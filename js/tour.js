/* The guided tour: a spotlight and a friendly card that walk you through the site, page by page.
   Progress is kept in localStorage so the tour carries on when it moves to the next page. */
(function () {
  "use strict";
  var S = window.MSsite || {}, store = S.store || { get: function () { return null; }, set: function () { } };
  var KEY = "ms-tour", SEEN = "ms-seen";
  var PAGES = { index: "index.html", problem: "problem.html", chat: "chat.html", register: "register.html", evidence: "evidence.html" };
  var STEPS = [
    { p: "index", t: "Welcome to MoSafety", x: "This site shows an anti-bullying chatbot for Mauritian schools: why it matters, the chatbot itself, the reports it saves, and the proof behind it. A minute of walking around, then you can explore on your own." },
    { p: "index", s: "[data-tour=nav]", t: "Four pages, in order", x: "Read them from left to right like a story, or jump straight to the one you want. The page you are on is highlighted." },
    { p: "index", s: "[data-tour=theme]", t: "Day or dusk", x: "This button switches the whole site between a bright day and a calm dusk." },
    { p: "index", s: "[data-tour=help]", t: "Help is always one tap away", x: "If this subject is close to home, this button lists who to tell and which numbers to call. It is on every page." },
    { p: "problem", s: "[data-tour=stage]", t: "A made-up day, on a see-saw", x: "Scroll down. As the day goes on, crates of weight land on one side and the student is lifted off the ground. Nothing here is a real person." },
    { p: "problem", s: "[data-tour=lifts]", t: "Now lift the other side", x: "Each balloon is something MoSafety does. Tap them one by one and watch the see-saw come level." },
    { p: "chat", s: "#mschat", t: "Talk to the real chatbot", x: "This is the actual MoSafety bot, right inside the page. Write in English, French or Kreol. Please use made-up scenarios only." },
    { p: "chat", s: "[data-tour=samples]", t: "Not sure what to type?", x: "Tap a sticky note and its message is sent for you. Each note says what a good answer looks like." },
    { p: "register", s: "[data-tour=tabs]", t: "The register", x: "Three tabs: the reports the bot really saved, our scripted test conversations, and the 480 labelled messages we tested the model on." },
    { p: "register", s: "[data-tour=ledger]", t: "Tap any row", x: "A pop-up opens with the full message and what each label means. Use the filters above to narrow things down." },
    { p: "evidence", s: "[data-tour=toc]", t: "Under the hood", x: "The code, the charts and the test results behind every claim, including where the bot fails. Code is folded away: open it when you want to check." },
    { p: "evidence", t: "That is the tour", x: "You can restart it from the button at the bottom left whenever you like.\n\nDeveloped by Mr Mooraby Sultaan." }
  ];
  var main = document.querySelector("main[data-page]"), page = main ? main.getAttribute("data-page") : "index";
  var el = {}, i = 0, on = false;

  function load() { try { var v = JSON.parse(store.get(KEY) || "null"); return v && v.on ? v : null; } catch (e) { return null; } }
  function save(v) { store.set(KEY, JSON.stringify(v)); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function build() {
    if (el.veil) return;
    el.veil = document.createElement("div"); el.veil.className = "tour-veil"; el.veil.setAttribute("aria-hidden", "true");
    el.hole = document.createElement("div"); el.hole.className = "tour-hole none";
    el.card = document.createElement("div"); el.card.className = "tour-card"; el.card.setAttribute("role", "dialog"); el.card.setAttribute("aria-live", "polite"); el.card.setAttribute("aria-label", "Guided tour");
    el.card.innerHTML = '<svg class="tour-guide" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 2C9 2 3 8.4 3 16.2c0 8.2 9 13.6 12.4 15.6l-1.8 3.4h6.8l-1.8-3.4C24 29.8 31 24.4 31 16.2 31 8.4 25 2 17 2Z" fill="#f7b731"/><ellipse cx="11.5" cy="10.5" rx="3.6" ry="5.6" fill="#fff" opacity=".55" transform="rotate(24 11.5 10.5)"/><path d="M17 36c-1.4 3 2 5 0 8" fill="none" stroke="#8a6a3c" stroke-width="1.4"/></svg>' +
      '<button type="button" class="tour-skip" aria-label="End the tour"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12"/></svg></button>' +
      '<h3></h3><p></p><div class="tour-foot"><div class="tour-dots"></div><div class="tour-nav"><button type="button" class="btn paper small tour-back">Back</button><button type="button" class="btn sun small tour-next">Next</button></div></div>';
    document.body.appendChild(el.veil); document.body.appendChild(el.hole); document.body.appendChild(el.card);
    el.card.querySelector(".tour-skip").addEventListener("click", end);
    el.card.querySelector(".tour-back").addEventListener("click", function () { go(i - 1); });
    el.card.querySelector(".tour-next").addEventListener("click", function () { if (i >= STEPS.length - 1) end(true); else go(i + 1); });
    el.veil.addEventListener("click", function () { /* clicks on the dim area do nothing: the tour is ended by its own buttons */ });
  }

  function place() {
    if (!on) return;
    var st = STEPS[i], t = st.s ? document.querySelector(st.s) : null, c = el.card, vw = window.innerWidth, vh = window.innerHeight, pad = 10;
    var cw = c.offsetWidth, ch = c.offsetHeight;
    if (!t) {
      el.hole.className = "tour-hole none"; el.hole.style.cssText = "top:" + (vh / 2) + "px;left:" + (vw / 2) + "px;width:0;height:0";
      c.style.left = Math.max(12, (vw - cw) / 2) + "px"; c.style.top = Math.max(60, (vh - ch) / 2) + "px"; return;
    }
    var r = t.getBoundingClientRect();
    var top = Math.max(6, r.top - pad), left = Math.max(6, r.left - pad), w = Math.min(vw - 12, r.width + pad * 2), h = Math.min(vh - 12, r.height + pad * 2);
    el.hole.className = "tour-hole"; el.hole.style.top = top + "px"; el.hole.style.left = left + "px"; el.hole.style.width = w + "px"; el.hole.style.height = h + "px";
    /* card goes below the target if there is room, else above, else beside, else floats at the bottom */
    var cx = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), vw - cw - 12), cy;
    if (top + h + 20 + ch + 12 <= vh) cy = top + h + 20; else if (top - 20 - ch >= 56) cy = top - 20 - ch; else { cy = vh - ch - 16; if (r.right + cw + 20 < vw) cx = r.right + 16; else if (r.left - cw - 20 > 0) cx = r.left - cw - 16; }
    c.style.left = cx + "px"; c.style.top = Math.max(60, cy) + "px";
  }

  function show() {
    build(); on = true; document.documentElement.classList.add("touring");
    var st = STEPS[i], c = el.card;
    c.querySelector("h3").textContent = st.t;
    c.querySelector("p").innerHTML = esc(st.x).replace(/\n\n/g, "<br><br>");
    c.querySelector(".tour-dots").innerHTML = STEPS.map(function (_, k) { return "<i class=\"" + (k === i ? "on" : k < i ? "done" : "") + "\"></i>"; }).join("");
    c.querySelector(".tour-back").hidden = i === 0;
    var last = i === STEPS.length - 1, nx = STEPS[i + 1];
    c.querySelector(".tour-next").textContent = last ? "Finish" : (nx && nx.p !== st.p ? "Next page" : "Next");
    var t = st.s ? document.querySelector(st.s) : null;
    if (t) { var r = t.getBoundingClientRect(); if (r.top < 70 || r.bottom > window.innerHeight - 20) t.scrollIntoView({ block: "center", behavior: "auto" }); }
    var b = document.querySelector(".tour-start"); if (b) b.hidden = true;
    var nudge = document.querySelector(".tour-nudge"); if (nudge) nudge.remove();
    requestAnimationFrame(function () { place(); setTimeout(place, 160); c.querySelector(".tour-next").focus({ preventScroll: true }); });
  }

  function go(n) {
    n = Math.max(0, Math.min(STEPS.length - 1, n));
    save({ on: true, i: n });
    var target = STEPS[n].p;
    if (target !== page) { location.href = PAGES[target]; return; }
    i = n; show();
  }

  function end(done) {
    on = false; save({ on: false, i: 0 }); store.set(SEEN, "1");
    document.documentElement.classList.remove("touring");
    [el.veil, el.hole, el.card].forEach(function (n) { if (n) n.remove(); }); el = {};
    var b = document.querySelector(".tour-start"); if (b) b.hidden = false;
    if (done && S.say) S.say("Tour finished. Restart it any time from the bottom left.");
  }

  function start() { store.set(SEEN, "1"); go(0); }

  /* the restart button, on every page */
  var btn = document.createElement("div"); btn.className = "tour-start";
  btn.innerHTML = '<button type="button" class="btn sun small" aria-label="Show me around"><svg width="18" height="22" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 2C9 2 3 8.4 3 16.2c0 8.2 9 13.6 12.4 15.6l-1.8 3.4h6.8l-1.8-3.4C24 29.8 31 24.4 31 16.2 31 8.4 25 2 17 2Z" fill="#ef5a4c"/></svg><span>Show me around</span></button>';
  document.body.appendChild(btn);
  btn.querySelector("button").addEventListener("click", start);
  document.querySelectorAll("[data-start-tour]").forEach(function (b) { b.addEventListener("click", start); });

  document.addEventListener("keydown", function (e) {
    if (!on) return;
    if (e.key === "Escape") end(); else if (e.key === "ArrowRight") { if (i < STEPS.length - 1) go(i + 1); } else if (e.key === "ArrowLeft") go(i - 1);
  });
  var tick; function sched() { if (!on) return; cancelAnimationFrame(tick); tick = requestAnimationFrame(place); }
  window.addEventListener("resize", sched); window.addEventListener("scroll", sched, { passive: true });

  /* carry on a tour that was in progress, or offer one to a first-time visitor on the welcome page */
  var st = load();
  if (st) {
    if (STEPS[st.i] && STEPS[st.i].p === page) { i = st.i; setTimeout(show, 450); }
    else { for (var k = 0; k < STEPS.length; k++) if (STEPS[k].p === page) { i = k; save({ on: true, i: k }); setTimeout(show, 450); break; } }
  } else if (page === "index" && !store.get(SEEN)) {
    setTimeout(function () {
      if (on || document.querySelector("dialog[open]")) return;
      var n = document.createElement("div"); n.className = "tour-nudge";
      n.innerHTML = '<p><b>New here?</b> A one-minute tour shows you around.</p><div class="btns"><button type="button" class="btn sun small go">Show me around</button><button type="button" class="btn paper small no">No thanks</button></div>';
      document.body.appendChild(n);
      n.querySelector(".go").addEventListener("click", function () { n.remove(); start(); });
      n.querySelector(".no").addEventListener("click", function () { store.set(SEEN, "1"); n.remove(); });
    }, 2200);
  }
})();
