(function () {
  "use strict";
  var app = document.getElementById("app");
  var id = (location.pathname.match(/\/r\/([a-z0-9]+)/) || [])[1];
  // Admin-Schlüssel aus dem Link übernehmen und sofort aus der Adresszeile entfernen,
  // damit er nicht versehentlich weitergegeben wird.
  var adminKey = new URLSearchParams(location.search).get("key") || "";
  try {
    if (adminKey) {
      sessionStorage.setItem("echoAdminKey", adminKey);
      history.replaceState(null, "", location.pathname);
    } else {
      adminKey = sessionStorage.getItem("echoAdminKey") || "";
    }
  } catch (e) { /* ohne Speicher geht es auch */ }
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
        "<div><p>" + esc(ind.finding) + "</p>" + evidence(ind.evidence) + "</div></div>";
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
    h += "<h1>" + esc(name) + "</h1>";
    h += '<div class="muted">' + esc(host(r.input.url)) + " · " + r.pagesRead.length + " Seiten gelesen" + (r.input.competitors.length ? " · " + r.input.competitors.length + " Mitbewerber verglichen" : "") + "</div>";
    h += '<div class="retell card"><div class="kicker">In einem Satz – so wird weitererzählt</div><q>' + esc(rep.retell_sentence) + "</q><p>" + esc(rep.retell_verdict) + "</p></div>";
    h += '<div class="profile">' + ["E", "C", "H", "O"].map(function (k) {
      var s = dims[k] ? dims[k].strength : "fehlt";
      return '<div><b class="s-' + s + '">' + k + "</b><span>" + DIM[k].name + "<br><small>" + STRENGTH_LABEL[s] + "</small></span></div>";
    }).join("") + "</div>";
    h += '<div class="legend"><span>Farbkraft = Stärke:</span><span><b class="s-fehlt">A</b>fehlt</span><span><b class="s-behauptet">A</b>behauptet</span><span><b class="s-erkennbar">A</b>erkennbar</span><span><b class="s-belegt">A</b>belegt</span></div>';
    h += "</div></section>";

    // Muster
    h += '<section class="band"><div class="wrap"><div><div class="kicker">Das Muster</div><h2>' + esc(rep.pattern.name) + "</h2></div><div><p>" + esc(rep.pattern.text) + "</p></div></div></section>";

    // E
    h += '<section class="dim"><div class="wrap">' + dimHead("E");
    h += '<div class="two"><div class="panel"><div class="kicker">Atmosphäre</div><p><b>Kern:</b> ' + esc(rep.atmosphere.kern) + "</p><p><b>Emotion:</b> " + esc(rep.atmosphere.emotion) + "</p><p><b>Atmosphäre:</b> " + esc(rep.atmosphere.atmosphaere) + "</p></div>";
    h += '<div class="panel"><div class="kicker">Held der Geschichte</div><div class="traits">' + esc(rep.hero.who) + "</div><p>" + esc(rep.hero.text) + "</p></div></div>";
    h += rows(r, ["E1", "E2", "E3", "E4"]) + "</div></section>";

    // C
    var a = r.archetype;
    h += '<section class="dim alt"><div class="wrap">' + dimHead("C");
    h += '<div class="two"><div class="panel"><div class="kicker">So wirkt ihr heute</div>';
    if (a.onesided) {
      h += '<div class="name">Einseitig: ' + esc(a.primary) + "</div><p>" + esc(a.primary) + " (" + esc(a.primaryText) + ") trägt den Auftritt allein – ohne zweiten Vorteil als Gegengewicht.</p>";
    } else {
      h += '<div class="name">' + esc(a.name) + "</div><p>" + esc(a.primary) + " (" + esc(a.primaryText) + ") + " + esc(a.secondary) + " (" + esc(a.secondaryText) + ")</p>";
    }
    h += '<div class="traits">' + a.traits.map(esc).join(" · ") + "</div><p>" + esc(rep.archetype.reasoning) + "</p></div>";
    h += '<div class="panel"><div class="kicker">Tonalität</div>' + (function () {
      var c2 = (rep.indicators || []).find(function (i) { return i.id === "C2"; });
      return c2 ? segs(c2.level) + '<div class="lvl">' + esc(LEVELS[c2.level]) + "</div><p>" + esc(c2.finding) + "</p>" + evidence(c2.evidence) : "";
    })() + "</div></div>";
    h += rows(r, ["C1"]) + "</div></section>";

    // H
    h += '<section class="dim"><div class="wrap">' + dimHead("H");
    if (rep.page_comparison && rep.page_comparison.length) {
      h += '<div class="table"><div class="tr th"><div>Seite</div><div>Charakter wirkt als</div><div>Anrede · Absender</div><div>Versprechen</div><div>Brüche</div></div>';
      h += rep.page_comparison.map(function (p) {
        var none = /^(keine?|–|-)\.?$/i.test((p.breaks || "").trim());
        return '<div class="tr"><div data-l="Seite"><a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.label) + '</a></div><div data-l="Charakter">' + esc(p.archetype_effect) + '</div><div data-l="Anrede · Absender">' + esc(p.address) + " · " + esc(p.sender) + '</div><div data-l="Versprechen">' + esc(p.promise) + '</div><div data-l="Brüche" class="' + (none ? "" : "brk") + '">' + esc(p.breaks) + "</div></div>";
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
    h += '<div class="note"><div class="kicker">Marktlogik</div><div><b>' + esc(POSITION[rep.market_logic.position] || "") + " · " + esc(INVOLVEMENT[rep.market_logic.involvement] || "") + "</b><p>" + esc(rep.market_logic.text) + "</p></div></div>";
    h += rows(r, ["O1", "O2", "O3"]) + "</div></section>";

    // Hebel
    h += '<section class="levers"><div class="wrap"><div class="kicker">Woran ihr arbeiten solltet</div><h2>Drei Hebel</h2><div class="lever-grid">';
    h += (rep.levers || []).map(function (l, i) {
      return '<div class="lever"><div class="lever-top"><div class="nr">' + (i + 1) + '</div><div class="chip">' + esc(l.dimension) + " · " + esc(DIM[l.dimension] ? DIM[l.dimension].name : "") + "</div></div><h3>" + esc(l.title) + "</h3><p>" + esc(l.why) + '</p><div class="first"><b>Erster Schritt:</b> ' + esc(l.first_step) + "</div></div>";
    }).join("");
    h += "</div></div></section>";

    // Abschluss
    var contact = job.contactUrl || "mailto:mk@mosaik.partners";
    h += '<section class="closer"><div class="wrap"><div><div class="kicker">Was ECHO von aussen nicht sieht</div><ul>' + (rep.limits || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
    h += '<div><h2>Das Echo ist gemessen. Den Ruf dahinter klären wir im Gespräch.</h2><div class="actions"><a class="btn light" href="' + esc(contact) + '">Gespräch vereinbaren</a><button class="btn ghost" type="button" onclick="window.print()">Ergebnis als PDF</button><a class="btn ghost" href="/">Neue Analyse</a></div></div></div></section>';

    // Hinweis zur Methode
    h += '<section><div class="wrap meta"><p>Diese Analyse beruht auf dem <a href="https://www.mosaik.partners/echo">ECHO-Modell</a> von <a href="https://www.mosaik.partners/">Mosaik &amp; Partners</a>. Es schärft Markenidentität und Markenerlebnis so, dass eine Marke auch im Zeitalter der KI unverwechselbar bleibt.</p></div></section>';

    app.innerHTML = h;
  }

  function previewBanner() {
    var bar = document.createElement("div");
    bar.className = "preview-bar";
    bar.innerHTML =
      '<div class="wrap"><span><b>Interne Vorschau</b> – noch nicht freigegeben. Wer den Link ohne Passwort öffnet, sieht noch die Warte-Meldung.</span>' +
      '<span class="preview-actions"><button type="button" class="btn light" id="approveBtn">Freigeben</button>' +
      '<a class="btn ghost" href="/admin">Zur Liste</a></span></div>';
    app.insertBefore(bar, app.firstChild);
    document.getElementById("approveBtn").addEventListener("click", function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = "Wird freigegeben …";
      fetch("/api/admin/approve/" + id, { method: "POST", headers: { "x-admin-key": adminKey } })
        .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok) throw new Error(x.j.error || "Fehler");
          bar.innerHTML = '<div class="wrap"><span><b>Freigegeben.</b> Dieser Link ist jetzt für alle sichtbar: ' + esc(shareUrl) + "</span></div>";
          bar.classList.add("ok");
        })
        .catch(function (e) {
          btn.disabled = false;
          btn.textContent = "Freigeben";
          alert("Freigabe hat nicht geklappt: " + e.message);
        });
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
          previewBanner();
          return;
        }
        if (j.status === "review") {
          message("Euer Echo ist gemessen.", "Das Ergebnis wird von Mosaik & Partners noch kurz geprüft und erscheint dann unter diesem Link. Speichere ihn dir – oder schau später wieder vorbei.",
            '<p class="muted" style="margin-top:14px">' + esc(shareUrl) + "</p>");
          return;
        }
        if (j.status === "error") {
          message("Das hat nicht geklappt.", j.error + (j.detail ? " (" + j.detail + ")" : ""), '<div class="actions"><a class="btn" href="/">Neue Analyse</a></div>');
          return;
        }
        render(j);
      })
      .catch(function () { setTimeout(poll, 6000); });
  }
  poll();
})();
