/**
 * Zweiter Weg zum Seitentext: ein einfacher, offen gekennzeichneter Abruf ohne Browser.
 * Wird genutzt, wenn der automatische Browser abgewiesen wird oder hängt.
 * Kein Umgehen von Schutzmechanismen: Weist die Website auch diesen Abruf ab, bleibt es dabei.
 */

export interface FetchedPage {
  url: string;
  status: number;
  title: string;
  lang: string;
  text: string;
  alts: string[];
  links: { href: string; text: string }[];
  germanAlternate: string | null;
}

export const ECHO_USER_AGENT = "Mozilla/5.0 (compatible; ECHO-Snapshot/1.0; +https://echo.mosaik.partners)";

const BLOCK = new Set([
  "p", "div", "section", "article", "header", "footer", "main", "aside", "nav", "li", "ul", "ol",
  "h1", "h2", "h3", "h4", "h5", "h6", "br", "tr", "td", "th", "table", "blockquote", "figcaption", "dd", "dt", "button", "form",
]);
const SKIP = new Set(["script", "style", "noscript", "template", "svg", "head", "iframe"]);

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "", ndash: "–", mdash: "—", hellip: "…",
  laquo: "«", raquo: "»", lsquo: "‘", rsquo: "’", sbquo: "‚", ldquo: "“", rdquo: "”", bdquo: "„", middot: "·", bull: "•",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ss", eacute: "é", egrave: "è", agrave: "à",
  ccedil: "ç", ecirc: "ê", acirc: "â", ocirc: "ô", icirc: "î", euro: "€", copy: "©", reg: "®", trade: "™", times: "×",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED[code] ?? m;
  });
}

function cleanText(raw: string): string {
  return decodeEntities(raw)
    .replace(/­/g, "")
    .split("\n")
    .map((l) => l.replace(/[ \t\r\f\v ]+/g, " ").trim())
    .filter((l, i, arr) => l.length > 0 || (i > 0 && arr[i - 1].length > 0))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Liest eine Seite per einfachem Abruf. Gibt null zurück, wenn keine HTML-Seite kommt. */
export async function fetchPage(url: string, timeoutMs = 20000): Promise<FetchedPage | null> {
  const res = await fetch(url, {
    headers: {
      "user-agent": ECHO_USER_AGENT,
      accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      "accept-language": "de-CH,de;q=0.9,en;q=0.4",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const finalUrl = res.url || url;
  if (!res.ok) {
    await res.body?.cancel();
    return { url: finalUrl, status: res.status, title: "", lang: "", text: "", alts: [], links: [], germanAlternate: null };
  }
  const type = res.headers.get("content-type") || "";
  if (!/html/i.test(type)) {
    await res.body?.cancel();
    return null;
  }
  return parseHtml(res, finalUrl);
}

/** Zerlegt eine HTML-Antwort mit dem HTMLRewriter des Workers. */
export async function parseHtml(res: Response, baseUrl: string): Promise<FetchedPage> {
  let title = "";
  let lang = "";
  let text = "";
  let skipDepth = 0;
  let inTitle = false;
  const alts: string[] = [];
  const links: { href: string; text: string }[] = [];
  let currentLink: { href: string; text: string } | null = null;
  let germanAlternate: string | null = null;
  const abs = (h: string) => {
    try {
      return new URL(decodeEntities(h), baseUrl).toString();
    } catch {
      return "";
    }
  };

  const rewriter = new HTMLRewriter()
    .on("html", { element(e) { lang = e.getAttribute("lang") || ""; } })
    .on("title", {
      element(e) {
        inTitle = true;
        e.onEndTag(() => { inTitle = false; });
      },
      text(t) { if (inTitle) title += t.text; },
    })
    .on('link[rel="alternate"][hreflang]', {
      element(e) {
        const hl = (e.getAttribute("hreflang") || "").toLowerCase();
        const href = e.getAttribute("href");
        if (!germanAlternate && href && hl.startsWith("de")) germanAlternate = abs(href);
      },
    })
    .on("img[alt]", {
      element(e) {
        const a = decodeEntities(e.getAttribute("alt") || "").trim();
        if (a.length > 2 && !alts.includes(a)) alts.push(a);
      },
    })
    .on("a[href]", {
      element(e) {
        const href = abs(e.getAttribute("href") || "");
        const link = { href, text: decodeEntities(e.getAttribute("aria-label") || "") };
        currentLink = link;
        if (href) links.push(link);
        text += " ";
        e.onEndTag(() => {
          text += " ";
          link.text = link.text.replace(/\s+/g, " ").trim().slice(0, 80);
          if (currentLink === link) currentLink = null;
        });
      },
    })
    .on("body *", {
      element(e) {
        const tag = e.tagName.toLowerCase();
        if (SKIP.has(tag)) {
          skipDepth++;
          e.onEndTag(() => { skipDepth--; });
          return;
        }
        if (BLOCK.has(tag)) {
          text += "\n";
          try { e.onEndTag(() => { text += "\n"; }); } catch { /* leere Elemente wie <br> */ }
        }
      },
      text(t) {
        if (skipDepth > 0) return;
        text += t.text;
        if (currentLink) currentLink.text += decodeEntities(t.text);
      },
    });

  await rewriter.transform(res).arrayBuffer();

  if (!germanAlternate) {
    const hit = links.find((l) => {
      try {
        return /^(de|deutsch)$/i.test(l.text.trim()) || /\/de(-ch)?(\/|$)/i.test(new URL(l.href).pathname);
      } catch {
        return false;
      }
    });
    if (hit) germanAlternate = hit.href;
  }

  return {
    url: baseUrl,
    status: res.status,
    title: decodeEntities(title).trim(),
    lang,
    text: cleanText(text),
    alts,
    links,
    germanAlternate,
  };
}
