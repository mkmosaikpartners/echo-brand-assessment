export function buildCommentary({
  companyName,
  scores,
  dependencyRate,
}: {
  companyName: string;
  scores: { E: number; C: number; H: number; O: number };
  dependencyRate: number;
}) {
  let lines = [];

  if (scores.H < scores.C && dependencyRate > 0.4) {
    lines.push(
      "Die Wirkung ist stark personen- oder situationsabhängig. Wo einzelne Persönlichkeiten tragen, entsteht hohe Qualität – wo sie fehlen, wird Haltung weniger klar übersetzt."
    );
  }

  lines.push(
    "Das Potenzial liegt nicht im Neu-Erfinden, sondern im bewussteren Führen dessen, was bereits da ist."
  );

  return lines.join("\n\n");
}
