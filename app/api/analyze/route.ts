import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({
    echo_factor: 60,
    scores: { E: 65, C: 70, H: 55, O: 50 },
    self_image_score: 62,
    digital_effect_score: 54,
    deviation: "medium",
    band: "average",
    commentary: "Beispielantwort der API."
  });
}
