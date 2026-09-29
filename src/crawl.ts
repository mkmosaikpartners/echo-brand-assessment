import puppeteer, { type Browser, type Page } from "@cloudflare/puppeteer";
import { selectPages, type LinkInfo } from "./pages";
import type { CrawlResult, PageRole, PageSnapshot } from "./types";
import { COOKIE_SCRIPT, EXTRACT_SCRIPT } from "./page-scripts";
import { withTimeout } from "./timeout";

const MAX_TEXT_PAGE = 14000;
const MAX_TEXT_COMPETITOR = 6000;
const MIN_READABLE = 200;

interface Extracted {
  title: string;
  lang: string;
  text: string;
  alts: string[];
  links: LinkInfo[];
  germanAlternate: string | null;
}

/** Liest Startseite, bis zu fünf Unterseiten und die Startseiten der Mitbewerber. */
export async function crawlSite(browserBinding: Fetcher, url: string, competitors: string[]): Promise<CrawlResult> {
  const notes: string[] = [];
  let browser: Browser | null = null;
  try {
    const started = Date.now();
    const timeLeft = (budgetMs: number) => Date.now() - started < budgetMs;
    browser = await withTimeout(puppeteer.launch(browserBinding, { keep_alive: 600000 }), 60000, "Browser starten");
    const b = browser;
    const openPage = async () => {
      const pg = await withTimeout(b.newPage(), 30000, "Seite öffnen");
      await withTimeout(pg.setViewport({ width: 1440, height: 900 }), 15000, "Ansicht setzen");
      await withTimeout(pg.setExtraHTTPHeaders({ "Accept-Language": "de-CH,de;q=0.9,en;q=0.4" }), 15000, "Sprache setzen");
      return pg;
    };
    let page = await openPage();
    // Hängt eine Seite, mit einem frischen Tab nochmals versuchen
    const visitRobust = async (target: string): Promise<Extracted | null> => {
      const first = await visit(page, target);
      if (first && first.text.length >= MIN_READABLE) return first;
      if (!timeLeft(170000)) return first;
      await page.close().catch(() => {});
      page = await openPage();
      return (await visit(page, target)) || first;
    };

    // Startseite
    let home = await visitRobust(url);
    if (!home) throw new EchoError(`Die Startseite liess sich nicht laden. Ist die Adresse korrekt und öffentlich erreichbar? (${lastVisitProblem.slice(0, 200)})`);
    let homeUrl = page.url();

    // Deutsche Fassung bevorzugen
    if (!home.lang.toLowerCase().startsWith("de") && home.germanAlternate) {
      const de = await visit(page, home.germanAlternate);
      if (de && de.text.length >= MIN_READABLE) {
        notes.push(`Die Startseite war nicht deutsch (${home.lang || "unbekannt"}); gelesen wurde die deutsche Fassung.`);
        home = de;
        homeUrl = page.url();
      }
    } else if (!home.lang.toLowerCase().startsWith("de") && home.lang) {
      notes.push(`Die Website ist nicht deutschsprachig (${home.lang}). Beurteilt wurde die ausgelieferte Sprachfassung.`);
    }

    let screenshot: string | undefined;
    try {
      screenshot = (await withTimeout(page.screenshot({ type: "jpeg", quality: 55, encoding: "base64" }), 20000, "Bildschirmfoto")) as string;
    } catch {
      notes.push("Vom ersten Bildschirm konnte kein Bild gemacht werden; die Atmosphäre ist nur aus der Sprache beurteilt.");
    }

    const pages: PageSnapshot[] = [snapshot(homeUrl, "start", home, MAX_TEXT_PAGE)];

    // Unterseiten (mit Zeitbudget, damit der Schritt nie ausläuft)
    for (const target of selectPages(home.links, homeUrl, 5)) {
      if (!timeLeft(150000)) {
        notes.push("Aus Zeitgründen wurden nicht alle Unterseiten gelesen.");
        break;
      }
      const sub = await visitRobust(target.url);
      if (sub && sub.text.length >= MIN_READABLE) {
        pages.push(snapshot(page.url(), target.role, sub, MAX_TEXT_PAGE));
      } else {
        notes.push(`Die Seite ${target.url} liess sich nicht lesen.`);
      }
    }

    const readable = pages.filter((p) => p.text.length >= MIN_READABLE);
    if (readable.length === 0) {
      throw new EchoError("Auf der Website liess sich kein Text lesen. Möglicherweise blockiert sie automatische Zugriffe.");
    }
    if (readable.length === 1) {
      notes.push(
        "Nur die Startseite liess sich lesen. Beurteile die Homogenität (H1, H2) innerhalb dieser Seite und über ihre Abschnitte, und nenne in den Grenzen, dass weitere Seiten nicht gelesen werden konnten.",
      );
    }
    const roles = new Set(pages.map((p) => p.role));
    for (const [role, label] of [["ueber", "Über uns"], ["angebot", "Angebot"], ["karriere", "Karriere"], ["referenzen", "Referenzen"]] as const) {
      if (!roles.has(role)) notes.push(`Keine Seite «${label}» gefunden.`);
    }

    // Mitbewerber (nur Startseite)
    const comp: PageSnapshot[] = [];
    for (const c of competitors) {
      if (!timeLeft(190000)) {
        notes.push(`Die Website des Mitbewerbers ${c} wurde aus Zeitgründen nicht gelesen.`);
        continue;
      }
      const cp = await visit(page, c);
      if (cp && cp.text.length >= MIN_READABLE) comp.push(snapshot(page.url(), "mitbewerber", cp, MAX_TEXT_COMPETITOR));
      else notes.push(`Die Website des Mitbewerbers ${c} liess sich nicht lesen.`);
    }

    return { pages, competitors: comp, screenshot, notes };
  } finally {
    if (browser) await withTimeout(browser.close(), 10000, "Browser schliessen").catch(() => {});
  }
}

