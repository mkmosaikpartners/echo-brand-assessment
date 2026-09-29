import type { IndicatorRating, PageSnapshot } from "./types";

/** Vereinheitlicht Text für den Vergleich: Kleinschreibung, Anführungszeichen, Striche, Leerraum, ß → ss. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFC")
    .replace(/­/g, "")
    .replace(/ß/g, "ss")
    .replace(/[«»„“”‚‘’'"`´]/g, "")
    .replace(/[‐‑‒–—―-]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .replace(/\s*([.,:;!?])\s*/g, "$1 ")
    .trim();
}

function stripEllipsis(q: string): string[] {
  // Zitate mit Auslassung («…») werden in Teilen geprüft
  return q
    .split(/\s*(?:\.\.\.|…|\[…\]|\[\.\.\.\])\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Findet ein Zitat im Text der angegebenen Seite oder, falls die URL nicht passt, auf irgendeiner gelesenen Seite. */
export function quoteFound(quote: string, url: string, pages: PageSnapshot[]): boolean {
  const pieces = stripEllipsis(quote).map(norm).filter((p) => p.length >= 4);
  if (pieces.length === 0) return false;
  const texts = pages.map((p) => ({ url: p.url, text: norm(p.text + " " + p.title + " " + p.alts.join(" ")) }));
  const preferred = texts.filter((t) => sameUrl(t.url, url));
  const pool = preferred.length ? [...preferred, ...texts] : texts;
  return pool.some((t) => pieces.every((piece) => t.text.includes(piece)));
}

function sameUrl(a: string, b: string): boolean {
  const c = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
  return c(a) === c(b);
}

/**
 * Prüft alle Zitate. Unauffindbare Zitate werden entfernt. Bleibt bei Stufe 2 oder 3 kein Beleg übrig,
 * wird die Stufe auf 1 («behauptet») gesenkt.
 */
export function verifyEvidence(indicators: IndicatorRating[], pages: PageSnapshot[]) {
  let total = 0;
  let verified = 0;
  let adjusted = 0;
  const out = indicators.map((ind) => {
    const evidence = ind.evidence
      .map((e) => {
        if (e.kind !== "zitat") return { ...e, verified: true };
        total++;
        const ok = quoteFound(e.text, e.url, pages);
        if (ok) verified++;
        return { ...e, verified: ok };
      })
      .filter((e) => e.verified);
    let level = ind.level;
    let wasAdjusted = false;
    if (evidence.length === 0 && level >= 2) {
      level = 1;
      wasAdjusted = true;
      adjusted++;
    }
    return { ...ind, level, evidence, adjusted: wasAdjusted || undefined };
  });
  return { indicators: out, total, verified, adjusted };
}
