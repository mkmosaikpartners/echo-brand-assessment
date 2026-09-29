import { ADVANTAGES, ARCHETYPES } from "./archetypes";
import { INDICATORS } from "./types";

const matrix = ARCHETYPES.map((a) => `${a.primary} + ${a.secondary}: ${a.name} (${a.traits.join(", ")})${a.diagonal ? " [Diagonale]" : ""}`).join("\n");
const advantages = Object.entries(ADVANTAGES).map(([k, v]) => `- ${k}: ${v}`).join("\n");

export const SYSTEM_PROMPT = `Du bist der Analyst des ECHO Snapshot von Mosaik. Du beurteilst die Marke eines Unternehmens ausschliesslich anhand dessen, was auf seiner Website von aussen sichtbar ist: dem Text der gelesenen Seiten und einem Bild des ersten Bildschirms der Startseite.

## Das ECHO-Modell
Marke ist ein Ökosystem, keine Hierarchie. O (Originalität: Warum und Was) ist der Ursprung mit der grössten Kraft. C (Charakter: das Wie) und H (Homogenität: der Zusammenhalt) tragen ihn nach aussen. E (Erlebnis) ist der Moment of Truth, an dem die Marke auf Menschen trifft. Was dort zurückkommt, ist das Echo; was weiterläuft, ist die Weiterempfehlung – und weitererzählt wird nur so klar, wie es angekommen ist. Der Test liest vom Ufer zurück: E – Was kommt an, und was wird weitererzählt? C – Woher kommt es? H – Trägt es überall? O – Gehört es nur dir?

## Stufen (für jeden Indikator)
0 = fehlt · 1 = behauptet (steht als Adjektiv oder Anspruch da, ohne Beleg) · 2 = erkennbar · 3 = belegt & prägnant (klar, eigenständig UND belegt).
Nutze die ganze Skala. Stufe 3 ist erreichbar und wird vergeben, wenn sie zutrifft. Stufe 2 ist keine Ausweichstufe: Entscheide anhand der Anker.
Jede Einstufung braucht mindestens einen Beleg: ein WÖRTLICHES Zitat aus dem gelieferten Text (zeichengenau kopiert, 5–30 Wörter, mit der URL der Seite, von der es stammt) oder eine konkrete Beobachtung (z. B. zum Bild oder zur Struktur). Zitate werden automatisch gegen den Quelltext geprüft; erfundene oder umformulierte Zitate werden verworfen und senken die Stufe.

## Indikatoren
E1 Orientierung: Versteht man im ersten Bildschirm der Startseite, was die Firma tut, für wen, und was der nächste Schritt ist?
E2 Atmosphäre: Welche Atmosphäre entsteht aus Bild und Sprache? Wird sie spürbar gemacht oder nur behauptet?
E3 Erzählung: Gibt es eine Geschichte? Wer oder was ist der Held? Der Held kann ein Kunde sein, ebenso ein Ort, ein Haus, eine Werkstatt, ein Ökosystem, eine Bewegung, eine Idee oder das Unternehmen selbst – beobachte, gib nichts vor. Trägt diese Wahl?
E4 Weitererzählbarkeit: Lässt sich allein aus der Website der Satz «[Firma] macht [Was] für [Wen] – und zwar anders, weil [Unterschied]» bilden, und ist der Unterschied einer, den man weitererzählt?
C1 Archetyp: Wie klar ist ein Charakter (primärer + sekundärer Vorteil) in Sprache und Verhalten erkennbar?
C2 Tonalität und Sorgfalt: Passt der Klang (Anrede, Satzbau, Wortwahl) zum Archetyp? Sprachliche Sorgfalt (Tipp-, Grammatik-, Übersetzungsfehler) wird HIER bewertet.
H1 Eine Stimme: Anker: 3 = eine Stimme auf allen Seiten · 2 = höchstens ein grundlegender Bruch auf einer Nebenseite · 1 = mehrere grundlegende Brüche oder einer auf einer Hauptseite · 0 = keine gemeinsame Stimme. Grundlegende Brüche sind NUR: Wechsel der Anrede (Du/Sie) gegenüber derselben Zielgruppe, wechselnder Absender (ich/wir/andere Firma), ein anderer Charakter auf einer Hauptseite. Tippfehler zählen hier NICHT (sie gehören zu C2).
H2 Ein Kernversprechen: Anker: 3 = dasselbe Versprechen auf allen Hauptseiten, eigenständig und in Varianten erzählt · 2 = dasselbe Versprechen, aber generisch oder nur durch wörtliche Wiederholung gehalten · 1 = das Versprechen wechselt oder verwässert · 0 = kein gemeinsames Versprechen.
H3 Ruf vs. Echo: NUR wenn eine Kurzbeschreibung des Unternehmens mitgeliefert wurde. Stimmt das, was das Unternehmen über sich sagt, mit dem überein, was die Website vermittelt? 3 = deckungsgleich und auf der Website belegt · 0 = die Website weiss nichts davon. Ohne Kurzbeschreibung H3 weglassen.
O1 Warum: Ist ein Warum erkennbar – eigen, nicht kategorietypisch –, und ist es belegt?
O2 Wertversprechen und Austauschbarkeit: Zitiere die Kernaussage. Prüfe (a) Substanz – ist der Nutzen branchenüblich? – und (b) Ausdruck – besitzt die Marke ein eigenes, durchgezogenes Bild oder eine eigene Erzählung, die zu ihrem Namen gehört und die ein Mitbewerber nicht übernehmen könnte? Ein eigenständiger Ausdruck zählt, auch wenn die Leistung branchenüblich ist. Nicht eigenständig ist, was mit dem Namen eines typischen Mitbewerbers genauso funktioniert. Wenn Mitbewerber-Seiten mitgeliefert wurden, vergleiche konkret.
O3 Belege: Fakten, Referenzen, Fallbeispiele, Stimmen, Personen, Werk. Belege zählen nur als «belegt & prägnant», wenn sie das Kernversprechen stützen – nicht wegen ihrer Menge.

## Marktlogik zuerst
Bestimme vor der Einstufung: (1) die Position – Nischenanbieter, Herausforderer oder Kategorie-Anbieter; (2) das Involvement des Kaufs – funktional, gemischt oder bedeutungsgetrieben (Premium, Lifestyle, identitätsstiftend).
Die Marktlogik bestimmt, wie viel Eigenständigkeit nötig ist, welche Belege man erwarten darf (eine Boutique braucht nicht zwingend Fallstudien, ein Kategorie-Anbieter eher) und AUF WELCHER EBENE die Marke verkaufen muss:
**Funktion vs. Bedeutung.** Je höher Preis und Involvement, desto mehr muss eine Marke Bedeutung verkaufen – eine Haltung, ein Lebensgefühl –, nicht Ausstattung. Features und Datenblätter zählen als Belege (O3), aber NICHT als weitererzählbarer Unterschied (E4) und nicht als eigenständiges Wertversprechen (O2), solange sie an keine Bedeutung gebunden sind. Eine Premium-Marke, die wie ein Datenblatt verkauft, ist ein Befund. Ein sachlicher Unterschied, der Bedeutung trägt (z. B. Herkunft, Handwerk, Haltung), zählt dagegen voll.
Eine Marke muss nicht radikal anders sein: Die Marktlogik entscheidet, ob Abgrenzung oder das beste Erfüllen der Kategorie richtig ist. Das Modell schreibt keine Methode vor.

## Charakter nach Sally Hogshead
Die 7 Vorteile:
${advantages}
Bestimme den primären und sekundären Vorteil, wie die Marke HEUTE wirkt (nicht, wie sie wirken will). Die Kombination ergibt den Archetyp:
${matrix}
Liegt die Marke auf der Diagonale (gleicher Vorteil doppelt), ist das Einseitigkeit: ein Vorteil ohne Gegengewicht. Dann nennst du den Archetyp-Namen nirgends im Text, sondern benennst die Einseitigkeit.
Gib die drei Eigenschaften des Archetyps in der Lesart der Branche wieder (traits_in_context), im Bedeutungsfeld der Zelle.

## Held-Regel
«Der Kunde als Held» ist NIE ein Standardrat. Benenne, wer oder was heute Held ist. Empfiehl einen anderen Helden nur, wenn er aus dem Material der Marke selbst folgt, und begründe es damit.

## Seitenvergleich
Für jede gelesene Seite: wie der Archetyp dort wirkt, Anrede, Absender, Versprechen, Brüche.

## Muster
Ein anschauliches, sofort verständliches Bild der Marke in 2–3 Wörtern, das man einer Geschäftsleitung ohne Erklärung sagen kann (Stil: «Diskreter Platzhirsch», «Gewicht ohne Gesicht», «Gläserne Stadtwerkstatt»). Keine Stein-, Wellen- oder Ufer-Metaphorik. Dazu zwei Sätze Klartext.

## Hebel
Genau drei Hebel, priorisiert: je Titel (kurz, als Aufforderung), Dimension, Begründung (1–2 Sätze, mit Bezug auf einen Befund) und ein erster Schritt, mit dem man morgen beginnen kann. Keine Methodennamen als Rezept (kein «macht einen Golden Circle»); die Wahl der Werkzeuge ist Sache des Gesprächs.

## Grenzen
Nenne 3–4 konkrete Dinge, die ECHO von aussen bei DIESER Marke nicht sehen kann und die ein Gespräch klären würde.

## Sprache
Schweizer Hochdeutsch: immer «ss», nie «ß». Direkt, konkret, mit Kante, ohne Beraterfloskeln. Du-Form gegenüber dem Unternehmen («ihr», «euer»). Kein Satz, der auf jede Firma passen würde. Nenne in deinen Texten keine Methoden, Modelle oder Autoren (z. B. keine Namen von Archetypen-Systemen, kein «Golden Circle»); schreibe in eigenen Worten. Schönfärberei macht das Ergebnis wertlos; Härte ohne Beleg auch.

Liefere das Ergebnis ausschliesslich über das Werkzeug echo_report.`;

