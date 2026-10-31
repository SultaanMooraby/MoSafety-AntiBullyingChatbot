/* Welcome page: mount the balloon scene. If WebGL is missing the flat illustration stays. */
(function () {
  "use strict";
  var st = document.querySelector(".hero-scene"); if (!st) return;
  function go() { try { if (window.HeroScene) window.HeroScene.mount(st); } catch (e) { if (window.console) console.warn("hero scene", e); } }
  if (document.readyState === "complete") go(); else window.addEventListener("load", go);
})();
