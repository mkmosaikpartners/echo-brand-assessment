import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { scrapeWebsite } from "@/lib/scrape";

const InputSchema = z.object({
  companyName: z.string().min(1),
  industry: z.string().min(1),
  url: z.string().url(),
  selfNote: z.string().optional().default(""),
});

const OutputSchema = z.object({
  position_statement: z.string(),
  scores: z.object({
    E: z.number(),
    C: z.number(),
    H: z.number(),
    O: z.number(),
  }),
  maturity: z.enum(["implizit", "bewusst", "intentional & geführt"]),
  industry_positioning: z.enum([
    "unterdurchschnittlich",
    "durchschnittlich",
    "überdurchschnittlich",
    "führend",
  ]),
  tensions: z.array(z.string()).length(3),
  executive_implication: z.string(),
});

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calibrate(value: number) {
  // milde Executive-Kalibrierung:
  // solide Firmen landen eher im 70er-Bereich, Ausreisser bleiben möglich
  if (value < 50) return clamp(value + 8);
  if (value < 65) return clamp(value + 10);
  if (value < 80) return clamp(value + 7);
  return clamp(value + 3);
}

function avg(values: number[]) {
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY fehlt in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const input = InputSchema.parse(await req.json());

    const pages = await scrapeWebsite(input.url);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
Du bist ein strategischer Markenanalyst.

Du erstellst eine Dritteinschätzung anhand der ECHO-Methode.
ECHO ist eine Methode, Identität greifbar zu machen.

E = Erlebnis
Wird Identität in Kontaktmomenten spürbar, verständlich und orientierend?

C = Charakter
Ist Haltung, Perspektive und Selbstverständnis klar erkennbar?

H = Homogenität
Ist diese Identität systemisch konsistent oder wirkt sie situativ / personenabhängig?

O = Originalität
Ist Differenzierung strukturell sichtbar oder eher austauschbar?

WICHTIG:
- Beurteile relativ zur Branche: ${input.industry}
- Keine Floskeln
- Keine To-dos
- Keine Beratungssprache
- Executive-Tonalität
- Es ist eine Momentaufnahme
- Branchenübliche Firmen sollen oft im 70er-Bereich landen
- Deutlich schwache Fälle dürfen unter 50 fallen
- Sehr starke Fälle dürfen über 85 liegen

Falls passend, integriere Spannungen wie:
- ambitioniert, aber nicht durchgängig umgesetzt
- personen-/standortabhängige Inkonsistenz
- Anspruch erkennbar, aber Differenzierung nicht verdichtet

Firma: ${input.companyName}
Branche: ${input.industry}
Optionale Kurznotiz:
${input.selfNote || "(keine)"}

Analysierte Seiten:
${JSON.stringify(pages, null, 2)}

Gib NUR JSON zurück in exakt diesem Format:
{
  "position_statement": "string",
  "scores": {
    "E": number,
    "C": number,
    "H": number,
    "O": number
  },
  "maturity": "implizit" | "bewusst" | "intentional & geführt",
  "industry_positioning": "unterdurchschnittlich" | "durchschnittlich" | "überdurchschnittlich" | "führend",
  "tensions": ["string", "string", "string"],
  "executive_implication": "string"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: "Du antwortest ausschliesslich mit gültigem JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Die KI hat kein gültiges JSON geliefert." },
        { status: 500 }
      );
    }

    const result = OutputSchema.parse(parsed);

    const calibratedScores = {
      E: calibrate(result.scores.E),
      C: calibrate(result.scores.C),
      H: calibrate(result.scores.H),
      O: calibrate(result.scores.O),
    };

    const echoFactor = avg([
      calibratedScores.E,
      calibratedScores.C,
      calibratedScores.H,
      calibratedScores.O,
    ]);

    return NextResponse.json({
      company_name: input.companyName,
      industry: input.industry,
      url: input.url,
      pages_analyzed: pages.map((p) => p.url),

      position_statement: result.position_statement,
      scores: calibratedScores,
      echo_factor: echoFactor,
      maturity: result.maturity,
      industry_positioning: result.industry_positioning,
      tensions: result.tensions,
      executive_implication: result.executive_implication,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Analyse fehlgeschlagen." },
      { status: 500 }
    );
  }
}
