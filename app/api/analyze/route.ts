import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export const runtime = "nodejs";

const InputSchema = z.object({
  companyName: z.string().min(1),
  industry: z.string().min(1),
  url: z.string().url(),
  // Optional: knappe Selbstbeschreibung (hilft Executive-Relevanz, ohne Self-Assessment-Overkill)
  selfNote: z.string().optional().default(""),
});

function sameOriginLinks(baseUrl: string, html: string) {
  const out: string[] = [];
  try {
    const base = new URL(baseUrl);
    const dom = new JSDOM(html);
    const as = Array.from(dom.window.document.querySelectorAll("a[href]")) as HTMLAnchorElement[];

    for (const a of as) {
      const href = (a.getAttribute("href") || "").trim();
      if (!href) continue;
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) continue;

      let u: URL | null = null;
      try {
        u = new URL(href, base);
      } catch {
        continue;
      }
      if (u.origin !== base.origin) continue;

      // nur "normale" Seiten
      if (/\.(pdf|jpg|jpeg|png|webp|svg|zip)$/i.test(u.pathname)) continue;

      // duplikate vermeiden
      const clean = u.toString().split("#")[0];
      out.push(clean);
    }
  } catch {
    // ignore
  }

  // uniq
  return Array.from(new Set(out));
}

function pickRelevantLinks(urls: string[]) {
  const keywords = [
    "about",
    "ueber",
    "über",
    "unternehmen",
    "team",
    "people",
    "kultur",
    "culture",
    "karriere",
    "career",
    "jobs",
    "leistungen",
    "services",
    "angebot",
    "portfolio",
    "cases",
    "referenzen",
    "kontakt",
    "contact",
  ];

  const scored = urls
    .map((u) => {
      const lu = u.toLowerCase();
      let s = 0;
      for (const k of keywords) if (lu.includes(k)) s += 1;
      // homepage nicht doppelt
      if (lu.endsWith("/") || lu.match(/\/(de|en|fr|it)\/?$/)) s += 0.5;
      return { u, s };
    })
    .sort((a, b) => b.s - a.s);

  // nimm die besten 4
  return scored.filter((x) => x.s > 0).slice(0, 4).map((x) => x.u);
}

function extractReadableText(url: string, html: string) {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // remove obvious noise
  doc.querySelectorAll("script, style, noscript").forEach((n) => n.remove());

  const title = (doc.querySelector("title")?.textContent || "").trim();
  const h1 = (doc.querySelector("h1")?.textContent || "").trim();

  const reader = new Readability(doc);
  const article = reader.parse();

  const mainText = (article?.textContent || doc.body?.textContent || "").replace(/\s+/g, " ").trim();

  // simple nav hint (IA)
  const navItems = Array.from(doc.querySelectorAll("nav a"))
    .map((a) => (a.textContent || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 20);

  return { title, h1, navItems, mainText };
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ECHO-Assessment/1.0; +https://mosaik.partners)",
      Accept: "text/html,application/xhtml+xml",
    },
    // @ts-ignore
    cache: "no-store",
  });

  const ct = res.headers.get("content-type") || "";
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  if (!ct.includes("text/html") && !ct.includes("application/xhtml+xml")) {
    throw new Error(`Not HTML (${ct}) for ${url}`);
  }
  return await res.text();
}

