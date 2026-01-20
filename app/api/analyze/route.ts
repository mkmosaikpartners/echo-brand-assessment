import { NextResponse } from "next/server";
import OpenAI from "openai";

function clamp(v: number) {
  return Math.max(0, Math.min(100, v));
}

export async function POST() {
  // 1) Basis-Scores (dein bestehendes Modell)
  let E = 60;
  let C = 65;
  let H = 58;
  let O = 55;

  const self_image_score = 66;

  // 2) KI-gestützte Feinjustierung
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Du bist ein Brand-Analyst. Du justierst bestehende Scores vorsichtig. " +
            "Du veränderst Werte nur leicht (max. ±8). Du antwortest ausschließlich als JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            scores: { E, C, H, O },
            context:
              "Digitale Markenwirkung eines KMU. Bitte prüfe, ob einzelne Dimensionen " +
              "leicht stärker oder schwächer wirken könnten. Keine starken Ausschläge.",
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (raw) {
      const adj = JSON.parse(raw);
      if (adj.E !== undefined) E = clamp(E + adj.E);
      if (adj.C !== undefined) C = clamp(C + adj.C);
      if (adj.H !== undefined) H = clamp(H + adj.H);
      if (adj.O !== undefined) O = clamp(O + adj.O);
    }
  } catch (e) {
    // falls KI ausfällt: Basiswerte bleiben bestehen
  }

  // 3) Abgeleitete Werte
  const digital_effect_score = Math.round((E + C + H + O) / 4);
  const echo_factor = digital_effect_score;

  const diff = Math.abs(self_image_score - digital_effect_score);
  const deviation =
    diff < 8 ? "small" : diff < 18 ? "medium" : "large";

  const band =
    echo_factor < 45
      ? "below average"
      : echo_factor > 70
      ? "above average"
      : "average";

  // 4) Kommentar (KI, aber sicher)
  let commentary =
    "Dein Auftritt wirkt insgesamt konsistent und professionell. " +
    "In der digitalen Wirkung zeigen sich jedoch feine Unterschiede zwischen Anspruch und Ausdruck. " +
    "Das betrifft weniger einzelne Inhalte als das Zusammenspiel von Tonalität, Struktur und Wiedererkennbarkeit. " +
    "Hier liegt Potenzial, die vorhandene Substanz klarer zu bündeln und bewusster zu führen.";

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
            "Du schreibst einen ruhigen, reflektierten Markenkommentar in Du-Form. " +
            "Keine Floskeln, keine Tipps, keine To-dos.",
        },
        {
          role: "user",
          content:
            `ECHO-Ergebnis:\n` +
            `E=${E}, C=${C}, H=${H}, O=${O}\n` +
            `Selbstbild=${self_image_score}, Digitale Wirkung=${digital_effect_score}\n\n` +
            `Formuliere einen Kommentar (120–150 Wörter), der Wirkung, Spannungen und Potenzial beschreibt.`,
        },
      ],
    });

    commentary =
      completion.choices[0]?.message?.content?.trim() || commentary;
  } catch (e) {}

  return NextResponse.json({
    echo_factor,
    scores: { E, C, H, O },
    self_image_score,
    digital_effect_score,
    deviation,
    band,
    commentary,
  });
}
