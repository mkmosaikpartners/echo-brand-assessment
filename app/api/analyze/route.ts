import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { scrapeWebsite } from "@/lib/scrape";

export const runtime = "nodejs";

const InputSchema = z.object({
  companyName: z.string().min(1),
  industry: z.string().min(1),
  url: z.string().url(),
  selfNote: z.string().optional().default(""),
});

const OutputSchema = z.object({
  position_statement: z.string(),
  assessment: z.string(),
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
  wording_signals: z.array(z.string()).min(2).max(4),
  echo_impulses: z.object({
    E: z.string(),
    C: z.string(),
    H: z.string(),
    O: z.string(),
  }),
  executive_implication: z.string(),
});

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calibrate(value: number) {
  // Solide Firmen nicht abstrafen, echte Ausreisser aber zulassen
  if (value < 40) return clamp(value + 8);
  if (value < 55) return clamp(value + 10);
  if (value < 70) return clamp(value + 9);
  if (value < 80) return clamp(value + 6);
  return clamp(value + 2);
}

function average(values: number[]) {
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
Du bist ein strategischer Markenanalyst und erstellst eine Dritteinschätzung anhand des ECHO-Modells.
ECHO ist eine Methode, Identität greifbar zu machen. Digital ist dabei ein Beobachtungsraum, nicht die ganze Identität.

Beurteile die Firma RELATIV zur Branche "${input.industry}".
Keine expliziten Mitbewerber werden gegeben. Nutze implizite Branchenstandards.

E = Erlebnis
Wird Identität in Kontaktmomenten spürbar, orientierend und verständlich?

C = Charakter
Ist Haltung, Perspektive und Selbstverständnis klar erkennbar?

H = Homogenität
Ist diese Identität konsistent über Seiten und Kontexte hinweg oder wirkt sie situativ / personenabhängig?

O = Originalität
Ist Differenzierung strukturell sichtbar oder bleibt der Auftritt branchenüblich?

WICHTIG:
- Executive-Tonalität
- Keine Floskeln
- Keine generische KI-Sprache
- Keine Checklisten
- Keine operative Beratung
- Aber: pro Buchstabe E/C/H/O ein kurzer Impuls
- Verwende 2–4 Begriffe, Formulierungen oder semantische Signale aus der Website selbst als Beleg
- Wenn passend, benenne Spannungen wie:
  - ambitioniert, aber nicht durchgängig umgesetzt
  - Anspruch erkennbar, aber nicht verdichtet
  - personen- / situationsabhängige Konsistenz
- Es ist eine Momentaufnahme

Score-Logik:
- solide investierende Firmen oft im Bereich 70–82
- über 85 nur bei klarer Führung + Verdichtung + Differenzierung
- unter 50 nur bei echter Schwäche oder Inkonsistenz

Firma: ${input.companyName}
Branche: ${input.industry}
Optionale Selbstnotiz:
${input.selfNote || "(keine)"}

Analysierte Seiten:
${JSON.stringify(pages, null, 2)}

Gib NUR JSON zurück in exakt diesem Format:
{
  "position_statement": "ein präziser Satz",
  "assessment": "120–220 Wörter, substanziell, etwas ausführlicher als nur ein Satz",
  "scores": {
    "E": number,
    "C": number,
    "H": number,
    "O": number
  },
  "maturity": "implizit" | "bewusst" | "intentional & geführt",
  "industry_positioning": "unterdurchschnittlich" | "durchschnittlich" | "überdurchschnittlich" | "führend",
  "tensions": ["...", "...", "..."],
  "wording_signals": ["...", "...", "..."],
  "echo_impulses": {
    "E": "ein Satz",
    "C": "ein Satz",
    "H": "ein Satz",
    "O": "ein Satz"
  },
  "executive_implication": "ein etwas längerer Satz oder zwei Sätze"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: "Du antwortest ausschliesslich mit gültigem JSON. Keine Markdown-Formatierung.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Die KI hat kein gültiges JSON geliefert." },
        { status: 500 }
      );
    }

    const result = OutputSchema.parse(parsed);

    const scores = {
      E: calibrate(result.scores.E),
      C: calibrate(result.scores.C),
      H: calibrate(result.scores.H),
      O: calibrate(result.scores.O),
    };

    const echoFactor = average([
      scores.E,
      scores.C,
      scores.H,
      scores.O,
    ]);

    return NextResponse.json({
      company_name: input.companyName,
      industry: input.industry,
      url: input.url,
      pages_analyzed: pages.map((p) => p.url),

      position_statement: result.position_statement,
      assessment: result.assessment,
      scores,
      echo_factor: echoFactor,
      maturity: result.maturity,
      industry_positioning: result.industry_positioning,
      tensions: result.tensions,
      wording_signals: result.wording_signals,
      echo_impulses: result.echo_impulses,
      executive_implication: result.executive_implication,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Analyse fehlgeschlagen." },
      { status: 500 }
    );
  }
}
