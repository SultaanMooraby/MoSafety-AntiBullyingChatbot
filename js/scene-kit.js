/* MoSafety 3D kit: the shared pieces of the two scenes (hero balloons, story see-saw).
   "Simplexity": simple, rounded, caricature-like shapes (a teardrop balloon, a chunky crate, a round-headed child)
   dressed in rich surfaces (paper grain, wood, canvas, glossy latex) and lit like a golden-hour animation still. */
(function () {
  "use strict";
  var T = window.THREE;
  var KIT = { ok: false, reduce: false };
  window.MS3D = KIT;
  try { KIT.reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { }
  if (!T) return;

  /* ---- can this browser draw WebGL at all? ---- */
  function canGL() {
    try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); } catch (e) { return false; }
  }
  KIT.ok = canGL();

  /* ---- a renderer + loop that sleeps when off-screen ---- */
  KIT.stage = function (host, opts) {
    opts = opts || {};
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    var renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "default" }); } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = opts.exposure || 0.95;
    renderer.shadowMap.enabled = opts.shadows !== false;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    host.appendChild(canvas);
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(opts.fov || 36, 1, 0.1, 100);
    var S = { renderer: renderer, scene: scene, camera: camera, canvas: canvas, tick: null, running: false, visible: true, raf: 0, last: 0, t: 0, dirty: true };
    try {
      var pm = new T.PMREMGenerator(renderer), env = new T.Scene();
      var g = document.createElement("canvas"); g.width = 8; g.height = 256; var x = g.getContext("2d");
      var gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#bfe3ff"); gr.addColorStop(0.5, "#fff3da"); gr.addColorStop(1, "#c9a56a");
      x.fillStyle = gr; x.fillRect(0, 0, 8, 256);
      env.add(new T.Mesh(new T.SphereGeometry(10, 16, 16), new T.MeshBasicMaterial({ map: new T.CanvasTexture(g), side: T.BackSide })));
      var win = new T.Mesh(new T.PlaneGeometry(6, 4), new T.MeshBasicMaterial({ color: 0xffffff })); win.position.set(-5, 4, 4); win.lookAt(0, 0, 0); env.add(win);
      scene.environment = pm.fromScene(env, 0.03).texture; pm.dispose();
    } catch (e) { }
    function size() {
      var w = host.clientWidth || 300, h = host.clientHeight || 300;
      renderer.setSize(w, h, false); camera.aspect = w / h;
      if (S.onSize) S.onSize(w, h);
      camera.updateProjectionMatrix(); S.dirty = true;
    }
    S.size = size;
    if (window.ResizeObserver) new ResizeObserver(size).observe(host); else window.addEventListener("resize", size);
    function frame(now) {
      S.raf = 0; if (!S.running) return;
      var dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now; S.t += dt;
      if (S.tick) S.tick(dt, S.t);
      renderer.render(scene, camera);
      S.raf = requestAnimationFrame(frame);
    }
    S.start = function () { if (S.running || !S.visible || document.hidden) return; S.running = true; S.last = 0; S.raf = requestAnimationFrame(frame); };
    S.stop = function () { S.running = false; if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; };
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { S.visible = es[0].isIntersecting; S.visible ? S.start() : S.stop(); }).observe(host);
    document.addEventListener("visibilitychange", function () { document.hidden ? S.stop() : S.start(); });
    size(); S.start();
    return S;
  };

  /* ---- procedural surfaces ---- */
  function canvasTex(w, h, draw, repeat) {
    var c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  function rng(seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  KIT.woodTex = function (base, seed, repeat) {
    return canvasTex(256, 128, function (x, w, h) {
      var r = rng(seed || 7); x.fillStyle = base; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 70; i++) { x.strokeStyle = "rgba(60,32,8," + (0.05 + r() * 0.12) + ")"; x.lineWidth = 0.6 + r() * 1.8; x.beginPath(); var y = r() * h; x.moveTo(0, y); for (var k = 1; k <= 8; k++) x.lineTo(k * w / 8, y + Math.sin(k * 0.9 + r() * 2) * 2.2 + (r() - 0.5) * 1.2); x.stroke(); }
      for (var j = 0; j < 3; j++) { var cx = r() * w, cy = r() * h; x.strokeStyle = "rgba(60,32,8,.22)"; for (var q = 1; q < 4; q++) { x.beginPath(); x.ellipse(cx, cy, q * 4, q * 2.2, 0, 0, 7); x.stroke(); } }
    }, repeat);
  };
  KIT.crateTex = function (label, color, seed) {
    return canvasTex(256, 256, function (x, w, h) {
      var r = rng(seed || 3);
      x.fillStyle = color; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 90; i++) { x.strokeStyle = "rgba(50,28,6," + (0.04 + r() * 0.1) + ")"; x.lineWidth = 0.6 + r() * 1.6; x.beginPath(); var y = r() * h; x.moveTo(0, y); x.bezierCurveTo(w * .3, y + (r() - .5) * 6, w * .7, y + (r() - .5) * 6, w, y + (r() - .5) * 4); x.stroke(); }
      x.strokeStyle = "rgba(70,40,10,.55)"; x.lineWidth = 16; x.strokeRect(8, 8, w - 16, h - 16);
      x.strokeStyle = "rgba(255,230,180,.28)"; x.lineWidth = 3; x.strokeRect(17, 17, w - 34, h - 34);
      x.strokeStyle = "rgba(70,40,10,.5)"; x.lineWidth = 12; x.beginPath(); x.moveTo(16, 16); x.lineTo(w - 16, h - 16); x.moveTo(w - 16, 16); x.lineTo(16, h - 16); x.stroke();
      x.fillStyle = "#f7ecd0"; x.strokeStyle = "rgba(70,40,10,.7)"; x.lineWidth = 4;
      var bw = 188, bh = 62; x.fillRect((w - bw) / 2, (h - bh) / 2, bw, bh); x.strokeRect((w - bw) / 2, (h - bh) / 2, bw, bh);
      x.fillStyle = "#3a230a"; x.textAlign = "center"; x.textBaseline = "middle";
      var fs = 40; x.font = "700 " + fs + "px 'Fredoka','Nunito',Arial,sans-serif";
      while (x.measureText(label).width > bw - 14 && fs > 14) { fs -= 2; x.font = "700 " + fs + "px 'Fredoka','Nunito',Arial,sans-serif"; }
      x.fillText(label, w / 2, h / 2 + 2);
    });
  };
  KIT.canvasTex = canvasTex; KIT.rng = rng;
  KIT.leatherTex = function (base, seed) {
    return canvasTex(256, 256, function (x, w, h) {
      var r = rng(seed || 5); x.fillStyle = base; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 2600; i++) { var l = r(); x.fillStyle = l > 0.5 ? "rgba(255,230,190,.07)" : "rgba(40,18,4,.09)"; x.fillRect(r() * w, r() * h, 1 + r() * 2.2, 1 + r() * 2.2); }
    });
  };
  KIT.grassTex = function () {
    return canvasTex(256, 256, function (x, w, h) {
      var r = rng(11); x.fillStyle = "#86c452"; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 1800; i++) { x.strokeStyle = r() > 0.5 ? "rgba(255,255,160,.18)" : "rgba(30,90,20,.2)"; x.lineWidth = 1; var px = r() * w, py = r() * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - .5) * 4, py - 3 - r() * 5); x.stroke(); }
    }, [3, 3]);
  };

  /* ---- materials ---- */
  KIT.latex = function (hex) {
    return new T.MeshPhysicalMaterial({ color: hex, roughness: 0.34, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, reflectivity: 0.4, envMapIntensity: 0.42 });
  };
  KIT.matte = function (hex, rough) { return new T.MeshStandardMaterial({ color: hex, roughness: rough == null ? 0.85 : rough, metalness: 0, envMapIntensity: 0.4 }); };

  /* ---- a teardrop balloon with a knot, pointing down at the knot ---- */
  KIT.balloon = function (hex, R) {
    R = R || 0.5;
    var pts = [], N = 28;
    for (var i = 0; i <= N; i++) {
      var p = Math.PI - (i / N) * Math.PI;            /* from the bottom (pi) to the top (0) */
      var x = R * Math.sin(p) * (1 + 0.14 * Math.cos(p));
      var y = R * 1.18 * Math.cos(p);
      pts.push(new T.Vector2(Math.max(x, 0.0001), y));
    }
    var g = new T.Group();
    var body = new T.Mesh(new T.LatheGeometry(pts, 36), KIT.latex(hex)); body.castShadow = true; g.add(body);
    var knot = new T.Mesh(new T.ConeGeometry(R * 0.2, R * 0.3, 14), KIT.latex(hex)); knot.position.y = -R * 1.18 - R * 0.1; knot.rotation.x = Math.PI; knot.castShadow = true; g.add(knot);
    g.userData.R = R; g.userData.knotY = -R * 1.18 - R * 0.24;
    return g;
  };

  /* ---- a cylinder that stretches between two points (a string) ---- */
  var UP = new T.Vector3(0, 1, 0), tmp = new T.Vector3();
  KIT.stringMesh = function (rad, hex) {
    var m = new T.Mesh(new T.CylinderGeometry(rad || 0.012, rad || 0.012, 1, 5), new T.MeshStandardMaterial({ color: hex || 0xf6efe0, roughness: 0.9 }));
    return m;
  };
  KIT.stretch = function (m, a, b) {
    tmp.subVectors(b, a); var len = tmp.length() || 0.0001;
    m.position.copy(a).addScaledVector(tmp, 0.5); m.scale.set(1, len, 1);
    m.quaternion.setFromUnitVectors(UP, tmp.normalize());
  };


  /* ---- big puffy cumulus: many spheres, shaded from a bright top to a blue-grey belly (baked into vertex colours) ---- */
  var CLOUDS = [];
  function puff(rad, seed) {
    var g = new T.SphereGeometry(rad, 18, 12), pos = g.attributes.position, col = new Float32Array(pos.count * 3), top = new T.Color(0xffffff), bot = new T.Color(0xa6c4ec), c = new T.Color();
    for (var i = 0; i < pos.count; i++) { var ny = pos.getY(i) / rad, k = Math.max(0, Math.min(1, ny * 0.5 + 0.55)); c.copy(bot).lerp(top, Math.pow(k, 0.7) * (3 - 2 * k)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute("color", new T.BufferAttribute(col, 3)); return g;
  }
  KIT.cumulus = function (w, seed) {
    var r = rng(seed || 5), g = new T.Group(), mat = new T.MeshBasicMaterial({ vertexColors: true });
    var n = 16 + Math.floor(r() * 6);
    for (var i = 0; i < n; i++) {
      var u = r() * 2 - 1, rad = (0.5 + r() * 0.55) * w * (0.42 - Math.abs(u) * 0.2);
      var m = new T.Mesh(puff(rad), mat); m.position.set(u * w * 0.95, (r() - 0.35) * w * 0.28 + (1 - Math.abs(u)) * w * 0.22 * r(), (r() - 0.5) * w * 0.5); m.scale.y = 0.8; g.add(m);
    }
    var base = new T.Mesh(puff(w * 0.5), mat); base.scale.set(2.1, 0.45, 0.8); base.position.y = -w * 0.18; g.add(base);
    g.userData.mat = mat; CLOUDS.push(mat); return g;
  };
  /* tint every cumulus for the time of day: white by day, peach at dusk, violet at night */
  KIT.cloudTime = function (t) {
    var day = new T.Color(0xffffff), dusk = new T.Color(0xffc3a0), night = new T.Color(0x8a86c8), c = new T.Color();
    if (t < 0.5) c.copy(day); else if (t < 0.8) c.copy(day).lerp(dusk, (t - 0.5) / 0.3); else c.copy(dusk).lerp(night, Math.min(1, (t - 0.8) / 0.2));
    c.convertSRGBToLinear(); CLOUDS.forEach(function (m) { m.color.copy(c); });
  };
  KIT.fabricTex = function (base) {
    return canvasTex(128, 128, function (x, w, h) {
      x.fillStyle = base; x.fillRect(0, 0, w, h);
      for (var i = 0; i < w; i += 4) { x.fillStyle = "rgba(255,255,255,.07)"; x.fillRect(i, 0, 1.5, h); x.fillStyle = "rgba(0,0,0,.07)"; x.fillRect(0, i, w, 1.5); }
      var r = rng(4); for (var j = 0; j < 500; j++) { x.fillStyle = r() > .5 ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)"; x.fillRect(r() * w, r() * h, 1, 2); }
    }, [5, 5]);
  };

  /* ---- a small puffy cloud ---- */
  KIT.cloud = function (s) {
    var g = new T.Group(), m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x9fc4e6, emissiveIntensity: 0.18 });
    [[0, 0, 0, 1], [0.9, -0.1, 0.1, 0.75], [-0.9, -0.12, 0, 0.78], [0.45, 0.35, 0, 0.7], [-0.4, 0.3, 0.1, 0.62]].forEach(function (c) {
      var b = new T.Mesh(new T.SphereGeometry(0.62 * c[3], 20, 14), m); b.position.set(c[0], c[1], c[2]); b.scale.y = 0.85; g.add(b);
    });
    g.scale.setScalar(s || 1); return g;
  };


  /* ---- the world around the playground: rolling ground, hazy hills, a small school far away ---- */
  KIT.world = function (scene, o) {
    o = o || {};
    var g = new T.Group(); scene.add(g);
    var gt = KIT.grassTex(); gt.repeat.set(40, 40);
    var ground = new T.Mesh(new T.CircleGeometry(160, 64), new T.MeshStandardMaterial({ map: gt, roughness: 1, color: 0xd8f0b0 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    if (o.patch) {
      var patch = new T.Mesh(new T.CircleGeometry(o.patch, 56), new T.MeshStandardMaterial({ color: 0x93cf55, roughness: 1 })); patch.rotation.x = -Math.PI / 2; patch.position.y = 0.012; patch.receiveShadow = true; g.add(patch);
      var ring = new T.Mesh(new T.RingGeometry(o.patch, o.patch + 0.35, 56), new T.MeshStandardMaterial({ color: 0xd6bd84, roughness: 1 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.014; ring.receiveShadow = true; g.add(ring);
    }
    var hillCols = [0x7dbb55, 0x6aab52, 0x5f9f60, 0x5b9a74, 0x6c9fa0];
    [[-34, -58, 38, 9, 16, 0], [18, -66, 46, 12, 18, 1], [-70, -78, 52, 16, 20, 3], [60, -88, 60, 20, 22, 4], [-8, -100, 80, 26, 26, 3], [-22, -30, 22, 3.6, 9, 0], [26, -34, 24, 4.6, 10, 1], [-46, -24, 18, 3.2, 8, 2]].forEach(function (h) {
      var m = new T.Mesh(new T.SphereGeometry(1, 28, 16), new T.MeshStandardMaterial({ color: hillCols[h[5]], roughness: 1 })); m.scale.set(h[2], h[3], h[4]); m.position.set(h[0], h[3] * 0.2 - 0.6, h[1]); m.receiveShadow = true; g.add(m);
    });
    function tree(x, z, sc) {
      var t = new T.Group(); t.position.set(x, 0, z); t.scale.setScalar(sc);
      var trunk = new T.Mesh(new T.CylinderGeometry(0.17, 0.26, 1.5, 10), new T.MeshStandardMaterial({ map: KIT.woodTex("#8b5a30", 9, [1, 2]), roughness: 0.95 })); trunk.position.y = 0.75; trunk.castShadow = true; t.add(trunk);
      [[0, 2.0, 0, 0.95], [0.6, 1.7, 0.2, 0.7], [-0.55, 1.75, -0.1, 0.72], [0.05, 2.6, 0, 0.65]].forEach(function (b, k) { var m = new T.Mesh(new T.SphereGeometry(b[3], 18, 14), KIT.matte(k % 2 ? 0x5da83a : 0x6cba45, 0.9)); m.position.set(b[0], b[1], b[2]); m.castShadow = true; t.add(m); });
      g.add(t); return t;
    }
    (o.trees || []).forEach(function (t) { tree(t[0], t[1], t[2]); });
    /* the school: cream walls, terracotta roof, a clock tower, windows that glow at dusk */
    var win = new T.MeshStandardMaterial({ color: 0x35557f, roughness: 0.3, emissive: 0xffc866, emissiveIntensity: 0 });
    if (o.school) {
      var sc = new T.Group(); sc.position.set(o.school[0], 0, o.school[1]); sc.rotation.y = o.school[2] || 0; sc.scale.setScalar(o.school[3] || 1); g.add(sc);
      var wall = KIT.matte(0xf3dfb4, 0.9), roof = KIT.matte(0xc9593b, 0.8);
      [[0, 2, 0, 16, 4, 5], [-8.4, 1.4, 1, 4, 2.8, 4], [8.4, 1.4, 1, 4, 2.8, 4]].forEach(function (b) { var m = new T.Mesh(new T.BoxGeometry(b[3], b[4], b[5]), wall); m.position.set(b[0], b[1], b[2]); m.castShadow = true; sc.add(m); });
      var rf = new T.Mesh(new T.CylinderGeometry(0, 1, 1, 4), roof); rf.scale.set(11.8, 1.7, 3.8); rf.rotation.y = Math.PI / 4; rf.position.set(0, 4.85, 0); sc.add(rf);
      var tw = new T.Mesh(new T.BoxGeometry(3, 7, 3), wall); tw.position.set(0, 3.5, 1.2); tw.castShadow = true; sc.add(tw);
      var tr = new T.Mesh(new T.ConeGeometry(2.4, 2.8, 4), roof); tr.position.set(0, 8.4, 1.2); tr.rotation.y = Math.PI / 4; sc.add(tr);
      var clock = new T.Mesh(new T.CylinderGeometry(0.85, 0.85, 0.15, 24), KIT.matte(0xfff6dd, 0.4)); clock.rotation.x = Math.PI / 2; clock.position.set(0, 5.6, 2.75); sc.add(clock);
      for (var i = -3; i <= 3; i++) if (i) { var w = new T.Mesh(new T.BoxGeometry(1.0, 1.4, 0.1), win); w.position.set(i * 2.0, 2.2, 2.55); sc.add(w); }
      var door = new T.Mesh(new T.BoxGeometry(1.5, 2, 0.1), KIT.matte(0x8f4f26, 0.8)); door.position.set(0, 1, 2.55); sc.add(door);
      var pole = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 3, 6), KIT.matte(0xdddddd, 0.5)); pole.position.set(0, 10.8, 1.2); sc.add(pole);
      var flag = new T.Mesh(new T.PlaneGeometry(1.2, 0.7), new T.MeshStandardMaterial({ color: 0xef5a4c, side: T.DoubleSide, roughness: 0.8 })); flag.position.set(0.65, 11.9, 1.2); sc.add(flag);
    }
    return {
      group: g,
      setTime: function (t, fogHex) {
        var night = Math.max(0, Math.min(1, (t - 0.62) / 0.3));
        win.emissiveIntensity = night * 1.4;
        if (scene.fog) scene.fog.color.set(fogHex).convertSRGBToLinear();
      }
    };
  };

  /* ---- dust in the light by day, fireflies by night ---- */
  KIT.motes = function (scene, n, box) {
    var pos = new Float32Array(n * 3), ph = [], r = KIT.rng(77);
    for (var i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * box[0]; pos[i * 3 + 1] = r() * box[1]; pos[i * 3 + 2] = (r() - 0.5) * box[2]; ph.push(r() * 6.28); }
    var geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    var tex = canvasTex(64, 64, function (x, w, h) { var gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); });
    var mat = new T.PointsMaterial({ size: 0.16, map: tex, transparent: true, depthWrite: false, opacity: 0.8, color: 0xfff0c8, blending: T.AdditiveBlending, sizeAttenuation: true });
    var pts = new T.Points(geo, mat); scene.add(pts);
    return {
      update: function (dt, t, night) {
        var a = geo.attributes.position.array;
        for (var i = 0; i < n; i++) {
          a[i * 3] += Math.sin(t * 0.3 + ph[i]) * dt * 0.12; a[i * 3 + 1] += dt * (0.08 + 0.05 * Math.sin(ph[i]));
          if (a[i * 3 + 1] > box[1]) a[i * 3 + 1] = 0;
        }
        geo.attributes.position.needsUpdate = true;
        mat.color.setRGB(1, 0.94 - night * 0.1, 0.78 - night * 0.45); mat.opacity = 0.55 + night * 0.4; mat.size = 0.13 + night * 0.12;
      }
    };
  };

  /* ---- the cinematic overlay: sun or moon, light shafts, bokeh, grain, vignette ---- */
  var SUN = [[0, 16, 40, 260, [255, 224, 160, 0.7], 0.5], [0.25, 30, 14, 200, [255, 250, 225, 0.6], 0.3], [0.5, 62, 24, 260, [255, 214, 140, 0.7], 0.4], [0.78, 84, 42, 340, [255, 150, 90, 0.8], 0.55], [1, 78, 16, 150, [225, 232, 255, 0.9], 0.12]];
  KIT.cssSky = function (el, t, sky) {
    t = Math.max(0, Math.min(1, t));
    var a = SUN[0], b = SUN[1], k = 0;
    for (var i = 0; i < SUN.length - 1; i++) if (t <= SUN[i + 1][0]) { a = SUN[i]; b = SUN[i + 1]; k = (t - a[0]) / (b[0] - a[0]); break; }
    if (t > SUN[SUN.length - 1][0]) { a = b = SUN[SUN.length - 1]; }
    function m(x, y) { return x + (y - x) * k; }
    var c = [0, 1, 2, 3].map(function (j) { return Math.round(m(a[4][j] * (j < 3 ? 1 : 100), b[4][j] * (j < 3 ? 1 : 100))) / (j < 3 ? 1 : 100); });
    var st = el.style;
    st.setProperty("--sx", m(a[1], b[1]).toFixed(1) + "%"); st.setProperty("--sy", m(a[2], b[2]).toFixed(1) + "%"); st.setProperty("--sw", Math.round(m(a[3], b[3])) + "px");
    st.setProperty("--sc", "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + c[3] + ")"); st.setProperty("--rays", m(a[5], b[5]).toFixed(2));
    st.setProperty("--stars", String(Math.max(0, Math.min(1, (t - 0.8) / 0.18)).toFixed(2)));
    if (sky) { st.setProperty("--s1", sky.top); st.setProperty("--s2", sky.bot); }
  };
  KIT.cine = function (el) {
    if (el.querySelector(".cine")) return;
    var d = document.createElement("div"); d.className = "cine"; d.setAttribute("aria-hidden", "true");
    d.innerHTML = '<i class="sun"></i><i class="rays"></i><i class="bokeh"></i><i class="vig"></i><i class="grain"></i><i class="flare"></i>';
    el.appendChild(d);
  };
  KIT.flare = function (el) { var f = el.querySelector(".flare"); if (!f) return; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); };

  /* ---- a camera that glides between shots ---- */
  KIT.rig = function (camera, shots, first) {
    var cur = JSON.parse(JSON.stringify(shots[first])), tgt = shots[first], px = 0, py = 0, tx = 0, ty = 0, lk = new T.Vector3(), name = first;
    return {
      pointer: function (x, y) { tx = x; ty = y; },
      shot: function (n) { if (shots[n]) { tgt = shots[n]; name = n; } },
      get name() { return name; },
      update: function (dt, now, scale) {
        var k = 1 - Math.exp(-dt * 1.5);
        for (var i = 0; i < 3; i++) { cur.pos[i] += (tgt.pos[i] - cur.pos[i]) * k; cur.look[i] += (tgt.look[i] - cur.look[i]) * k; }
        cur.fov += (tgt.fov - cur.fov) * k;
        px += (tx - px) * Math.min(1, dt * 2); py += (ty - py) * Math.min(1, dt * 2);
        var hs = KIT.reduce ? 0 : 1, sc = scale || 1;
        camera.position.set(cur.pos[0] * 1 + px * 0.9 + Math.sin(now * 0.31) * 0.05 * hs, cur.pos[1] - py * 0.3 + Math.sin(now * 0.43) * 0.04 * hs, 0 + (cur.pos[2]) * sc);
        lk.set(cur.look[0], cur.look[1], cur.look[2]); camera.lookAt(lk);
        var f = cur.fov * (camera.aspect < 1 ? 1.38 : 1);
        if (Math.abs(camera.fov - f) > 0.01) { camera.fov = f; camera.updateProjectionMatrix(); }
      }
    };
  };

  /* hex colours are sRGB; this three.js build wants them linear, otherwise everything looks washed out */
  KIT.fixColors = function (scene) {
    scene.traverse(function (o) {
      if (o.isLight && o.color && !o.userData.lin) { o.color.convertSRGBToLinear(); if (o.groundColor) o.groundColor.convertSRGBToLinear(); o.userData.lin = true; }
      if (!o.isMesh) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        if (!m || m.userData.lin) return; m.userData.lin = true;
        if (m.color && !m.map) m.color.convertSRGBToLinear(); if (m.emissive && m.emissiveIntensity) m.emissive.convertSRGBToLinear();
      });
    });
  };

  /* ---- confetti made of tiny balloons, as DOM (cheap, works with or without WebGL) ---- */
  KIT.confetti = function () {
    if (KIT.reduce) return;
    var box = document.createElement("div"); box.className = "confetti"; document.body.appendChild(box);
    var cols = ["#ef5a4c", "#f7b731", "#22b3a4", "#2f93e8", "#ee80ae", "#8a6ad8", "#79be4c"];
    for (var i = 0; i < 46; i++) {
      var s = document.createElement("i"); s.style.left = Math.random() * 100 + "%"; s.style.background = cols[i % cols.length];
      s.style.animationDuration = 2.2 + Math.random() * 2 + "s"; s.style.animationDelay = Math.random() * 0.6 + "s"; s.style.setProperty("--r", (Math.random() * 500 - 250) + "deg");
      s.style.transform = "scale(" + (0.7 + Math.random() * 0.8) + ")"; box.appendChild(s);
    }
    setTimeout(function () { box.remove(); }, 5200);
  };
})();
