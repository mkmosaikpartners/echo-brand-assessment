/* ECHO Snapshot – Ergebnis als Präsentation (16:9). Wird für das PDF verwendet. */
(function () {
  "use strict";

  var LEVELS = ["fehlt", "behauptet", "erkennbar", "belegt & prägnant"];
  var STRENGTH_LABEL = { fehlt: "fehlt", behauptet: "behauptet", erkennbar: "erkennbar", belegt: "belegt" };
  var DIM = {
    E: { name: "Erlebnis", q: "Was kommt an – und was wird weitererzählt?", color: "#8a816f" },
    C: { name: "Charakter", q: "Woher kommt es?", color: "#4b5670" },
    H: { name: "Homogenität", q: "Trägt es überall?", color: "#37435e" },
    O: { name: "Originalität", q: "Gehört es nur euch?", color: "#28354f" },
  };
  var IND = {
    E1: "Orientierung", E2: "Atmosphäre", E3: "Erzählung", E4: "Weitererzählbarkeit",
    C1: "Klarheit des Charakters", C2: "Tonalität und Sorgfalt",
    H1: "Eine Stimme", H2: "Ein Kernversprechen", H3: "Ruf und Echo",
    O1: "Warum", O2: "Wertversprechen", O3: "Belege",
  };
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

  var RIPPLES = '<svg class="d-rip" viewBox="0 0 1200 1200" aria-hidden="true"><circle cx="600" cy="600" r="120"/><circle cx="600" cy="600" r="260"/><circle cx="600" cy="600" r="420"/><circle cx="600" cy="600" r="590"/></svg>';

  function segs(level) {
    var h = '<span class="d-segs">';
    for (var i = 0; i < 3; i++) h += '<i class="' + (i < level ? "on" : "") + '"></i>';
    return h + "</span>";
  }
  function ev(list, max) {
    return (list || []).slice(0, max).map(function (e) {
      return '<div class="d-ev">' + (e.kind === "zitat" ? "«" + esc(e.text) + "»" : esc(e.text)) + ' <span>– ' + esc(pathOf(e.url)) + "</span></div>";
    }).join("");
  }
  function indBlock(ind) {
    return '<div class="d-ind"><div class="d-ind-l"><h3>' + esc(IND[ind.id]) + "</h3>" + segs(ind.level) + '<div class="d-lvl">' + esc(LEVELS[ind.level]) + "</div></div>" +
      '<div class="d-ind-r"><p>' + esc(ind.finding) + "</p>" + ev(ind.evidence, 2) + "</div></div>";
  }
  function head(key, sub) {
    var d = DIM[key];
    return '<div class="d-head"><b style="color:' + d.color + '">' + key + "</b><div><h2>" + d.name + (sub ? ' <span>· ' + esc(sub) + "</span>" : "") + "</h2><p>" + d.q + "</p></div></div>";
  }

  function build(job) {
    var r = job.result, rep = r.report;
    var name = rep.company_name || host(r.input.url);
    var dims = {};
    r.dimensions.forEach(function (d) { dims[d.key] = d; });
    var find = function (id) { return (rep.indicators || []).find(function (i) { return i.id === id; }); };
    var slides = [];
    var add = function (cls, body) {
      var rip = body.indexOf(RIPPLES) === 0;
      slides.push({ cls: cls, body: rip ? body.slice(RIPPLES.length) : body, bg: rip ? RIPPLES : "" });
    };

    // 1 Titel
    add("d-cover", RIPPLES +
      '<div class="d-top"><span class="d-brand">ECHO SNAPSHOT</span><span>Mosaik &amp; Partners</span></div>' +
      '<div class="d-cover-main"><div class="d-kick">Euer Echo · Momentaufnahme vom ' + esc(date(r.createdAt)) + "</div><h1>" + esc(name) + "</h1>" +
      '<div class="d-muted">' + esc(host(r.input.url)) + " · " + r.pagesRead.length + " Seiten gelesen" + (r.input.competitors.length ? " · " + r.input.competitors.length + " Mitbewerber verglichen" : "") + "</div></div>" +
      '<div class="d-letters"><span>E</span><span>C</span><span>H</span><span>O</span></div>');

    // 2 In einem Satz
    add("d-white d-center", '<div class="d-kick">In einem Satz – so wird weitererzählt</div><blockquote>«' + esc(rep.retell_sentence) + '»</blockquote><p class="d-lead">' + esc(rep.retell_verdict) + "</p>");

    // 3 Profil + Muster
    var prof = '<div class="d-kick">Euer Profil</div><div class="d-profile">' + ["E", "C", "H", "O"].map(function (k) {
      var s = dims[k] ? dims[k].strength : "fehlt";
      return '<div><b class="s-' + s + '">' + k + "</b><span>" + DIM[k].name + "<small>" + STRENGTH_LABEL[s] + "</small></span></div>";
    }).join("") + "</div>" +
      '<div class="d-legend"><span>Farbkraft = Stärke:</span><span><b class="s-fehlt">A</b>fehlt</span><span><b class="s-behauptet">A</b>behauptet</span><span><b class="s-erkennbar">A</b>erkennbar</span><span><b class="s-belegt">A</b>belegt</span></div>';
    add("d-cream", prof);

    var pat = rep.pattern || {};
    if (pat.name || pat.text) add("d-blue", RIPPLES + '<div class="d-kick">Das Muster</div><h2 class="d-big">' + esc(pat.name) + '</h2><p class="d-lead">' + esc(pat.text) + "</p>");

    // E
    var at = rep.atmosphere || {}, he = rep.hero || {};
    var panels = [];
    if (at.kern || at.emotion || at.atmosphaere) {
      panels.push('<div class="d-panel"><div class="d-kick">Atmosphäre</div>' +
        [["Kern", at.kern], ["Emotion", at.emotion], ["Atmosphäre", at.atmosphaere]].filter(function (x) { return x[1]; })
          .map(function (x) { return "<p><b>" + x[0] + ":</b> " + esc(x[1]) + "</p>"; }).join("") + "</div>");
    }
    if (he.who) panels.push('<div class="d-panel"><div class="d-kick">Held der Geschichte</div><div class="d-name">' + esc(he.who) + "</div><p>" + esc(he.text) + "</p></div>");
    if (panels.length) add("d-white", head("E") + '<div class="d-cols n' + panels.length + '">' + panels.join("") + "</div>");
    pairs(["E1", "E2", "E3", "E4"], "E");

    // C
    var a = r.archetype;
    var cLeft = '<div class="d-panel"><div class="d-kick">So wirkt ihr heute</div>' +
      (a.onesided
        ? '<div class="d-name">Einseitig: ' + esc(a.primary) + "</div><p>" + esc(a.primary) + " (" + esc(a.primaryText) + ") trägt den Auftritt allein – ohne zweiten Vorteil als Gegengewicht.</p>"
        : '<div class="d-name">' + esc(a.name) + "</div><p>" + esc(a.primary) + " (" + esc(a.primaryText) + ") + " + esc(a.secondary) + " (" + esc(a.secondaryText) + ")</p>") +
      '<div class="d-traits">' + a.traits.map(esc).join(" · ") + "</div>" + (rep.archetype && rep.archetype.reasoning ? "<p>" + esc(rep.archetype.reasoning) + "</p>" : "") + "</div>";
    var c2 = find("C2");
    var cRight = c2 ? '<div class="d-panel"><div class="d-kick">Tonalität</div>' + segs(c2.level) + '<div class="d-lvl">' + esc(LEVELS[c2.level]) + "</div><p>" + esc(c2.finding) + "</p>" + ev(c2.evidence, 2) + "</div>" : "";
    add("d-white", head("C") + '<div class="d-cols n' + (cRight ? 2 : 1) + '">' + cLeft + cRight + "</div>");
    pairs(["C1"], "C");

    // H
    if (rep.page_comparison && rep.page_comparison.length) {
      var t = '<div class="d-table"><div class="d-tr d-th"><div>Seite</div><div>Charakter wirkt als</div><div>Anrede · Absender</div><div>Versprechen</div><div>Brüche</div></div>' +
        rep.page_comparison.map(function (p) {
          var none = /^(keine?|–|-)\.?$/i.test((p.breaks || "").trim());
          return '<div class="d-tr"><div><b>' + esc(p.label) + "</b></div><div>" + esc(p.archetype_effect) + "</div><div>" + esc(p.address) + " · " + esc(p.sender) + "</div><div>" + esc(p.promise) + '</div><div class="' + (none ? "" : "d-brk") + '">' + esc(p.breaks) + "</div></div>";
        }).join("") + "</div>";
      add("d-white", head("H", "Seite für Seite") + t);
    }
    pairs(["H1", "H2"], "H");
    if (r.input.description) {
      var h3 = find("H3");
      add("d-white", head("H", "Ruf und Echo") + '<div class="d-cols n2"><div class="d-panel"><div class="d-kick">Der Ruf – eure Kurzbeschreibung</div><p class="d-quote">«' + esc(r.input.description) + '»</p></div><div class="d-panel"><div class="d-kick">Das Echo – die Website</div>' + (h3 ? segs(h3.level) + '<div class="d-lvl">' + esc(LEVELS[h3.level]) + "</div><p>" + esc(h3.finding) + "</p>" + ev(h3.evidence, 1) : "") + "</div></div>");
    }

    // O
    var ml = rep.market_logic || {};
    var mlHead = [POSITION[ml.position], INVOLVEMENT[ml.involvement]].filter(Boolean).join(" · ");
    var o1 = find("O1");
    if (mlHead || ml.text) {
      add("d-white", head("O") + '<div class="d-note"><div class="d-kick">Marktlogik</div><div>' + (mlHead ? "<b>" + esc(mlHead) + "</b>" : "") + "<p>" + esc(ml.text) + "</p></div></div>" + (o1 ? indBlock(o1) : ""));
      pairs(["O2", "O3"], "O");
    } else {
      pairs(["O1", "O2", "O3"], "O");
    }

    // Hebel
    add("d-cream", '<div class="d-kick">Worüber es sich nachzudenken lohnt</div><h2 class="d-h2">Drei Hebel</h2><div class="d-levers">' +
      (rep.levers || []).map(function (l, i) {
        var body = l.question
          ? '<div class="d-lv-label">Was wir sehen</div><p>' + esc(l.why) + '</p><div class="d-lv-label">Die Frage an euch</div><p class="d-lv-q">' + esc(l.question) + '</p><div class="d-first"><div class="d-lv-label">Ein möglicher Weg</div>' + esc(l.option) + "</div>"
          : "<p>" + esc(l.why) + '</p><div class="d-first"><b>Erster Schritt:</b> ' + esc(l.first_step) + "</div>";
        return '<div class="d-lever"><div class="d-lever-top"><b>' + (i + 1) + '</b><span>' + esc(l.dimension) + " · " + esc(DIM[l.dimension] ? DIM[l.dimension].name : "") + "</span></div><h3>" + esc(l.title) + "</h3>" + body + "</div>";
      }).join("") + "</div>");

    // Abschluss
    add("d-taupe", '<div class="d-cols n2 d-close"><div><div class="d-kick">Was ECHO von aussen nicht sieht</div><ul>' + (rep.limits || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" +
      '<div><h2 class="d-h2">Das Echo ist gemessen. Den Ruf dahinter klären wir im Gespräch.</h2><p class="d-contact">Gespräch vereinbaren<br><b>mosaik.partners/#termin-mit-martin</b></p></div></div>' +
      '<p class="d-method">Diese Analyse beruht auf dem ECHO-Modell von Mosaik &amp; Partners. Es schärft Markenidentität und Markenerlebnis so, dass eine Marke auch im Zeitalter der KI unverwechselbar bleibt.</p>');

    function pairs(ids, key) {
      var list = ids.map(find).filter(Boolean);
      for (var i = 0; i < list.length; i += 2) {
        add("d-white", head(key) + list.slice(i, i + 2).map(indBlock).join(""));
      }
    }

    var n = slides.length;
    return slides.map(function (s, i) {
      var foot = i === 0 ? "" : '<div class="d-foot"><span>ECHO Snapshot · ' + esc(name) + "</span><span>" + (i + 1) + " / " + n + "</span></div>";
      return '<section class="d-slide ' + s.cls + '">' + s.bg + '<div class="d-in">' + s.body + "</div>" + foot + "</section>";
    }).join("");
  }

  /** Verkleinert die Schrift einer Folie, bis alles Platz hat. */
  function fit(root) {
    var slides = root.querySelectorAll(".d-slide");
    for (var i = 0; i < slides.length; i++) {
      var s = slides[i], box = s.querySelector(".d-in"), k = 1;
      s.style.fontSize = "";
      if (s.classList.contains("d-cover")) continue;
      while (box.scrollHeight > box.clientHeight + 1 && k > 0.62) {
        k -= 0.04;
        s.style.fontSize = (k * 100).toFixed(0) + "%";
      }
    }
  }

  window.EchoDeck = { build: build, fit: fit };
})();
