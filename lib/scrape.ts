import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

type ScrapedPage = {
  url: string;
  title: string;
  h1: string;
  navItems: string[];
  text: string;
};

const BLOCKED_PATTERNS = [
  "/cart",
  "/checkout",
  "/login",
  "/signin",
  "/account",
  "/privacy",
  "/datenschutz",
  "/impressum",
  "/agb",
  "/terms",
  "/cookie",
  "/cookies",
  "/legal",
  "/feed",
  "/wp-json",
];

function cleanText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function isBlockedUrl(url: string) {
  const lower = url.toLowerCase();
  return BLOCKED_PATTERNS.some((pattern) => lower.includes(pattern));
}

function scoreLink(url: string) {
  const lower = url.toLowerCase();
  let score = 0;

  const positives = [
    "about",
    "ueber",
    "über",
    "unternehmen",
    "team",
    "approach",
    "method",
    "methode",
    "services",
    "leistungen",
    "angebot",
    "portfolio",
    "work",
    "cases",
    "referenzen",
    "kunden",
    "contact",
    "kontakt",
    "karriere",
    "culture",
    "values",
    "werte",
  ];

  const negatives = [
    "cart",
    "checkout",
    "login",
    "privacy",
    "impressum",
    "agb",
    "cookie",
    "legal",
    "feed",
  ];

  for (const p of positives) {
    if (lower.includes(p)) score += 2;
  }

  for (const n of negatives) {
    if (lower.includes(n)) score -= 5;
  }

  if (lower.split("/").length <= 5) score += 1;

  return score;
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ECHO-Snapshot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    // @ts-ignore
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Website konnte nicht geladen werden (${res.status})`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Kein HTML-Inhalt unter ${url}`);
  }

  return await res.text();
}

function extractInternalLinks(baseUrl: string, html: string) {
  const dom = new JSDOM(html, { url: baseUrl });
  const document = dom.window.document;
  const base = new URL(baseUrl);

  const urls = Array.from(document.querySelectorAll("a[href]"))
    .map((a) => (a as HTMLAnchorElement).href)
    .map((href) => href.split("#")[0].trim())
    .filter(Boolean)
    .filter((href) => {
      try {
        const u = new URL(href);
        return u.origin === base.origin;
      } catch {
        return false;
      }
    })
    .filter((href) => !isBlockedUrl(href));

  return Array.from(new Set(urls));
}

function extractPage(url: string, html: string): ScrapedPage {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  document.querySelectorAll("script, style, noscript").forEach((node) => node.remove());

  const reader = new Readability(document);
  const article = reader.parse();

  const title = cleanText(document.querySelector("title")?.textContent || "");
  const h1 = cleanText(document.querySelector("h1")?.textContent || "");

  const navItems = Array.from(document.querySelectorAll("nav a"))
    .map((a) => cleanText(a.textContent || ""))
    .filter(Boolean)
    .slice(0, 15);

  const rawText =
    article?.textContent ||
    document.body?.textContent ||
    "";

  const text = cleanText(rawText).slice(0, 5000);

  return {
    url,
    title,
    h1,
    navItems,
    text,
  };
}

export async function scrapeWebsite(startUrl: string) {
  const homepageHtml = await fetchHtml(startUrl);
  const homepage = extractPage(startUrl, homepageHtml);

  const internalLinks = extractInternalLinks(startUrl, homepageHtml)
    .sort((a, b) => scoreLink(b) - scoreLink(a))
    .slice(0, 4);

  const pages: ScrapedPage[] = [homepage];

  for (const link of internalLinks) {
    if (pages.find((p) => p.url === link)) continue;

    try {
      const html = await fetchHtml(link);
      const page = extractPage(link, html);

      if (page.text.length < 120) continue;

      pages.push(page);
    } catch {
      // einzelne Seiten dürfen ausfallen
    }
  }

  return pages;
}
