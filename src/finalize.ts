import { verifyEvidence } from "./verify";
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
  const primary = (raw.archetype?.primary in ADVANTAGES ? raw.archetype.primary : "Trust") as Advantage;
  const secondary = (raw.archetype?.secondary in ADVANTAGES ? raw.archetype.secondary : primary) as Advantage;
  return {
    id: p.id,
    createdAt: new Date().toISOString(),
    input: { url: p.url, description: p.description, competitors: p.competitors },
    pagesRead: crawl.pages.map((pg) => ({ url: pg.url, role: pg.role, title: pg.title })),
    notes: crawl.notes,
    report,
    archetype: resolveArchetype(primary, secondary, raw.archetype?.traits_in_context),
    dimensions: scoreDimensions(checked.indicators, hasDescription),
    quality: { quotesTotal: checked.total, quotesVerified: checked.verified, levelsAdjusted: checked.adjusted },
    model,
  };
}

