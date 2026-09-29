import { describe, expect, it } from "vitest";
import { normalizeUrl, selectPages } from "../src/pages";
import { quoteFound, verifyEvidence } from "../src/verify";
import { scoreDimensions, resolveArchetype, strengthOf } from "../src/score";
import { finalize } from "../src/finalize";
import { ARCHETYPES } from "../src/archetypes";
import { COOKIE_SCRIPT, EXTRACT_SCRIPT } from "../src/page-scripts";
import type { CrawlResult, IndicatorRating, ModelReport, PageSnapshot } from "../src/types";

const page = (url: string, text: string): PageSnapshot => ({ url, role: "start", title: "", lang: "de", text, alts: [] });

describe("Adressen", () => {
  it("ergänzt https und lehnt Unsinn ab", () => {
    expect(normalizeUrl("isolutions.ch")).toBe("https://isolutions.ch/");
    expect(normalizeUrl("https://www.zuriga.com/de/ch#top")).toBe("https://www.zuriga.com/de/ch");
    expect(normalizeUrl("hallo")).toBeNull();
    expect(normalizeUrl("localhost:3000")).toBeNull();
    expect(normalizeUrl("ftp://x.ch")).toBeNull();
  });
});

describe("Seitenauswahl", () => {
  it("wählt pro Rolle eine Seite derselben Domain", () => {
    const links = [
      { href: "https://www.firma.ch/ueber-uns", text: "Über uns" },
      { href: "https://www.firma.ch/leistungen", text: "Leistungen" },
      { href: "https://www.firma.ch/leistungen/", text: "Leistungen" },
      { href: "https://firma.ch/karriere", text: "Jobs" },
      { href: "https://www.firma.ch/referenzen", text: "Kunden" },
      { href: "https://www.firma.ch/kontakt", text: "Kontakt" },
      { href: "https://www.firma.ch/impressum", text: "Impressum" },
      { href: "https://www.andere.ch/ueber", text: "Über" },
      { href: "mailto:info@firma.ch", text: "Mail" },
      { href: "https://www.firma.ch/datei.pdf", text: "Prospekt Angebot" },
    ];
    const p = selectPages(links, "https://www.firma.ch/");
    expect(p.map((x) => x.role)).toEqual(["ueber", "angebot", "referenzen", "karriere", "kontakt"]);
    expect(p.every((x) => !x.url.includes("andere.ch") && !x.url.includes("impressum"))).toBe(true);
  });
});

describe("Zitatprüfung", () => {
  const pages = [page("https://a.ch/", "Wir bauen hochwertige Espressomaschinen in eigener Manufaktur hier in Zürich. Grösste Sorgfalt – immer.")];
  it("findet wörtliche Zitate trotz Anführungszeichen, Strichen und ß", () => {
    expect(quoteFound("«hochwertige Espressomaschinen in eigener Manufaktur»", "https://a.ch/", pages)).toBe(true);
    expect(quoteFound("Größte Sorgfalt - immer", "https://a.ch", pages)).toBe(true);
    expect(quoteFound("Wir bauen … hier in Zürich", "https://a.ch/", pages)).toBe(true);
  });
  it("verwirft umformulierte Zitate", () => {
    expect(quoteFound("Wir fertigen edle Kaffeemaschinen", "https://a.ch/", pages)).toBe(false);
  });
  it("senkt Stufe 2–3 auf 1, wenn kein Beleg bleibt", () => {
    const inds: IndicatorRating[] = [
      { id: "O2", level: 3, finding: "x", evidence: [{ kind: "zitat", text: "erfundenes Zitat hier", url: "https://a.ch/" }] },
      { id: "O3", level: 2, finding: "y", evidence: [{ kind: "beobachtung", text: "Preise sichtbar", url: "https://a.ch/" }] },
    ];
    const r = verifyEvidence(inds, pages);
    expect(r.indicators[0].level).toBe(1);
    expect(r.indicators[0].adjusted).toBe(true);
    expect(r.indicators[1].level).toBe(2);
    expect(r.total).toBe(1);
    expect(r.verified).toBe(0);
  });
});

