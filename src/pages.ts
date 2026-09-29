import type { PageRole } from "./types";

export interface LinkInfo {
  href: string;
  text: string;
}

/** Macht aus einer Eingabe wie «isolutions.ch» eine vollständige URL. Gibt null zurück, wenn es keine gültige Web-Adresse ist. */
export function normalizeUrl(input: string): string | null {
  let s = (input || "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!u.hostname.includes(".")) return null;
    // Keine lokalen oder privaten Adressen
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname)) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function sameSite(a: string, b: string): boolean {
  const strip = (h: string) => h.replace(/^www\./, "");
  return strip(a) === strip(b);
}

const ROLE_PATTERNS: [Exclude<PageRole, "start" | "mitbewerber">, RegExp][] = [
  ["ueber", /(über|ueber|uber|about|wir|team|portrait|porträt|geschichte|unternehmen|firma|who-we-are|wer-wir-sind|philosophie|werte|vision|mission|founders|partner(?!s?hip))/i],
  ["angebot", /(angebot|leistung|services?|dienstleistung|produkte?|lösung|loesung|solutions?|expertise|kompetenz|was-wir-tun|shop|kollektion|sortiment|apartments?|zimmer|klausur|beratung)/i],
  ["referenzen", /(referenz|kunden|cases?|projekte|erfolge|success|portfolio|testimonial|stimmen)/i],
  ["karriere", /(karriere|jobs?|stellen|career|arbeiten-bei|offene-stellen|join)/i],
  ["kontakt", /(kontakt|contact|anfahrt|standort)/i],
];

const SKIP = /\.(pdf|jpe?g|png|gif|zip|docx?|xlsx?|pptx?|mp4)(\?|$)|^(mailto|tel|javascript):|\/(cart|warenkorb|login|account|checkout|impressum|datenschutz|privacy|agb|legal)/i;

/**
 * Wählt aus den Links der Startseite bis zu `max` Unterseiten aus – höchstens eine pro Rolle,
 * in der Reihenfolge Über uns, Angebot, Referenzen, Karriere, Kontakt.
 */
export function selectPages(links: LinkInfo[], startUrl: string, max = 5): { url: string; role: PageRole }[] {
  const start = new URL(startUrl);
  const seen = new Set<string>([canonical(start.toString())]);
  const candidates: { url: string; label: string }[] = [];
  for (const l of links) {
    if (!l.href || SKIP.test(l.href)) continue;
    let u: URL;
    try {
      u = new URL(l.href, start);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || !sameSite(u.hostname, start.hostname)) continue;
    u.hash = "";
    const key = canonical(u.toString());
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ url: u.toString(), label: `${l.text} ${u.pathname}` });
  }
  const picked: { url: string; role: PageRole }[] = [];
  for (const [role, re] of ROLE_PATTERNS) {
    if (picked.length >= max) break;
    const hit = candidates.find((c) => re.test(c.label) && !picked.some((p) => p.url === c.url));
    if (hit) picked.push({ url: hit.url, role });
  }
  return picked;
}

function canonical(u: string): string {
  return u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").toLowerCase();
}
