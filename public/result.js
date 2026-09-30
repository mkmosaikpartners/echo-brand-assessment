(function () {
  "use strict";
  var app = document.getElementById("app");
  var id = (location.pathname.match(/\/r\/([a-z0-9]+)/) || [])[1];
  // Admin-Passwort: kommt aus dem Gerätespeicher (gesetzt in /admin), nie aus Links.
  // Ein alter Link mit ?key= wird noch verstanden, aber sofort aus Adresse und Verlauf entfernt.
  var adminKey = "";
  try {
    var fromUrl = new URLSearchParams(location.search).get("key");
    if (fromUrl) {
      localStorage.setItem("echoAdminKey", fromUrl);
      history.replaceState(null, "", location.pathname);
    }
    adminKey = localStorage.getItem("echoAdminKey") || "";
  } catch (e) { /* ohne Speicher keine Admin-Ansicht */ }
  var shareUrl = location.origin + location.pathname;

  var LEVELS = ["fehlt", "behauptet", "erkennbar", "belegt & prägnant"];
  var STRENGTH_LABEL = { fehlt: "fehlt", behauptet: "behauptet", erkennbar: "erkennbar", belegt: "belegt" };
  var DIM = {
    E: { name: "Erlebnis", q: "Was kommt an – und was wird weitererzählt?", color: "var(--taupe)" },
    C: { name: "Charakter", q: "Woher kommt es?", color: "var(--blue-4)" },
    H: { name: "Homogenität", q: "Trägt es überall?", color: "var(--blue-2)" },
    O: { name: "Originalität", q: "Gehört es nur euch?", color: "var(--blue)" },
  };
  var IND = {
    E1: "Orientierung", E2: "Atmosphäre", E3: "Erzählung", E4: "Weitererzählbarkeit",
    C1: "Klarheit des Charakters", C2: "Tonalität und Sorgfalt",
    H1: "Eine Stimme", H2: "Ein Kernversprechen", H3: "Ruf und Echo",
    O1: "Warum", O2: "Wertversprechen", O3: "Belege",
  };
  var ROLE = { start: "Startseite", ueber: "Über uns", angebot: "Angebot", karriere: "Karriere", referenzen: "Referenzen", kontakt: "Kontakt" };
  var POSITION = { nische: "Nischenanbieter", herausforderer: "Herausforderer", kategorie: "Kategorie-Anbieter" };
  var INVOLVEMENT = { funktional: "funktionaler Kauf", gemischt: "gemischter Kauf", bedeutung: "bedeutungsgetriebener Kauf" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } }
  function pathOf(u) { try { var x = new URL(u); return x.hostname.replace(/^www\./, "") + (x.pathname === "/" ? "" : x.pathname); } catch (e) { return u; } }
  function date(d) { try { return new Date(d).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; } }

  var steps = [["warten", "In der Warteschlange"], ["lesen", "Website lesen"], ["einstufen", "Einstufen"], ["auswerten", "Auswerten"]];
  function waiting(step, url) {
    var idx = steps.findIndex(function (s) { return s[0] === step; });
    app.innerHTML =
      '<section class="waiting"><div class="wrap">' +
      '<div class="pulse" aria-hidden="true"><span></span><span></span><span></span><b>E</b></div>' +
      "<h1 style=\"font-size:36px\">Wir hören hin.</h1>" +
      '<p class="muted" style="margin-top:8px">' + esc(host(url)) + " wird gelesen und eingestuft. Das dauert zwei bis drei Minuten – du kannst diese Seite offen lassen.</p>" +
      '<ul class="steps">' +
      steps.map(function (s, i) { return '<li class="' + (i < idx ? "done" : i === idx ? "on" : "") + '">' + s[1] + "</li>"; }).join("") +
      "</ul></div></section>";
  }

  function message(title, text, extra) {
    app.innerHTML =
      '<section class="waiting"><div class="wrap" style="max-width:720px">' +
      '<h1 style="font-size:40px;line-height:1.1">' + esc(title) + "</h1>" +
      '<p style="margin-top:14px;font-size:20px">' + esc(text) + "</p>" + (extra || "") +
      "</div></section>";
  }

  // Bearbeitbare Texte (nur in der Admin-Ansicht aktiv)
  function ed(path, text) {
    return '<span data-edit="' + path + '">' + esc(text) + "</span>";
  }

  function segs(level) {
    var h = '<div class="segs" aria-hidden="true">';
    for (var i = 0; i < 3; i++) h += '<i class="' + (i < level ? "on" : "") + '"></i>';
    return h + "</div>";
  }

  function evidence(list) {
    return (list || []).map(function (e) {
      var src = '<a href="' + esc(e.url) + '" target="_blank" rel="noopener">' + esc(pathOf(e.url)) + "</a>";
      return '<div class="ev">' + (e.kind === "zitat" ? "<q>" + esc(e.text) + "</q>" : esc(e.text)) + " – " + src + "</div>";
    }).join("");
  }

  function rows(result, ids) {
    return ids.map(function (iid) {
      var ind = (result.report.indicators || []).find(function (i) { return i.id === iid; });
      if (!ind) return "";
      return '<div class="row"><h3>' + esc(IND[iid]) + "</h3>" +
        "<div>" + segs(ind.level) + '<div class="lvl">' + esc(LEVELS[ind.level]) + "</div></div>" +
        "<div><p>" + ed("report.indicators.#" + iid + ".finding", ind.finding) + "</p>" + evidence(ind.evidence) + "</div></div>";
    }).join("");
  }

  function dimHead(key) {
    var d = DIM[key];
    return '<div class="dim-head"><div class="letter" style="color:' + d.color + '">' + key + "</div><div><h2>" + d.name + "</h2><p>" + d.q + "</p></div></div>";
  }

  function render(job) {
    var r = job.result, rep = r.report;
    var dims = {};
    r.dimensions.forEach(function (d) { dims[d.key] = d; });
    var name = rep.company_name || host(r.input.url);
    document.title = "Das Echo von " + name + " | ECHO Snapshot";
    var hasDesc = !!r.input.description;
    var h = "";

    // Einstieg
    h += '<section class="r-hero"><div class="ripples" aria-hidden="true"><svg viewBox="0 0 1200 1200"><circle cx="900" cy="700" r="140"></circle><circle cx="900" cy="700" r="320"></circle><circle cx="900" cy="700" r="520"></circle><circle cx="900" cy="700" r="740"></circle></svg></div><div class="wrap">';
    h += '<div class="kicker">Euer Echo · Momentaufnahme vom ' + esc(date(r.createdAt)) + "</div>";
    h += "<h1>" + (rep.company_name ? ed("report.company_name", rep.company_name) : esc(name)) + "</h1>";
    h += '<div class="muted">' + esc(host(r.input.url)) + " · " + r.pagesRead.length + " Seiten gelesen" + (r.input.competitors.length ? " · " + r.input.competitors.length + " Mitbewerber verglichen" : "") + "</div>";
    h += '<div class="retell card"><div class="kicker">In einem Satz – so wird weitererzählt</div><q>' + ed("report.retell_sentence", rep.retell_sentence) + "</q>" +
      window.EchoRetell(rep).map(function (x) {
        return '<div class="rt-row">' + (x[0] ? '<span class="rt-label">' + x[0] + "</span>" : "") + "<p>" + ed(x[2], x[1]) + "</p></div>";
      }).join("") + "</div>";
    h += '<div class="profile">' + ["E", "C", "H", "O"].map(function (k) {
      var s = dims[k] ? dims[k].strength : "fehlt";
      return '<div><b class="s-' + s + '">' + k + "</b><span>" + DIM[k].name + "<br><small>" + STRENGTH_LABEL[s] + "</small></span></div>";
    }).join("") + "</div>";
    h += '<div class="legend"><span>Die Farbe zeigt die Stärke:</span><span><b class="s-fehlt">●</b>fehlt</span><span><b class="s-behauptet">●</b>behauptet</span><span><b class="s-erkennbar">●</b>erkennbar</span><span><b class="s-belegt">●</b>belegt</span></div>';
    h += "</div></section>";

    // Muster
    var pat = rep.pattern || {};
    if (pat.name || pat.text) h += '<section class="band"><div class="wrap"><div><div class="kicker">Das Muster</div><h2>' + ed("report.pattern.name", pat.name) + "</h2></div><div><p>" + ed("report.pattern.text", pat.text) + "</p></div></div></section>";

    // E
    h += '<section class="dim"><div class="wrap">' + dimHead("E");
    var at = rep.atmosphere || {}, he = rep.hero || {};
    var panels = [];
    if (at.kern || at.emotion || at.atmosphaere) {
      panels.push('<div class="panel"><div class="kicker">Atmosphäre</div>' +
        [["Kern", at.kern, "kern"], ["Emotion", at.emotion, "emotion"], ["Atmosphäre", at.atmosphaere, "atmosphaere"]].filter(function (x) { return x[1]; })
          .map(function (x) { return "<p><b>" + x[0] + ":</b> " + ed("report.atmosphere." + x[2], x[1]) + "</p>"; }).join("") + "</div>");
    }
    if (he.who) panels.push('<div class="panel"><div class="kicker">Held der Geschichte</div><div class="traits">' + ed("report.hero.who", he.who) + "</div><p>" + ed("report.hero.text", he.text) + "</p></div>");
    if (panels.length) h += '<div class="' + (panels.length === 2 ? "two" : "one") + '">' + panels.join("") + "</div>";
    h += rows(r, ["E1", "E2", "E3", "E4"]) + "</div></section>";

    // C
    var a = r.archetype;
    h += '<section class="dim alt"><div class="wrap">' + dimHead("C");
    var pf = window.EchoProfile(r);
    h += '<div class="two"><div class="panel profile-panel"><div class="kicker">' + pf.kicker + "</div>";
    if (pf.title) h += '<div class="name">' + esc(pf.title) + "</div>";
    if (pf.effects) h += '<div class="effects">' + esc(pf.effects) + "</div>";
    if (pf.traits.length) h += '<div class="traits">' + ed("archetype.traits", pf.traits.join(" · ")) + "</div>";
    if (pf.reasoning) h += "<p>" + ed("report.archetype.reasoning", pf.reasoning) + "</p>";
    h += "</div>";
    h += '<div class="panel"><div class="kicker">Tonalität</div>' + (function () {
      var c2 = (rep.indicators || []).find(function (i) { return i.id === "C2"; });
      return c2 ? segs(c2.level) + '<div class="lvl">' + esc(LEVELS[c2.level]) + "</div><p>" + ed("report.indicators.#C2.finding", c2.finding) + "</p>" + evidence(c2.evidence) : "";
    })() + "</div></div>";
    h += rows(r, ["C1"]) + "</div></section>";

    // H
    h += '<section class="dim"><div class="wrap">' + dimHead("H");
    if (rep.page_comparison && rep.page_comparison.length) {
      h += '<div class="table"><div class="tr th"><div>Seite</div><div>Charakter wirkt als</div><div>Anrede · Absender</div><div>Versprechen</div><div>Brüche</div></div>';
      h += rep.page_comparison.map(function (p, pi) {
        var none = /^(keine?|–|-)\.?$/i.test((p.breaks || "").trim());
        var pc = "report.page_comparison." + pi + ".";
        return '<div class="tr"><div data-l="Seite"><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.label) + '</a></div><div data-l="Charakter">' + ed(pc + "archetype_effect", p.archetype_effect) + '</div><div data-l="Anrede · Absender">' + ed(pc + "address", p.address) + " · " + ed(pc + "sender", p.sender) + '</div><div data-l="Versprechen">' + ed(pc + "promise", p.promise) + '</div><div data-l="Brüche" class="' + (none ? "" : "brk") + '">' + ed(pc + "breaks", p.breaks) + "</div></div>";
      }).join("") + "</div>";
    }
    h += rows(r, hasDesc ? ["H1", "H2", "H3"] : ["H1", "H2"]);
    if (hasDesc) {
      var h3 = (rep.indicators || []).find(function (i) { return i.id === "H3"; });
      h += '<div class="two"><div class="panel"><div class="kicker">Der Ruf – eure Kurzbeschreibung</div><p style="font-size:21px">«' + esc(r.input.description) + '»</p></div><div class="panel"><div class="kicker">Das Echo – die Website</div><p style="font-size:21px">' + esc(h3 ? h3.finding : "") + "</p></div></div>";
    }
    h += "</div></section>";

    // O
    h += '<section class="dim alt"><div class="wrap">' + dimHead("O");
    var ml = rep.market_logic || {};
    var mlHead = [POSITION[ml.position], INVOLVEMENT[ml.involvement]].filter(Boolean).join(" · ");
    if (mlHead || ml.text) h += '<div class="note"><div class="kicker">Marktlogik</div><div>' + (mlHead ? "<b>" + esc(mlHead) + "</b>" : "") + "<p>" + ed("report.market_logic.text", ml.text) + "</p></div></div>";
    h += rows(r, ["O1", "O2", "O3"]) + "</div></section>";

    // Hebel
    h += '<section class="levers"><div class="wrap"><div class="kicker">Worüber es sich nachzudenken lohnt</div><h2>Drei Hebel</h2><div class="lever-grid">';
    h += (rep.levers || []).map(function (l, i) {
      var lp = "report.levers." + i + ".";
      var body = l.question
        ? '<div class="lv-part"><div class="lv-label">Was wir sehen</div><p>' + ed(lp + "why", l.why) + '</p></div><div class="lv-part lv-q"><div class="lv-label">Die Frage an euch</div><p>' + ed(lp + "question", l.question) + '</p></div><div class="first"><div class="lv-label">Ein möglicher Weg</div>' + ed(lp + "option", l.option) + "</div>"
        : "<p>" + ed(lp + "why", l.why) + '</p><div class="first"><b>Erster Schritt:</b> ' + ed(lp + "first_step", l.first_step) + "</div>";
      return '<div class="lever"><div class="lever-top"><div class="nr">' + (i + 1) + '</div><div class="chip">' + esc(l.dimension) + " · " + esc(DIM[l.dimension] ? DIM[l.dimension].name : "") + "</div></div><h3>" + ed(lp + "title", l.title) + "</h3>" + body + "</div>";
    }).join("");
    h += "</div></div></section>";

    // Abschluss
    var contact = job.contactUrl || "https://www.mosaik.partners/#termin-mit-martin";
    h += '<section class="closer"><div class="wrap">';
    h += '<div class="closer-main">' + (rep.fazit ? '<div class="kicker">Fazit</div><p class="fazit">' + ed("report.fazit", rep.fazit) + "</p>" : "") +
      '<h2>Das Echo hallt nach.</h2><p class="closer-lead">Die Möglichkeiten erläutern wir gerne in einem Gespräch.</p>' +
      '<div class="actions"><a class="btn light" href="' + esc(contact) + '" target="_blank" rel="noopener">Gespräch vereinbaren</a></div></div>';
    h += '<div class="closer-limits"><div class="kicker">Was ECHO von aussen nicht sieht</div><ul>' + (rep.limits || []).map(function (x, li) { return "<li>" + ed("report.limits." + li, x) + "</li>"; }).join("") + "</ul></div>";
    h += "</div></section>";

    // Für Entschlossene: Brand Identity Sprint (bewusst leiser als das Gespräch)
    h += '<section class="sprint"><div class="wrap"><a class="sprint-card" href="https://schwendi.swiss/brandsprint" target="_blank" rel="noopener">' +
      '<span class="kicker">Für Entschlossene</span><span class="sprint-title">Brand Identity Sprint · 3 Tage. Eine Marke.</span>' +
      '<span class="sprint-text">Drei Tage im Pilgerhaus Schwendi, um eure Marke zu schärfen.</span><span class="sprint-more">Mehr zum Sprint →</span></a></div></section>';

    // Nebenwege und Hinweis zur Methode
    h += '<section><div class="wrap meta"><p class="side-links"><button type="button" class="linkish" id="pdfBtn">Ergebnis als PDF herunterladen</button> · <a href="/">Neue Analyse starten</a></p>' +
      '<p>Diese Analyse beruht auf dem <a href="https://www.mosaik.partners/echo">ECHO-Modell</a> von <a href="https://www.mosaik.partners/">Mosaik &amp; Partners</a>. Es schärft Markenidentität und Markenerlebnis so, dass eine Marke auch im Zeitalter der KI unverwechselbar bleibt.</p></div></section>';

    app.innerHTML = h;
  }

  /* Admin-Leiste: Bearbeiten, Speichern, Freigeben */
  function adminBar(job) {
    var review = job.status === "review";
    var bar = document.createElement("div");
    bar.className = "preview-bar";
    bar.innerHTML =
      '<div class="wrap"><span id="barText">' + (review
        ? "<b>Interne Vorschau</b> – noch nicht freigegeben. Wer den Link ohne Passwort öffnet, sieht noch die Warte-Meldung."
        : "<b>Admin-Ansicht</b> – dieses Ergebnis ist freigegeben. Änderungen sind sofort für alle sichtbar.") + "</span>" +
      '<span class="preview-actions"><button type="button" class="btn ghost" id="editBtn">Bearbeiten</button>' +
      (review ? '<button type="button" class="btn light" id="approveBtn">Freigeben</button>' : "") +
      '<a class="btn ghost" href="/admin">Zur Liste</a></span></div>';
    app.insertBefore(bar, app.firstChild);

    var editing = false;
    var editBtn = document.getElementById("editBtn");
    var fields = function () { return Array.prototype.slice.call(document.querySelectorAll("[data-edit]")); };
    fields().forEach(function (el) { el.setAttribute("data-orig", el.textContent); });

    function changes() {
      var out = {}, n = 0;
      fields().forEach(function (el) {
        var v = el.innerText.replace(/\s+/g, " ").trim();
        if (v !== el.getAttribute("data-orig").replace(/\s+/g, " ").trim()) { out[el.getAttribute("data-edit")] = v; n++; }
      });
      return n ? out : null;
    }
    function save() {
      var c = changes();
      if (!c) return Promise.resolve(false);
      return fetch("/api/admin/edit/" + id, { method: "POST", headers: { "x-admin-key": adminKey, "content-type": "application/json" }, body: JSON.stringify({ changes: c }) })
        .then(function (res) { return res.json().then(function (j) { if (!res.ok) throw new Error(j.error || "Fehler"); return true; }); });
    }
    function setEditing(on) {
      editing = on;
      document.body.classList.toggle("editing", on);
      fields().forEach(function (el) {
        if (on) {
          el.setAttribute("contenteditable", "plaintext-only");
          if (el.contentEditable !== "plaintext-only") el.setAttribute("contenteditable", "true");
        } else el.removeAttribute("contenteditable");
      });
      editBtn.textContent = on ? "Änderungen speichern" : "Bearbeiten";
      document.getElementById("barText").innerHTML = on
        ? "<b>Bearbeiten</b> – klicke in einen umrandeten Text und ändere ihn. Belege (Zitate) bleiben unverändert."
        : document.getElementById("barText").innerHTML;
    }
    // Eingefügter Text immer ohne Formatierung
    app.addEventListener("paste", function (e) {
      if (!editing || !e.target.closest || !e.target.closest("[data-edit]")) return;
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData("text");
      document.execCommand("insertText", false, t);
    });
    window.addEventListener("beforeunload", function (e) { if (editing && changes()) { e.preventDefault(); e.returnValue = ""; } });

    editBtn.addEventListener("click", function () {
      if (!editing) { setEditing(true); return; }
      editBtn.disabled = true;
      editBtn.textContent = "Wird gespeichert …";
      save().then(function (saved) {
        editing = false;
        location.reload();
        if (!saved) { editBtn.disabled = false; setEditing(false); }
      }).catch(function (e) {
        editBtn.disabled = false;
        editBtn.textContent = "Änderungen speichern";
        alert("Speichern hat nicht geklappt: " + e.message);
      });
    });

    var approveBtn = document.getElementById("approveBtn");
    if (approveBtn) approveBtn.addEventListener("click", function () {
      approveBtn.disabled = true;
      approveBtn.textContent = "Wird freigegeben …";
      (editing ? save() : Promise.resolve(false))
        .then(function () { return fetch("/api/admin/approve/" + id, { method: "POST", headers: { "x-admin-key": adminKey } }); })
        .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok) throw new Error(x.j.error || "Fehler");
          editing = false;
          document.body.classList.remove("editing");
          bar.innerHTML = '<div class="wrap"><span><b>Freigegeben.</b> Dieser Link ist jetzt für alle sichtbar: ' + esc(shareUrl) + "</span></div>";
          bar.classList.add("ok");
          fields().forEach(function (el) { el.removeAttribute("contenteditable"); });
        })
        .catch(function (e) {
          approveBtn.disabled = false;
          approveBtn.textContent = "Freigeben";
          alert("Freigabe hat nicht geklappt: " + e.message);
        });
    });
  }

  function afterRender(job) {
    // Präsentation für das PDF (unsichtbar auf dem Bildschirm)
    var deck = document.getElementById("deck");
    if (!deck) { deck = document.createElement("div"); deck.id = "deck"; document.body.appendChild(deck); }
    if (window.EchoDeck) {
      deck.innerHTML = window.EchoDeck.build(job);
      document.documentElement.classList.add("deck-print");
      var done = function () { window.EchoDeck.fit(deck); document.body.setAttribute("data-ready", "1"); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(done); else done();
      window.addEventListener("beforeprint", function () { window.EchoDeck.fit(deck); });
    }
    var btn = document.getElementById("pdfBtn");
    if (btn) btn.addEventListener("click", function () {
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = "PDF wird erstellt …";
      fetch("/api/pdf/" + id, { headers: adminKey ? { "x-admin-key": adminKey } : {} })
        .then(function (res) {
          if (!res.ok) throw new Error("pdf");
          var cd = res.headers.get("content-disposition") || "";
          var m = cd.match(/filename="([^"]+)"/);
          return res.blob().then(function (b) { return { b: b, name: m ? m[1] : "ECHO-Snapshot.pdf" }; });
        })
        .then(function (x) {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(x.b);
          a.download = x.name;
          document.body.appendChild(a);
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        })
        .catch(function () {
          // Rückfall: Drucken im Browser (zeigt dieselbe Präsentation)
          window.print();
        })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });
  }

  var tries = 0;
  function poll() {
    if (!id) { message("Kein Ergebnis", "Dieser Link ist unvollständig."); return; }
    fetch("/api/result/" + id, { headers: adminKey ? { "x-admin-key": adminKey } : {} })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
      .then(function (x) {
        var j = x.j;
        if (!x.ok) { message("Nicht gefunden", j.error || "Dieses Ergebnis gibt es nicht oder nicht mehr."); return; }
        if (j.status === "queued" || j.status === "running") {
          waiting(j.status === "queued" ? "warten" : j.step, j.url);
          tries++;
          if (tries < 200) setTimeout(poll, 4000);
          else message("Das dauert ungewöhnlich lange", "Bitte lade die Seite in ein paar Minuten neu.");
          return;
        }
        if (j.status === "review" && j.result) {
          // Interne Vorschau für Mosaik & Partners
          render(j);
          adminBar(j);
          afterRender(j);
          return;
        }
        if (j.status === "review") {
          message("Euer Echo ist gemessen.", "Das Ergebnis wird von Mosaik & Partners noch kurz geprüft. Sobald es freigegeben ist, bekommst du den Link per E-Mail – es erscheint dann auch unter dieser Adresse.",
            '<p class="muted" style="margin-top:14px">' + esc(shareUrl) + "</p>");
          return;
        }
        if (j.status === "error") {
          message("Das hat nicht geklappt.", j.error + (j.detail ? " (" + j.detail + ")" : ""), '<div class="actions"><a class="btn" href="/">Neue Analyse</a></div>');
          return;
        }
        render(j);
        if (j.admin) adminBar(j);
        afterRender(j);
      })
      .catch(function () { setTimeout(poll, 6000); });
  }
  poll();
})();
