/* MoSafety site behaviour: day/dusk theme, pop-ups (glossary, help now), copy + send, scroll pop-ins, counters,
   code blocks, contents highlight, the example stepper. */
(function () {
  "use strict";
  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  };
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { }
  window.MSsite = { store: store, $: $, $$: $$, esc: esc };

  /* ---------- day / dusk ---------- */
  var saved = store.get("ms-theme");
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  var tb = $("#theme-btn");
  if (tb) tb.addEventListener("click", function () {
    var cur = root.getAttribute("data-theme") || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next); store.set("ms-theme", next);
    tb.setAttribute("aria-label", next === "dark" ? "Switch to day" : "Switch to dusk");
  });

  /* ---------- toast + copy ---------- */
  var toast;
  function say(msg) {
    if (!toast) { toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast); }
    toast.textContent = msg; toast.classList.add("on"); clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.classList.remove("on"); }, 2600);
  }
  function copyText(text, ok) {
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var done = false; try { done = document.execCommand("copy"); } catch (e) { }
      ta.remove(); say(done ? ok : "Select the text and copy it.");
    }
    try { navigator.clipboard.writeText(text).then(function () { say(ok); }, fallback); } catch (e) { fallback(); }
  }
  window.MSsite.say = say; window.MSsite.copy = copyText;
  $$("[data-copy]").forEach(function (b) { b.addEventListener("click", function () { copyText(b.getAttribute("data-copy"), "Copied. Paste it into the chat."); }); });
  /* sample notes on the chat page send straight into the chat window */
  $$("[data-send]").forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-send"), c = window.MSChat && window.MSChat.main;
      if (!c) { copyText(text, "Copied. Paste it into the chat."); return; }
      var box = document.getElementById("mschat");
      if (box) { var r = box.getBoundingClientRect(); if (r.top < 60 || r.bottom > window.innerHeight) box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); }
      c.send(text);
    });
  });

  /* ---------- pop-ups ---------- */
  var TERMS = {
    "power-imbalance": ["Power imbalance", "<p>Bullying is not a fight between equals. One side has more power: more friends, more size or age, a higher place in the group, or simply less to lose. The other side cannot easily push back.</p><p>That gap is what makes it bullying, and it is why “just ignore it” or “tell them to stop” so often fails.</p>"],
    "risk": ["Risk level", "<p>MoSafety sorts every message into one of four levels: <b>Minimal</b> (a question, not an incident), <b>Limited</b>, <b>High</b> and <b>Emergency</b> (someone may be in danger now).</p><p>Emergency reports skip the usual questions and go to the top. In this prototype the alert is simulated.</p>"],
    "simulated": ["Simulated alert", "<p>When the bot detects an emergency it shows an alert on screen, but <b>nothing is sent to anyone</b>. A real alert needs a person on call who owns it. That is on our list of next steps.</p>"],
    "macro-f1": ["Macro-F1", "<p>A score from 0 to 1 that averages how well the model does on each risk level, giving the rare ones the same weight as the common ones. It is fairer than plain accuracy when some classes are small.</p><p>Our final model scores 0.73 on messages it never saw while we tuned it.</p>"],
    "recall": ["Recall", "<p>Out of all the truly urgent messages, the share the system catches. Missing an emergency is the worst mistake, so recall for the Emergency level is our headline safety number: 16 of 17.</p>"],
    "tfidf": ["TF-IDF", "<p>A way of turning text into numbers: words (or letter groups) that are rare overall but common in one message get more weight. We use groups of characters, so spelling variants in Kreol still match.</p>"],
    "threshold": ["Alarm threshold", "<p>The model gives each message a probability of being an Emergency. The threshold is how sure it must be before it raises the alarm. We lowered it on purpose: more false alarms, fewer missed emergencies.</p>"],
    "slot-filling": ["Slot filling", "<p>Collecting specific pieces of information (class, place, who, evidence) from free text. MoSafety only asks for the slots still empty, so the student never repeats themselves.</p>"],
    "classification": ["Text classification", "<p>Putting a message into categories. MoSafety gives every message two labels: its <b>nature</b> (verbal, physical, social, cyber) and its <b>risk level</b>.</p>"],
    "human-loop": ["A person decides", "<p>MoSafety sorts and structures what a student writes. It never decides anything alone: a counsellor reads every report and chooses what to do.</p>"],
    "synthetic": ["Synthetic data", "<p>Messages written for testing, not taken from real students. Ours were drafted with AI and reviewed by people. Real Kreol is probably harder than ours, so real performance may be lower.</p>"],
    "rag": ["Retrieval-augmented generation (RAG)", "<p>Before answering, the bot looks up passages in a document (here a data-protection guide) and answers from them. It lowers made-up answers; it does not remove them.</p>"],
    "no-name": ["“No name needed”", "<p>MoSafety never asks for your name, and the report table has no column for it. That is <b>not</b> the same as anonymous: your message still travels through a chatbot platform, and the people who run it could in principle see it. We do not claim anonymity.</p>"],
    "kreol": ["Kreol morisien", "<p>Mauritian Creole, the language most students speak at home. It has little written text online, so AI understands it less well than English or French. We tested it separately and report that openly.</p>"]
  };
  var dlg;
  function popup(html, wide) {
    if (!dlg) {
      dlg = document.createElement("dialog"); dlg.className = "pop"; dlg.setAttribute("aria-labelledby", "pop-title");
      dlg.innerHTML = '<div class="pop-card"><svg class="pop-balloon" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 2C9 2 3 8.4 3 16.2c0 8.2 9 13.6 12.4 15.6l-1.8 3.4h6.8l-1.8-3.4C24 29.8 31 24.4 31 16.2 31 8.4 25 2 17 2Z" fill="#ef5a4c"/><ellipse cx="11.5" cy="10.5" rx="3.6" ry="5.6" fill="#fff" opacity=".5" transform="rotate(24 11.5 10.5)"/><path d="M17 36c-1.4 3 2 5 0 8" fill="none" stroke="#8a6a3c" stroke-width="1.4"/></svg><button type="button" class="pop-x" aria-label="Close"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12"/></svg></button><div class="pop-body"></div></div>';
      document.body.appendChild(dlg);
      $(".pop-x", dlg).addEventListener("click", function () { close(); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
      dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
    }
    $(".pop-body", dlg).innerHTML = html; dlg.classList.toggle("wide", !!wide); $(".pop-card", dlg).classList.toggle("wide", !!wide);
    if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); } }
    var x = $(".pop-x", dlg); if (x) x.focus();
  }
  function close() { if (!dlg) return; try { dlg.close(); } catch (e) { dlg.removeAttribute("open"); } if (dlg._ret) { try { dlg._ret.focus(); } catch (e) { } } }
  window.MSsite.popup = popup; window.MSsite.closePopup = close;
  function term(key, from) {
    var t = TERMS[key]; if (!t) return;
    popup('<h2 id="pop-title">' + esc(t[0]) + "</h2>" + t[1]); if (dlg) dlg._ret = from || null;
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-term]"); if (!b) return;
    e.preventDefault(); term(b.getAttribute("data-term"), b);
  });
  var HELP = '<h2 id="pop-title">If you need help right now</h2>' +
    '<p><b>Tell an adult you trust today</b>: a teacher, the school counsellor, a parent, an older relative. You do not have to explain everything. “Something is happening to me and I need help” is enough.</p>' +
    '<p><b>If someone is in danger now, call:</b></p>' +
    '<ul class="nums"><li><b>112</b> or <b>999</b><span>Police</span></li><li><b>114</b><span>Ambulance (SAMU)</span></li><li><b>113</b><span>Child helpline</span></li></ul>' +
    '<p class="pop-src">Numbers taken from a public guide to emergency services in Mauritius. Please confirm them with your school. MoSafety is a university prototype: it cannot call anyone for you, and its emergency alert is simulated.</p>';
  $$("[data-help]").forEach(function (b) { b.addEventListener("click", function () { popup(HELP); dlg._ret = b; }); });

  /* ---------- scroll pop-ins (content is visible without script; these only add a small bounce) ---------- */
  var rises = $$(".rise");
  if (rises.length && "IntersectionObserver" in window && !reduce) {
    var vh = window.innerHeight;
    rises.forEach(function (el) { if (el.getBoundingClientRect().top > vh * 0.92) el.classList.add("pre"); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove("pre"); e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    rises.forEach(function (el) { io.observe(el); });
  }

  /* ---------- number counters ---------- */
  $$("[data-count]").forEach(function (el) {
    var to = parseFloat(el.getAttribute("data-count")), dec = (el.getAttribute("data-count").split(".")[1] || "").length, suf = el.getAttribute("data-suffix") || "";
    function show(v) { el.textContent = v.toFixed(dec) + suf; }
    if (reduce || !("IntersectionObserver" in window)) { show(to); return; }
    show(to);
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now(), dur = 1300;
      (function step(n) { var k = Math.min(1, (n - t0) / dur), e = 1 - Math.pow(1 - k, 3); show(to * e); if (k < 1) requestAnimationFrame(step); else show(to); })(t0);
    }, { threshold: 0.6 });
    o.observe(el);
  });

  /* ---------- code blocks (Under the hood) ---------- */
  $$("pre[data-code]").forEach(function (pre) {
    var k = pre.getAttribute("data-code"), code = pre.querySelector("code");
    if (window.CODE && window.CODE[k]) code.textContent = window.CODE[k];
    var det = pre.closest("details");
    function hl() { if (window.hljs && !code.dataset.done) { try { window.hljs.highlightElement(code); code.dataset.done = "1"; } catch (e) { } } }
    if (det) det.addEventListener("toggle", function () { if (det.open) hl(); });
    var btn = pre.parentNode.querySelector("[data-copy-code]");
    if (btn) btn.addEventListener("click", function () { copyText(code.textContent, "Code copied."); });
  });

  /* ---------- contents highlight (Under the hood) ---------- */
  var toc = $$(".toc a");
  if (toc.length && "IntersectionObserver" in window) {
    var map = {}; toc.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { toc.forEach(function (a) { a.classList.remove("on"); }); var a = map[e.target.id]; if (a) { a.classList.add("on"); if (window.innerWidth <= 1000) { var bar = a.parentNode; bar.scrollLeft = a.offsetLeft - 16; } } } });
    }, { rootMargin: "-20% 0px -70% 0px" });
    $$(".ev-sec").forEach(function (s) { io2.observe(s); });
  }

  /* ---------- "watch one message get sorted" (The problem) ---------- */
  var exRoot = $("#examples");
  if (exRoot && window.RESULTS) {
    var E = window.RESULTS.examples;
    var tabs = [{ t: "English, physical", i: 0 }, { t: "Kreol, cyber", i: 1 }, { t: "Emergency", i: 2 }, { t: "A miss", i: 3 }];
    var list = $(".ex-tabs", exRoot), panel = $(".ex-panel", exRoot);
    function routeText(ex) {
      if (ex.risk === "Emergency") return "MoSafety skips the usual questions, asks where the student is, and shows an emergency alert. In this prototype the alert is simulated: nothing is sent to anyone.";
      if (ex.risk === "High") return "MoSafety asks only for the details still missing: class, who, where, and whether there is evidence. Then it saves the report to the counsellor table, marked High.";
      return "MoSafety asks the same questions, then saves the report to the counsellor table, marked " + ex.risk + ". It sits lower in the queue.";
    }
    var show = function (n) {
      var ex = E[tabs[n].i], same = ex.risk === ex.truth;
      $$(".ex-tab", list).forEach(function (b, i) { b.setAttribute("aria-selected", i === n ? "true" : "false"); b.tabIndex = i === n ? 0 : -1; });
      var h = "";
      h += '<div class="ex-step"><h4>1. A student writes</h4><p class="val msg">“' + esc(ex.text) + "”</p>" + (ex.gloss ? '<p class="gloss">In English: ' + esc(ex.gloss) + "</p>" : "") + '<p class="gloss">' + esc(ex.lang) + "</p></div>";
      h += '<div class="ex-step"><h4>2. MoSafety reads the nature of the problem</h4><p class="val"><button type="button" class="tag term-btn" data-term="classification">Text classification</button> ' + esc(ex.nature) + (ex.nature === ex.truthNature ? "" : " (our label: " + esc(ex.truthNature) + ")") + "</p></div>";
      h += '<div class="ex-step"><h4>3. It judges how urgent it is</h4><p class="val"><span class="pill r-' + ex.risk + '">' + ex.risk + "</span> " + (same ? "This matches our label." : "Our label for this message is <span class=\"pill r-" + ex.truth + '">' + ex.truth + "</span>. The model rated it too low.") + "</p></div>";
      h += '<div class="ex-step"><h4>4. It decides what happens next</h4><p class="val">' + routeText(ex) + (ex.risk !== "Emergency" ? ' <button type="button" class="tag term-btn" data-term="slot-filling">Slot filling</button>' : ' <button type="button" class="tag term-btn" data-term="simulated">Simulated alert</button>') + "</p></div>";
      h += '<div class="ex-step"><h4>5. A person takes over</h4><p class="val">A counsellor reads the saved report and decides what to do. MoSafety only sorts and structures.</p>' +
        (same ? "" : '<p class="gloss" style="margin-top:8px;max-width:62ch">This is one of five serious cases the model rated too low. All five describe indirect harm with no violent word. We show it on purpose: the fix is to ask a clarifying question when unsure, and to have a person read every report.</p>') + "</div>";
      panel.className = "ex-panel ex-steps ex-reveal"; panel.innerHTML = h; void panel.offsetWidth;
    };
    tabs.forEach(function (t, n) {
      var b = document.createElement("button"); b.type = "button"; b.className = "ex-tab"; b.setAttribute("role", "tab"); b.textContent = t.t;
      b.addEventListener("click", function () { show(n); });
      b.addEventListener("keydown", function (e) { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { var m = (n + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length; show(m); $$(".ex-tab", list)[m].focus(); } });
      list.appendChild(b);
    });
    show(0);
  }
})();
