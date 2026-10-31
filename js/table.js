/* The register: three tabs of real records (the bot's own table, scripted test chats, the labelled messages), with filters and pop-up details. */
(function () {
  "use strict";
  var R = window.REGISTER; var root = document.getElementById("register"); if (!R || !root) return;
  var S = window.MSsite || {}; function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function $(s, c) { return (c || root).querySelector(s); } function $$(s, c) { return Array.prototype.slice.call((c || root).querySelectorAll(s)); }
  var ORDER = { Emergency: 0, High: 1, Limited: 2, Minimal: 3, "": 4 };
  var NAT = { Verbal: "Words that hurt: names, threats, mockery.", Physical: "Hitting, pushing, breaking or taking someone's things.", Social: "Leaving someone out, spreading rumours, turning friends against them.", Cyber: "Bullying through phones and apps: group chats, edited photos, messages." };
  var RISK = { Emergency: "Someone may be in danger right now. Goes to the top and skips the usual questions.", High: "Serious and ongoing, or involving injury or threats. A counsellor should read it soon.", Limited: "Real but less urgent: it should still be read, and it sits lower in the queue.", Minimal: "A question or worry, not an incident." };
  function pill(r) { return r ? '<span class="pill r-' + esc(r) + '">' + esc(r) + "</span>" : '<span class="pill r-none">not saved</span>'; }
  function chip(group, val, label, on) { return '<button type="button" class="chip" data-g="' + group + '" data-v="' + esc(val) + '" aria-pressed="' + (on ? "true" : "false") + '">' + esc(label) + "</button>"; }

  /* ----- tabs ----- */
  var tabs = $$(".reg-tab"), panels = $$(".reg-panel");
  function pick(k, focus) {
    tabs.forEach(function (t) { var on = t.getAttribute("data-tab") === k; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    panels.forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== k; });
    try { history.replaceState(null, "", "#" + k); } catch (e) { }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { pick(t.getAttribute("data-tab")); });
    t.addEventListener("keydown", function (e) { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { var m = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length; pick(tabs[m].getAttribute("data-tab"), true); } });
  });
  var h = (location.hash || "").slice(1); if (["reports", "tests", "corpus"].indexOf(h) >= 0) pick(h);

  /* ----- 1. saved reports ----- */
  var q = R.quality;
  $$("[data-q]").forEach(function (n) { var k = n.getAttribute("data-q"); n.textContent = q[k]; });
  var rp = { risk: "", nature: "", hide: false, text: "", sort: "time", dir: 1 };
  function reportRows() {
    var rows = R.reports.filter(function (r) {
      if (rp.risk && r.risk !== rp.risk) return false;
      if (rp.nature && (rp.nature === "none" ? r.nature : r.nature !== rp.nature)) return false;
      if (rp.hide && !r.first) return false;
      if (rp.text && (r.text + " " + r.place + " " + r.cls).toLowerCase().indexOf(rp.text) < 0) return false;
      return true;
    });
    rows.sort(function (a, b) { var v = rp.sort === "risk" ? (ORDER[a.risk] - ORDER[b.risk]) || (a.id - b.id) : (a.id - b.id); return v * (rp.sort === "time" ? rp.dir : 1); });
    return rows;
  }
  function drawReports() {
    var rows = reportRows(), tb = $("#rep-body");
    tb.innerHTML = rows.map(function (r) {
      var notes = []; if (!r.first) notes.push("repeat of row " + (R.reports.filter(function (x) { return x.g === r.g && x.first; })[0] || {}).id); else if (r.n > 1) notes.push("saved " + r.n + " times");
      return '<tr tabindex="0" data-id="' + r.id + '"><td class="mut">' + esc(r.at) + '</td><td class="txt">' + esc(r.text) + (r.n > 1 && r.first ? '<span class="dup">×' + r.n + "</span>" : "") + "</td><td>" + (esc(r.nature) || '<span class="mut">blank</span>') + "</td><td>" + pill(r.risk) + "</td><td>" + (esc(r.cls) || "") + "</td><td>" + esc(r.place) + "</td></tr>";
    }).join("") || '<tr><td colspan="6" class="mut" style="padding:28px">No report matches these filters.</td></tr>';
    $("#rep-count").textContent = rows.length + " of " + R.reports.length + " rows shown";
  }
  var fr = $("#rep-filters");
  fr.innerHTML = '<div class="fgroup"><span>Risk</span>' + chip("risk", "", "All", true) + ["Emergency", "High", "Limited"].map(function (v) { return chip("risk", v, v); }).join("") + "</div>" +
    '<div class="fgroup"><span>Nature</span>' + chip("nature", "", "All", true) + ["Physical", "Verbal", "Social", "Cyber"].map(function (v) { return chip("nature", v, v); }).join("") + chip("nature", "none", "Blank") + "</div>" +
    '<div class="fgroup">' + chip("hide", "1", "Hide repeated saves") + "</div>" +
    '<input class="search" type="search" placeholder="Search the messages" aria-label="Search the saved reports">';
  fr.addEventListener("click", function (e) {
    var b = e.target.closest(".chip"); if (!b) return; var g = b.getAttribute("data-g"), v = b.getAttribute("data-v");
    if (g === "hide") { rp.hide = !rp.hide; b.setAttribute("aria-pressed", rp.hide ? "true" : "false"); }
    else { rp[g] = v; $$('.chip[data-g="' + g + '"]', fr).forEach(function (c) { c.setAttribute("aria-pressed", c === b ? "true" : "false"); }); }
    drawReports();
  });
  $(".search", fr).addEventListener("input", function (e) { rp.text = e.target.value.trim().toLowerCase(); drawReports(); });
  $$("#rep-head [data-sort]").forEach(function (b) { b.addEventListener("click", function () { var k = b.getAttribute("data-sort"); if (rp.sort === k && k === "time") rp.dir *= -1; rp.sort = k; drawReports(); }); });
  function reportDialog(r) {
    var flags = [];
    if (r.n > 1) flags.push("This message was saved " + r.n + " times within a second or two. The bot wrote the same row more than once, which is a bug we are fixing.");
    if (r.flags.indexOf("class") >= 0) flags.push("The class field holds “" + esc(r.cls) + "”, which is a label, not a class. The bot filled the wrong field.");
    if (r.flags.indexOf("target") >= 0) flags.push("The field for who was involved was never filled: it still holds a template placeholder. (Names are hidden on this site anyway.)");
    if (r.flags.indexOf("nature") >= 0 || r.flags.indexOf("risk") >= 0) flags.push("One of the labels was not saved. The row is incomplete.");
    if (r.flags.indexOf("test") >= 0) flags.push("This looks like a test word, not a real scenario.");
    var h = '<h2 id="pop-title">Saved report, row ' + r.id + '</h2><div class="convo"><div class="m me"><small>What the student wrote</small>' + esc(r.text) + "</div></div>" +
      '<dl class="kv"><dt>Nature</dt><dd><b>' + (esc(r.nature) || "blank") + "</b>" + (NAT[r.nature] ? "<br>" + NAT[r.nature] : "") + "</dd>" +
      "<dt>Risk</dt><dd>" + pill(r.risk) + (RISK[r.risk] ? "<br>" + RISK[r.risk] : "") + "</dd>" +
      "<dt>Class</dt><dd>" + (esc(r.cls) || "blank") + "</dd><dt>Place</dt><dd>" + (esc(r.place) || "blank") + "</dd><dt>Evidence</dt><dd>" + esc(r.ev) + "</dd><dt>Saved</dt><dd>" + esc(r.at) + " (Mauritius time)</dd></dl>" +
      (flags.length ? '<div class="notice warn" style="margin-top:16px"><p><b>What to notice.</b> ' + flags.join(" ") + "</p></div>" : "");
    S.popup(h, true);
  }
  $("#rep-body").addEventListener("click", function (e) { var tr = e.target.closest("tr[data-id]"); if (tr) reportDialog(R.reports.filter(function (x) { return x.id == tr.getAttribute("data-id"); })[0]); });
  $("#rep-body").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { var tr = e.target.closest("tr[data-id]"); if (tr) { e.preventDefault(); reportDialog(R.reports.filter(function (x) { return x.id == tr.getAttribute("data-id"); })[0]); } } });
  drawReports();

  /* ----- 2. test conversations ----- */
  var tg = $("#test-grid");
  tg.innerHTML = R.tests.map(function (t) {
    var cls = t.verdict === "PASS" ? "ok" : t.verdict === "FAIL" ? "bad" : t.verdict === "PARTIAL" ? "mid" : "none";
    return '<button type="button" class="tcard ' + cls + '" data-id="' + esc(t.id) + '"><span class="tid">' + esc(t.id) + '</span><b>' + esc(t.what) + '</b><span class="tl">' + esc(t.lang) + '</span><span class="verdict">' + (t.verdict === "NOT RUN" ? "Not run yet" : t.verdict === "PARTIAL" ? "Partly" : t.verdict.charAt(0) + t.verdict.slice(1).toLowerCase()) + "</span></button>";
  }).join("");
  tg.addEventListener("click", function (e) {
    var b = e.target.closest(".tcard"); if (!b) return; var t = R.tests.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0];
    var turns = t.turns.map(function (m) { return '<div class="m me"><small>Student, turn</small>' + esc(m) + "</div>"; }).join("");
    var h = '<h2 id="pop-title">' + esc(t.id) + ": " + esc(t.what) + "</h2><p class=\"mut\">Language: " + esc(t.lang) + ". We expected: " + esc(t.expect) + "</p><h3 style=\"margin-top:14px\">What we sent</h3><div class=\"convo\">" + turns + "</div>";
    if (t.verdict === "NOT RUN") h += '<div class="notice"><p><b>Not run live yet.</b> This scripted conversation is on our test sheet but we have not run it on the live bot.</p></div>';
    else h += "<h3>What the bot did</h3><p>" + esc(t.did) + '</p><div class="notice ' + (t.verdict === "PASS" ? "" : t.verdict === "FAIL" ? "bad" : "warn") + '"><p><b>' + (t.verdict === "PASS" ? "Passed." : t.verdict === "FAIL" ? "Failed." : "Passed in part.") + "</b> " + esc(t.note) + "</p></div>";
    S.popup(h, true);
  });
  var vc = { PASS: 0, PARTIAL: 0, FAIL: 0, "NOT RUN": 0 }; R.tests.forEach(function (t) { vc[t.verdict]++; });
  $$("[data-v]").forEach(function (n) { n.textContent = vc[n.getAttribute("data-v")]; });

  /* ----- 3. labelled messages ----- */
  var C = R.corpus.map(function (r) { return { id: r[0], text: r[1], lang: r[2], nature: r[3], risk: r[4], split: r[5], pred: r[6], pn: r[7] }; });
  var cp = { lang: "", nature: "", risk: "", split: "", text: "", page: 0 }, PS = 15;
  var cf = $("#cor-filters");
  cf.innerHTML = '<div class="fgroup"><span>Language</span>' + chip("lang", "", "All", true) + chip("lang", "English", "English") + chip("lang", "Kreol / mixed", "Kreol and mixed") + "</div>" +
    '<div class="fgroup"><span>Nature</span>' + chip("nature", "", "All", true) + ["Verbal", "Physical", "Social", "Cyber"].map(function (v) { return chip("nature", v, v); }).join("") + "</div>" +
    '<div class="fgroup"><span>Risk</span>' + chip("risk", "", "All", true) + ["Minimal", "Limited", "High", "Emergency"].map(function (v) { return chip("risk", v, v); }).join("") + "</div>" +
    '<div class="fgroup"><span>Set</span>' + chip("split", "", "All", true) + chip("test", "test", "Locked test set") + chip("split", "dev", "Used for tuning") + "</div>" +
    '<input class="search" type="search" placeholder="Search the messages" aria-label="Search the labelled messages">';
  function corRows() {
    return C.filter(function (r) {
      if (cp.lang && r.lang !== cp.lang) return false; if (cp.nature && r.nature !== cp.nature) return false; if (cp.risk && r.risk !== cp.risk) return false;
      if (cp.split && r.split !== cp.split) return false; if (cp.text && (r.text + " " + r.id).toLowerCase().indexOf(cp.text) < 0) return false; return true;
    });
  }
  function drawCor() {
    var rows = corRows(), pages = Math.max(1, Math.ceil(rows.length / PS)); if (cp.page >= pages) cp.page = pages - 1;
    var sl = rows.slice(cp.page * PS, cp.page * PS + PS);
    $("#cor-body").innerHTML = sl.map(function (r) {
      var guess = r.pred ? (r.pred === r.risk ? '<span class="ok" title="matches our label">' + pill(r.pred) + " ✓</span>" : pill(r.pred) + ' <span class="miss" title="differs from our label">✗</span>') : '<span class="mut">not tested</span>';
      return '<tr tabindex="0" data-id="' + esc(r.id) + '"><td class="mut">' + esc(r.id) + '</td><td class="txt">' + esc(r.text) + "</td><td>" + esc(r.lang) + "</td><td>" + esc(r.nature) + "</td><td>" + pill(r.risk) + "</td><td>" + guess + "</td></tr>";
    }).join("") || '<tr><td colspan="6" class="mut" style="padding:28px">No message matches these filters.</td></tr>';
    $("#cor-count").textContent = rows.length + " messages";
    $("#cor-page").textContent = "Page " + (cp.page + 1) + " of " + pages;
    $("#cor-prev").disabled = cp.page === 0; $("#cor-next").disabled = cp.page >= pages - 1;
    var t = rows.filter(function (r) { return r.pred; }), ok = t.filter(function (r) { return r.pred === r.risk; }).length;
    $("#cor-acc").textContent = t.length ? "Of the " + t.length + " test messages shown, the final model's risk level matches our label on " + ok + "." : "Choose “Locked test set” to see how the final model did on messages it never saw.";
  }
  cf.addEventListener("click", function (e) {
    var b = e.target.closest(".chip"); if (!b) return; var g = b.getAttribute("data-g"), v = b.getAttribute("data-v");
    var key = g === "test" ? "split" : g; var already = b.getAttribute("aria-pressed") === "true" && g === "test";
    cp[key] = already ? "" : v; cp.page = 0;
    $$('.chip[data-g="' + g + '"], .chip[data-g="' + (g === "split" ? "test" : g === "test" ? "split" : g) + '"]', cf).forEach(function (c) { var cg = c.getAttribute("data-g"), cv = c.getAttribute("data-v"); c.setAttribute("aria-pressed", (cp[cg === "test" ? "split" : cg] === cv) ? "true" : "false"); });
    drawCor();
  });
  $(".search", cf).addEventListener("input", function (e) { cp.text = e.target.value.trim().toLowerCase(); cp.page = 0; drawCor(); });
  $("#cor-prev").addEventListener("click", function () { cp.page--; drawCor(); }); $("#cor-next").addEventListener("click", function () { cp.page++; drawCor(); });
  function corDialog(r) {
    var h = '<h2 id="pop-title">' + esc(r.id) + '</h2><div class="convo"><div class="m me"><small>Message</small>' + esc(r.text) + "</div></div>" +
      '<dl class="kv"><dt>Language</dt><dd>' + esc(r.lang) + "</dd><dt>Nature</dt><dd><b>" + esc(r.nature) + "</b><br>" + (NAT[r.nature] || "") + "</dd><dt>Our risk label</dt><dd>" + pill(r.risk) + "<br>" + (RISK[r.risk] || "") + "</dd>" +
      "<dt>Set</dt><dd>" + (r.split === "test" ? "Locked test set: the model never saw it while we tuned it." : "Used for tuning the rules and settings.") + "</dd>" +
      (r.pred ? "<dt>Final model said</dt><dd>" + pill(r.pred) + " " + (r.pred === r.risk ? "matches our label" : "<b>differs from our label</b>") + "<br>Nature guess: " + esc(r.pn) + "</dd>" : "") + "</dl>" +
      '<p class="pop-src">Synthetic: drafted with AI and reviewed by people. Not a real student.</p>';
    S.popup(h, true);
  }
  $("#cor-body").addEventListener("click", function (e) { var tr = e.target.closest("tr[data-id]"); if (tr) corDialog(C.filter(function (x) { return x.id === tr.getAttribute("data-id"); })[0]); });
  $("#cor-body").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { var tr = e.target.closest("tr[data-id]"); if (tr) { e.preventDefault(); corDialog(C.filter(function (x) { return x.id === tr.getAttribute("data-id"); })[0]); } } });
  drawCor();
})();
