import { NextResponse } from "next/server";
import OpenAI from "openai";

function clamp(v: number) {
  return Math.max(0, Math.min(100, v));
}

function maturityFrom(score: number) {
  if (score < 50) return "implizit";
  if (score < 70) return "bewusst";
  return "intentional & geführt";
}

export async function POST() {
  // Basiswerte aus Schritt 2
  let E = 60;
  let C = 65;
  let H = 58;
  let O = 55;

  const self_image_score = 66;

  // Digitale Wirkung
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

  const maturity = maturityFrom(echo_factor);

  // Fallback-Kommentar (sehr wichtig)
  let commentary =
    `Deine Marke wirkt aktuell ${maturity} geführt. Das heisst, vieles funktioniert bereits aus einer klaren Haltung heraus, ` +
    `ohne dass Wirkung überall explizit gesteuert wird.\n\n` +
    `Aus Kundensicht entsteht ein insgesamt verlässlicher und professioneller Eindruck, ` +
    `der Vertrauen schafft, aber nicht in jedem Moment klar führt.\n` +
    `Bewerber nehmen ein solides, jedoch eher zurückhaltendes Profil wahr, bei dem Haltung spürbar, ` +
    `aber nicht durchgängig formuliert ist.\n` +
    `Branchenkenner erkennen Substanz und Erfahrung, gleichzeitig bleibt die Unterscheidung zu vergleichbaren Anbietern punktuell unscharf.\n\n` +
    `Genau hier liegt Potenzial: nicht im Neu-Erfinden, sondern im bewussteren Führen dessen, was bereits da ist.`;

  // KI formuliert Reifegrad + Aussenwahrnehmung + Vergleich
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
            "Du bist ein erfahrener Markenstratege. Du schreibst in Du-Form, ruhig, präzise, ohne Floskeln. " +
            "Du erklärst Reifegrad, Aussenwahrnehmung (Kunde, Bewerber, Branche) und relative Einordnung zu Mitbewerbern. " +
            "Keine Tipps, keine To-dos.",
        },
        {
          role: "user",
          content:
            `ECHO-Ergebnis:\n` +
            `E=${E}, C=${C}, H=${H}, O=${O}\n` +
            `ECHO-Faktor=${echo_factor} (${band})\n` +
            `Selbstbild=${self_image_score}, Digitale Wirkung=${digital_effect_score}, Abweichung=${deviation}\n\n` +
            `Reifegrad-Logik:\n` +
            `- implizit = Wirkung entsteht zufällig oder historisch\n` +
            `- bewusst = Wirkung wird verstanden, aber nicht durchgehend geführt\n` +
            `- intentional & geführt = Wirkung ist klar definiert und konsistent umgesetzt\n\n` +
            `Formuliere einen Kommentar (150–200 Wörter), der:\n` +
            `1) den Reifegrad einordnet,\n` +
            `2) beschreibt, wie die Marke auf Kunden, Bewerber und Branchenkenner wirkt,\n` +
            `3) die Position im Vergleich zu typischen Mitbewerbern beschreibt,\n` +
            `4) Potenzial aufzeigt, ohne konkret zu werden.`,
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
    maturity,
    commentary,
  });
}
