import { NextResponse } from "next/server";

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function POST() {
  // MVP: Dummy-Result, damit du den kompletten Flow testen kannst.
  // Als nächster Schritt ersetzen wir das durch echte Website-Analyse + OpenAI.
  const E = 65, C = 70, H = 55, O = 50;
  const echo = clamp((E + C + H + O) / 4);

  return NextResponse.json({
    echo_factor: echo,
    scores: { E, C, H, O },
    self_image_score: 62,
    digital_effect_score: 54,
    deviation: "medium",
    band: echo < 45 ? "below average" : echo <= 70 ? "average" : "above average",
    commentary:
      "Dein Auftritt wirkt insgesamt professionell und ambitioniert, mit klar erkennbarer Haltung.\n\n" +
      "Gleichzeitig zeigen sich – je nach Kontaktmoment – Spannungen zwischen Selbstbild und digitaler Wirkung. Das ist kein Fehler, sondern ein Hinweis darauf, wo Übersetzung und Konsistenz noch nicht überall gleich stark sind.\n\n" +
      "Das Profil ist da. Das Potenzial liegt darin, dass es in den ersten digitalen Sekunden und im Vergleich zum Umfeld schneller und eindeutiger erkennbar wird.",
  });
}
