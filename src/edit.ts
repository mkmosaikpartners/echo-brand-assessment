import type { EchoResult } from "./types";

/** Übernimmt eine Textänderung aus der Admin-Ansicht. Nur bestehende Textfelder, nie neue Strukturen. */
const EDIT_PATH = /^(report(\.(#[A-Z]\d|\d{1,2}|[a-z_]{2,30})){1,3}|archetype\.traits)$/;

export function applyEdit(result: EchoResult, path: string, raw: unknown): boolean {
  if (typeof raw !== "string" || !EDIT_PATH.test(path)) return false;
  const value = raw.replace(/\s+/g, " ").trim().slice(0, 3000);
  if (path === "archetype.traits") {
    const t = value.split(/\s*·\s*/).map((x) => x.trim()).filter(Boolean);
    if (!t.length) return false;
    result.archetype.traits = t;
    return true;
  }
  const segs = path.split(".").slice(1);
  let obj: unknown = result.report;
  for (let i = 0; i < segs.length - 1; i++) {
    const k = segs[i];
    obj = k.startsWith("#")
      ? Array.isArray(obj) ? obj.find((x) => x && (x as { id?: string }).id === k.slice(1)) : undefined
      : (obj as Record<string, unknown> | undefined)?.[k];
    if (!obj || typeof obj !== "object") return false;
  }
  const last = segs[segs.length - 1];
  const target = obj as Record<string, unknown>;
  if (typeof target[last] !== "string") return false;
  target[last] = value;
  return true;
}
