import puppeteer, { type Browser, type Page } from "@cloudflare/puppeteer";
import { selectPages, type LinkInfo } from "./pages";
import type { CrawlResult, PageRole, PageSnapshot } from "./types";

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
    browser = await puppeteer.launch(browserBinding);
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "de-CH,de;q=0.9,en;q=0.4" });

    // Startseite
    let home = await visit(page, url);
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
      screenshot = (await page.screenshot({ type: "jpeg", quality: 55, encoding: "base64" })) as string;
    } catch {
      notes.push("Vom ersten Bildschirm konnte kein Bild gemacht werden; die Atmosphäre ist nur aus der Sprache beurteilt.");
    }

    const pages: PageSnapshot[] = [snapshot(homeUrl, "start", home, MAX_TEXT_PAGE)];

    // Unterseiten
    for (const target of selectPages(home.links, homeUrl, 5)) {
      const sub = await visit(page, target.url);
      if (sub && sub.text.length >= MIN_READABLE) {
        pages.push(snapshot(page.url(), target.role, sub, MAX_TEXT_PAGE));
      } else {
        notes.push(`Die Seite ${target.url} liess sich nicht lesen.`);
      }
    }

    const readable = pages.filter((p) => p.text.length >= MIN_READABLE);
    if (readable.length < 2) {
      throw new EchoError(
        readable.length === 0
          ? "Auf der Website liess sich kein Text lesen. Möglicherweise blockiert sie automatische Zugriffe."
          : "Ausser der Startseite liess sich keine weitere Seite lesen. Für eine faire Beurteilung braucht ECHO mindestens zwei Seiten.",
      );
    }
    const roles = new Set(pages.map((p) => p.role));
    for (const [role, label] of [["ueber", "Über uns"], ["angebot", "Angebot"], ["karriere", "Karriere"], ["referenzen", "Referenzen"]] as const) {
      if (!roles.has(role)) notes.push(`Keine Seite «${label}» gefunden.`);
    }

    // Mitbewerber (nur Startseite)
    const comp: PageSnapshot[] = [];
    for (const c of competitors) {
      const cp = await visit(page, c);
      if (cp && cp.text.length >= MIN_READABLE) comp.push(snapshot(page.url(), "mitbewerber", cp, MAX_TEXT_COMPETITOR));
      else notes.push(`Die Website des Mitbewerbers ${c} liess sich nicht lesen.`);
    }

    return { pages, competitors: comp, screenshot, notes };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

export class EchoError extends Error {}

function snapshot(url: string, role: PageRole, e: Extracted, max: number): PageSnapshot {
  return { url, role, title: e.title, lang: e.lang, text: e.text.slice(0, max), alts: e.alts.slice(0, 25) };
}

let lastVisitProblem = "";

async function visit(page: Page, url: string): Promise<Extracted | null> {
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
      await page.waitForNetworkIdle({ idleTime: 800, timeout: 8000 }).catch(() => {});
      await acceptCookieBanner(page);
      const data = (await page.evaluate(EXTRACT_SCRIPT)) as Extracted;
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
    await page.evaluate(COOKIE_SCRIPT);
  } catch {
    /* egal */
  }
}

// Läuft im Browser der gelesenen Seite. Bewusst als Text, damit der Bundler nichts hineinschreibt.
const EXTRACT_SCRIPT = `(() => {
  var clean = function (s) { return s.replace(/\u00ad/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(); };
  var text = clean(document.body ? document.body.innerText : "");
  var alts = Array.from(document.querySelectorAll("img[alt]"))
    .map(function (i) { return (i.getAttribute("alt") || "").trim(); })
    .filter(function (a) { return a.length > 2; });
  var links = Array.from(document.querySelectorAll("a[href]")).map(function (a) {
    return { href: a.href, text: (a.innerText || a.getAttribute("aria-label") || "").trim().slice(0, 80) };
  });
  var germanAlternate = null;
  var alt = document.querySelector('link[rel="alternate"][hreflang^="de"]');
  if (alt && alt.href) germanAlternate = alt.href;
  if (!germanAlternate) {
    var hit = links.find(function (l) {
      try { return /^(de|deutsch)$/i.test(l.text) || /\/de(-ch)?(\/|$)/i.test(new URL(l.href, location.href).pathname); }
      catch (e) { return false; }
    });
    if (hit) germanAlternate = hit.href;
  }
  return {
    title: document.title || "",
    lang: document.documentElement.getAttribute("lang") || "",
    text: text,
    alts: Array.from(new Set(alts)),
    links: links,
    germanAlternate: germanAlternate
  };
})()`;

const COOKIE_SCRIPT = `(() => {
  var words = /^(alle akzeptieren|akzeptieren|zustimmen|einverstanden|accept all|accept|ok|verstanden|tout accepter)$/i;
  var btn = Array.from(document.querySelectorAll("button, a[role=button]")).find(function (b) { return words.test((b.textContent || "").trim()); });
  if (btn) btn.click();
})()`;
