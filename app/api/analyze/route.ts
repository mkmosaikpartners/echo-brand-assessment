import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST() {
  // 1) Fixe Scores (bewusst stabil)
  const baseResult = {
    echo_factor: 62,
    scores: { E: 60, C: 65, H: 58, O: 55 },
    self_image_score: 66,
    digital_effect_score: 58,
    deviation: "medium" as const,
    band: "average" as const,
  };

  // 2) Fallback-Kommentar (falls KI ausfällt)
  let commentary =
    "Dein Auftritt wirkt insgesamt solide und professionell, mit klar erkennbaren Stärken in einzelnen Bereichen. " +
    "Gleichzeitig zeigen sich Spannungen zwischen dem, wie du dich selbst verstehst, und dem Eindruck, der digital entsteht. " +
    "Das ist kein Mangel, sondern ein typisches Zeichen dafür, dass Haltung und Ausdruck noch nicht überall gleich stark zusammenspielen. " +
    "Hier liegt Potenzial, die Wirkung bewusster zu führen und klarer zu bündeln.";

  // 3) KI nur für den Text
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Du bist ein ruhiger, präziser Markenanalyst. Du schreibst in Du-Form, ohne Marketing-Floskeln. " +
            "Beschreibend, reflektiert, nicht belehrend.",
        },
        {
          role: "user",
          content:
            "Formuliere einen kurzen Kommentar (120–150 Wörter) zu einem Brand-Assessment-Ergebnis:\n\n" +
            "- ECHO-Faktor: 62 (durchschnittlich)\n" +
            "- Erlebnis: 60\n" +
            "- Charakter: 65\n" +
            "- Homogenität: 58\n" +
            "- Originalität: 55\n" +
            "- Selbstbild: 66\n" +
            "- Digitale Wirkung: 58\n" +
            "- Abweichung: mittel\n\n" +
            "Der Text soll erklären, wie die Marke aktuell wirkt, wo Spannungen liegen " +
            "und welches Potenzial grundsätzlich vorhanden ist – ohne konkrete Handlungsempfehlungen.",
        },
      ],
    });

    commentary =
      completion.choices[0]?.message?.content?.trim() || commentary;
  } catch (e) {
    // bewusst leer: Fallback bleibt bestehen
  }

  return NextResponse.json({
    ...baseResult,
    commentary,
  });
}
