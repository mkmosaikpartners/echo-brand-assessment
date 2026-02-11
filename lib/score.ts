// lib/score.ts
// Robustes ECHO-Scoring – tolerant gegenüber UI-Strings

export type ScoreDelta = {
  E: number;
  C: number;
  H: number;
  O: number;
};

export type AssessmentAnswer = {
  questionId: string;
  markers: string[];
  dependency?: "yes" | "no";
};

/**
 * String-Normalisierung
 * macht das System tolerant gegen:
 * - Gross-/Kleinschreibung
 * - zusätzliche Leerzeichen
 */
function norm(s: string) {
  return s?.toLowerCase().trim();
}

/**
 * Zentrale Marker-Regeln
 * ➜ bewusst generisch, damit sie zu deiner UI passen
 */
const MARKER_RULES: Record<string, ScoreDelta> = {
  // Erlebnis
  "klarheit & orientierung": { E: 0.25, C: 0.05, H: 0.15, O: 0.05 },
  "verlässlichkeit & ruhe": { E: 0.20, C: 0.10, H: 0.15, O: 0.00 },
  "kompetenz & anspruch": { E: 0.15, C: 0.20, H: 0.10, O: 0.05 },
  "nähe & dialog": { E: 0.20, C: 0.15, H: 0.10, O: 0.00 },
  "effizienz & tempo": { E: 0.15, C: 0.10, H: 0.10, O: 0.05 },

  // Charakter
  "eigenständigkeit & haltung": { E: 0.10, C: 0.25, H: 0.10, O: 0.10 },
  "menschlichkeit & fürsorge": { E: 0.15, C: 0.20, H: 0.10, O: 0.05 },
  "präzision & sorgfalt": { E: 0.10, C: 0.15, H: 0.20, O: 0.05 },

  // Meta (Ruth-Feedback)
  "ambitioniert, aber nicht durchgängig": {
    E: 0.05,
    C: 0.10,
    H: -0.12,
    O: 0.08,
  },
};

/**
 * Dependency-Regel
 * Personen-/Standortabhängigkeit reduziert Homogenität leicht
 */
function applyDependencyPenalty(
  score: ScoreDelta,
  dependency?: "yes" | "no"
): ScoreDelta {
  if (dependency === "yes") {
    return { ...score, H: score.H - 0.08 };
  }
  return score;
}

/**
 * Normalisierung
 * verhindert 60er-Ballung
 */
function normalize(total: ScoreDelta): ScoreDelta {
  const MAX = 2.5; // bewusst etwas höher für bessere Streuung

  const clamp = (v: number) =>
    Math.max(0, Math.min(100, Math.round((v / MAX) * 100)));

  return {
    E: clamp(total.E),
    C: clamp(total.C),
    H: clamp(total.H),
    O: clamp(total.O),
  };
}

/**
 * Zentrale Berechnung
 */
export function scoreAssessment(answers: AssessmentAnswer[]): ScoreDelta {
  let total: ScoreDelta = { E: 0, C: 0, H: 0, O: 0 };

  for (const a of answers || []) {
    for (const m of a.markers || []) {
      const key = norm(m);
      const rule = MARKER_RULES[key];

      if (!rule) continue;

      const adjusted = applyDependencyPenalty(rule, a.dependency);

      total.E += adjusted.E;
      total.C += adjusted.C;
      total.H += adjusted.H;
      total.O += adjusted.O;
    }
  }

  return normalize(total);
}

/**
 * Durchschnitt
 */
export function avg4(E: number, C: number, H: number, O: number) {
  return Math.round((E + C + H + O) / 4);
}
