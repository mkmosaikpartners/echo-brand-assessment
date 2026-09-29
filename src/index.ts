import puppeteer from "@cloudflare/puppeteer";
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { crawlSite, EchoError } from "./crawl";
import { callModel, DEFAULT_MODEL } from "./analyze";
import { finalize } from "./finalize";
import { missingParts } from "./normalize";
import { withTimeout } from "./timeout";
import { applyEdit } from "./edit";
import { mailResultReady, mailReviewWaiting } from "./mail";
import { normalizeUrl } from "./pages";
import type { AnalysisParams, CrawlResult, Env, JobStatus, ModelReport } from "./types";

const TTL_SECONDS = 60 * 60 * 24 * 90; // Ergebnisse 90 Tage aufbewahren
const PDF_VERSION = "3"; // erhöhen, wenn sich das Aussehen der Präsentation ändert

/* ================= Hintergrund-Ablauf ================= */

export class EchoWorkflow extends WorkflowEntrypoint<Env, AnalysisParams> {
  async run(event: Readonly<WorkflowEvent<AnalysisParams>>, step: WorkflowStep) {
    const p = event.payload;
    const createdAt = new Date().toISOString();
    const setStatus = (s: JobStatus) => this.env.RESULTS.put(`r:${p.id}`, JSON.stringify(s), { expirationTtl: TTL_SECONDS });

    try {
      await step.do("status: lesen", async () => {
        await setStatus({ status: "running", step: "lesen", createdAt, url: p.url });
        return true;
      });

      const crawlJson = await step.do(
        "website lesen",
        { retries: { limit: 1, delay: "10 seconds" }, timeout: "4 minutes" },
        async () => {
          try {
            return JSON.stringify(await withTimeout(crawlSite(this.env.BROWSER, p.url, p.competitors), 210000, "Website lesen"));
          } catch (e) {
            if (e instanceof EchoError) throw new NonRetryableError(e.message);
            throw e;
          }
        },
      );
      const crawl = JSON.parse(crawlJson) as CrawlResult;

      await step.do("status: einstufen", async () => {
        await setStatus({ status: "running", step: "einstufen", createdAt, url: p.url });
        return true;
      });

      const model = this.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
      const ask = (name: string) =>
        step.do(name, { retries: { limit: 1, delay: "20 seconds" }, timeout: "8 minutes" }, async () => {
          try {
            return JSON.stringify(await callModel(this.env.ANTHROPIC_API_KEY, model, crawl, p.description));
          } catch (e) {
            if (e instanceof EchoError) throw new NonRetryableError(e.message);
            throw e;
          }
        });
      let report = JSON.parse(await ask("einstufen")) as ModelReport;
      let missing = missingParts(report);
      if (missing.length) {
        // Unvollständige Antwort: einmal neu fragen, in einem eigenen Schritt
        const second = JSON.parse(await ask("einstufen, zweiter Anlauf")) as ModelReport;
        const missing2 = missingParts(second);
        if (missing2.length < missing.length) { report = second; missing = missing2; }
      }
      if (missing.includes("Charakter") || missing.length > 2) throw new Error(`Analyse unvollständig (${missing.join(", ")}).`);

      await step.do("auswerten und speichern", async () => {
        const result = finalize(p, crawl, report, model);
        const review = (this.env.REVIEW_MODE || "").toLowerCase() === "on";
        await setStatus({ status: review ? "review" : "done", createdAt, url: p.url, result });
        return true;
      });

      await step.do("benachrichtigen", async () => {
        const job = JSON.parse((await this.env.RESULTS.get(`r:${p.id}`)) || "{}") as JobStatus;
        if (job.status === "review") await withTimeout(mailReviewWaiting(this.env, p.id, job), 30000, "Mail").catch(() => {});
        if (job.status === "done") await withTimeout(mailResultReady(this.env, p.id, job), 30000, "Mail").catch(() => {});
        return true;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await setStatus({ status: "error", createdAt, url: p.url, error: friendlyError(msg), detail: msg.slice(0, 1000) });
      throw e;
    }
  }
}

function friendlyError(msg: string): string {
  if (/API-Schlüssel|401|authentication/i.test(msg)) return "Der Analyse-Dienst ist im Moment nicht erreichbar. Bitte versuche es später erneut.";
  if (/timed? ?out|timeout|Zeitüberschreitung/i.test(msg)) return "Die Website hat zu lange gebraucht, um zu antworten. Bitte versuche es später erneut.";
  if (/^(Die |Auf der |Ausser )/.test(msg)) return msg;
  return "Bei der Analyse ist ein Fehler aufgetreten. Bitte versuche es später erneut.";
}

/* ================= Web ================= */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
}

async function rateLimited(env: Env, ip: string): Promise<boolean> {
  const limit = Number(env.RATE_LIMIT_PER_HOUR || "5");
  if (!limit) return false;
  const key = `rl:${ip}:${new Date().toISOString().slice(0, 13)}`;
  const n = Number((await env.RESULTS.get(key)) || "0");
  if (n >= limit) return true;
  await env.RESULTS.put(key, String(n + 1), { expirationTtl: 3700 });
  return false;
}

async function handleAnalyze(req: Request, env: Env): Promise<Response> {
  let body: { url?: string; description?: string; competitors?: string[]; name?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ungültige Anfrage." }, 400);
  }
  const name = (body.name || "").trim().slice(0, 120);
  const email = (body.email || "").trim().slice(0, 200);
  if (!name) return json({ error: "Bitte gib deinen Namen ein." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }, 400);
  const url = normalizeUrl(body.url || "");
  if (!url) return json({ error: "Bitte gib eine gültige Website-Adresse ein, z. B. www.beispiel.ch." }, 400);
  const description = (body.description || "").trim().slice(0, 400) || undefined;
  const competitors: string[] = [];
  for (const c of (body.competitors || []).slice(0, 3)) {
    if (!c || !c.trim()) continue;
    const n = normalizeUrl(c);
    if (!n) return json({ error: `Die Mitbewerber-Adresse «${c}» ist ungültig.` }, 400);
    competitors.push(n);
  }
  const ip = req.headers.get("cf-connecting-ip") || "unbekannt";
  if (await rateLimited(env, ip)) {
    return json({ error: "Du hast in der letzten Stunde bereits mehrere Analysen gestartet. Bitte versuche es später erneut." }, 429);
  }
  const id = newId();
  const createdAt = new Date().toISOString();
  await env.RESULTS.put(`r:${id}`, JSON.stringify({ status: "queued", step: "warten", createdAt, url } satisfies JobStatus), {
    expirationTtl: TTL_SECONDS,
  });
  // Kontakt getrennt vom Ergebnis speichern: nur für Mosaik & Partners sichtbar
  await env.RESULTS.put(`c:${id}`, JSON.stringify({ name, email, url, description, createdAt }), { expirationTtl: TTL_SECONDS });
  await env.ECHO_WORKFLOW.create({ id, params: { id, url, description, competitors } });
  return json({ id });
}

async function handleResult(id: string, env: Env, admin: boolean): Promise<Response> {
  const raw = await env.RESULTS.get(`r:${id}`);
  if (!raw) return json({ error: "Dieses Ergebnis gibt es nicht oder nicht mehr." }, 404);
  const job = JSON.parse(raw) as JobStatus;
  if (job.status === "review" && !admin) return json({ status: "review", createdAt: job.createdAt, url: job.url });
  // Technische Fehlerdetails nur für Mosaik & Partners
  if (job.status === "error" && !admin) {
    const { detail: _hidden, ...pub } = job;
    return json({ ...pub, contactUrl: env.CONTACT_URL || "https://www.mosaik.partners/#termin-mit-martin" });
  }
  return json({ ...job, ...(admin ? { admin: true } : {}), contactUrl: env.CONTACT_URL || "https://www.mosaik.partners/#termin-mit-martin" });
}

function isAdmin(req: Request, env: Env): boolean {
  // Nur über den Header, nie über die Adresse (Adressen landen in Verlauf und Protokollen)
  const key = (req.headers.get("x-admin-key") || "").trim();
  const expected = (env.ADMIN_KEY || "").trim();
  return expected.length > 0 && key === expected;
}

async function handleAdminList(env: Env): Promise<Response> {
  const list = await env.RESULTS.list({ prefix: "r:", limit: 200 });
  const items = await Promise.all(
    list.keys.map(async (k) => {
      const j = JSON.parse((await env.RESULTS.get(k.name)) || "{}") as JobStatus;
      const c = JSON.parse((await env.RESULTS.get(`c:${k.name.slice(2)}`)) || "{}") as { name?: string; email?: string };
      return {
        name: c.name,
        email: c.email,
        id: k.name.slice(2),
        status: j.status,
        url: j.url,
        createdAt: j.createdAt,
        company: "result" in j ? j.result.report.company_name : undefined,
        pattern: "result" in j ? j.result.report.pattern?.name : undefined,
      };
    }),
  );
  items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return json({ items });
}

async function handleApprove(id: string, env: Env): Promise<Response> {
  const raw = await env.RESULTS.get(`r:${id}`);
  if (!raw) return json({ error: "Nicht gefunden." }, 404);
  const job = JSON.parse(raw) as JobStatus;
  if (job.status !== "review") return json({ error: "Dieses Ergebnis wartet nicht auf Freigabe." }, 400);
  const approved = { ...job, status: "done" } as JobStatus;
  await env.RESULTS.put(`r:${id}`, JSON.stringify(approved), { expirationTtl: TTL_SECONDS });
  await mailResultReady(env, id, approved);
  return json({ ok: true });
}

async function handleHealth(env: Env): Promise<Response> {
  // Testphase: zeigt nur, OB Schlüssel vorhanden sind – nie deren Inhalt.
  let lastError: unknown = null;
  try {
    const list = await env.RESULTS.list({ prefix: "r:", limit: 50 });
    const jobs = await Promise.all(list.keys.map(async (k) => JSON.parse((await env.RESULTS.get(k.name)) || "{}") as JobStatus));
    const errs = jobs.filter((j) => j.status === "error").sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (errs[0] && errs[0].status === "error") lastError = { createdAt: errs[0].createdAt, url: errs[0].url, detail: errs[0].detail };
  } catch (e) {
    lastError = String(e);
  }
  return json({
    anthropicKey: !!(env.ANTHROPIC_API_KEY || "").trim(),
    adminKey: !!(env.ADMIN_KEY || "").trim(),
    model: env.ANTHROPIC_MODEL || null,
    reviewMode: env.REVIEW_MODE || null,
    bindings: { browser: !!env.BROWSER, kv: !!env.RESULTS, workflow: !!env.ECHO_WORKFLOW },
    lastError,
  });
}


/* ================= Bearbeiten durch Mosaik & Partners ================= */

async function handleEdit(id: string, req: Request, env: Env): Promise<Response> {
  const raw = await env.RESULTS.get(`r:${id}`);
  if (!raw) return json({ error: "Nicht gefunden." }, 404);
  const job = JSON.parse(raw) as JobStatus;
  if (job.status !== "review" && job.status !== "done") return json({ error: "Dieses Ergebnis kann nicht bearbeitet werden." }, 400);
  let body: { changes?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ungültige Anfrage." }, 400);
  }
  let applied = 0;
  for (const [path, value] of Object.entries(body.changes || {}).slice(0, 200)) if (applyEdit(job.result, path, value)) applied++;
  job.result.editedAt = new Date().toISOString();
  await env.RESULTS.put(`r:${id}`, JSON.stringify(job), { expirationTtl: TTL_SECONDS });
  await env.RESULTS.delete(`p${PDF_VERSION}:${id}`); // PDF neu erzeugen
  return json({ ok: true, applied });
}

/* ================= PDF (Präsentation) ================= */

async function handlePdf(id: string, req: Request, env: Env, admin: boolean): Promise<Response> {
  const raw = await env.RESULTS.get(`r:${id}`);
  if (!raw) return json({ error: "Nicht gefunden." }, 404);
  const job = JSON.parse(raw) as JobStatus;
  if (job.status !== "done" && !(job.status === "review" && admin)) return json({ error: "Noch nicht verfügbar." }, 403);
  const company = job.status === "done" || job.status === "review" ? job.result.report.company_name || new URL(job.url).hostname : "Ergebnis";
  const fileName = `ECHO-Snapshot-${company.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}.pdf`;
  const headers = {
    "content-type": "application/pdf",
    "content-disposition": `attachment; filename="${fileName}"`,
    "cache-control": "no-store",
  };

  // Freigegebene Ergebnisse nur einmal erzeugen
  if (job.status === "done") {
    const cached = await env.RESULTS.get(`p${PDF_VERSION}:${id}`, "arrayBuffer");
    if (cached) return new Response(cached, { headers });
  }
  const ip = req.headers.get("cf-connecting-ip") || "unbekannt";
  if (!admin && (await rateLimitedKey(env, `rlp:${ip}`, 20))) return json({ error: "Zu viele PDF-Anfragen. Bitte später erneut." }, 429);

  const origin = new URL(req.url).origin;
  const target = `${origin}/r/${id}`;
  const browser = await withTimeout(puppeteer.launch(env.BROWSER), 30000, "Browser starten");
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    if (job.status === "review") {
      // Vorschau: Passwort nur im Speicher des Hilfsbrowsers, nicht in der Adresse (sonst stünde es in den Protokollen)
      await page.evaluateOnNewDocument((k: string) => { try { localStorage.setItem("echoAdminKey", k); } catch { /* egal */ } }, (env.ADMIN_KEY || "").trim());
    }
    await page.goto(target, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
    const pdf = await withTimeout(page.pdf({ width: "297mm", height: "167mm", printBackground: true, preferCSSPageSize: true }), 45000, "PDF erzeugen");
    if (job.status === "done") await env.RESULTS.put(`p${PDF_VERSION}:${id}`, pdf, { expirationTtl: TTL_SECONDS });
    return new Response(pdf, { headers });
  } finally {
    await withTimeout(browser.close(), 10000, "Browser schliessen").catch(() => {});
  }
}

async function rateLimitedKey(env: Env, prefix: string, limit: number): Promise<boolean> {
  const key = `${prefix}:${new Date().toISOString().slice(0, 13)}`;
  const n = Number((await env.RESULTS.get(key)) || "0");
  if (n >= limit) return true;
  await env.RESULTS.put(key, String(n + 1), { expirationTtl: 3700 });
  return false;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/api/analyze" && req.method === "POST") return handleAnalyze(req, env);
    if (path === "/api/health") return isAdmin(req, env) ? handleHealth(env) : json({ error: "Kein Zugriff." }, 403);

    let m = path.match(/^\/api\/result\/([a-z0-9]{8,32})$/);
    if (m && req.method === "GET") return handleResult(m[1], env, isAdmin(req, env));

    m = path.match(/^\/api\/pdf\/([a-z0-9]{8,32})$/);
    if (m && req.method === "GET") return handlePdf(m[1], req, env, isAdmin(req, env));

    if (path === "/api/admin/list") return isAdmin(req, env) ? handleAdminList(env) : json({ error: "Kein Zugriff." }, 403);
    m = path.match(/^\/api\/admin\/edit\/([a-z0-9]{8,32})$/);
    if (m && req.method === "POST") return isAdmin(req, env) ? handleEdit(m[1], req, env) : json({ error: "Kein Zugriff." }, 403);
    m = path.match(/^\/api\/admin\/approve\/([a-z0-9]{8,32})$/);
    if (m && req.method === "POST") return isAdmin(req, env) ? handleApprove(m[1], env) : json({ error: "Kein Zugriff." }, 403);

    // Ergebnisseite: /r/<id> liefert dieselbe HTML-Datei aus
    if (/^\/r\/[a-z0-9]{8,32}\/?$/.test(path)) {
      return env.ASSETS.fetch(new Request(new URL("/result", url), req));
    }
    if (path === "/admin") return env.ASSETS.fetch(new Request(new URL("/admin", url), req));

    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
