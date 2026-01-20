import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeSchema } from "@/lib/schema";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import { scrapeUrl } from "@/lib/scrape";
import { scoreSelfAssessment, clamp01, to0_100, avg4 } from "@/lib/score";

import OpenAI from "openai";

export const runtime = "nodejs";

const InputSchema = z.object({
  companyName: z.string().min(1),
  industry: z.string().min(1),
  size: z.string().optional(),
  role: z.string().optional(),
  intent: z.object({
    picks: z.array(z.string()).default([]),
    note: z.string().optional().default(""),
  }),
  selfAssessment: z.array(
    z.object({
      questionId: z.string(),
      markers: z.array(z.string()).default([]),
      note: z.string().optional().default(""),
    })
  ),
  urls: z.object({
    company: z.string().url(),
    competitors: z.array(z.string().url()).length(3),
  }),
});

function bandFrom(n: number): "below average" | "average" | "above average" {
  if (n < 45) return "below average";
  if (n <= 70) return "average";
  return "above average";
}

function deviationFrom(diff: number): "small" | "medium" | "large" {
  if (diff <= 8) return "small";
  if (diff <= 18) return "medium";
  return "large";
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const input = InputSchema.parse(json);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY fehlt (Vercel → Settings → Environment Variables)." },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_MODEL || "gpt-5";

    // 1) Selbstbild score (heuristisch, schnell & stabil)
    const self = scoreSelfAssessment({
      intentPicks: input.intent.picks,
      answers: input.selfAssessment,
    });
    const self_image_score = Math.round(avg4(self.E, self.C, self.H, self.O));

    // 2) Websites scrapen (eigene + 3 Mitbewerber)
    const [own, c1, c2, c3] = await Promise.all([
      scrapeUrl(input.urls.company),
      scrapeUrl(input.urls.competitors[0]),
      scrapeUrl(input.urls.competitors[1]),
      scrapeUrl(input.urls.competitors[2]),
    ]);

    // 3) KI: digitale Wirkung beurteilen (ECHO)
    const system = buildSystemPrompt();
    const user = buildUserPrompt({
      company: {
        name: input.companyName,
        industry: input.industry,
        url: input.urls.company,
        extracted: own,
      },
      competitors: [
        { url: input.urls.competitors[0], extracted: c1 },
        { url: input.urls.competitors[1], extracted: c2 },
        { url: input.urls.competitors[2], extracted: c3 },
      ],
      intent: input.intent,
      selfScore: self,
      role: input.role || "",
      size: input.size || "",
    });

    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.25,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      // Wir erwarten JSON
      response_format: { type: "json_object" } as any,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = analyzeSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "KI-Antwort war nicht im erwarteten Format.", details: parsed.error.flatten() },
        { status: 500 }
      );
    }

    const digital = parsed.data.digital;
    const digital_effect_score = Math.round(avg4(digital.E, digital.C, digital.H, digital.O));

    // 4) ECHO-Faktor (wir nehmen digital als „Realitäts-Anker“)
    const echo_factor = digital_effect_score;

    // 5) Abweichung + kurzer Kommentar-Add-on
    const diff = Math.abs(self_image_score - digital_effect_score);
    const deviation = deviationFrom(diff);
    const band = bandFrom(echo_factor);

    const deviationLine =
      deviation === "small"
        ? "Dein Selbstbild und der digitale Eindruck liegen nahe beieinander."
        : deviation === "medium"
        ? "Es gibt erkennbare Spannungen zwischen Selbstbild und digitaler Wirkung."
        : "Selbstbild und digitaler Eindruck unterscheiden sich deutlich – das ist ein Hinweis auf Übersetzungsfragen.";

    const commentary =
      (parsed.data.commentary?.trim() || "") +
      (parsed.data.commentary?.trim() ? "\n\n" : "") +
      deviationLine;

    return NextResponse.json({
      echo_factor,
      scores: {
        E: digital.E,
        C: digital.C,
        H: digital.H,
        O: digital.O,
      },
      self_image_score,
      digital_effect_score,
      deviation,
      band,
      commentary,
      debug: {
        own: { title: own.title, chars: own.text.length },
        competitors: [
          { title: c1.title, chars: c1.text.length },
          { title: c2.title, chars: c2.text.length },
          { title: c3.title, chars: c3.text.length },
        ],
      },
    });
  } catch (e: any) {
    const msg = e?.message || "Unbekannter Fehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
