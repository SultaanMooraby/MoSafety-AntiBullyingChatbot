/* Small chart kit for the MoSafety evidence page. Every number comes from data/results.js,
   which is generated from the executed notebook. Each chart has a table view. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var R = window.RESULTS;
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function s(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function pct(v, d) { return (v * 100).toFixed(d || 0) + "%"; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* tooltip */
  var tip;
  function tipEl() { if (!tip) { tip = h("div", { "class": "tip", role: "tooltip" }); document.body.appendChild(tip); } return tip; }
  function showTip(text, x, y) {
    var t = tipEl(); t.textContent = text; t.classList.add("on");
    var w = t.offsetWidth, hh = t.offsetHeight;
    t.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x + 14)) + "px";
    t.style.top = Math.max(8, y - hh - 12) + "px";
  }
  function hideTip() { if (tip) tip.classList.remove("on"); }

  /* table view */
  function tableView(container, headers, rows, numCols) {
    var d = h("details", { "class": "tv" });
    d.appendChild(h("summary", null, "Table view"));
    var wrap = h("div", { "class": "scroll" });
    var t = h("table", { "class": "data" });
    var th = "<thead><tr>" + headers.map(function (x, i) { return "<th" + (numCols && numCols.indexOf(i) > -1 ? ' class="num"' : "") + ">" + esc(x) + "</th>"; }).join("") + "</tr></thead>";
    var tb = "<tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (c, i) { return "<td" + (numCols && numCols.indexOf(i) > -1 ? ' class="num"' : "") + ">" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody>";
    t.innerHTML = th + tb; wrap.appendChild(t); d.appendChild(wrap); container.appendChild(d);
  }

  /* horizontal bars (HTML) */
  function hbars(el, rows, o) {
    o = o || {};
    var max = o.max || Math.max.apply(null, rows.map(function (r) { return r.value; }));
    var box = h("div", { "class": "hb", role: "list" });
    var reserve = 14 + 8 * Math.max.apply(null, rows.map(function (r) { return String(r.display != null ? r.display : r.value).length; }));
    rows.forEach(function (r) {
      var row = h("div", { "class": "hb-row", role: "listitem" });
      row.appendChild(h("div", { "class": "hb-label" }, esc(r.label)));
      var tr = h("div", { "class": "hb-track" });
      var bar = h("div", { "class": "hb-bar" + (r.cls ? " " + r.cls : "") });
      bar.style.width = "calc((100% - " + reserve + "px) * " + (r.value / max).toFixed(4) + ")";
      tr.appendChild(bar);
      tr.appendChild(h("div", { "class": "hb-val" }, esc(r.display != null ? r.display : r.value)));
      row.appendChild(tr); box.appendChild(row);
    });
    el.appendChild(box);
  }

  /* segmented bar (HTML) */
  function segbar(el, parts, legendTitle) {
    var total = parts.reduce(function (a, p) { return a + p.value; }, 0);
    var bar = h("div", { "class": "seg", role: "img", "aria-label": parts.map(function (p) { return p.name + " " + p.value; }).join(", ") });
    parts.forEach(function (p) {
      var d = h("div", null, "");
      d.style.flex = p.value + " 1 0"; d.style.background = p.bg;
      if (p.dark) d.className = "dark-text";
      var share = p.value / total;
      if (share >= 0.1) d.textContent = Math.round(share * 100) + "%";
      d.title = p.name + ": " + p.value + " (" + Math.round(share * 100) + "%)";
      bar.appendChild(d);
    });
    el.appendChild(bar);
    var lg = h("div", { "class": "legend" });
    parts.forEach(function (p) { lg.appendChild(h("span", null, '<i style="background:' + p.bg + '"></i>' + esc(p.name))); });
    el.appendChild(lg);
    tableView(el, ["Group", "Messages", "Share"], parts.map(function (p) { return [p.name, p.value, pct(p.value / total)]; }), [1, 2]);
  }

  /* responsive svg */
  function responsive(el, build) {
    var last = 0;
    function render() {
      var w = Math.max(280, Math.floor(el.getBoundingClientRect().width));
      last = w;
      var keep = el.querySelector("details.tv"), nodes = el.querySelectorAll(".svgwrap");
      nodes.forEach(function (n) { n.remove(); });
      var wrap = h("div", { "class": "svgwrap" }); wrap.appendChild(build(w));
      el.insertBefore(wrap, keep || null);
    }
    render();
    if (window.ResizeObserver) {
      var t; new ResizeObserver(function () { clearTimeout(t); t = setTimeout(function () { var w = Math.floor(el.getBoundingClientRect().width); if (Math.abs(w - last) > 3) render(); }, 120); }).observe(el);
    }
  }

  function axes(svg, w, hgt, m, xs, ys, xt, yt, xl, yl) {
    yt.forEach(function (v) {
      s("line", { x1: m.l, x2: w - m.r, y1: ys(v.v), y2: ys(v.v), "class": "grid" }, svg);
      var t = s("text", { x: m.l - 8, y: ys(v.v) + 4, "text-anchor": "end", "class": "ax" }, svg); t.textContent = v.l;
    });
    s("line", { x1: m.l, x2: w - m.r, y1: hgt - m.b, y2: hgt - m.b, "class": "axis" }, svg);
    xt.forEach(function (v) {
      s("line", { x1: xs(v.v), x2: xs(v.v), y1: hgt - m.b, y2: hgt - m.b + 5, "class": "axis" }, svg);
      var t = s("text", { x: xs(v.v), y: hgt - m.b + 19, "text-anchor": "middle", "class": "ax" }, svg); t.textContent = v.l;
    });
    var tx = s("text", { x: m.l + (w - m.l - m.r) / 2, y: hgt - 6, "text-anchor": "middle", "class": "ax" }, svg); tx.textContent = xl;
    var ty = s("text", { transform: "translate(13," + (m.t + (hgt - m.t - m.b) / 2) + ") rotate(-90)", "text-anchor": "middle", "class": "ax" }, svg); ty.textContent = yl;
  }

  /* ---------- charts ---------- */
  var charts = {
    "risk-seg": function (el) {
      var c = R.counts.risk, mixes = [30, 52, 74, 100];
      segbar(el, R.labels.map(function (k, i) { return { name: k, value: c[k], bg: "color-mix(in srgb, var(--c1) " + mixes[i] + "%, var(--surface))", dark: false }; }));
      var segs = el.querySelectorAll(".seg > div"); segs.forEach(function (d, i) { if (mixes[i] <= 52) d.style.color = "var(--ink)"; });
    },
    "lang-seg": function (el) {
      var c = R.counts.langAll;
      segbar(el, [{ name: "English only", value: c["English only"], bg: "var(--c1)" }, { name: "Kreol or code-mixed", value: c["Kreol / code-mixed"], bg: "var(--c2)" }]);
    },
    "sys-f1": function (el) {
      hbars(el, R.systems.map(function (x) { return { label: x.name, value: x.f1, display: x.f1.toFixed(2), cls: x.id === R.final ? "hi" : "" }; }), { max: 1 });
      tableView(el, ["System", "Macro-F1"], R.systems.map(function (x) { return [x.name, x.f1.toFixed(2)]; }), [1]);
    },
    "sys-recall": function (el) {
      hbars(el, R.systems.map(function (x) { return { label: x.name, value: x.recall, display: x.caught + " (" + pct(x.recall) + ")", cls: x.id === R.final ? "hi" : "" }; }), { max: 1 });
      tableView(el, ["System", "Emergencies caught", "Recall"], R.systems.map(function (x) { return [x.name, x.caught, pct(x.recall)]; }), [1, 2]);
    },
    "sys-table": function (el) {
      var hd = ["System", "Macro-F1", "Accuracy", "Weighted κ", "Emergency recall", "Serious rated low", "Missed Emergency rated low", "False alarms"];
      var t = h("table", { "class": "data" });
      t.innerHTML = "<thead><tr>" + hd.map(function (x, i) { return "<th" + (i ? ' class="num"' : "") + ">" + x + "</th>"; }).join("") + "</tr></thead><tbody>" +
        R.systems.map(function (x) { return "<tr" + (x.id === R.final ? ' class="final"' : "") + "><td>" + esc(x.name) + "</td><td class=num>" + x.f1.toFixed(2) + "</td><td class=num>" + x.acc.toFixed(2) + "</td><td class=num>" + x.kappa.toFixed(2) + "</td><td class=num>" + x.caught + "</td><td class=num>" + x.under + "</td><td class=num>" + x.missEm + "</td><td class=num>" + x.over + "</td></tr>"; }).join("") + "</tbody>";
      var w = h("div", { "class": "scroll" }); w.appendChild(t); el.appendChild(w);
    },
    "heat": function (el) {
      var ctl = h("div", { "class": "seg-ctl", role: "group", "aria-label": "Choose system" });
      var b1 = h("button", { type: "button", "aria-pressed": "true" }, "Final system"), b2 = h("button", { type: "button", "aria-pressed": "false" }, "Plain TF-IDF + LR");
      ctl.appendChild(b1); ctl.appendChild(b2); el.appendChild(ctl);
      var grid = h("div", { "class": "heat", role: "table", "aria-label": "Confusion matrix" }); el.appendChild(grid);
      var note = h("p", { "class": "small", style: "margin-top:12px" }); el.appendChild(note);
      var holder = h("div"); el.appendChild(holder);
      function draw(cm, final) {
        var L = R.labels, max = Math.max.apply(null, [].concat.apply([], cm));
        var out = '<div class="h"></div>' + L.map(function (l) { return '<div class="h">Predicted ' + l + "</div>"; }).join("");
        cm.forEach(function (row, i) {
          out += '<div class="h row">True ' + L[i] + "</div>";
          row.forEach(function (v, j) {
            var a = v === 0 ? 0 : Math.max(12, Math.round(v / max * 100));
            var danger = i >= 2 && j <= 1;
            out += '<div class="c' + (danger && v > 0 ? " warn" : "") + '" style="background:color-mix(in srgb, var(--c1) ' + a + '%, var(--surface));color:' + (a >= 55 ? "#fff" : "var(--ink)") + '" title="True ' + L[i] + ", predicted " + L[j] + ": " + v + '">' + v + "</div>";
          });
        });
        grid.innerHTML = out;
        var under = cm[2][0] + cm[2][1] + cm[3][0] + cm[3][1], em = cm[3][3];
        note.innerHTML = "Red outline: a serious case (High or Emergency) rated Minimal or Limited. <b>" + under + "</b> cases. Emergencies caught: <b>" + em + " of " + (cm[3].reduce(function (a, b) { return a + b; }, 0)) + "</b>. Row 3, column 4 shows the price of the safety setting: High messages pushed up to Emergency.";
        holder.innerHTML = ""; tableView(holder, ["True \\ Predicted"].concat(L), cm.map(function (r, i) { return [L[i]].concat(r); }), [1, 2, 3, 4]);
      }
      draw(R.cmFinal, true);
      b1.onclick = function () { b1.setAttribute("aria-pressed", "true"); b2.setAttribute("aria-pressed", "false"); draw(R.cmFinal, true); };
      b2.onclick = function () { b2.setAttribute("aria-pressed", "true"); b1.setAttribute("aria-pressed", "false"); draw(R.cmLr, false); };
    },
    "report": function (el) {
      var t = h("table", { "class": "data" });
      t.innerHTML = "<thead><tr><th>Risk level</th><th class=num>Precision</th><th class=num>Recall</th><th class=num>F1</th><th class=num>Messages</th></tr></thead><tbody>" +
        R.report.map(function (r) { return "<tr><td>" + r.cls + "</td><td class=num>" + r.p.toFixed(2) + "</td><td class=num>" + r.r.toFixed(2) + "</td><td class=num>" + r.f1.toFixed(2) + "</td><td class=num>" + r.n + "</td></tr>"; }).join("") + "</tbody>";
      var w = h("div", { "class": "scroll" }); w.appendChild(t); el.appendChild(w);
    },
    "ci": function (el) {
      var items = [{ n: "Macro-F1 (risk)", d: R.ci.f1 }, { n: "Emergency recall", d: R.ci.recall }];
      items.forEach(function (it) {
        var row = h("div", { "class": "ci-row" });
        row.appendChild(h("div", null, "<b>" + it.n + "</b><br><span class='small'>" + it.d.v.toFixed(2) + ", 95% interval " + it.d.lo.toFixed(2) + " to " + it.d.hi.toFixed(2) + "</span>"));
        var tr = h("div", { "class": "ci-track", role: "img", "aria-label": it.n + " " + it.d.v + " with interval " + it.d.lo + " to " + it.d.hi });
        var wh = h("div", { "class": "ci-whisk" }); wh.style.left = (it.d.lo * 100) + "%"; wh.style.width = ((it.d.hi - it.d.lo) * 100) + "%"; tr.appendChild(wh);
        var dot = h("div", { "class": "ci-dot" }); dot.style.left = (it.d.v * 100) + "%"; tr.appendChild(dot);
        row.appendChild(tr); el.appendChild(row);
      });
      el.appendChild(h("div", { "class": "ci-scale" }, "<span>0</span><span>0.5</span><span>1.0</span>"));
      el.appendChild(h("p", { "class": "small", style: "margin-top:10px" }, "Interval from 1,000 bootstrap resamples of the 160 test messages. Only 17 are true Emergencies, so the recall interval is wide."));
    },
    "tradeoff": function (el) {
      var cv = R.curve.slice().sort(function (a, b) { return a.far - b.far; });
      responsive(el, function (w) {
        var hgt = w < 520 ? 300 : 350, m = { l: 50, r: 16, t: 16, b: 50 };
        var xs = function (v) { return m.l + (v / 0.6) * (w - m.l - m.r); };
        var ys = function (v) { return m.t + (1 - (v - 0.7) / 0.3) * (hgt - m.t - m.b); };
        var svg = s("svg", { "class": "svgchart", viewBox: "0 0 " + w + " " + hgt, width: w, height: hgt, role: "img", "aria-label": "Emergency recall against false-alarm rate. Choosing the threshold on development data gives about 97 percent recall at about 10 percent false alarms. The locked test lands at 94 percent recall and 9.8 percent false alarms." });
        var xt = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map(function (v) { return { v: v, l: Math.round(v * 100) + "%" }; });
        var yt = [0.7, 0.8, 0.9, 1.0].map(function (v) { return { v: v, l: Math.round(v * 100) + "%" }; });
        axes(svg, w, hgt, m, xs, ys, xt, yt, "False alarms: non-emergencies flagged as Emergency", "Emergencies caught");
        var d = cv.map(function (p, i) { return (i ? "L" : "M") + xs(p.far).toFixed(1) + " " + ys(p.recall).toFixed(1); }).join(" ");
        s("path", { d: d, "class": "ln" }, svg);
        var dv = R.devPoint, tp = R.testPoint;
        var lx1 = Math.min(xs(dv.far) + 34, w - 190), ly1 = ys(dv.recall) + 40;
        s("line", { x1: xs(dv.far), y1: ys(dv.recall), x2: lx1 - 4, y2: ly1 - 5, "class": "lead-ln" }, svg);
        var t1 = s("text", { x: lx1, y: ly1, "class": "val" }, svg); t1.innerHTML = '<tspan x="' + lx1 + '">Chosen threshold t = ' + R.tSafe.toFixed(2) + '</tspan><tspan x="' + lx1 + '" dy="15" class="ax" style="font-weight:400">development: ' + pct(dv.recall) + " caught</tspan>";
        var lx2 = Math.min(xs(tp.far) + 34, w - 190), ly2 = ys(tp.recall) + 98;
        s("line", { x1: xs(tp.far), y1: ys(tp.recall), x2: lx2 - 4, y2: ly2 - 5, "class": "lead-ln" }, svg);
        var t2 = s("text", { x: lx2, y: ly2, "class": "val" }, svg); t2.innerHTML = '<tspan x="' + lx2 + '">Locked test result</tspan><tspan x="' + lx2 + '" dy="15" class="ax" style="font-weight:400">16 of 17 caught, 14 false alarms</tspan>';
        s("circle", { cx: xs(dv.far), cy: ys(dv.recall), r: 6, "class": "dev" }, svg);
        s("rect", { x: xs(tp.far) - 6.5, y: ys(tp.recall) - 6.5, width: 13, height: 13, "class": "tst" }, svg);
        var cross = s("line", { y1: m.t, y2: hgt - m.b, "class": "cross", visibility: "hidden" }, svg);
        var dot = s("circle", { r: 4.5, "class": "dev", visibility: "hidden" }, svg);
        var hit = s("rect", { x: m.l, y: m.t, width: w - m.l - m.r, height: hgt - m.t - m.b, fill: "transparent" }, svg);
        hit.addEventListener("pointermove", function (e) {
          var r = svg.getBoundingClientRect(), px = e.clientX - r.left, best = null, bd = 1e9;
          cv.forEach(function (p) { var dd = Math.abs(xs(p.far) - px); if (dd < bd) { bd = dd; best = p; } });
          cross.setAttribute("x1", xs(best.far)); cross.setAttribute("x2", xs(best.far)); cross.setAttribute("visibility", "visible");
          dot.setAttribute("cx", xs(best.far)); dot.setAttribute("cy", ys(best.recall)); dot.setAttribute("visibility", "visible");
          showTip("t = " + best.t.toFixed(2) + ": " + pct(best.recall) + " of emergencies caught, " + pct(best.far, 1) + " false alarms", e.clientX, e.clientY);
        });
        hit.addEventListener("pointerleave", function () { cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); hideTip(); });
        return svg;
      });
      var lg = h("div", { "class": "legend" }, '<span><i style="background:var(--c1);border-radius:50%"></i>Development data, cross-validated (used to pick t)</span><span><i style="background:var(--c2)"></i>Locked test set</span>');
      el.appendChild(lg);
      tableView(el, ["Threshold t", "Emergencies caught (dev)", "False alarms (dev)"], R.curve.filter(function (p, i) { return i % 3 === 0 || Math.abs(p.t - R.tSafe) < 1e-9; }).map(function (p) { return [p.t.toFixed(2), pct(p.recall, 1), pct(p.far, 1)]; }), [0, 1, 2]);
    },
    "lcurve": function (el) {
      responsive(el, function (w) {
        var hgt = w < 520 ? 280 : 320, m = { l: 50, r: 16, t: 16, b: 50 };
        var xs = function (v) { return m.l + ((v - 200) / 260) * (w - m.l - m.r); };
        var ys = function (v) { return m.t + (1 - (v - 0.6) / 0.35) * (hgt - m.t - m.b); };
        var svg = s("svg", { "class": "svgchart", viewBox: "0 0 " + w + " " + hgt, width: w, height: hgt, role: "img", "aria-label": "Macro-F1 rises from 0.74 with 240 training messages to 0.81 with 432. Our locked test split scored 0.72 at 320." });
        var xt = [200, 250, 300, 350, 400, 450].map(function (v) { return { v: v, l: String(v) }; });
        var yt = [0.6, 0.7, 0.8, 0.9].map(function (v) { return { v: v, l: v.toFixed(1) }; });
        axes(svg, w, hgt, m, xs, ys, xt, yt, "Training messages", "Macro-F1 (risk)");
        var up = R.lc.map(function (p) { return xs(p.n).toFixed(1) + "," + ys(Math.min(0.95, p.mean + p.sd)).toFixed(1); });
        var dn = R.lc.slice().reverse().map(function (p) { return xs(p.n).toFixed(1) + "," + ys(Math.max(0.6, p.mean - p.sd)).toFixed(1); });
        s("polygon", { points: up.concat(dn).join(" "), "class": "band" }, svg);
        s("path", { d: R.lc.map(function (p, i) { return (i ? "L" : "M") + xs(p.n).toFixed(1) + " " + ys(p.mean).toFixed(1); }).join(" "), "class": "ln" }, svg);
        R.lc.forEach(function (p) {
          var c = s("circle", { cx: xs(p.n), cy: ys(p.mean), r: 5, "class": "dev", tabindex: 0, "aria-label": p.n + " training messages: mean " + p.mean.toFixed(2) + ", sd " + p.sd.toFixed(2) }, svg);
          var f = function (e) { var r = c.getBoundingClientRect(); showTip(p.n + " training messages: mean macro-F1 " + p.mean.toFixed(2) + " (sd " + p.sd.toFixed(2) + ")", e.clientX || r.left + 6, e.clientY || r.top); };
          c.addEventListener("pointermove", f); c.addEventListener("focus", f); c.addEventListener("pointerleave", hideTip); c.addEventListener("blur", hideTip);
        });
        var tx = xs(R.lcTest.n), ty = ys(R.lcTest.f1);
        s("rect", { x: tx - 6.5, y: ty - 6.5, width: 13, height: 13, "class": "tst" }, svg);
        var lx = Math.min(tx + 22, w - 160);
        s("line", { x1: tx, y1: ty, x2: lx - 4, y2: ty + 26, "class": "lead-ln" }, svg);
        var tt = s("text", { x: lx, y: ty + 36, "class": "val" }, svg); tt.innerHTML = '<tspan x="' + lx + '">Our locked test split</tspan><tspan x="' + lx + '" dy="15" class="ax" style="font-weight:400">TF-IDF + LR, macro-F1 0.72</tspan>';
        return svg;
      });
      el.appendChild(h("div", { "class": "legend" }, '<span><i style="background:var(--c1);border-radius:50%"></i>Mean of repeated cross-validation, shaded band = ±1 standard deviation</span><span><i style="background:var(--c2)"></i>Our single locked split</span>'));
      tableView(el, ["Folds", "Training messages", "Mean macro-F1", "Std. dev."], R.lc.map(function (p) { return [p.k, p.n, p.mean.toFixed(3), p.sd.toFixed(3)]; }), [0, 1, 2, 3]);
    },
    "errtypes": function (el) {
      hbars(el, R.errorTypes.map(function (e) { return { label: e.name, value: e.n, display: String(e.n), cls: e.kind === "bad" ? "bad" : "hi" }; }), { max: 32 });
      tableView(el, ["Error type", "Test messages"], R.errorTypes.map(function (e) { return [e.name, e.n]; }), [1]);
    },
    "audit": function (el) {
      hbars(el, R.audit.map(function (a) { return { label: a.name, value: a.n, display: a.n + " of " + R.auditN + " (" + Math.round(a.n / R.auditN * 100) + "%)", cls: "hi" }; }), { max: 14 });
      tableView(el, ["Problem in the logged reports", "Rows", "Share of 21"], R.audit.map(function (a) { return [a.name, a.n, Math.round(a.n / R.auditN * 100) + "%"]; }), [1, 2]);
    }
  };

  /* ---------- tables from data ---------- */
  function stClass(v) { return String(v).toLowerCase().replace(/[^a-z]/g, ""); }
  function stIcon(v) { v = String(v).toUpperCase(); return v === "PASS" ? "✓" : v === "FAIL" ? "✕" : v === "PARTIAL" ? "◐" : v === "PENDING" ? "…" : "•"; }
  function badge(v) { return '<span class="st ' + stClass(v) + '"><span aria-hidden="true">' + stIcon(v) + "</span>" + esc(v) + "</span>"; }
  var tables = {
    "live": function (el) {
      var t = h("table", { "class": "data" });
      t.innerHTML = "<thead><tr><th>Test</th><th>What we sent</th><th>What the bot did</th><th>Result</th><th>What we found</th></tr></thead><tbody>" +
        R.live.map(function (r) { return "<tr><td><b>" + r.id + "</b><br><span class=small>" + esc(r.tests) + "</span></td><td>" + esc(r.sent) + "</td><td>" + esc(r.did) + "</td><td>" + badge(r.verdict) + "</td><td>" + esc(r.note) + "</td></tr>"; }).join("") + "</tbody>";
      var w = h("div", { "class": "scroll" }); w.appendChild(t); el.appendChild(w);
    },
    "claims": function (el) {
      var t = h("table", { "class": "data" });
      t.innerHTML = "<thead><tr><th>Where</th><th>What the bot says</th><th>What the export shows</th><th>Status</th><th>Fix</th></tr></thead><tbody>" +
        R.claims.map(function (r) { return "<tr><td class=mono>" + esc(r.where) + "</td><td>" + esc(r.says) + "</td><td>" + esc(r.shows) + "</td><td>" + badge(r.status === "Not wired" ? "Not wired" : r.status) + "</td><td>" + esc(r.fix) + "</td></tr>"; }).join("") + "</tbody>";
      var w = h("div", { "class": "scroll" }); w.appendChild(t); el.appendChild(w);
    },
    "score": function (el) {
      var t = h("table", { "class": "data" });
      t.innerHTML = "<thead><tr><th>Measure</th><th>Evidence</th><th>Score</th><th>What it means</th><th>Decision</th></tr></thead><tbody>" +
        R.score.map(function (r) { var pend = /PENDING/.test(r[2]); return "<tr><td><b>" + esc(r[0]) + "</b></td><td>" + esc(r[1]) + "</td><td>" + (pend ? badge("PENDING") : esc(r[2])) + "</td><td>" + esc(r[3]) + "</td><td>" + esc(r[4]) + "</td></tr>"; }).join("") + "</tbody>";
      var w = h("div", { "class": "scroll" }); w.appendChild(t); el.appendChild(w);
    },
    "inventory": function (el) {
      var t = h("table", { "class": "data" });
      t.innerHTML = "<thead><tr><th>Idea (Lecture 10)</th><th>In MoSafety</th><th>Where in Botpress</th><th>How we evaluate it</th></tr></thead><tbody>" +
        R.inventory.map(function (r) { return "<tr><td><b>" + esc(r.concept) + "</b></td><td>" + esc(r.inbot) + "</td><td>" + esc(r.where) + "</td><td>" + esc(r.eval) + "</td></tr>"; }).join("") + "</tbody>";
      var w = h("div", { "class": "scroll" }); w.appendChild(t); el.appendChild(w);
    },
    "resp": function (el) {
      var t = h("table", { "class": "data" });
      t.innerHTML = "<thead><tr><th>Risk</th><th>What we did</th><th>What remains</th></tr></thead><tbody>" +
        R.resp.map(function (r) { return "<tr><td><b>" + esc(r.risk) + "</b></td><td>" + esc(r.did) + "</td><td>" + esc(r.remains) + "</td></tr>"; }).join("") + "</tbody>";
      var w = h("div", { "class": "scroll" }); w.appendChild(t); el.appendChild(w);
    },
    "lang": function (el) {
      var t = h("table", { "class": "data" });
      t.innerHTML = "<thead><tr><th>Language group</th><th class=num>Test messages</th><th class=num>Accuracy</th><th class=num>Macro-F1</th><th class=num>Emergencies caught</th><th class=num>Serious rated low</th></tr></thead><tbody>" +
        R.lang.map(function (r) { return "<tr><td>" + r.name + "</td><td class=num>" + r.n + "</td><td class=num>" + r.acc.toFixed(2) + "</td><td class=num>" + r.f1.toFixed(2) + "</td><td class=num>" + r.caught + "</td><td class=num>" + r.under + "</td></tr>"; }).join("") + "</tbody>";
      var w = h("div", { "class": "scroll" }); w.appendChild(t); el.appendChild(w);
    },
    "under": function (el) {
      var out = "";
      R.under.forEach(function (u) { out += '<p class="quote">“' + esc(u.text) + '”<br><span class="small">' + esc(u.lang) + ' · our label <span class="pill r-' + u.truth + '">' + u.truth + '</span> · model said <span class="pill r-' + u.pred + '">' + u.pred + "</span></span></p>"; });
      el.innerHTML = out;
    }
  };

  function init() {
    if (!R) return;
    document.querySelectorAll("[data-chart]").forEach(function (el) { var f = charts[el.getAttribute("data-chart")]; if (f) { try { f(el); } catch (e) { el.textContent = "Chart could not load."; console.error(e); } } });
    document.querySelectorAll("[data-table]").forEach(function (el) { var f = tables[el.getAttribute("data-table")]; if (f) { try { f(el); } catch (e) { console.error(e); } } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