export class EchoError extends Error {}

function snapshot(url: string, role: PageRole, e: Extracted, max: number): PageSnapshot {
  return { url, role, title: e.title, lang: e.lang, text: e.text.slice(0, max), alts: e.alts.slice(0, 25) };
}

let lastVisitProblem = "";

async function visit(page: Page, url: string): Promise<Extracted | null> {
  try {
    return await withTimeout(visitInner(page, url), 75000, `Seite ${url}`);
  } catch (e) {
    lastVisitProblem = e instanceof Error ? e.message : String(e);
    return null;
  }
}

async function visitInner(page: Page, url: string): Promise<Extracted | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let res = null;
      try {
        res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      } catch (e) {
        // Zeitüberschreitung beim Laden: trotzdem versuchen, was schon da ist
        lastVisitProblem = `Laden: ${e instanceof Error ? e.message : String(e)}`;
      }
      if (res && res.status() === 429 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      if (res && res.status() >= 400) {
        lastVisitProblem = `HTTP ${res.status()}`;
        return null;
      }
      // Kurz warten, bis Inhalte nachgeladen sind – aber nie länger als 8 Sekunden
      await page.waitForNetworkIdle({ idleTime: 800, timeout: 6000 }).catch(() => {});
      await acceptCookieBanner(page);
      const data = (await withTimeout(page.evaluate(EXTRACT_SCRIPT), 15000, "Text lesen")) as Extracted;
      if (data && data.text) return data;
      lastVisitProblem = "kein Text auf der Seite";
    } catch (e) {
      lastVisitProblem = e instanceof Error ? e.message : String(e);
      if (attempt === 1) return null;
    }
  }
  return null;
}

/** Schliesst gängige Cookie-Banner, damit sie den Text nicht überdecken. Fehler werden ignoriert. */
async function acceptCookieBanner(page: Page): Promise<void> {
  try {
    await withTimeout(page.evaluate(COOKIE_SCRIPT), 8000, "Cookie-Hinweis");
  } catch {
    /* egal */
  }
}

