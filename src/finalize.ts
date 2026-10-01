import { quoteFound, verifyEvidence } from "./verify";
import { clampLevel, resolveArchetype, scoreDimensions } from "./score";
import { ADVANTAGES, type Advantage } from "./archetypes";
import type { AnalysisParams, CrawlResult, EchoResult, ModelReport } from "./types";

export function finalize(p: AnalysisParams, crawl: CrawlResult, raw: ModelReport, model: string): EchoResult {
  const hasDescription = !!p.description;
  const indicators = (raw.indicators || [])
    .filter((i) => i.id !== "H3" || hasDescription)
    .map((i) => ({ ...i, level: clampLevel(i.level), evidence: Array.isArray(i.evidence) ? i.evidence : [] }));
  const checked = verifyEvidence(indicators, [...crawl.pages]);
  const report: ModelReport = { ...raw, indicators: checked.indicators };
  // Vergleich nur mit gelesenen Mitbewerbern; deren Zitate werden gegen ihren Text geprüft
  if (!crawl.competitors.length || !raw.comparison) {
    delete report.comparison;
  } else {
    report.comparison = {
      ...raw.comparison,
      competitors: (raw.comparison.competitors || []).slice(0, 3).map((c) => ({
        ...c,
        promiseVerified: !!c.promise && quoteFound(c.promise, c.url, crawl.competitors),
      })),
    };
  }
  const primary = (raw.archetype?.primary in ADVANTAGES ? raw.archetype.primary : "Trust") as Advantage;
  const secondary = (raw.archetype?.secondary in ADVANTAGES ? raw.archetype.secondary : primary) as Advantage;
  return {
    id: p.id,
    createdAt: new Date().toISOString(),
    input: { url: p.url, description: p.description, competitors: p.competitors },
    pagesRead: crawl.pages.map((pg) => ({ url: pg.url, role: pg.role, title: pg.title })),
    notes: crawl.notes,
    report,
    archetype: resolveArchetype(
      primary,
      secondary,
      raw.archetype?.traits_in_context,
      raw.archetype?.clarity,
      checked.indicators.find((i) => i.id === "C1")?.level,
    ),
    dimensions: scoreDimensions(checked.indicators, hasDescription),
    quality: { quotesTotal: checked.total, quotesVerified: checked.verified, levelsAdjusted: checked.adjusted },
    model,
  };
}

