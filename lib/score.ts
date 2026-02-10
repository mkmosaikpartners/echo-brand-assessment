// lib/score.ts
// Zentrale Scoring-Logik für ECHO
// Regeln als Daten, keine UI-Logik, keine Snippets

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
 * Marker-Regeln
 * Alle Marker, die im UI vorkommen, müssen hier existieren.
 */
export const MARKER_RULES: Record<string, ScoreDelta> = {
  // Erlebnis / Klarheit
  "klar & geordnet": { E: 0.25, C: 0.05, H: 0.20, O: 0.0 },
  "ruhig & souverän": { E: 0.20, C: 0.10, H: 0.15, O: 0.0 },
  "sachlich & funktional": { E: 0.10, C: 0.05, H: 0.10, O: 0.0 },
  "persönlich & nah": { E: 0.20, C: 0.15, H: 0.10, O: 0.0 },
  "schwer greifbar": { E: 0.05, C: 0.0, H: 0.05, O: 0.0 },

  // Charakter / Haltung
  "partnerschaftlich": { E: 0.10, C: 0.15, H: 0.05, O: 0.0 },
  "anspruchsvoll & fordernd": { E: 0.05, C: 0.20, H: 0.05, O: 0.0 },
  "sorgfältig & verantwortungsvoll": { E: 0.10, C: 0.15, H: 0.10, O: 0.0 },
  "distanziert": { E: 0.05, C: 0.05, H: 0.05, O: 0.0 },

  // Homogenität
  "sehr konsistent": { E: 0.10, C: 0.05, H: 0.25, O: 0.0 },
  "meist konsistent": { E: 0.08, C: 0.04, H: 0.18, O: 0.0 },
  "situationsabhängig": { E: 0.05, C: 0.03, H: 0.10, O: 0.0 },
  "eher widersprüchlich": { E: 0.03, C: 0.0, H: 0.05, O: 0.0 },

  // Originalität
  "klar positioniert": { E: 0.10, C: 0.15, H: 0.10, O: 0.10 },
  "solide & erwartet": { E: 0.08, C: 0.08, H: 0.10, O: 0.05 },
  "ambitioniert, aber nicht durchgängig": {
    E: 0.05,
    C: 0.10,
    H: -0.10,
    O: 0.05,
  },
  "schwer einzuordnen": { E: 0.03, C: 0.0, H: 0.03, O: 0.0 },
};

/**
 * Dependency-Regel
 * Personen- / Standortabhängigkeit reduziert Homogenität leicht
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
 * Normalisierung auf 0–100
 * Verhindert Ballung um 60
 */
function normalize(total: ScoreDelta): ScoreDelta {
  const MAX = 2.2;

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
 * Zentrale Bewertung
 */
export function scoreAssessment(answers: AssessmentAnswer[]): ScoreDelta {
  let total: ScoreDelta = { E: 0, C: 0, H: 0, O: 0 };

  for (const a of answers) {
    for (const m of a.markers) {
      const rule = MARKER_RULES[m];
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
 * Hilfsfunktion
 */
export function avg4(E: number, C: number, H: number, O: number) {
  return Math.round((E + C + H + O) / 4);
}
