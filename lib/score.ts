type Answer = { questionId: string; markers: string[]; note?: string };

export function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function to0_100(x01: number) {
  return Math.round(clamp01(x01) * 100);
}

export function avg4(a: number, b: number, c: number, d: number) {
  return (a + b + c + d) / 4;
}

const INTENT_HINT: Record<string, { E: number; C: number; H: number; O: number }> = {
  clarity: { E: 0.20, C: 0.05, H: 0.10, O: 0.00 },
  reliability: { E: 0.15, C: 0.05, H: 0.10, O: 0.00 },
  competence: { E: 0.10, C: 0.15, H: 0.05, O: 0.00 },
  dialogue: { E: 0.10, C: 0.10, H: 0.05, O: 0.00 },
  efficiency: { E: 0.10, C: 0.05, H: 0.05, O: 0.00 },
  stance: { E: 0.05, C: 0.20, H: 0.05, O: 0.05 },
  human: { E: 0.10, C: 0.15, H: 0.05, O: 0.00 },
  precision: { E: 0.10, C: 0.05, H: 0.15, O: 0.00 },
};

// Mapping der Marker (IDs aus app/page.tsx) auf E/C/H/O
const MARKER_MAP: Record<string, { E: number; C: number; H: number; O: number }> = {
  // Kunde K1
  ClearOrdered: { E: 0.25, C: 0.05, H: 0.20, O: 0.00 },
  CalmSovereign: { E: 0.20, C: 0.10, H: 0.15, O: 0.00 },
  Functional: { E: 0.10, C: 0.05, H: 0.10, O: 0.00 },
  PersonalClose: { E: 0.20, C: 0.15, H: 0.10, O: 0.00 },
  NeedsExplanation: { E: 0.05, C: 0.00, H: 0.05, O: 0.00 },
  HardToGrasp: { E: 0.03, C: 0.00, H: 0.03, O: 0.00 },

  // Kunde K2
  CareResponsible: { E: 0.10, C: 0.15, H: 0.10, O: 0.00 },
  PragmaticSolution: { E: 0.10, C: 0.10, H: 0.10, O: 0.00 },
  Partnership: { E: 0.10, C: 0.15, H: 0.05, O: 0.00 },
  DemandingHighBar: { E: 0.05, C: 0.20, H: 0.05, O: 0.00 },
  Distant: { E: 0.03, C: 0.00, H: 0.03, O: 0.00 },
  Inconsistent: { E: 0.03, C: 0.00, H: 0.02, O: 0.00 },

  // Kunde K3
  VeryConsistent: { E: 0.10, C: 0.05, H: 0.25, O: 0.00 },
  MostlyConsistent: { E: 0.08, C: 0.04, H: 0.18, O: 0.00 },
  ContextDependent: { E: 0.05, C: 0.03, H: 0.10, O: 0.00 },
  Contradictory: { E: 0.03, C: 0.00, H: 0.05, O: 0.00 },

  // Bewerber B1
  Inviting: { E: 0.15, C: 0.10, H: 0.10, O: 0.00 },
  FocusedHighBar: { E: 0.05, C: 0.20, H: 0.05, O: 0.00 },
  Human: { E: 0.10, C: 0.20, H: 0.05, O: 0.00 },
  FormalDistant: { E: 0.05, C: 0.05, H: 0.05, O: 0.00 },
  Generic: { E: 0.05, C: 0.03, H: 0.05, O: 0.00 },
  HardToPlace: { E: 0.03, C: 0.00, H: 0.03, O: 0.00 },

  // Bewerber B2
  TrustResponsibility: { E: 0.10, C: 0.15, H: 0.05, O: 0.00 },
  PerformanceDemand: { E: 0.05, C: 0.20, H: 0.05, O: 0.00 },
  CollaborationClose: { E: 0.10, C: 0.15, H: 0.05, O: 0.00 },
  OrderControl: { E: 0.05, C: 0.05, H: 0.10, O: 0.00 },
  FreedomCreate: { E: 0.10, C: 0.10, H: 0.05, O: 0.05 },
  UnclearContradictory: { E: 0.03, C: 0.00, H: 0.03, O: 0.00 },

  // Bewerber B3
  VeryAligned: { E: 0.10, C: 0.10, H: 0.20, O: 0.00 },
  MostlyAligned: { E: 0.08, C: 0.08, H: 0.14, O: 0.00 },
  Tension: { E: 0.05, C: 0.05, H: 0.08, O: 0.00 },
  Unclear: { E: 0.03, C: 0.00, H: 0.03, O: 0.00 },

  // Branche R1
  ClearlyPositioned: { E: 0.10, C: 0.15, H: 0.10, O: 0.10 },
  SolidExpected: { E: 0.08, C: 0.08, H: 0.10, O: 0.05 },
  AmbitiousNotSharp: { E: 0.08, C: 0.10, H: 0.08, O: 0.06 },
  Distinct: { E: 0.08, C: 0.10, H: 0.08, O: 0.12 },
  HardToPlace2: { E: 0.03, C: 0.00, H: 0.03, O: 0.00 },
  Contradictory2: { E: 0.03, C: 0.00, H: 0.03, O: 0.00 },

  // Branche R2
  HighlyDistinct: { E: 0.05, C: 0.10, H: 0.05, O: 0.22 },
  PartlyDistinct: { E: 0.05, C: 0.08, H: 0.05, O: 0.14 },
  IndustryTypical: { E: 0.05, C: 0.05, H: 0.05, O: 0.08 },
  BarelyDistinct: { E: 0.03, C: 0.03, H: 0.03, O: 0.03 },

  // Branche R3
  ConsciousDecisions: { E: 0.05, C: 0.10, H: 0.10, O: 0.05 },
  GrownPractice: { E: 0.05, C: 0.08, H: 0.08, O: 0.05 },
  SingleInitiatives: { E: 0.03, C: 0.05, H: 0.05, O: 0.03 },
  ChanceHistory: { E: 0.02, C: 0.02, H: 0.03, O: 0.02 },
};

export function scoreSelfAssessment(args: { intentPicks: string[]; answers: Answer[] }) {
  let E = 0, C = 0, H = 0, O = 0;

  for (const p of args.intentPicks || []) {
    const w = INTENT_HINT[p];
    if (!w) continue;
    E += w.E; C += w.C; H += w.H; O += w.O;
  }

  for (const a of args.answers || []) {
    for (const m of a.markers || []) {
      const w = MARKER_MAP[m];
      if (!w) continue;
      E += w.E; C += w.C; H += w.H; O += w.O;
    }
  }

  // Normalisierung grob auf 0..1
  // (Wir halten es absichtlich robust statt „mathematisch perfekt“)
  const norm = 2.4; // passt grob für „ein paar Marker“
  const e01 = clamp01(E / norm);
  const c01 = clamp01(C / norm);
  const h01 = clamp01(H / norm);
  const o01 = clamp01(O / norm);

  return {
    E: to0_100(e01),
    C: to0_100(c01),
    H: to0_100(h01),
    O: to0_100(o01),
  };
}
