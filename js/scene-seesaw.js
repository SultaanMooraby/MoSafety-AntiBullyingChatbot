/* The see-saw. A made-up student (Kavi) sits on one end. Crates of "weight" land on the other end as the story goes on,
   and Kavi is lifted off the ground with nothing to push against. Four balloons (MoSafety's features) lift the heavy end.
   One API for the story and the lift toggles; a flat SVG version is used when WebGL is not available. */
(function () {
  "use strict";
  var KIT = window.MS3D || {}, T = window.THREE;
  var LABELS = ["Names", "Shove", "Left out", "Group chat", "Keeping quiet"];
  var CRATE_COL = ["#cf9650", "#bd8240", "#d6a05c", "#c58b49", "#b4783a"];
  var BAL_COL = [0xef5a4c, 0xf7b731, 0x22b3a4, 0x8a6ad8];
  var SKY = [ /* time, top, bottom, sun colour, sun intensity, hemi intensity */
    [0.0, "#3f92e4", "#d4eafb", 0xffedc8, 1.15, 0.6],
    [0.25, "#2c82df", "#c2e1f9", 0xfff8e8, 1.25, 0.62],
    [0.5, "#eebb68", "#fde6bd", 0xffd9a0, 1.05, 0.55],
    [0.78, "#c9698c", "#f6b684", 0xffb48a, 0.75, 0.45],
    [1.0, "#1d2456", "#5b4a86", 0x9fb0ff, 0.45, 0.45]
  ];
  function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix(a, b, k) { return a + (b - a) * k; }
  function mixHex(a, b, k) { var x = hex2rgb(a), y = hex2rgb(b); return "rgb(" + Math.round(mix(x[0], y[0], k)) + "," + Math.round(mix(x[1], y[1], k)) + "," + Math.round(mix(x[2], y[2], k)) + ")"; }
  function skyAt(t) {
    t = Math.max(0, Math.min(1, t));
    for (var i = 0; i < SKY.length - 1; i++) if (t <= SKY[i + 1][0]) {
      var a = SKY[i], b = SKY[i + 1], k = (t - a[0]) / (b[0] - a[0]);
      var sa = new T.Color(a[3]), sb = new T.Color(b[3]);
      return { top: mixHex(a[1], b[1], k), bot: mixHex(a[2], b[2], k), sun: sa.lerp(sb, k).convertSRGBToLinear(), si: mix(a[4], b[4], k), hi: mix(a[5], b[5], k) };
    }
    var l = SKY[SKY.length - 1]; return { top: l[1], bot: l[2], sun: new T.Color(l[3]).convertSRGBToLinear(), si: l[4], hi: l[5] };
  }

  /* ---------- the shared state both versions use ---------- */
  function State() {
    var s = this; s.crates = 0; s.time = 0; s.mood = 0; s.clock = ""; s.cam = "wide"; s.lift = [0, 0, 0, 0]; s.levelCb = null; s.fired = false;
  }

  /* ---------- 3D ---------- */
  function build3D(host, stageEl, st) {
    var S = KIT.stage(host, { fov: 36, exposure: 0.92 });
    if (!S) return null;
    var scene = S.scene, camera = S.camera;
    var PIV = 0.74, TOP = 0.15, HALF = 3.2;

    /* light */
    var hemi = new T.HemisphereLight(0xcfe9ff, 0x8a6a3c, 0.6); scene.add(hemi);
    var sun = new T.DirectionalLight(0xfff0d2, 1.25); sun.position.set(-8, 9, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); var sc = sun.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -6; sc.near = 1; sc.far = 30; sun.shadow.bias = -0.0006; sun.shadow.radius = 4;
    scene.add(sun);
    var rim = new T.DirectionalLight(0xbfdcff, 0.35); rim.position.set(7, 4, -6); scene.add(rim);

    /* the world: a clearing, hills in the haze, a small school far away */
    scene.fog = new T.Fog(0xe6f4fb, 32, 115);
    var world = KIT.world(scene, { patch: 5.4, trees: [[-7.6, -3.2, 1], [8.4, -4.2, 1.15], [-10.5, -8, 1.3], [11.5, -9.5, 1.4], [-16, -14, 1.7], [16.5, -16, 1.6], [3.2, -12, 1.2]], school: [-15, -36, 0.22, 1.2] });
    var island = new T.Group(); scene.add(island);
    var r = KIT.rng(21);
    for (var i = 0; i < 34; i++) {
      var a = r() * 6.283, d = 1.2 + r() * 3.8, fl = new T.Mesh(new T.SphereGeometry(0.06 + r() * 0.05, 8, 8), KIT.matte([0xffffff, 0xffd96e, 0xff9ab8, 0xb9a2ff][i % 4], 0.6));
      fl.position.set(Math.cos(a) * d, 0.06, Math.sin(a) * d * 0.9 + 0.3); if (Math.abs(fl.position.x) < 3.6 && fl.position.z > -0.8 && fl.position.z < 1.1) continue; island.add(fl);
    }
    KIT.cine(stageEl);
    var motes = KIT.motes(scene, 110, [16, 7, 9]);

    /* fulcrum */
    var sh = new T.Shape(); sh.moveTo(-0.85, 0); sh.lineTo(0.85, 0); sh.lineTo(0.12, PIV + 0.02); sh.lineTo(-0.12, PIV + 0.02); sh.closePath();
    var fg = new T.ExtrudeGeometry(sh, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 }); fg.translate(0, 0, -0.275);
    var ful = new T.Mesh(fg, new T.MeshStandardMaterial({ color: 0xe9503f, roughness: 0.55 })); ful.castShadow = true; ful.receiveShadow = true; island.add(ful);
    var bolt = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.9, 16), KIT.matte(0xf2c14e, 0.35)); bolt.rotation.x = Math.PI / 2; bolt.position.y = PIV; island.add(bolt);

    /* plank */
    var plank = new T.Group(); plank.position.y = PIV; island.add(plank);
    var ps = new T.Shape(), pw = HALF, ph = 0.1, rr = 0.09;
    ps.moveTo(-pw + rr, -ph); ps.lineTo(pw - rr, -ph); ps.quadraticCurveTo(pw, -ph, pw, -ph + rr); ps.lineTo(pw, ph - rr); ps.quadraticCurveTo(pw, ph, pw - rr, ph); ps.lineTo(-pw + rr, ph); ps.quadraticCurveTo(-pw, ph, -pw, ph - rr); ps.lineTo(-pw, -ph + rr); ps.quadraticCurveTo(-pw, -ph, -pw + rr, -ph);
    var pg = new T.ExtrudeGeometry(ps, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 }); pg.translate(0, 0, -0.3);
    var pm = new T.Mesh(pg, new T.MeshStandardMaterial({ map: KIT.woodTex("#e3b878", 3, [3, 1]), roughness: 0.8 })); pm.castShadow = true; pm.receiveShadow = true; plank.add(pm);
    [-HALF + 0.35, HALF - 0.35].forEach(function (x) { var cap = new T.Mesh(new T.BoxGeometry(0.22, 0.26, 0.66), KIT.matte(0xe9503f, 0.55)); cap.position.set(x, 0, 0); cap.castShadow = true; plank.add(cap); });

    /* Kavi */
    var kavi = new T.Group(); kavi.position.set(-2.3, TOP, 0); kavi.scale.setScalar(1.12); plank.add(kavi);
    var skin = new T.MeshStandardMaterial({ color: 0xb7774b, roughness: 0.55 }), dark = KIT.matte(0x251712, 0.6), fab = KIT.fabricTex("#ffffff"), hood = new T.MeshStandardMaterial({ color: 0x22b3a4, roughness: 0.95, bumpMap: fab, bumpScale: 0.22 }), pants = new T.MeshStandardMaterial({ color: 0x3d4f8a, roughness: 0.95, bumpMap: fab, bumpScale: 0.2 });
    var tp = [[0.001, 0], [0.33, 0.02], [0.4, 0.26], [0.36, 0.55], [0.25, 0.72], [0.12, 0.78], [0.001, 0.8]].map(function (p) { return new T.Vector2(p[0], p[1]); });
    var torso = new T.Mesh(new T.LatheGeometry(tp, 28), hood); torso.position.y = 0.06; torso.castShadow = true; kavi.add(torso);
    var pocket = new T.Mesh(new T.BoxGeometry(0.34, 0.14, 0.04), KIT.matte(0x1c9488, 0.9)); pocket.position.set(0, 0.32, 0.37); pocket.rotation.x = -0.12; kavi.add(pocket);
    var head = new T.Group(); head.position.y = 1.24; head.scale.setScalar(1.14); kavi.add(head);
    var skull = new T.Mesh(new T.SphereGeometry(0.42, 32, 24), skin); skull.scale.set(1, 0.95, 0.97); skull.castShadow = true; head.add(skull);
    var hair = new T.Mesh(new T.SphereGeometry(0.435, 32, 20, 0, Math.PI * 2, 0, 1.72), dark); hair.position.set(0, 0.015, -0.035); hair.rotation.x = -0.18; hair.castShadow = true; head.add(hair);
    [-1, 1].forEach(function (sx) {
      var ear = new T.Mesh(new T.SphereGeometry(0.085, 12, 10), skin); ear.position.set(sx * 0.41, -0.02, 0); ear.scale.set(0.6, 1, 0.8); head.add(ear);
      var cheek = new T.Mesh(new T.SphereGeometry(0.075, 12, 10), new T.MeshStandardMaterial({ color: 0xe9737a, roughness: 0.9, transparent: true, opacity: 0 })); cheek.position.set(sx * 0.25, -0.12, 0.35); cheek.scale.set(1, 0.6, 0.4); cheek.name = "cheek"; head.add(cheek);
    });
    var eyes = [], brows = [];
    [-1, 1].forEach(function (sx) {
      var eg = new T.Group(); eg.position.set(sx * 0.17, 0.03, 0.372);
      var w = new T.Mesh(new T.SphereGeometry(0.092, 16, 12), KIT.matte(0xffffff, 0.3)); w.scale.z = 0.5; eg.add(w);
      var pu = new T.Mesh(new T.SphereGeometry(0.064, 14, 10), dark); pu.position.z = 0.03; pu.scale.z = 0.6; eg.add(pu);
      var hl = new T.Mesh(new T.SphereGeometry(0.02, 8, 6), KIT.matte(0xffffff, 0.2)); hl.position.set(0.022, 0.028, 0.074); eg.add(hl);
      head.add(eg); eyes.push({ g: eg, pupil: pu });
      var br = new T.Mesh(new T.BoxGeometry(0.15, 0.03, 0.03), dark); br.position.set(sx * 0.16, 0.16, 0.38); head.add(br); brows.push({ m: br, sx: sx });
    });
    var nose = new T.Mesh(new T.SphereGeometry(0.045, 10, 8), skin); nose.position.set(0, -0.04, 0.41); nose.scale.z = 0.7; head.add(nose);
    var mouth = new T.Mesh(new T.TorusGeometry(0.1, 0.017, 8, 20, Math.PI), KIT.matte(0x4a1f1a, 0.6)); mouth.position.set(0, -0.19, 0.385); head.add(mouth);
    var arms = [];
    [-1, 1].forEach(function (sx) {
      var arm = new T.Mesh(new T.CylinderGeometry(0.085, 0.075, 0.62, 12), hood); arm.castShadow = true; kavi.add(arm); arms.push({ m: arm, sx: sx });
      var hand = new T.Mesh(new T.SphereGeometry(0.085, 12, 10), skin); kavi.add(hand); arms[arms.length - 1].hand = hand;
    });
    var legs = [];
    [-1, 1].forEach(function (sx) {
      var th = new T.Mesh(new T.CylinderGeometry(0.125, 0.115, 0.68, 14), pants); th.rotation.x = Math.PI / 2; th.position.set(sx * 0.17, 0.15, 0.36); th.castShadow = true; kavi.add(th);
      var knee = new T.Group(); knee.position.set(sx * 0.17, 0.15, 0.7); kavi.add(knee);
      var shin = new T.Mesh(new T.CylinderGeometry(0.108, 0.095, 0.78, 14), pants); shin.position.y = -0.39; shin.castShadow = true; knee.add(shin);
      var shoe = new T.Mesh(new T.SphereGeometry(0.14, 14, 10), KIT.matte(0xf28a33, 0.6)); shoe.scale.set(1, 0.72, 1.55); shoe.position.set(0, -0.82, 0.07); shoe.castShadow = true; knee.add(shoe);
      legs.push({ g: knee, sx: sx });
    });

    /* crates */
    var crates = [], slots = [[1.85, 0], [2.75, 0], [1.85, 1], [2.75, 1], [2.3, 2]], CS = 0.86;
    for (var c = 0; c < 5; c++) {
      var mat = new T.MeshStandardMaterial({ map: KIT.crateTex(LABELS[c], CRATE_COL[c], c + 2), roughness: 0.85 });
      var box = new T.Mesh(new T.BoxGeometry(CS, CS, CS), mat); box.castShadow = true; box.receiveShadow = true; box.visible = false;
      var jitter = (KIT.rng(c + 40)()) * 0.1 - 0.05;
      var bx = slots[c][0], by = TOP + 0.04 + CS / 2 + slots[c][1] * CS;
      box.position.set(bx, by, 0); box.rotation.y = jitter; plank.add(box);
      crates.push({ m: box, by: by, yo: 0, vy: 0, on: false, s: 0, landed: false, delay: 0 });
    }
    var topY = TOP + 0.04 + CS * 3;

    /* balloons tied to the top crate */
    var bg = new T.Group(); bg.position.set(2.3, topY, 0); plank.add(bg);
    var bals = [], offs = [[-0.95, 1.8, 0.15], [-0.3, 2.45, -0.2], [0.35, 2.1, 0.25], [1.0, 2.8, -0.1]];
    for (var b = 0; b < 4; b++) {
      var bl = KIT.balloon(BAL_COL[b], 0.58); bl.visible = false; bg.add(bl);
      var str = KIT.stringMesh(0.014); str.visible = false; bg.add(str);
      bals.push({ g: bl, s: str, off: offs[b], p: 0 });
    }

    /* clouds: big cumulus banks in the distance, lit from the top left */
    var clouds = [];
    [[-26, 17, -62, 16, 3], [14, 24, -78, 22, 8], [34, 12, -58, 13, 5], [-4, 30, -90, 24, 2], [-52, 24, -80, 18, 9], [58, 26, -96, 22, 4]].forEach(function (c) {
      var cl = KIT.cumulus(c[3], c[4]); cl.position.set(c[0], c[1], c[2]); scene.add(cl); clouds.push({ g: cl, x0: c[0], v: 0.03 + c[4] * 0.004 });
    });
    /* dappled light: an invisible canopy of leaves above the sun's path throws moving-looking patches of shade */
    var canopy = new T.Group(), cm = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), rc = KIT.rng(5);
    for (var q = 0; q < 46; q++) { var lf = new T.Mesh(new T.SphereGeometry(0.35 + rc() * 0.55, 8, 6), cm); lf.position.set(-4.7 + (rc() - 0.5) * 8, 5.6 + (rc() - 0.5) * 3.2, 4.4 + (rc() - 0.5) * 8); lf.castShadow = true; canopy.add(lf); }
    scene.add(canopy);

    /* camera: a rig that glides between shots as the story moves */
    var rig = KIT.rig(camera, {
      wide: { pos: [0, 3.2, 15], look: [0, 2.4, 0], fov: 36 },
      "in": { pos: [-0.8, 2.8, 11.6], look: [-0.5, 2.2, 0], fov: 34 },
      close: { pos: [0.2, 1.4, 9.8], look: [0.3, 2.35, 0], fov: 37 },
      crane: { pos: [1.2, 5.4, 17.5], look: [0.4, 2.7, 0], fov: 34 }
    }, "wide");
    stageEl.addEventListener("pointermove", function (e) { var b = stageEl.getBoundingClientRect(); rig.pointer(((e.clientX - b.left) / b.width - 0.5) * 2, ((e.clientY - b.top) / b.height - 0.5) * 2); });
    stageEl.addEventListener("pointerleave", function () { rig.pointer(0, 0); });

    /* simulation */
    var ang = 0, angV = 0, tNow = 0, mood = 0, blink = 0, blinkAt = 2, thud = 0, lit = skyAt(0), shot = "";
    function setSky(t) {
      lit = skyAt(t);
      KIT.cssSky(stageEl, t, lit);
      sun.color.copy(lit.sun); sun.intensity = lit.si; hemi.intensity = lit.hi;
      hemi.color.set(t > 0.7 ? 0x7f8ad8 : 0xcfe9ff).convertSRGBToLinear();
      world.setTime(t, lit.bot); KIT.cloudTime(t);
    }
    S.tick = function (dt, now) {
      var reduce = KIT.reduce;
      /* crates: appear, fall, land */
      var weight = 0;
      crates.forEach(function (c, i) {
        var want = i < st.crates;
        if (want && !c.on) { c.on = true; c.landed = false; c.yo = 7; c.vy = 0; c.s = 1; c.delay = (i % 5) * 0.0; c.m.visible = true; c.m.scale.setScalar(1); }
        if (!want && c.on) { c.on = false; c.landed = false; }
        if (c.on) {
          if (!c.landed) {
            c.vy -= 22 * dt; c.yo += c.vy * dt;
            if (c.yo <= 0) { c.yo = 0; if (c.vy < -3) { c.vy = -c.vy * 0.28; thud += Math.min(1, -c.vy * 0.2 + 0.4); } else { c.vy = 0; c.landed = true; } }
          }
          c.m.position.y = c.by + c.yo;
          if (c.landed || c.yo < 0.05) weight += 1;
        } else if (c.m.visible) {
          c.s -= dt * 4; if (c.s <= 0) { c.m.visible = false; c.s = 0; } c.m.scale.setScalar(Math.max(0.001, c.s)); c.m.position.y = c.by + (1 - c.s) * 1.2;
        }
      });
      /* balloons: float up or sink */
      var lifted = 0, nb = 0;
      bals.forEach(function (b, i) {
        var want = st.lift[i] ? 1 : 0; b.p += (want - b.p) * Math.min(1, dt * 3.2);
        if (Math.abs(b.p - want) < 0.003) b.p = want;
        lifted += b.p; var vis = b.p > 0.01; b.g.visible = vis; b.s.visible = vis; if (want) nb++;
        if (!vis) return;
        var sway = reduce ? 0 : Math.sin(now * 1.1 + i * 1.7) * 0.12, up = b.p;
        var bx = b.off[0] * (0.25 + 0.75 * up) + sway, by = 0.2 + (b.off[1] - 0.2) * up + (reduce ? 0 : Math.sin(now * 1.4 + i) * 0.06), bz = b.off[2] * up;
        b.g.position.set(bx, by + b.g.userData.R * 1.18 + 0.28, bz); b.g.rotation.z = -sway * 0.5; b.g.scale.setScalar(0.4 + 0.6 * up);
        KIT.stretch(b.s, new T.Vector3(0, 0.02, 0), new T.Vector3(bx - sway * 0.2, by + 0.28 - 0.04, bz));
      });
      /* plank: a spring toward the angle the weights ask for */
      var net = Math.max(0, weight - 1.25 * lifted), target = -net * 0.044;
      angV += ((target - ang) * 38 - angV * 5.2) * dt; ang += angV * dt;
      if (thud) { angV -= thud * 0.5; thud = 0; }
      var idle = reduce ? 0 : Math.sin(now * 0.9) * 0.006 * (net < 0.2 ? 1 : 0.3);
      plank.rotation.z = ang + idle;
      bg.rotation.z = -plank.rotation.z;
      /* when it is level with all four balloons, celebrate once */
      if (st.crates === 5 && lifted > 3.97 && Math.abs(ang) < 0.012 && !st.fired) { st.fired = true; if (st.levelCb) st.levelCb(); }
      if (lifted < 3.5 && st.fired) st.fired = false;
      if (st.meterCb) st.meterCb(Math.min(1, net / 5), weight, lifted);

      /* time of day */
      tNow += (st.time - tNow) * Math.min(1, dt * 2.2); setSky(tNow);
      /* Kavi's face follows the weight and the mood the story asks for */
      var wantMood = st.mood != null ? st.mood : Math.min(1, net / 4.5);
      mood += (wantMood - mood) * Math.min(1, dt * 3); var m = mood;
      head.rotation.x = m * 0.28 - (1 - m) * 0.03; head.rotation.z = Math.sin(now * 0.7) * 0.03 * (1 - m);
      torso.scale.y = 1 - m * 0.07; torso.rotation.x = m * 0.12;
      var smile = 1 - m * 2.1;                       /* +1 big smile, 0 flat, -1 frown */
      mouth.rotation.z = smile > 0 ? Math.PI : 0; mouth.scale.y = Math.max(0.12, Math.abs(smile) * 0.9 + 0.1); mouth.position.y = -0.19 + (smile > 0 ? 0.05 * smile : -0.02 * (-smile));
      mouth.scale.x = 1 + Math.max(0, smile) * 0.35;
      brows.forEach(function (b) { b.m.rotation.z = b.sx * (0.06 - m * 0.42); b.m.position.y = 0.16 + (1 - m) * 0.01 + m * 0.012; });
      eyes.forEach(function (e) { e.pupil.position.y = -m * 0.022; });
      blinkAt -= dt; if (blinkAt < 0) { blink = 1; blinkAt = 2.5 + Math.random() * 3; }
      blink = Math.max(0, blink - dt * 7); var lid = 1 - Math.sin(blink * Math.PI) * 0.9;
      eyes.forEach(function (e) { e.g.scale.y = lid; });
      head.children.forEach(function (ch) { if (ch.name === "cheek") ch.material.opacity = Math.max(0, smile) * 0.55; });
      var swing = reduce ? 0 : Math.sin(now * (1.2 + (1 - m) * 1.4)) * (0.04 + (1 - m) * 0.32) * (net > 0.5 ? 0.6 : 1);
      legs.forEach(function (l) { l.g.rotation.x = swing * l.sx * -1 * 0.8 + (net > 0.5 ? 0.12 : 0); });
      arms.forEach(function (a) {
        var s = new T.Vector3(a.sx * 0.36, 0.7 + 0.06 - m * 0.05, 0.02), h = new T.Vector3(a.sx * 0.5, 0.2, 0.28 + m * 0.05);
        KIT.stretch(a.m, s, h); a.hand.position.copy(h);
      });
      /* scenery and camera */
      if (!reduce) { clouds.forEach(function (c) { c.g.position.x = c.x0 + Math.sin(now * c.v) * 3; }); canopy.position.x = Math.sin(now * 0.35) * 0.5; canopy.position.z = Math.cos(now * 0.27) * 0.4; }
      if (st.cam && st.cam !== shot) { shot = st.cam; rig.shot(shot); }
      rig.update(dt, now, camera.aspect < 1 ? 1.28 : 1);
      motes.update(reduce ? 0 : dt, now, Math.max(0, Math.min(1, (tNow - 0.62) / 0.3)));
    };
    KIT.fixColors(scene);
    return { S: S };
  }

  /* ---------- flat SVG version for browsers without WebGL ---------- */
  function buildFlat(host, stageEl, st) {
    var NS = "http://www.w3.org/2000/svg";
    host.innerHTML = '<svg viewBox="0 0 400 320" role="img" aria-label="A see-saw. A student sits on the light end, lifted off the ground, while crates pile up on the other end.">' +
      '<ellipse cx="200" cy="262" rx="170" ry="26" fill="#86c452"/><ellipse cx="200" cy="274" rx="160" ry="14" fill="#8a5a32" opacity=".5"/>' +
      '<path d="M170 262 200 190 230 262Z" fill="#e9503f"/>' +
      '<g id="f-plank" style="transform-origin:200px 190px;transition:transform .9s cubic-bezier(.3,1.5,.5,1)"><rect x="40" y="184" width="320" height="12" rx="6" fill="#e3b878"/>' +
      '<g id="f-kavi" transform="translate(84 184)"><rect x="-16" y="-44" width="32" height="40" rx="14" fill="#22b3a4"/><circle cx="0" cy="-58" r="18" fill="#b7774b"/><path d="M-18 -62a18 18 0 0 1 36 0z" fill="#251712"/><circle cx="-6" cy="-57" r="2.4" fill="#251712"/><circle cx="6" cy="-57" r="2.4" fill="#251712"/><path id="f-mouth" d="M-6 -49q6 -3 12 0" stroke="#4a1f1a" stroke-width="2" fill="none"/><rect x="-14" y="-6" width="10" height="34" rx="5" fill="#3d4f8a"/><rect x="4" y="-6" width="10" height="34" rx="5" fill="#3d4f8a"/></g>' +
      '<g id="f-crates"></g><g id="f-bals"></g></g></svg>';
    var svg = host.firstChild, plank = svg.querySelector("#f-plank"), cr = svg.querySelector("#f-crates"), bl = svg.querySelector("#f-bals"), mouth = svg.querySelector("#f-mouth");
    var pos = [[300, 0], [338, 0], [300, 1], [338, 1], [319, 2]];
    LABELS.forEach(function (lb, i) {
      var g = document.createElementNS(NS, "g"); g.style.opacity = 0; g.style.transition = "opacity .4s";
      g.innerHTML = '<rect x="' + (pos[i][0] - 18) + '" y="' + (184 - 36 * (pos[i][1] + 1)) + '" width="36" height="36" rx="3" fill="' + CRATE_COL[i] + '" stroke="#6b4310" stroke-width="2"/><text x="' + pos[i][0] + '" y="' + (184 - 36 * pos[i][1] - 14) + '" font-size="7" text-anchor="middle" fill="#3a230a" font-family="sans-serif" font-weight="700">' + lb + '</text>';
      cr.appendChild(g);
    });
    BAL_COL.forEach(function (c, i) {
      var g = document.createElementNS(NS, "g"); g.style.opacity = 0; g.style.transition = "opacity .4s, transform .8s";
      var x = 270 + i * 26, h = 90 + (i % 2) * 24;
      g.innerHTML = '<line x1="319" y1="70" x2="' + x + '" y2="' + (70 - h + 22) + '" stroke="#e9dfc7" stroke-width="1"/><ellipse cx="' + x + '" cy="' + (70 - h) + '" rx="15" ry="19" fill="#' + ("000000" + c.toString(16)).slice(-6) + '"/>';
      bl.appendChild(g);
    });
    function apply() {
      var n = st.crates, lifted = st.lift.reduce(function (a, b) { return a + b; }, 0), net = Math.max(0, n - 1.25 * lifted);
      plank.style.transform = "rotate(" + (-net * 0.044 * 57.3).toFixed(1) + "deg)";
      Array.prototype.forEach.call(cr.children, function (g, i) { g.style.opacity = i < n ? 1 : 0; });
      Array.prototype.forEach.call(bl.children, function (g, i) { g.style.opacity = st.lift[i] ? 1 : 0; });
      var m = st.mood != null ? st.mood : Math.min(1, net / 4.5); mouth.setAttribute("d", m < 0.4 ? "M-7 -50q7 6 14 0" : m < 0.7 ? "M-6 -49h12" : "M-6 -47q6 -5 12 0");
      KIT.cssSky(stageEl, st.time, skyAt(st.time)); KIT.cine(stageEl);
      if (st.meterCb) st.meterCb(Math.min(1, net / 5), n, lifted);
      if (n === 5 && lifted > 3.97 && !st.fired) { st.fired = true; setTimeout(function () { if (st.levelCb) st.levelCb(); }, 900); }
      if (lifted < 3.5) st.fired = false;
    }
    return { apply: apply };
  }

  /* ---------- public ---------- */
  window.SeeSaw = {
    mount: function (stageEl) {
      var host = stageEl.querySelector(".stage-gl"); if (!host) return null;
      var st = new State(), impl = null, flat = null;
      var useGL = KIT.ok && T && !/[?&]nogl=1/.test(location.search);
      if (useGL) { try { impl = build3D(host, stageEl, st); } catch (e) { impl = null; if (window.console) console.warn("3D scene failed", e); } }
      if (impl) stageEl.classList.add("live"); else { flat = buildFlat(host, stageEl, st); stageEl.classList.add("flat"); flat.apply(); }
      var api = {
        mode: impl ? "3d" : "flat",
        set: function (o) { for (var k in o) st[k] = o[k]; if (flat) flat.apply(); },
        lift: function (arr) { st.lift = arr.slice(); if (flat) flat.apply(); },
        onLevel: function (cb) { st.levelCb = cb; }, onMeter: function (cb) { st.meterCb = cb; },
        state: st
      };
      return api;
    }
  };
})();
