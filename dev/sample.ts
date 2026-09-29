import { finalize } from "../src/finalize";
import type { CrawlResult, ModelReport } from "../src/types";
import { writeFileSync } from "node:fs";

const home = "https://zuriga.com/de/ch";
const pages = [
  { url: home, role: "start", title: "ZURIGA", lang: "de", alts: [], text: "Die neue ZURIGA T2. Was, wenn du alles einstellen kannst? Und doch nichts musst. Wir bauen hochwertige Espressomaschinen in eigener Manufaktur hier in Zürich. Am Anfang stand die Idee einer einfachen, hochwertigen und energieeffizienten Espressomaschine. Klein. Schnell. Und einfach zu bedienen." },
  { url: "https://zuriga.com/de/ch/ueber-uns", role: "ueber", title: "Über uns", lang: "de", alts: [], text: "Normalerweise ist das Geschäft mit Kaffeemaschinen fragmentiert. Bei ZURIGA vereinen wir diese Fähigkeiten in einem einzigen Team. Hier sitzt die Entwicklung direkt neben der Montage. Wir sind überzeugte Andersdenker." },
  { url: "https://zuriga.com/de/ch/manufaktur", role: "angebot", title: "Manufaktur", lang: "de", alts: [], text: "Die Manufaktur ist unser Herzstück. Hier in Zürich Altstetten wurde schon immer geschraubt, gebohrt und poliert. Wir bauen unsere Maschinen so, dass sie ein Leben lang halten. Eine ZURIGA besteht auf 318 Einzelteilen." },
] as const;
const crawl = { pages: pages as any, competitors: [], notes: ["Keine Seite «Referenzen» gefunden."] } as CrawlResult;
const L = (id: string, level: number, finding: string, text: string, url: string, kind = "zitat") => ({ id, level, finding, evidence: [{ kind, text, url }] });
const report = {
  company_name: "ZURIGA",
  market_logic: { position: "herausforderer", involvement: "bedeutung", text: "Premium-Espressomaschinen im Direktvertrieb gegen etablierte italienische Hersteller. Preis und Lieferzeit rechtfertigen sich nur über Herkunft, Handwerk und Haltung – und genau darüber verkauft ihr." },
  retell_sentence: "ZURIGA macht hochwertige Espressomaschinen – und zwar anders, weil sie alles unter einem Dach mitten in Zürich entwickeln, von Hand bauen und selbst reparieren.",
  retell_verdict: "Der Satz trägt: konkret, nachprüfbar und leicht weiterzugeben. Offen bleibt nur, für wen genau.",
  atmosphere: { kern: "Präzision ohne Aufregung", emotion: "gelassenes Können mit Understatement", atmosphaere: "städtische Werkbank mit echten Materialien" },
  hero: { who: "Die Stadtwerkstatt in Zürich-Altstetten", carries: true, text: "Ort und Hände tragen die Geschichte auf fast allen Seiten – belegt mit Teilezahlen, Montagestunden und offenen Führungen." },
  archetype: { primary: "Innovation", secondary: "Trust", traits_in_context: ["überlegt", "durchdacht", "reparierbar gedacht"], reasoning: "Ihr brecht mit der Branchenlogik (alles unter einem Dach) und verankert das in Langlebigkeit und Reparatur." },
  indicators: [
    L("E1", 2, "Der Einstieg lanciert ein Produkt, sagt aber Neuen nicht, dass es um Espresso aus Zürich geht.", "Was, wenn du alles einstellen kannst? Und doch nichts musst.", home),
    L("E2", 3, "Die Atmosphäre ist sinnlich konkret: Werkbank, Materialien, Stadt.", "Hier in Zürich Altstetten wurde schon immer geschraubt, gebohrt und poliert.", "https://zuriga.com/de/ch/manufaktur"),
    L("E3", 3, "Die Heldin ist die Stadt-Manufaktur – nicht der Kunde. Die Wahl trägt.", "Die Manufaktur ist unser Herzstück.", "https://zuriga.com/de/ch/manufaktur"),
    L("E4", 3, "Der Unterschied ist spezifisch und trägt Bedeutung: Herkunft und Handwerk.", "Hier sitzt die Entwicklung direkt neben der Montage.", "https://zuriga.com/de/ch/ueber-uns"),
    L("C1", 3, "Der Charakter ist über alle Seiten klar lesbar.", "Wir sind überzeugte Andersdenker.", "https://zuriga.com/de/ch/ueber-uns"),
    L("C2", 2, "Konsequentes Du, kurze Sätze, trockene Selbstironie – mit einem Tippfehler an prominenter Stelle.", "Eine ZURIGA besteht auf 318 Einzelteilen.", "https://zuriga.com/de/ch/manufaktur"),
    L("H1", 3, "Anrede, Absender und Haltung bleiben auf allen Seiten gleich.", "Klein. Schnell. Und einfach zu bedienen.", home),
    L("H2", 3, "Dasselbe Versprechen in Varianten: Zürich, von Hand, ein Leben lang.", "Wir bauen unsere Maschinen so, dass sie ein Leben lang halten.", "https://zuriga.com/de/ch/manufaktur"),
    L("O1", 2, "Ein Warum ist erkennbar, die Werte bleiben aber unbenannt.", "Am Anfang stand die Idee einer einfachen, hochwertigen und energieeffizienten Espressomaschine.", home),
    L("O2", 3, "Substanz und Ausdruck sind eigen: Die Stadt-Werkstatt gehört zum Namen.", "Bei ZURIGA vereinen wir diese Fähigkeiten in einem einzigen Team.", "https://zuriga.com/de/ch/ueber-uns"),
    L("O3", 2, "Viele harte Belege, aber keine Kundenstimmen.", "Keine Kundenstimmen auf den Produktseiten.", home, "beobachtung"),
  ],
  page_comparison: [
    { url: home, label: "Startseite", archetype_effect: "Artisan", address: "du", sender: "wir / ZURIGA", promise: "Manufaktur Zürich, einfach und hochwertig", breaks: "Einstieg ohne Kategorie und Zielgruppe" },
    { url: "https://zuriga.com/de/ch/ueber-uns", label: "Über uns", archetype_effect: "Artisan, Innovation betont", address: "du", sender: "wir", promise: "keine Zwischenhändler", breaks: "keine" },
    { url: "https://zuriga.com/de/ch/manufaktur", label: "Manufaktur", archetype_effect: "Artisan, Trust betont", address: "du", sender: "wir", promise: "ein Leben lang, auf Bestellung", breaks: "Tippfehler «besteht auf»" },
  ],
  pattern: { name: "Gläserne Stadtwerkstatt", text: "ZURIGA zeigt offen, wo, von wem und mit wie vielen Teilen die Maschinen gebaut werden – und macht diese Offenheit zum Markenkern. Schwächer sind nur der Einstieg für Neue und ein Warum, das seine Werte nicht beim Namen nennt." },
  levers: [
    { title: "Erster Bildschirm für Neue", dimension: "E", why: "Der Einstieg spricht nur zu Leuten, die ZURIGA schon kennen.", first_step: "Unter «Die neue ZURIGA T2» eine Zeile ergänzen: «Espressomaschinen, von Hand gebaut in Zürich-Altstetten»." },
    { title: "Werte benennen statt verneinen", dimension: "O", why: "«Werte … und nicht der Gewinn» sagt nur, was euch nicht antreibt.", first_step: "Drei Werte benennen – langlebig, reparierbar, energiesparsam – und jeden mit einer Zahl belegen." },
    { title: "Den Händen Gesichter geben", dimension: "E", why: "Die stärkste Figur sind die zwei Leute, die die T2 bauen können – sie bleiben namenlos.", first_step: "Die beiden Monteur:innen auf der T2-Seite mit Namen, Foto und einem Satz zeigen." },
  ],
  limits: ["Wie sich die Maschine im Alltag nach drei Jahren anfühlt", "Wie der Reparaturdienst erlebt wird", "Was Kundinnen und Kunden weitererzählen", "Wie die Strategie hinter dem Auftritt lautet"],
} as unknown as ModelReport;
const r = finalize({ id: "demo", url: home, competitors: [] }, crawl, report, "claude-sonnet-5-5");
writeFileSync("dev/demo.json", JSON.stringify({ status: "done", createdAt: r.createdAt, url: home, result: r, contactUrl: "mailto:mk@mosaik.partners" }));
console.log(r.dimensions, r.quality);