describe("Werte", () => {
  const lv = (id: IndicatorRating["id"], level: 0 | 1 | 2 | 3): IndicatorRating => ({ id, level, finding: "", evidence: [] });
  it("rechnet Dimensionen fest aus den Stufen und lässt H3 ohne Kurzbeschreibung weg", () => {
    const inds = [lv("E1", 3), lv("E2", 3), lv("E3", 2), lv("E4", 1), lv("C1", 3), lv("C2", 2), lv("H1", 1), lv("H2", 2), lv("H3", 0), lv("O1", 0), lv("O2", 1), lv("O3", 1)];
    const d = Object.fromEntries(scoreDimensions(inds, false).map((x) => [x.key, x.value]));
    expect(d).toEqual({ E: 2.3, C: 2.5, H: 1.5, O: 0.7 });
    const withDesc = Object.fromEntries(scoreDimensions(inds, true).map((x) => [x.key, x.value]));
    expect(withDesc.H).toBe(1);
  });
  it("ordnet Stärken zu", () => {
    expect([0.5, 1.2, 2, 2.5].map(strengthOf)).toEqual(["fehlt", "behauptet", "erkennbar", "belegt"]);
  });
  it("kennt alle 49 Archetypen und nennt die Diagonale nicht beim Namen", () => {
    expect(ARCHETYPES).toHaveLength(49);
    expect(resolveArchetype("Trust", "Prestige").name).toBe("The Diplomat");
    const d = resolveArchetype("Prestige", "Prestige");
    expect(d.name).toBeNull();
    expect(d.onesided).toBe(true);
  });
});

describe("Gesamtergebnis", () => {
  it("fügt Prüfung, Werte und Archetyp zusammen", () => {
    const crawl: CrawlResult = { pages: [page("https://a.ch/", "Die Stadtwerkstatt baut jede Maschine von Hand."), page("https://a.ch/ueber", "Über uns")], competitors: [], notes: [] };
    const report = {
      company_name: "A",
      market_logic: { position: "nische", involvement: "bedeutung", text: "" },
      retell_sentence: "", retell_verdict: "",
      atmosphere: { kern: "", emotion: "", atmosphaere: "" },
      hero: { who: "", carries: true, text: "" },
      archetype: { primary: "Innovation", secondary: "Trust", traits_in_context: ["a", "b", "c"], reasoning: "" },
      indicators: [
        { id: "E4", level: 3, finding: "", evidence: [{ kind: "zitat", text: "baut jede Maschine von Hand", url: "https://a.ch/" }] },
        { id: "H3", level: 3, finding: "", evidence: [{ kind: "beobachtung", text: "x", url: "https://a.ch/" }] },
        { id: "O2", level: 7, finding: "", evidence: [{ kind: "zitat", text: "gibt es nicht", url: "https://a.ch/" }] },
      ],
      page_comparison: [], pattern: { name: "", text: "" }, levers: [], limits: [],
    } as unknown as ModelReport;
    const r = finalize({ id: "x", url: "https://a.ch/", competitors: [] }, crawl, report, "m");
    expect(r.archetype.name).toBe("The Artisan");
    expect(r.report.indicators.map((i) => i.id)).toEqual(["E4", "O2"]); // H3 ohne Kurzbeschreibung entfernt
    expect(r.report.indicators[1].level).toBe(1); // 7 → 3, dann mangels Beleg → 1
    expect(r.quality).toEqual({ quotesTotal: 2, quotesVerified: 1, levelsAdjusted: 1 });
  });
});

describe("Skripte für den Browser", () => {
  it("sind gültiges JavaScript", () => {
    for (const s of [EXTRACT_SCRIPT, COOKIE_SCRIPT]) expect(() => new Function("return " + s)).not.toThrow();
  });
});
