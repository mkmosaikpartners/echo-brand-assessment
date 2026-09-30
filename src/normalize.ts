import { ADVANTAGES } from "./archetypes";
import type { ModelReport } from "./types";

/**
 * Das Modell liefert verschachtelte Teile manchmal als Text statt als Objekt
 * (z. B. "atmosphere": "{\"kern\": …}") oder flach ("atmosphere_kern").
 * Diese Funktion bringt alles in die erwartete Form.
 */
const OBJECTS: Record<string, string[]> = {
  market_logic: ["position", "involvement", "text"],
  atmosphere: ["kern", "emotion", "atmosphaere"],
  hero: ["who", "carries", "text"],
  archetype: ["primary", "secondary", "clarity", "traits_in_context", "reasoning"],
  pattern: ["name", "text"],
};
const ARRAYS = ["indicators", "page_comparison", "levers", "limits"];
// Unterfelder, die eindeutig genug sind, um sie auch auf oberster Ebene zu übernehmen
const UNIQUE_TOP = new Set(["position", "involvement", "kern", "emotion", "atmosphaere", "who", "carries", "primary", "secondary", "traits_in_context", "reasoning"]);

function parseMaybe(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!(t.startsWith("{") || t.startsWith("["))) return v;
  try {
    return JSON.parse(t);
  } catch {
    return v;
  }
}

export function normalizeReport(input: unknown): ModelReport {
  let raw = parseMaybe(input) as Record<string, unknown>;
  if (!raw || typeof raw !== "object") raw = {};
  // Manchmal steckt alles in einem Unterobjekt («echo_report», «report», «input»)
  for (const k of ["echo_report", "report", "input"]) {
    const inner = parseMaybe(raw[k]);
    if (inner && typeof inner === "object" && !Array.isArray(inner) && !("indicators" in raw)) raw = inner as Record<string, unknown>;
  }
  const out: Record<string, unknown> = { ...raw };

  for (const [key, fields] of Object.entries(OBJECTS)) {
    let obj = parseMaybe(raw[key]);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) obj = {};
    const o = { ...(obj as Record<string, unknown>) };
    for (const f of fields) {
      if (o[f] !== undefined && o[f] !== "") continue;
      const flat = raw[`${key}_${f}`] ?? raw[`${key}.${f}`] ?? (UNIQUE_TOP.has(f) ? raw[f] : undefined);
      if (flat !== undefined) o[f] = flat;
    }
    // Muster als reiner Text: «Name – Erklärung» oder nur der Name
    if (key === "pattern" && typeof raw.pattern === "string" && !o.name) {
      const m = raw.pattern.match(/^(.{3,60}?)\s*[–:-]\s+(.+)$/s);
      if (m) { o.name = m[1].trim(); o.text = m[2].trim(); } else o.name = raw.pattern.trim();
    }
    out[key] = o;
  }

  for (const key of ARRAYS) {
    const v = parseMaybe(raw[key]);
    out[key] = Array.isArray(v) ? v.map((x) => parseMaybe(x)) : [];
  }
  out.indicators = (out.indicators as Record<string, unknown>[]).map((i) =>
    i && typeof i === "object" ? { ...i, evidence: (() => { const e = parseMaybe(i.evidence); return Array.isArray(e) ? e : []; })() } : i,
  );

  // Archetyp: Gross-/Kleinschreibung tolerieren
  const arch = out.archetype as Record<string, unknown>;
  for (const f of ["primary", "secondary"]) {
    const v = typeof arch[f] === "string" ? (arch[f] as string).trim() : "";
    const hit = Object.keys(ADVANTAGES).find((a) => a.toLowerCase() === v.toLowerCase());
    if (hit) arch[f] = hit;
  }
  const traits = parseMaybe(arch.traits_in_context);
  arch.traits_in_context = Array.isArray(traits) ? traits : typeof traits === "string" ? traits.split(/\s*[·,;]\s*/).filter(Boolean) : [];

  return out as unknown as ModelReport;
}

/** Liefert die Liste der Teile, die fehlen. Leer = vollständig. */
export function missingParts(r: ModelReport): string[] {
  const miss: string[] = [];
  const has = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  if (!has(r.pattern?.name) || !has(r.pattern?.text)) miss.push("Muster");
  if (!has(r.atmosphere?.kern) || !has(r.atmosphere?.atmosphaere)) miss.push("Atmosphäre");
  if (!has(r.hero?.who)) miss.push("Held");
  if (!has(r.market_logic?.text)) miss.push("Marktlogik");
  if (!(r.archetype?.primary in ADVANTAGES) || !(r.archetype?.secondary in ADVANTAGES)) miss.push("Charakter");
  if (!has(r.retell_sentence)) miss.push("Weitererzählsatz");
  if (!Array.isArray(r.indicators) || r.indicators.length < 8) miss.push("Indikatoren");
  if (!Array.isArray(r.levers) || r.levers.length < 3) miss.push("Hebel");
  return miss;
}
