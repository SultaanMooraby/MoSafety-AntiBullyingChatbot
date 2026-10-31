/* Welcome scene: a school satchel carried up by a bunch of glossy balloons. The weight you cannot see, lifted.
   Move the pointer to look around; touch a balloon and it bounces. */
(function () {
  "use strict";
  var KIT = window.MS3D || {}, T = window.THREE;
  var COLS = [0xef5a4c, 0xf7b731, 0x22b3a4, 0x2f93e8, 0xee80ae, 0x8a6ad8, 0xf28a33, 0x79be4c, 0xef5a4c];
  var OFFS = [[-1.55, 3.7, 0.2, 0.7], [-0.6, 4.7, -0.3, 0.74], [0.55, 4.3, 0.3, 0.72], [1.5, 3.55, -0.1, 0.68], [-2.3, 2.7, -0.3, 0.6], [2.3, 2.6, 0.2, 0.62], [0.0, 3.15, 0.6, 0.66], [-1.0, 3.2, -0.8, 0.6], [1.15, 5.2, -0.4, 0.58]];

  function roundedRect(w, h, r) {
    var s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  function satchel() {
    var g = new T.Group(), leather = new T.MeshStandardMaterial({ map: KIT.leatherTex("#c0793a", 3), roughness: 0.7 }), dark = new T.MeshStandardMaterial({ map: KIT.leatherTex("#8f4f26", 8), roughness: 0.7 });
    var body = new T.Mesh(new T.ExtrudeGeometry(roundedRect(1.5, 1.15, 0.3), { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 5 }), leather); body.geometry.translate(0, 0, -0.25); g.add(body);
    var flap = new T.Mesh(new T.ExtrudeGeometry(roundedRect(1.62, 0.72, 0.28), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 4 }), dark); flap.position.set(0, 0.3, 0.42); g.add(flap);
    var buckle = new T.Mesh(new T.BoxGeometry(0.26, 0.24, 0.07), KIT.matte(0xf2c14e, 0.3)); buckle.position.set(0, 0.0, 0.52); g.add(buckle);
    var pin = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.08), KIT.matte(0x8f4f26, 0.5)); pin.position.set(0, 0.0, 0.55); g.add(pin);
    var side = new T.Mesh(new T.ExtrudeGeometry(roundedRect(0.34, 0.6, 0.12), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 }), dark); side.position.set(-0.86, -0.15, 0); g.add(side);
    var side2 = side.clone(); side2.position.x = 0.86; g.add(side2);
    var handle = new T.Mesh(new T.TorusGeometry(0.4, 0.05, 10, 24, Math.PI), dark); handle.position.set(0, 0.72, 0); g.add(handle);
    var patch = KIT.canvasTex(256, 128, function (x, w, h) {
      x.fillStyle = "#f7ecd0"; x.fillRect(0, 0, w, h); x.strokeStyle = "#8f4f26"; x.setLineDash([8, 6]); x.lineWidth = 4; x.strokeRect(8, 8, w - 16, h - 16);
      x.setLineDash([]); x.fillStyle = "#ef5a4c"; x.beginPath(); x.ellipse(60, 56, 26, 33, 0, 0, 7); x.fill(); x.fillStyle = "rgba(255,255,255,.5)"; x.beginPath(); x.ellipse(51, 44, 7, 12, .4, 0, 7); x.fill();
      x.strokeStyle = "#8f4f26"; x.lineWidth = 3; x.beginPath(); x.moveTo(60, 90); x.quadraticCurveTo(52, 104, 62, 116); x.stroke();
      x.fillStyle = "#3a230a"; x.font = "700 34px 'Fredoka',Arial,sans-serif"; x.textAlign = "left"; x.textBaseline = "middle"; x.fillText("Mo", 100, 50); x.fillText("Safety", 100, 86);
    });
    var pm = new T.Mesh(new T.PlaneGeometry(0.62, 0.31), new T.MeshStandardMaterial({ map: patch, roughness: 0.9 })); pm.position.set(0, -0.28, 0.4); g.add(pm);
    g.traverse(function (o) { if (o.isMesh) o.castShadow = false; });
    return g;
  }

  function merge(geos) {
    var pos = [], nor = [], uv = [], idx = [], off = 0;
    geos.forEach(function (g) {
      var p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
      for (var i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); }
      for (var j = 0; j < g.index.count; j++) idx.push(g.index.getX(j) + off); off += p.count;
    });
    var m = new T.BufferGeometry(); m.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); m.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); m.setAttribute("uv", new T.Float32BufferAttribute(uv, 2)); m.setIndex(idx); return m;
  }
  /* one balloon (body + knot) as a single geometry, so 80 of them cost one draw call */
  function balloonGeo() {
    var R = 1, pts = [];
    for (var i = 0; i <= 28; i++) { var p = Math.PI - (i / 28) * Math.PI; pts.push(new T.Vector2(Math.max(R * Math.sin(p) * (1 + 0.14 * Math.cos(p)), 0.0001), R * 1.18 * Math.cos(p))); }
    var body = new T.LatheGeometry(pts, 28), knot = new T.ConeGeometry(0.2, 0.32, 10); knot.rotateX(Math.PI); knot.translate(0, -1.18 - 0.12, 0);
    return merge([body, knot]);
  }
  var PAL = [0xef4b3d, 0xf7a823, 0xffd13b, 0x2f8de8, 0x28b86f, 0xee6fa6, 0x8a62d8, 0xf2762c, 0x1fb3b0, 0xd93a4f, 0x5cc0f0, 0x9bd14a];

  window.HeroScene = {
    mount: function (stageEl) {
      var host = stageEl.querySelector(".stage-gl"); if (!host || !KIT.ok || !T || /[?&]nogl=1/.test(location.search)) return null;
      var S; try { S = KIT.stage(host, { fov: 40, shadows: false, exposure: 0.95 }); } catch (e) { return null; }
      if (!S) return null;
      var scene = S.scene, camera = S.camera;
      KIT.cine(stageEl);
      var hemi = new T.HemisphereLight(0xa8d4ff, 0xffffff, 0.6); scene.add(hemi);
      var sun = new T.DirectionalLight(0xfff0d0, 1.5); sun.position.set(-6, 10, 9); scene.add(sun);
      var rim = new T.DirectionalLight(0xbfdcff, 0.5); rim.position.set(7, 4, -6); scene.add(rim);
      function themeDark() { var d = document.documentElement.getAttribute("data-theme"); return d ? d === "dark" : !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches); }
      var tTime = 0.06, night = 0;
      function theme() {
        var d = themeDark(); tTime = d ? 0.82 : 0.06; night = d ? 1 : 0;
        KIT.cssSky(stageEl, tTime, null); KIT.cloudTime(tTime);
        sun.color.set(d ? 0xffa27a : 0xfff0d0).convertSRGBToLinear(); sun.intensity = d ? 1.0 : 1.35; hemi.color.set(d ? 0x7a78d0 : 0xa8d4ff).convertSRGBToLinear(); hemi.intensity = d ? 0.55 : 0.75;
      }
      /* clouds first (they are tinted by theme()) */
      var clouds = [[-14, -5.5, -8, 12, 3], [2, -7, -10, 15, 7], [16, -5, -9, 12, 5], [-30, 2, -26, 14, 2], [30, 6, -30, 16, 9], [-8, 14, -40, 18, 4], [-3, -3.4, 2, 7, 6]].map(function (c) { var cl = KIT.cumulus(c[3], c[4]); cl.position.set(c[0], c[1], c[2]); scene.add(cl); return { g: cl, x0: c[0], v: 0.04 + c[4] * 0.004 }; });
      theme();
      try { new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme); } catch (e) { }

      var root = new T.Group(); scene.add(root);
      var bag = satchel(); bag.scale.setScalar(1.15); bag.position.set(0, 0.2, 0); root.add(bag);
      var anchor = new T.Vector3(0, 1.45, 0.1);

      /* the cluster: eighty balloons packed into a teardrop */
      var N = 84, r = KIT.rng(31), P = [];
      while (P.length < N) {
        var y = 3.4 + r() * 10.4, t = (y - 3.4) / 10.4, rad = 4.1 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.85) + 0.3, a = r() * 6.283, d = Math.sqrt(r()) * rad;
        P.push({ x: Math.cos(a) * d, y: y, z: Math.sin(a) * d * 0.8, s: 0.52 + r() * 0.26, c: PAL[Math.floor(r() * PAL.length)], ph: r() * 6.28, hit: 0 });
      }
      for (var it = 0; it < 36; it++) for (var i = 0; i < N; i++) for (var j = i + 1; j < N; j++) {
        var dx = P[j].x - P[i].x, dy = P[j].y - P[i].y, dz = P[j].z - P[i].z, dd = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001, min = (P[i].s + P[j].s) * 0.88;
        if (dd < min) { var k = (min - dd) / dd * 0.5; P[i].x -= dx * k; P[i].y -= dy * k * 0.7; P[i].z -= dz * k; P[j].x += dx * k; P[j].y += dy * k * 0.7; P[j].z += dz * k; }
      }
      var mesh = new T.InstancedMesh(balloonGeo(), KIT.latex(0xffffff), N); mesh.frustumCulled = false; root.add(mesh);
      var cc = new T.Color(); P.forEach(function (b, i) { cc.set(b.c).convertSRGBToLinear(); mesh.setColorAt(i, cc); });
      var lg = new T.BufferGeometry(), lp = new Float32Array(N * 6); lg.setAttribute("position", new T.BufferAttribute(lp, 3));
      var lines = new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0xf6efe0, transparent: true, opacity: 0.8 })); lines.frustumCulled = false; root.add(lines);
      var dummy = new T.Object3D();

      var rig = KIT.rig(camera, { open: { pos: [0, -2.2, 30], look: [0, 4.5, 0], fov: 38 }, rest: { pos: [0, 0.2, 19.5], look: [0, 6.4, 0], fov: 40 } }, "open");
      setTimeout(function () { rig.shot("rest"); }, 250);
      stageEl.addEventListener("pointermove", function (e) { var b = stageEl.getBoundingClientRect(); rig.pointer(((e.clientX - b.left) / b.width - 0.5) * 2, ((e.clientY - b.top) / b.height - 0.5) * 2); });
      stageEl.addEventListener("pointerleave", function () { rig.pointer(0, 0); });
      var ray = new T.Raycaster(), ndc = new T.Vector2();
      function hit(e) {
        var b = S.canvas.getBoundingClientRect(); ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); ray.setFromCamera(ndc, camera);
        var h = ray.intersectObject(mesh); return h.length && h[0].instanceId != null ? h[0].instanceId : -1;
      }
      stageEl.addEventListener("pointerdown", function (e) { var id = hit(e); if (id >= 0) { P[id].hit = 1; for (var k = 0; k < N; k++) { var dd = Math.abs(P[k].x - P[id].x) + Math.abs(P[k].y - P[id].y); if (dd < 2.4 && k !== id) P[k].hit = Math.max(P[k].hit, 0.5); } } });
      stageEl.addEventListener("pointermove", function (e) { stageEl.style.cursor = hit(e) >= 0 ? "pointer" : ""; });

      S.tick = function (dt, now) {
        var reduce = KIT.reduce;
        root.position.y = reduce ? 0 : Math.sin(now * 0.8) * 0.2; root.rotation.y = Math.sin(now * 0.3) * 0.22;
        bag.rotation.z = reduce ? 0 : Math.sin(now * 0.8) * 0.05;
        for (var i = 0; i < N; i++) {
          var b = P[i], sw = reduce ? 0 : Math.sin(now * 1.1 + b.ph) * 0.1, hv = b.hit; b.hit = Math.max(0, b.hit - dt * 1.4);
          var bounce = Math.sin(hv * 14) * hv * 0.3;
          dummy.position.set(b.x + sw, b.y + bounce + (reduce ? 0 : Math.sin(now * 1.3 + b.ph) * 0.07), b.z); dummy.rotation.set(0, 0, -sw * 0.3 + Math.sin(hv * 18) * hv * 0.25); dummy.scale.setScalar(b.s * (1 + Math.sin(hv * 12) * hv * 0.12));
          dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
          lp[i * 6] = anchor.x; lp[i * 6 + 1] = anchor.y; lp[i * 6 + 2] = anchor.z; lp[i * 6 + 3] = dummy.position.x; lp[i * 6 + 4] = dummy.position.y - b.s * 1.5; lp[i * 6 + 5] = dummy.position.z;
        }
        mesh.instanceMatrix.needsUpdate = true; lg.attributes.position.needsUpdate = true;
        if (!reduce) clouds.forEach(function (c) { c.g.position.x = c.x0 + Math.sin(now * c.v) * 2.2; });
        rig.update(dt, now, camera.aspect < 1 ? 1.22 : 1);
        /* wide screens: slide the picture to the right so the cluster sits beside the headline, not behind it */
        var W = host.clientWidth, H = host.clientHeight;
        if (W > H * 1.25) { var off = -W * 0.2; if (camera.view == null || !camera.view.enabled || Math.abs(camera.view.offsetX - off) > 0.5 || camera.view.fullWidth !== W || camera.view.fullHeight !== H) { camera.setViewOffset(W, H, off, 0, W, H); } }
        else if (camera.view && camera.view.enabled) { camera.clearViewOffset(); }
      };
      KIT.fixColors(scene);
      stageEl.classList.add("live");
      return { S: S };
    }
  };
})();
