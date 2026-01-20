import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const MAX_CHARS = 9000; // pro Seite, damit es stabil bleibt
const TIMEOUT_MS = 12000;

function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n) + "\n…";
}

async function fetchWithTimeout(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ECHO-Assessment/1.0; +https://mosaik.partners)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const ct = res.headers.get("content-type") || "";
    if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
    if (!ct.includes("text/html")) throw new Error(`Not HTML (${ct}) for ${url}`);

    const html = await res.text();
    return html;
  } finally {
    clearTimeout(t);
  }
}

function extractMeta(doc: Document) {
  const get = (sel: string) =>
    (doc.querySelector(sel) as HTMLMetaElement | null)?.content?.trim() || "";

  const description = get('meta[name="description"]') || undefined;
  const ogTitle = get('meta[property="og:title"]') || undefined;
  const ogDescription = get('meta[property="og:description"]') || undefined;

  return { description, ogTitle, ogDescription };
}

export async function scrapeUrl(url: string): Promise<{
  url: string;
  title: string;
  text: string;
  meta: { description?: string; ogTitle?: string; ogDescription?: string };
}> {
  const html = await fetchWithTimeout(url);

  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  const title = (doc.querySelector("title")?.textContent || "").trim();
  const meta = extractMeta(doc);

  // Readability extrahiert den „Hauptinhalt“
  const reader = new Readability(doc);
  const article = reader.parse();

  let text =
    (article?.textContent || "")
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() || "";

  // Fallback: wenn Readability nichts findet
  if (!text || text.length < 200) {
    const bodyText = (doc.body?.textContent || "").replace(/\s+/g, " ").trim();
    text = bodyText;
  }

  text = truncate(text, MAX_CHARS);

  return { url, title, text, meta };
}
