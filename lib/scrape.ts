import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ECHO-Snapshot/1.0)",
    },
    // @ts-ignore
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Website konnte nicht geladen werden (${response.status}).`);
  }

  const html = await response.text();
  return html;
}

function extractLinks(baseUrl: string, html: string) {
  const dom = new JSDOM(html, { url: baseUrl });
  const document = dom.window.document;

  const base = new URL(baseUrl);

  const links = Array.from(document.querySelectorAll("a[href]"))
    .map((a) => (a as HTMLAnchorElement).href)
    .filter((href) => {
      try {
        const url = new URL(href);
        return url.origin === base.origin;
      } catch {
        return false;
      }
    });

  return Array.from(new Set(links));
}

function scoreLink(url: string) {
  const value = url.toLowerCase();
  let score = 0;

  const keywords = [
    "about",
    "ueber",
    "über",
    "unternehmen",
    "team",
    "approach",
    "services",
    "leistungen",
    "angebot",
    "culture",
    "karriere",
    "contact",
    "kontakt",
  ];

  for (const keyword of keywords) {
    if (value.includes(keyword)) score += 1;
  }

  return score;
}

function extractText(url: string, html: string) {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  const reader = new Readability(document);
  const article = reader.parse();

  const title = document.querySelector("title")?.textContent?.trim() || "";
  const h1 = document.querySelector("h1")?.textContent?.trim() || "";
  const text =
    article?.textContent?.replace(/\s+/g, " ").trim() ||
    document.body?.textContent?.replace(/\s+/g, " ").trim() ||
    "";

  return {
    title,
    h1,
    text: text.slice(0, 4000),
  };
}

export async function scrapeWebsite(startUrl: string) {
  const homepageHtml = await fetchHtml(startUrl);
  const homepage = extractText(startUrl, homepageHtml);

  const links = extractLinks(startUrl, homepageHtml)
    .sort((a, b) => scoreLink(b) - scoreLink(a))
    .slice(0, 3);

  const pages = [
    {
      url: startUrl,
      ...homepage,
    },
  ];

  for (const link of links) {
    try {
      const html = await fetchHtml(link);
      const page = extractText(link, html);
      pages.push({
        url: link,
        ...page,
      });
    } catch {
      // einzelne Seiten dürfen ausfallen, ohne den ganzen Flow zu zerstören
    }
  }

  return pages;
}