function clamp0_100(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Executive-Normierung: investierende Firmen sollen "nicht demotiviert" werden,
// Extreme bleiben sichtbar.
function executiveCalibrate(raw: number) {
  // 60 -> 70, 70 -> 78, 80 -> 85, 50 -> 63, 40 -> 55, 30 -> 48
  return clamp0_100(raw * 0.75 + 25);
}

function avg4(E: number, C: number, H: number, O: number) {
  return Math.round((E + C + H + O) / 4);
}

const ModelJsonSchema = z.object({
  position_statement: z.string().min(10),
  scores: z.object({
    E: z.number(),
    C: z.number(),
    H: z.number(),
    O: z.number(),
  }),
  maturity: z.enum(["implizit", "bewusst", "intentional & geführt"]),
  industry_positioning: z.enum(["unterdurchschnittlich", "durchschnittlich", "überdurchschnittlich", "führend"]),
  tensions: z.array(z.string()).min(3).max(3),
  executive_implication: z.string().min(20),
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY fehlt in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const body = InputSchema.parse(await req.json());

    // 1) Website sammeln (Homepage + 0–4 relevante Seiten)
    const homeHtml = await fetchHtml(body.url);
    const links = sameOriginLinks(body.url, homeHtml);
    const picked = pickRelevantLinks(links);

    const pages: Array<{
      url: string;
      title: string;
      h1: string;
      navItems: string[];
      text: string;
    }> = [];

    // homepage
    {
      const ex = extractReadableText(body.url, homeHtml);
      pages.push({
        url: body.url,
        title: ex.title,
        h1: ex.h1,
        navItems: ex.navItems,
        text: ex.mainText,
      });
    }

    // extras
    for (const u of picked) {
      try {
        const html = await fetchHtml(u);
        const ex = extractReadableText(u, html);
        pages.push({
          url: u,
          title: ex.title,
          h1: ex.h1,
          navItems: ex.navItems,
          text: ex.mainText,
        });
      } catch {
        // bewusst ignorieren (robust)
      }
    }

    // 2) Kompakt machen (Token-Hygiene)
    const compact = pages.map((p) => ({
      url: p.url,
      title: p.title,
      h1: p.h1,
      nav: p.navItems.slice(0, 12),
      text: p.text.slice(0, 3500),
    }));

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 3) Prompt: Executive, branchenbezogen, nicht langweilig, Ruth integriert
    const prompt = `
Du bist ein strategischer Markenanalyst und gibst eine Dritteinschätzung anhand des ECHO-Modells.
ECHO ist eine Methode, Identität greifbar zu machen – nicht „digitale Identität“.

Bewerte RELATIV zur Branche "${body.industry}" (ohne explizite Mitbewerber).
Du nutzt implizite Branchenstandards (üblich vs. überdurchschnittlich vs. führend).

E – Erlebnis: Wird Identität in Kontaktmomenten greifbar (Orientierung, Klarheit, Führung, Verständlichkeit)?
C – Charakter: Ist Haltung erkennbar und positioniert (Ton, Selbstverständnis, Mut zur Kontur)?
H – Homogenität: Ist die Identität systemisch konsistent über Seiten/Touchpoints, oder wirkt sie personen-/situationsabhängig?
O – Originalität: Ist Differenzierung strukturell sichtbar (Wertversprechen, Perspektive, Narrative), oder austauschbar?

Integriere diese Muster explizit, wenn passend (Ruth):
- „ambitioniert, aber nicht durchgängig umgesetzt“
- Personen-/Standortabhängigkeit als Grund für inkonsistente Wirkung
- Anspruch/Exzellenz erkennbar, aber Differenzierung nicht verdichtet

Tonalität:
- professionell interessant (präzise, ruhig, erwachsen)
- kein Marketing-Sprech, keine Floskeln
- keine To-dos / keine Beratung / keine Checklisten
- Diagnose als Momentaufnahme (damit der Test später erneut besser ausfallen kann)

Score-Logik (Rohwerte 0–100, aber realistisch):
- Branchen-Standard liegt typischerweise eher im Bereich 65–78
- Unter 55 nur bei massiver Inkonsistenz / Unklarheit
- Über 85 nur bei klarer Führung + Verdichtung + Differenzierung

Gib ausschließlich JSON zurück in genau diesem Format:
{
  "position_statement": "ein Satz, der sitzt (nicht freundlich weich, nicht aggressiv)",
  "scores": {"E": number, "C": number, "H": number, "O": number},
  "maturity": "implizit" | "bewusst" | "intentional & geführt",
  "industry_positioning": "unterdurchschnittlich" | "durchschnittlich" | "überdurchschnittlich" | "führend",
  "tensions": ["drei präzise Spannungsfelder", "…", "…"],
  "executive_implication": "eine knappe, strategische Implikation (kein Ratschlag)"
}

Kontext:
Firma: ${body.companyName}
Branche: ${body.industry}
Optionale Selbstnotiz: ${body.selfNote || "(keine)"}

Website-Auszug (mehrere Seiten, komprimiert):
${JSON.stringify(compact, null, 2)}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      messages: [
        { role: "system", content: "Du gibst ausschließlich gültiges JSON zurück. Kein Markdown." },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim() || "";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "KI hat kein gültiges JSON geliefert.", raw: content.slice(0, 1000) },
        { status: 500 }
      );
    }

    const model = ModelJsonSchema.parse(parsed);

    // 4) Executive-Normierung (für Wirkung / Wiederholbarkeit / nicht demotivierend)
    const raw = {
      E: clamp0_100(model.scores.E),
      C: clamp0_100(model.scores.C),
      H: clamp0_100(model.scores.H),
      O: clamp0_100(model.scores.O),
    };

    const calibrated = {
      E: executiveCalibrate(raw.E),
      C: executiveCalibrate(raw.C),
      H: executiveCalibrate(raw.H),
      O: executiveCalibrate(raw.O),
    };

    const echo_factor = avg4(calibrated.E, calibrated.C, calibrated.H, calibrated.O);

    return NextResponse.json({
      company_name: body.companyName,
      industry: body.industry,
      url: body.url,

      position_statement: model.position_statement,
      maturity: model.maturity,
      industry_positioning: model.industry_positioning,
      tensions: model.tensions,
      executive_implication: model.executive_implication,

      raw_scores: raw,
      scores: calibrated,
      echo_factor,

      // für Transparenz (ohne UI-Overload)
      meta: {
        pages_analyzed: compact.map((p) => p.url),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "API Error" }, { status: 500 });
  }
}
