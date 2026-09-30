import { WorkerMailer } from "worker-mailer";
import type { Env, JobStatus } from "./types";

/**
 * E-Mails über das Google-Workspace-Postfach (SMTP mit App-Passwort) oder alternativ über Resend.
 * Ohne Zugangsdaten wird still nichts verschickt.
 */

interface Contact {
  name?: string;
  email?: string;
  url?: string;
  createdAt?: string;
  mailedAt?: string;
  notifiedAt?: string;
}

const TTL_SECONDS = 60 * 60 * 24 * 90;

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function baseUrl(env: Env): string {
  return (env.PUBLIC_URL || "https://echo.mosaik.partners").replace(/\/$/, "");
}

async function send(env: Env, to: string, subject: string, html: string, text: string): Promise<boolean> {
  const smtpPass = (env.SMTP_PASS || "").replace(/\s+/g, "");
  if (smtpPass) {
    const user = (env.SMTP_USER || "mk@mosaik.partners").trim();
    try {
      await WorkerMailer.send(
        { host: env.SMTP_HOST || "smtp.gmail.com", port: 465, secure: true, authType: "plain", credentials: { username: user, password: smtpPass } },
        {
          from: { name: "Mosaik & Partners", email: user },
          to: { email: to },
          reply: env.MAIL_REPLY_TO || user,
          subject,
          html,
          text,
        },
      );
      return true;
    } catch (e) {
      console.log("SMTP fehlgeschlagen", e instanceof Error ? e.message : String(e));
      return false;
    }
  }
  const key = (env.RESEND_API_KEY || "").trim();
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM || "Mosaik & Partners <echo@mosaik.partners>",
      to: [to],
      reply_to: env.MAIL_REPLY_TO || "mk@mosaik.partners",
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) console.log("Mail fehlgeschlagen", res.status, (await res.text()).slice(0, 300));
  return res.ok;
}

async function loadContact(env: Env, id: string): Promise<Contact | null> {
  const raw = await env.RESULTS.get(`c:${id}`);
  return raw ? (JSON.parse(raw) as Contact) : null;
}

async function saveContact(env: Env, id: string, c: Contact): Promise<void> {
  await env.RESULTS.put(`c:${id}`, JSON.stringify(c), { expirationTtl: TTL_SECONDS });
}

function companyOf(job: JobStatus): string {
  if ((job.status === "done" || job.status === "review") && job.result.report.company_name) return job.result.report.company_name;
  try {
    return new URL(job.url).hostname.replace(/^www\./, "");
  } catch {
    return "eure Marke";
  }
}

function layout(inner: string): string {
  return `<!doctype html><html lang="de-CH"><body style="margin:0;padding:0;background:#f5f2eb;font-family:'Titillium Web',Helvetica,Arial,sans-serif;color:#28354f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2eb"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px">
<tr><td style="padding:28px 32px 0;font-size:12px;font-weight:700;letter-spacing:3px;color:#28354f">ECHO SNAPSHOT</td></tr>
<tr><td style="padding:20px 32px 32px;font-size:16px;line-height:1.55">${inner}</td></tr>
</table>
<p style="font-size:12px;color:#56607a;margin:18px 0 0">Mosaik &amp; Partners · <a href="https://www.mosaik.partners/" style="color:#56607a">mosaik.partners</a></p>
</td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#28354f;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px">${esc(label)}</a></p>`;
}

