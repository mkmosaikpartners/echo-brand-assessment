type Extracted = {
  url: string;
  title: string;
  text: string;
  meta: { description?: string; ogTitle?: string; ogDescription?: string };
};

export function buildSystemPrompt() {
  return `
Du bist ein Brand-Analyst. Du gibst keine Marketing-Phrasen aus. Du arbeitest beschreibend, nicht wertend.
Dein Ziel ist eine pragmatische, nachvollziehbare Einordnung der digitalen Markenwirkung anhand des ECHO-Modells:

E = Erlebnis (wie spürbar ist Führung durch Erlebnis: Klarheit, Vertrauen, Reibung, Orientierung, Ton, erste Sekunden)
C = Charakter (Haltung, Stimme, Persönlichkeit, „wer sind wir“, spürbare Prinzipien)
H = Homogenität (Kohärenz über Seiten/Touchpoints hinweg: Botschaften, Stil, Fokus, Wiedererkennbarkeit)
O = Originalität (Unterscheidbarkeit im Umfeld: Eigenständigkeit ohne „laut“ zu sein)

Wichtig:
- Beurteile NUR, was aus den extrahierten Website-Texten + Meta-Infos ableitbar ist.
- Keine Unterstellungen über interne Kultur, wenn sie nicht sichtbar ist.
- Keine generischen Ratschläge, keine „Best Practices“.
- Output AUSSCHLIESSLICH als JSON (kein Markdown, kein Fliesstext).
- Werte 0–100. 50 = durchschnittlich.
- Kommentar: 120–220 Wörter, ruhig, klar, Du-Form, ohne Siezen.
- Kommentar muss: (1) digitale Wirkung beschreiben, (2) Spannungsfelder benennen, (3) Potenzial als Richtung andeuten (ohne To-Do-Liste).
`.trim();
}

export function buildUserPrompt(args: {
  company: { name: string; industry: string; url: string; extracted: Extracted };
  competitors: { url: string; extracted: Extracted }[];
  intent: { picks: string[]; note?: string };
  selfScore: { E: number; C: number; H: number; O: number };
  role: string;
  size: string;
}) {
  const own = args.company.extracted;
  const comps = args.competitors;

  const intentLine =
    args.intent.picks?.length
      ? `Gewünschte Wirkung (Intent, max 2): ${args.intent.picks.join(", ")}${args.intent.note ? ` — Notiz: ${args.intent.note}` : ""}`
      : "Gewünschte Wirkung (Intent): nicht angegeben";

  return `
Aufgabe:
1) Beurteile die digitale Wirkung der Marke "${args.company.name}" (Branche: ${args.company.industry}) anhand ECHO (E,C,H,O).
2) Nutze die drei Mitbewerber als relativen Kontext: Wie unterscheidbar wirkt der Auftritt im direkten Umfeld?

Hinweise:
- Rolle des Testnehmers: ${args.role || "—"}; Firmengrösse: ${args.size || "—"}
- Selbstbild (heuristisch) als Referenz: E=${args.selfScore.E}, C=${args.selfScore.C}, H=${args.selfScore.H}, O=${args.selfScore.O}
- ${intentLine}

Eigene Website:
URL: ${args.company.url}
Title: ${own.title}
Meta: ${JSON.stringify(own.meta)}
Extrakt (gekürzt):
${own.text}

Mitbewerber:
1) ${comps[0].url}
Title: ${comps[0].extracted.title}
Meta: ${JSON.stringify(comps[0].extracted.meta)}
Extrakt:
${comps[0].extracted.text}

2) ${comps[1].url}
Title: ${comps[1].extracted.title}
Meta: ${JSON.stringify(comps[1].extracted.meta)}
Extrakt:
${comps[1].extracted.text}

3) ${comps[2].url}
Title: ${comps[2].extracted.title}
Meta: ${JSON.stringify(comps[2].extracted.meta)}
Extrakt:
${comps[2].extracted.text}

Gib JSON zurück im Format:
{
  "digital": { "E": number, "C": number, "H": number, "O": number },
  "commentary": "..."
}
`.trim();
}
