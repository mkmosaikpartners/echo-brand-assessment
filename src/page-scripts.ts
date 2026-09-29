// Läuft im Browser der gelesenen Seite. Bewusst als Text, damit der Bundler nichts hineinschreibt.
export const EXTRACT_SCRIPT = String.raw`(() => {
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

export const COOKIE_SCRIPT = String.raw`(() => {
  var words = /^(alle akzeptieren|akzeptieren|zustimmen|einverstanden|accept all|accept|ok|verstanden|tout accepter)$/i;
  var btn = Array.from(document.querySelectorAll("button, a[role=button]")).find(function (b) { return words.test((b.textContent || "").trim()); });
  if (btn) btn.click();
})()`;
