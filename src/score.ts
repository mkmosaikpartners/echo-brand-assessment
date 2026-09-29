import { ADVANTAGES, findArchetype, type Advantage } from "./archetypes";
import type { DimensionScore, IndicatorId, IndicatorRating, Strength } from "./types";

export const DIMENSION_INDICATORS: Record<DimensionScore["key"], IndicatorId[]> = {
  E: ["E1", "E2", "E3", "E4"],
  C: ["C1", "C2"],
  H: ["H1", "H2", "H3"],
  O: ["O1", "O2", "O3"],
};

export function strengthOf(value: number): Strength {
  if (value < 0.75) return "fehlt";
  if (value < 1.5) return "behauptet";
  if (value < 2.25) return "erkennbar";
  return "belegt";
}

/** Dimensionswert = Mittel der vorhandenen Indikator-Stufen. H3 zählt nur, wenn es eingestuft wurde. */
export function scoreDimensions(indicators: IndicatorRating[], hasDescription: boolean): DimensionScore[] {
  return (Object.keys(DIMENSION_INDICATORS) as DimensionScore["key"][]).map((key) => {
    const ids = DIMENSION_INDICATORS[key].filter((id) => id !== "H3" || hasDescription);
    const levels = ids
      .map((id) => indicators.find((i) => i.id === id))
      .filter((i): i is IndicatorRating => !!i)
      .map((i): number => clampLevel(i.level));
    const value = levels.length ? round1(levels.reduce((a, b) => a + b, 0) / levels.length) : 0;
    return { key, value, strength: strengthOf(value) };
  });
}

export function clampLevel(n: unknown): 0 | 1 | 2 | 3 {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v < 0) return 0;
  return (v > 3 ? 3 : v) as 0 | 1 | 2 | 3;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Archetyp aus der Matrix; bei doppeltem Vorteil (Diagonale) ohne Namen – als Einseitigkeit. */
export function resolveArchetype(primary: Advantage, secondary: Advantage, traitsInContext?: string[]) {
  const a = findArchetype(primary, secondary);
  const onesided = primary === secondary;
  return {
    name: onesided || !a ? null : a.name,
    primary,
    secondary,
    primaryText: ADVANTAGES[primary],
    secondaryText: ADVANTAGES[secondary],
    traits: traitsInContext && traitsInContext.length === 3 ? traitsInContext : a?.traits ?? [],
    onesided,
  };
}
