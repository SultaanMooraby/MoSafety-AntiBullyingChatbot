/* The problem page: the see-saw follows the story as you scroll, and the four balloons lift it when you tap them. */
(function () {
  "use strict";
  var stage = document.querySelector(".story-stage"); if (!stage) return;
  var S = window.MSsite || {}, $$ = S.$$ || function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var api = null, lifts = $$(".lift"), arr = [0, 0, 0, 0];
  var clock = stage.querySelector(".clock b"), cap = stage.querySelector(".cap"), bar = stage.querySelector(".meter .bar i"), mlab = stage.querySelector(".meter .lab"), mval = stage.querySelector(".meter .val");
  var count = document.querySelector("[data-lift-count]"), note = document.querySelector("[data-lift-note]");

  function mount() { if (api) return; if (window.SeeSaw) api = window.SeeSaw.mount(stage); if (!api) return; api.onMeter(meter); api.onLevel(level); apply(beats[0]); }
  function meter(net, w, l) {
    var pct = Math.round(net * 100);
    if (bar) bar.style.width = pct + "%";
    if (mval) mval.textContent = net < 0.02 && w >= 5 ? "level" : pct + "%";
    if (mlab) mlab.textContent = w === 0 ? "Weight on this side" : net < 0.02 && w >= 5 ? "Balanced" : "Weight on this side";
    stage.classList.toggle("level", net < 0.02 && w >= 5);
  }
  function level() {
    if (window.MS3D) { window.MS3D.confetti(); window.MS3D.flare(stage); }
    if (cap) cap.textContent = "Level. Kavi's feet are on the ground again.";
    if (note) { note.hidden = false; }
  }

  var beats = $$(".beat");
  function apply(b) {
    if (!b || !api) return;
    var d = b.dataset;
    api.set({ crates: +d.crates || 0, time: parseFloat(d.time) || 0, mood: d.mood === "auto" ? null : parseFloat(d.mood) || 0, cam: d.cam || "wide" });
    if (!b.classList.contains("beat-lift")) { api.lift([0, 0, 0, 0]); lifts.forEach(function (l) { l.setAttribute("aria-pressed", "false"); }); arr = [0, 0, 0, 0]; updateCount(); }
    if (clock) clock.textContent = d.clock || "";
    if (cap) cap.textContent = d.cap || "";
    beats.forEach(function (x) { x.classList.toggle("on", x === b); });
    stage.setAttribute("data-beat", String(beats.indexOf(b)));
  }
  function updateCount() { var n = arr.reduce(function (a, b) { return a + b; }, 0); if (count) count.textContent = n + " of 4 balloons"; if (n < 4 && note) note.hidden = true; }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) apply(e.target); });
    }, { rootMargin: "-42% 0px -42% 0px" });
    beats.forEach(function (b) { io.observe(b); });
  }

  lifts.forEach(function (b, i) {
    b.addEventListener("click", function () {
      var on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on ? "true" : "false"); arr[i] = on ? 1 : 0; updateCount();
      if (api) api.lift(arr);
      if (cap && on) cap.textContent = b.getAttribute("data-says") || "";
    });
  });
  var all = document.querySelector("[data-lift-all]");
  if (all) all.addEventListener("click", function () {
    var on = arr.some(function (v) { return !v; });
    arr = [on ? 1 : 0, on ? 1 : 0, on ? 1 : 0, on ? 1 : 0]; lifts.forEach(function (b) { b.setAttribute("aria-pressed", on ? "true" : "false"); });
    updateCount(); if (api) api.lift(arr);
    all.textContent = on ? "Take them off" : "Lift all four";
  });

  /* the scene scripts load after this one; mount as soon as they are there */
  var tries = 0; (function wait() { if (window.SeeSaw && window.THREE !== undefined || tries > 40) mount(); else { tries++; setTimeout(wait, 100); } })();
  window.addEventListener("load", mount);
})();