/** Schickt der bestellenden Person den Link, sobald das Ergebnis sichtbar ist. Nur einmal. */
export async function mailResultReady(env: Env, id: string, job: JobStatus): Promise<void> {
  try {
    const c = await loadContact(env, id);
    if (!c?.email || c.mailedAt) return;
    const link = `${baseUrl(env)}/r/${id}`;
    const company = companyOf(job);
    const first = (c.name || "").trim().split(/\s+/)[0];
    const hello = first ? `Hallo ${first}` : "Hallo";
    const subject = `Das Echo von ${company} hallt nach`;
    const html = layout(
      `<p style="margin:0 0 14px">${esc(hello)}</p>
<p style="margin:0 0 14px">das Echo von <b>${esc(company)}</b> hallt nach. Du siehst jetzt, was von eurer Marke ankommt, was weitererzählt wird – und worüber es sich nachzudenken lohnt.</p>
${button(link, "Ergebnis ansehen")}
<p style="margin:0 0 14px;font-size:14px;color:#56607a">Der Link bleibt 90 Tage gültig. Auf der Ergebnisseite kannst du es auch als Präsentation (PDF) herunterladen.</p>
<p style="margin:0 0 14px">Die Möglichkeiten erläutern wir gerne in einem Gespräch: <a href="https://www.mosaik.partners/#termin-mit-martin" style="color:#28354f">Termin vereinbaren</a>.</p>
<p style="margin:20px 0 0">Herzlich<br>Martin Künzi<br><span style="color:#56607a">Mosaik &amp; Partners</span></p>`,
    );
    const text = `${hello}\n\ndas Echo von ${company} hallt nach.\n\nErgebnis ansehen: ${link}\n\nDer Link bleibt 90 Tage gültig. Auf der Ergebnisseite kannst du es auch als Präsentation (PDF) herunterladen.\n\nDie Möglichkeiten erläutern wir gerne in einem Gespräch: https://www.mosaik.partners/#termin-mit-martin\n\nHerzlich\nMartin Künzi\nMosaik & Partners`;
    if (await send(env, c.email, subject, html, text)) await saveContact(env, id, { ...c, mailedAt: new Date().toISOString() });
  } catch (e) {
    console.log("mailResultReady", e);
  }
}

/** Meldet Mosaik & Partners, dass ein Ergebnis auf Freigabe wartet. */
export async function mailReviewWaiting(env: Env, id: string, job: JobStatus): Promise<void> {
  try {
    const to = (env.NOTIFY_EMAIL || "").trim();
    if (!to) return;
    const c = (await loadContact(env, id)) || {};
    if (c.notifiedAt) return;
    const company = companyOf(job);
    const pattern = job.status === "review" ? job.result.report.pattern?.name : "";
    const subject = `Neuer ECHO Snapshot wartet: ${company}`;
    const html = layout(
      `<p style="margin:0 0 14px"><b>${esc(company)}</b> ist fertig eingestuft und wartet auf deine Freigabe.</p>
<p style="margin:0 0 6px">Website: ${esc(job.url)}</p>
${pattern ? `<p style="margin:0 0 6px">Muster: ${esc(pattern)}</p>` : ""}
<p style="margin:0 0 6px">Bestellt von: ${esc(c.name || "–")}${c.email ? ` · <a href="mailto:${esc(c.email)}" style="color:#28354f">${esc(c.email)}</a>` : ""}</p>
${button(`${baseUrl(env)}/admin`, "Zur Freigabe")}`,
    );
    const text = `${company} wartet auf Freigabe.\nWebsite: ${job.url}\nBestellt von: ${c.name || "–"} ${c.email || ""}\n\n${baseUrl(env)}/admin`;
    if (await send(env, to, subject, html, text)) await saveContact(env, id, { ...c, notifiedAt: new Date().toISOString() });
  } catch (e) {
    console.log("mailReviewWaiting", e);
  }
}

/** Meldet Mosaik & Partners, dass eine Analyse gescheitert ist – damit kein Interessent verloren geht. */
export async function mailFailed(env: Env, id: string, url: string, reason: string): Promise<void> {
  try {
    const to = (env.NOTIFY_EMAIL || "").trim();
    if (!to) return;
    const c = (await loadContact(env, id)) || {};
    const subject = `ECHO Snapshot nicht möglich: ${url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}`;
    const html = layout(
      `<p style="margin:0 0 14px">Die Analyse von <b>${esc(url)}</b> hat nicht geklappt.</p>
<p style="margin:0 0 6px">Grund: ${esc(reason)}</p>
<p style="margin:0 0 14px">Bestellt von: ${esc(c.name || "–")}${c.email ? ` · <a href="mailto:${esc(c.email)}" style="color:#28354f">${esc(c.email)}</a>` : ""}</p>
<p style="margin:0">Vielleicht lohnt sich eine persönliche Nachricht.</p>`,
    );
    const text = `Die Analyse von ${url} hat nicht geklappt.\nGrund: ${reason}\nBestellt von: ${c.name || "–"} ${c.email || ""}`;
    await send(env, to, subject, html, text);
  } catch (e) {
    console.log("mailFailed", e);
  }
}