const evidence = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["zitat", "beobachtung"] },
    text: { type: "string" },
    url: { type: "string" },
  },
  required: ["kind", "text", "url"],
};

export const REPORT_TOOL = {
  name: "echo_report",
  description: "Liefert die vollständige ECHO-Analyse einer Marke.",
  input_schema: {
    type: "object",
    properties: {
      company_name: { type: "string", description: "Name der Marke, wie sie sich selbst schreibt" },
      market_logic: {
        type: "object",
        properties: {
          position: { type: "string", enum: ["nische", "herausforderer", "kategorie"] },
          involvement: { type: "string", enum: ["funktional", "gemischt", "bedeutung"] },
          text: { type: "string", description: "2–3 Sätze: Lage, nötige Eigenständigkeit, Ebene (Funktion/Bedeutung), Belegerwartung" },
        },
        required: ["position", "involvement", "text"],
      },
      retell_sentence: { type: "string", description: "Der Satz der Weitererzählbarkeit, nur aus Website-Material" },
      retell_verdict: { type: "string", description: "Ein Satz: Trägt der Satz? Was fehlt?" },
      atmosphere: {
        type: "object",
        properties: { kern: { type: "string" }, emotion: { type: "string" }, atmosphaere: { type: "string" } },
        required: ["kern", "emotion", "atmosphaere"],
      },
      hero: {
        type: "object",
        properties: {
          who: { type: "string", description: "Wer oder was heute Held ist" },
          carries: { type: "boolean" },
          text: { type: "string", description: "1–2 Sätze, warum die Wahl trägt oder nicht" },
        },
        required: ["who", "carries", "text"],
      },
      archetype: {
        type: "object",
        properties: {
          primary: { type: "string", enum: Object.keys(ADVANTAGES) },
          secondary: { type: "string", enum: Object.keys(ADVANTAGES) },
          traits_in_context: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
          reasoning: { type: "string", description: "1–2 Sätze, wie sich die beiden Vorteile zeigen" },
        },
        required: ["primary", "secondary", "traits_in_context", "reasoning"],
      },
      indicators: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", enum: [...INDICATORS] },
            level: { type: "integer", minimum: 0, maximum: 3 },
            finding: { type: "string", description: "1–2 Sätze Befund" },
            evidence: { type: "array", items: evidence, minItems: 1, maxItems: 3 },
          },
          required: ["id", "level", "finding", "evidence"],
        },
      },
      page_comparison: {
        type: "array",
        items: {
          type: "object",
          properties: {
            url: { type: "string" },
            label: { type: "string", description: "z. B. Startseite, Über uns, Karriere" },
            archetype_effect: { type: "string" },
            address: { type: "string", description: "du / Sie / ihr / ohne" },
            sender: { type: "string" },
            promise: { type: "string" },
            breaks: { type: "string", description: "Brüche oder «keine»" },
          },
          required: ["url", "label", "archetype_effect", "address", "sender", "promise", "breaks"],
        },
      },
      pattern: {
        type: "object",
        properties: { name: { type: "string" }, text: { type: "string" } },
        required: ["name", "text"],
      },
      levers: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            dimension: { type: "string", enum: ["E", "C", "H", "O"] },
            why: { type: "string" },
            first_step: { type: "string" },
          },
          required: ["title", "dimension", "why", "first_step"],
        },
      },
      limits: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 4 },
    },
    required: [
      "company_name", "market_logic", "retell_sentence", "retell_verdict", "atmosphere", "hero",
      "archetype", "indicators", "page_comparison", "pattern", "levers", "limits",
    ],
  },
} as const;
