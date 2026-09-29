import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { crawlSite, EchoError } from "./crawl";
import { callModel, DEFAULT_MODEL } from "./analyze";
import { finalize } from "./finalize";
import { normalizeUrl } from "./pages";
import type { AnalysisParams, CrawlResult, Env, JobStatus, ModelReport } from "./types";

const TTL_SECONDS = 60 * 60 * 24 * 90; // Ergebnisse 90 Tage aufbewahren

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
            return JSON.stringify(await crawlSite(this.env.BROWSER, p.url, p.competitors));
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
      const reportJson = await step.do(
        "einstufen",
        { retries: { limit: 2, delay: "20 seconds", backoff: "exponential" }, timeout: "6 minutes" },
        async () => {
          try {
            return JSON.stringify(await callModel(this.env.ANTHROPIC_API_KEY, model, crawl, p.description));
          } catch (e) {
            if (e instanceof EchoError) throw new NonRetryableError(e.message);
            throw e;
          }
        },
      );
      const report = JSON.parse(reportJson) as ModelReport;

      await step.do("auswerten und speichern", async () => {
        const result = finalize(p, crawl, report, model);
        const review = (this.env.REVIEW_MODE || "").toLowerCase() === "on";
        await setStatus({ status: review ? "review" : "done", createdAt, url: p.url, result });
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
  if (/timed? ?out|timeout/i.test(msg)) return "Die Website hat zu lange gebraucht, um zu antworten. Bitte versuche es später erneut.";
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
  let body: { url?: string; description?: string; competitors?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ungültige Anfrage." }, 400);
  }
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
  await env.ECHO_WORKFLOW.create({ id, params: { id, url, description, competitors } });
  return json({ id });
}

async function handleResult(id: string, env: Env, admin: boolean): Promise<Response> {
  const raw = await env.RESULTS.get(`r:${id}`);
  if (!raw) return json({ error: "Dieses Ergebnis gibt es nicht oder nicht mehr." }, 404);
  const job = JSON.parse(raw) as JobStatus;
  if (job.status === "review" && !admin) return json({ status: "review", createdAt: job.createdAt, url: job.url });
  if (job.status === "error" && !admin) return json({ status: "error", createdAt: job.createdAt, url: job.url, error: job.error });
  return json({ ...job, contactUrl: env.CONTACT_URL || "mailto:mk@mosaik.partners?subject=ECHO%20Snapshot" });
}

function isAdmin(req: Request, env: Env): boolean {
  const key = new URL(req.url).searchParams.get("key") || req.headers.get("x-admin-key") || "";
  return !!env.ADMIN_KEY && key === env.ADMIN_KEY;
}

async function handleAdminList(env: Env): Promise<Response> {
  const list = await env.RESULTS.list({ prefix: "r:", limit: 200 });
  const items = await Promise.all(
    list.keys.map(async (k) => {
      const j = JSON.parse((await env.RESULTS.get(k.name)) || "{}") as JobStatus;
      return {
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
  await env.RESULTS.put(`r:${id}`, JSON.stringify({ ...job, status: "done" }), { expirationTtl: TTL_SECONDS });
  return json({ ok: true });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/api/analyze" && req.method === "POST") return handleAnalyze(req, env);

    let m = path.match(/^\/api\/result\/([a-z0-9]{8,32})$/);
    if (m && req.method === "GET") return handleResult(m[1], env, isAdmin(req, env));

    if (path === "/api/admin/list") return isAdmin(req, env) ? handleAdminList(env) : json({ error: "Kein Zugriff." }, 403);
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
