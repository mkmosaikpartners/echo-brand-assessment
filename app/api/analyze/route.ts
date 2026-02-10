import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { scoreAssessment, avg4 } from "@/lib/score";

export const runtime = "nodejs";

const InputSchema = z.object({
  companyName: z.string().min(1),
  industry: z.string().min(1),
  selfAssessment: z.array(
    z.object({
      questionId: z.string(),
      markers: z.array(z.string()).default([]),
      dependency: z.enum(["yes", "no"]).optional(),
      note: z.string().optional(),
    })
  ),
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

function bandDE(band: "below average" | "average" | "above average") {
  return band === "below average"
    ? "unterdurchschnittlich"
    : band === "above average"
    ? "überdurchschnittlich"
    : "durchschnittlich";
}

function deviationFrom(diff: number): "small" | "medium" | "large" {
  if (diff <= 8) return "small";
  if (diff <= 18) return "medium";
  return "large";
}

function deterministicCommentary(args: {
  companyName: string;
  maturity: string;
  band: string;
  echo: number;
  scores: { E: number; C: number; H: number; O: number };
  deviation: "small" | "medium" | "large";
}) {
  const devLine =
    args.deviation === "small"
      ? "Dein Selbstbild und die Wirkung liegen nahe beieinander."
      : args.deviation === "medium"
      ? "Es gibt erkennbare Spannungen zwischen Selbstbild und Wirkung."
      : "Selbstbild und Wirkung unterscheiden sich deutlich.";

  return (
    `${args.companyName} wirkt aktuell ${args.maturity} geführt. ` +
    `Der ECHO-Faktor liegt bei ${args.echo}/100 (${args.band}). ` +
    `Erlebnis (E=${args.scores.E}) und Charakter (C=${args.scores.C}) tragen die Wirkung, ` +
    `während Homogenität (H=${args.scores.H}) und Originalität (O=${args.scores.O}) nicht durchgängig greifen. ` +
    `${devLine} ` +
    `Das Potenzial liegt im bewussteren Führen dessen, was bereits da ist.`
  );
}

export async function POST(req: Request) {
  try {
    const body = InputSchema.parse(await req.json());

    // 1) EIN Scoring – keine Doppel-Logik
    const scores = scoreAssessment(body.selfAssessment);

    const echo_factor = avg4(scores.E, scores.C, scores.H, scores.O);
    const band = bandFrom(echo_factor);
    const maturity = maturityFrom(echo_factor);

    // aktuell: digitale Wirkung = Self-Assessment
    const self_image_score = echo_factor;
    const digital_effect_score = echo_factor;

    const deviation = deviationFrom(
      Math.abs(self_image_score - digital_effect_score)
    );

    // 2) Kommentar aus API (deterministisch)
    let commentary = deterministicCommentary({
      companyName: body.companyName,
      maturity,
      band: bandDE(band),
      echo: echo_factor,
      scores,
      deviation,
    });

    // Optional: KI veredelt Text
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
                "Ruhig, präzise, Du-Form, keine Ratschläge, keine Floskeln.",
            },
            {
              role: "user",
              content: commentary,
            },
          ],
        });

        const txt = completion.choices[0]?.message?.content?.trim();
        if (txt && txt.length > 60) commentary = txt;
      } catch {
        /* fallback bleibt */
      }
    }

    return NextResponse.json({
      company_name: body.companyName,
      industry: body.industry,
      echo_factor,
      scores,
      self_image_score,
      digital_effect_score,
      deviation,
      band,
      maturity,
      commentary,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "API Error" },
      { status: 500 }
    );
  }
}
