import type { Advantage } from "./archetypes";

export interface Env {
  RESULTS: KVNamespace;
  BROWSER: Fetcher;
  ECHO_WORKFLOW: Workflow<AnalysisParams>;
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  ADMIN_KEY?: string;
  REVIEW_MODE?: string; // "on" = Ergebnisse erst nach Freigabe sichtbar
  RATE_LIMIT_PER_HOUR?: string;
  CONTACT_URL?: string;
}

export interface AnalysisParams {
  id: string;
  url: string;
  description?: string;
  competitors: string[];
}

/* ---------- Lesen ---------- */

export interface PageSnapshot {
  url: string;
  role: PageRole;
  title: string;
  lang: string;
  text: string; // sichtbarer Text (innerText), gekürzt
  alts: string[];
}

export type PageRole =
  | "start"
  | "ueber"
  | "angebot"
  | "karriere"
  | "referenzen"
  | "kontakt"
  | "mitbewerber";

export interface CrawlResult {
  pages: PageSnapshot[];
  competitors: PageSnapshot[];
  screenshot?: string; // base64 JPEG der Startseite (erster Bildschirm)
  notes: string[]; // Einschränkungen beim Lesen
}

/* ---------- Einstufen (Antwort des Sprachmodells) ---------- */

export const INDICATORS = [
  "E1", "E2", "E3", "E4",
  "C1", "C2",
  "H1", "H2", "H3",
  "O1", "O2", "O3",
] as const;
export type IndicatorId = (typeof INDICATORS)[number];

export interface Evidence {
  kind: "zitat" | "beobachtung";
  text: string;
  url: string;
  verified?: boolean;
}

export interface IndicatorRating {
  id: IndicatorId;
  level: 0 | 1 | 2 | 3;
  finding: string;
  evidence: Evidence[];
  adjusted?: boolean; // Stufe gesenkt, weil kein Beleg verifiziert werden konnte
}

export interface ModelReport {
  company_name: string;
  market_logic: {
    position: "nische" | "herausforderer" | "kategorie";
    involvement: "funktional" | "gemischt" | "bedeutung";
    text: string;
  };
  retell_sentence: string;
  retell_verdict: string;
  atmosphere: { kern: string; emotion: string; atmosphaere: string };
  hero: { who: string; carries: boolean; text: string };
  archetype: {
    primary: Advantage;
    secondary: Advantage;
    traits_in_context: string[];
    reasoning: string;
  };
  indicators: IndicatorRating[];
  page_comparison: {
    url: string;
    label: string;
    archetype_effect: string;
    address: string;
    sender: string;
    promise: string;
    breaks: string;
  }[];
  pattern: { name: string; text: string };
  levers: { title: string; dimension: "E" | "C" | "H" | "O"; why: string; first_step: string }[];
  limits: string[];
}

/* ---------- Ergebnis ---------- */

export type Strength = "fehlt" | "behauptet" | "erkennbar" | "belegt";

export interface DimensionScore {
  key: "E" | "C" | "H" | "O";
  value: number; // Mittel der Stufen 0–3
  strength: Strength;
}

export interface EchoResult {
  id: string;
  createdAt: string;
  input: { url: string; description?: string; competitors: string[] };
  pagesRead: { url: string; role: PageRole; title: string }[];
  notes: string[];
  report: ModelReport;
  archetype: {
    name: string | null; // null bei Einseitigkeit (Diagonale)
    primary: Advantage;
    secondary: Advantage;
    primaryText: string;
    secondaryText: string;
    traits: string[];
    onesided: boolean;
  };
  dimensions: DimensionScore[];
  quality: { quotesTotal: number; quotesVerified: number; levelsAdjusted: number };
  model: string;
}

export type JobStatus =
  | { status: "queued" | "running"; step: string; createdAt: string; url: string }
  | { status: "review"; createdAt: string; url: string; result: EchoResult }
  | { status: "done"; createdAt: string; url: string; result: EchoResult }
  | { status: "error"; createdAt: string; url: string; error: string; detail?: string };
