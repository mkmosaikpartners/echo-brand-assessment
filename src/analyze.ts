import { REPORT_TOOL, SYSTEM_PROMPT } from "./rubric";
import type { CrawlResult, ModelReport } from "./types";
import { EchoError } from "./crawl";

export const DEFAULT_MODEL = "claude-sonnet-5-5";

const ROLE_LABEL: Record<string, string> = {
  start: "Startseite",
  ueber: "Über uns",
  angebot: "Angebot",
  karriere: "Karriere",
  referenzen: "Referenzen",
  kontakt: "Kontakt",
  mitbewerber: "Mitbewerber (Startseite)",
};

export function buildUserText(crawl: CrawlResult, description?: string): string {
  const parts: string[] = [];
  parts.push(
    description
      ? `KURZBESCHREIBUNG DES UNTERNEHMENS (der «Ruf», vom Unternehmen selbst eingegeben – für H3):\n«${description}»`
      : "Keine Kurzbeschreibung eingegeben: H3 weglassen.",
  );
  if (crawl.notes.length) parts.push(`HINWEISE ZUM LESEN:\n- ${crawl.notes.join("\n- ")}`);
  parts.push(crawl.screenshot ? "Das beigefügte Bild zeigt den ersten Bildschirm der Startseite (1440 × 900)." : "Kein Bild der Startseite vorhanden.");
  for (const p of crawl.pages) {
    parts.push(
      `===== SEITE: ${ROLE_LABEL[p.role]} =====\nURL: ${p.url}\nTitel: ${p.title}\nSprache: ${p.lang || "unbekannt"}\n` +
        (p.alts.length ? `Bildbeschreibungen (Alt-Texte): ${p.alts.join(" | ")}\n` : "") +
        `TEXT:\n${p.text}`,
    );
  }
  if (crawl.competitors.length) {
    parts.push("===== MITBEWERBER (nur für den Austauschbarkeitstest in O2) =====");
    for (const c of crawl.competitors) parts.push(`--- ${c.url} ---\n${c.text}`);
  } else {
    parts.push("Keine Mitbewerber angegeben: Prüfe O2 gegen typische Muster der Branche.");
  }
  return parts.join("\n\n");
}

export async function callModel(apiKey: string, model: string, crawl: CrawlResult, description?: string): Promise<ModelReport> {
  if (!apiKey) throw new EchoError("Der Analyse-Dienst ist nicht eingerichtet (API-Schlüssel fehlt).");
  const content: unknown[] = [];
  if (crawl.screenshot) {
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: crawl.screenshot } });
  }
  content.push({ type: "text", text: buildUserText(crawl, description) });

  // Nicht jedes Modell erlaubt alle Optionen. Bei einer Ablehnung wird die betroffene Option weggelassen.
  const opts = { temperature: true, forceTool: true };
  const send = () =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 24000,
        ...(opts.temperature ? { temperature: 0 } : {}),
        system: SYSTEM_PROMPT,
        tools: [REPORT_TOOL],
        tool_choice: opts.forceTool ? { type: "tool", name: REPORT_TOOL.name } : { type: "auto" },
        messages: [{ role: "user", content }],
      }),
    });
  let res = await send();
  for (let i = 0; i < 2 && res.status === 400; i++) {
    const peek = await res.clone().text();
    if (opts.forceTool && /tool_choice/i.test(peek)) opts.forceTool = false;
    else if (opts.temperature && /temperature/i.test(peek)) opts.temperature = false;
    else break;
    res = await send();
  }
  if (!res.ok) {
    const body = await res.text();
    // 4xx ausser 429 sind Konfigurationsfehler: nicht wiederholen
    const msg = `Analyse-Dienst antwortete mit ${res.status}: ${body.slice(0, 300)}`;
    if (res.status >= 400 && res.status < 500 && res.status !== 429) throw new EchoError(msg);
    throw new Error(msg);
  }
  const data = (await res.json()) as { content: { type: string; name?: string; input?: unknown; text?: string }[]; stop_reason?: string };
  const tool = data.content.find((c) => c.type === "tool_use" && c.name === REPORT_TOOL.name);
  if (tool && tool.input) return tool.input as ModelReport;
  // Rückfall: JSON im Text
  const text = data.content.filter((c) => c.type === "text").map((c) => c.text || "").join("\n");
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]) as ModelReport;
    } catch {
      /* weiter unten */
    }
  }
  throw new Error(`Keine Analyse erhalten (stop_reason: ${data.stop_reason}).`);
}
