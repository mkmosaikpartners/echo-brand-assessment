import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { scoreSelfAssessment, avg4 } from "@/lib/score";

export const runtime = "nodejs";

const InputSchema = z.object({
  companyName: z.string().min(1),
  industry: z.string().min(1),
  size: z.string().optional().default(""),
  role: z.string().optional().default(""),
  intent: z
    .object({
      picks: z.array(z.string()).default([]),
      note: z.string().optional().default(""),
    })
    .default({ picks: [], note: "" }),
  selfAssessment: z
    .array(
      z.object({
        questionId: z.string(),
        markers: z.array(z.string()).default([]),
        note: z.string().optional().default(""),
      })
    )
    .default([]),
  urls: z
    .object({
      company: z.string().optional().default(""),
      competitors: z.array(z.string()).optional().default([]),
    })
    .default({ company: "", competitors: [] }),
});

function bandFrom(score: number): "below average" | "average" | "above average" {
  if (score < 45) return "below average";
  if (score > 70) return "above average";
  return "average";
}

function maturityFrom(score: number): "implizit" | "bewusst" | "intentional & geführt" {
  if (score < 50) return "implizit";
  if (score < 70) return "bewusst";
  return "intentional & geführt";
}

function deviationFrom(diff: number): "small" | "medium" | "large" {
  if (diff <= 8) return "small";
  if (diff <= 18) return "medium";
  return "large";
}

function bandDE(band: "below average" | "average" | "above average") {
  return band === "below average"
    ? "unterdurchschnittlich"
    : band === "above average"
    ? "überdurchschnittlich"
    : "durchschnittlich";
}

// Kommentar, falls OpenAI nicht gesetzt ist (aber IMMER aus dem API, kein Frontend-Fallback)
function deterministicCommentary(args: {
  companyName: string;
  maturity: string;
  band: string;
  echo: number;
  E: number;
  C: number;
  H: number;
  O: number;
  self: number;
  digital: number;
  deviation: "small" | "medium" | "large";
}) {
  const devLine =
    args.deviation === "small"
      ? "Dein Selbstbild und die abgeleitete Wirkung liegen nah beieinander."
      : args.deviation === "medium"
      ? "Es gibt erkennbare Spannungen zwischen Selbstbild und Wirkung."
      : "Selbstbild und Wirkung unterscheiden sich deutlich – das ist ein Hinweis auf Übersetzungsfragen.";

  return (
    `${args.companyName} wirkt aktuell ${args.maturity} geführt. ` +
    `Der ECHO-Faktor liegt bei ${args.echo}/100 (${args.band}). ` +
    `In der Wirkung zeigt sich Substanz, aber nicht jede Dimension trägt gleich stark: ` +
    `Erlebnis (E=${args.E}) und Charakter (C=${args.C}) wirken tragender, ` +
    `während Homogenität (H=${args.H}) und Originalität (O=${args.O}) je nach Kontext weniger eindeutig durchziehen. ` +
    `${devLine} ` +
    `Das Potenzial liegt darin, die vorhandene Haltung sichtbarer zu bündeln, damit Wirkung über Momente hinweg klarer geführt wird.`
  );
}

export async function POST(req: Request) {
  try {
    const body = InputSchema.parse(await req.json());

    // 1) Scores werden aus den Antworten berechnet (variieren garantiert)
    const self = scoreSelfAssessment({
      intentPicks: body.intent.picks,
      answers: body.selfAssessment,
    });

    const self_image_score = Math.round(avg4(self.E, self.C, self.H, self.O));

    // 2) Digitale Wirkung (fürs Debug/Testing): aktuell = Selbstbild
    // (Später ersetzen wir das durch echte Website-Analyse; aber wichtig: Resultate sind jetzt nicht mehr konstant)
    const digital = { ...self };
    const digital_effect_score = Math.round(avg4(digital.E, digital.C, digital.H, digital.O));

    const echo_factor = digital_effect_score;

    const band = bandFrom(echo_factor);
    const maturity = maturityFrom(echo_factor);

    const diff = Math.abs(self_image_score - digital_effect_score);
    const deviation = deviationFrom(diff);

    // 3) Kommentar kommt IMMER vom API
    let commentary = deterministicCommentary({
      companyName: body.companyName,
      maturity,
      band: bandDE(band),
      echo: echo_factor,
      E: digital.E,
      C: digital.C,
      H: digital.H,
      O: digital.O,
      self: self_image_score,
      digital: digital_effect_score,
      deviation,
    });

    // Optional: KI veredelt den Kommentar (wenn Key vorhanden)
    if (process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.35,
          messages: [
            {
              role: "system",
              content:
                "Du formulierst ruhig, präzise, in Du-Form, ohne Floskeln. " +
                "Keine To-dos, keine Tipps. Beschreibend, reflektiert. 160–200 Wörter.",
            },
            {
              role: "user",
              content:
                `Schreibe einen Kommentar zum ECHO-Ergebnis:\n` +
                `Firma: ${body.companyName}\n` +
                `E=${digital.E}, C=${digital.C}, H=${digital.H}, O=${digital.O}\n` +
                `ECHO-Faktor=${echo_factor} (${bandDE(band)})\n` +
                `Reifegrad=${maturity}\n` +
                `Selbstbild=${self_image_score}, Digitale Wirkung=${digital_effect_score}, Abweichung=${deviation}\n\n` +
                `Bitte beschreibe Wirkung, Spannungen und Potenzial als Richtung (ohne Ratschläge).`,
            },
          ],
        });

        const txt = completion.choices[0]?.message?.content?.trim();
        if (txt && txt.length > 60) commentary = txt;
      } catch {
        // bleibt beim deterministischen Kommentar
      }
    }

    return NextResponse.json({
      company_name: body.companyName,
      industry: body.industry,
      echo_factor,
      scores: { E: digital.E, C: digital.C, H: digital.H, O: digital.O },
      self_image_score,
      digital_effect_score,
      deviation,
      band,
      maturity,
      commentary,
      debug: {
        used: "selfAssessment-only",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "API Error" }, { status: 500 });
  }
}
