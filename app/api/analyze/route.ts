import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    echo_factor: 62,
    scores: { E: 60, C: 65, H: 58, O: 55 },
    self_image_score: 66,
    digital_effect_score: 58,
    deviation: "medium",
    band: "average",
    commentary:
      "Das ist ein Test-Ergebnis. Wenn du das siehst, funktioniert der gesamte Ablauf: Test → Auswerten → Ergebnis. Die KI-Analyse aktivieren wir als nächsten Schritt.",
  });
}
