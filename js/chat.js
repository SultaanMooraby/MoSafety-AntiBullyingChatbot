/* MoSafety chat: the site's own chat window, connected to the MoSafety bot on Botpress.
   It calls Botpress's webchat API directly, so there is no widget and no link to follow.
   Flow: create a visitor and a conversation on the first message, listen to the reply stream (server-sent events),
   fall back to polling if the stream drops, and keep the conversation in localStorage so it survives page changes. */
(function () {
  "use strict";

  var CFG = window.MOSAFETY_CHAT || {};
  var CLIENT_ID = CFG.clientId || "8e894bc6-d3bc-47aa-99aa-1efd701918d1";
  var BASE = "https://webchat.botpress.cloud/" + CLIENT_ID;
  var OPEN_URL = CFG.openUrl || "https://cdn.botpress.cloud/webchat/v3.7/shareable.html?configUrl=https://files.bpcontent.cloud/2026/05/01/17/20260501171430-KGVRI319.json";
  var SESSION_KEY = "ms-chat-v1";
  var OPEN_KEY = "ms-chat-open";
  var MAXLEN = 1000;
  var STARTERS = [
    { label: "Hello", text: "Hello" },
    { label: "Bonjour", text: "Bonjour" },
    { label: "Bonzour", text: "Bonzour" }
  ];
  var STATUS = { idle: "Ready", wait: "Connecting", on: "Connected", retry: "Reconnecting", off: "Cannot reach the chat" };

  /* ---------- small helpers ---------- */
  var mem = {};
  var store = {
    get: function (k) { try { var v = localStorage.getItem(k); return v === null ? (mem[k] || null) : v; } catch (e) { return mem[k] || null; } },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) { } },
    del: function (k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { } }
  };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function hhmm(iso) { var d = iso ? new Date(iso) : new Date(); if (isNaN(d)) d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function safeUrl(u) { return /^https?:\/\//i.test(String(u || "")) ? String(u) : ""; }

  var MARK = '<svg class="mc-mark" width="34" height="40" viewBox="0 0 34 40" aria-hidden="true"><path d="M17 36c-1-4 2-6 0-9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M17 2C9 2 3 8.4 3 16.2c0 8.2 9 13.6 12.4 15.6l-1.8 3.4h6.8l-1.8-3.4C24 29.8 31 24.4 31 16.2 31 8.4 25 2 17 2Z" fill="#ef5a4c" stroke="rgba(0,0,0,.18)" stroke-width="1"/><ellipse cx="11.5" cy="10.5" rx="3.6" ry="5.6" fill="#fff" opacity=".45" transform="rotate(24 11.5 10.5)"/></svg>';
  var SEND = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.5 8h12M9 3.5 13.5 8 9 12.5"/></svg>';
  var CLOSE = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 2l10 10M12 2 2 12"/></svg>';

  /* ---------- turning a bot message into safe HTML ---------- */
  function inline(s) {
    var keep = [];
    function hold(h) { keep.push(h); return "\u0000" + (keep.length - 1) + "\u0000"; }
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, t, u) { return hold('<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + "</a>"); });
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]*[^\s<).,;!?])/g, function (m, p, u) { return p + hold('<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + "</a>"); });
    s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;!?]|$)/g, "$1<em>$2</em>");
    s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    return s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return keep[+i]; });
  }
  function format(text) {
    var t = String(text == null ? "" : text).replace(/\r/g, "").replace(/\\n/g, "\n").replace(/\n (?=[a-zà-ÿ])/g, " ").trim();
    if (!t) return "";
    return t.split(/\n{2,}/).map(function (block) {
      var lines = block.split("\n");
      var ul = lines.every(function (l) { return /^\s*[-*•]\s+/.test(l); });
      var ol = lines.every(function (l) { return /^\s*\d+[.)]\s+/.test(l); });
      if (ul || ol) {
        var tag = ul ? "ul" : "ol";
        return "<" + tag + ">" + lines.map(function (l) { return "<li>" + inline(esc(l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ""))) + "</li>"; }).join("") + "</" + tag + ">";
      }
      return "<p>" + lines.map(function (l) {
        var h = l.match(/^#{1,4}\s+(.*)$/);
        return h ? "<strong>" + inline(esc(h[1])) + "</strong>" : inline(esc(l));
      }).join("<br>") + "</p>";
    }).join("");
  }

  /* what a payload shows, and which quick replies it offers */
  function describe(p) {
    var out = { html: "", options: [] };
    if (!p) return out;
    var t = p.type;
    if (t === "text" || t === "markdown" || t === "choice" || t === "dropdown") {
      out.html = format(p.text != null ? p.text : p.markdown);
      if ((t === "choice" || t === "dropdown") && p.options) out.options = p.options.map(function (o) { return { label: o.label, value: o.value != null ? o.value : o.label }; });
      if ((t === "choice" || t === "dropdown") && /^\s*options:?\s*$/i.test(p.text || "")) out.html = "";
    } else if (t === "image" && safeUrl(p.imageUrl)) {
      out.html = '<p><img src="' + esc(safeUrl(p.imageUrl)) + '" alt="" loading="lazy"></p>';
    } else if (t === "card") {
      out = cardOf(p);
    } else if (t === "carousel" && p.items) {
      p.items.forEach(function (c) { var d = cardOf(c); out.html += d.html; out.options = out.options.concat(d.options); });
    } else if ((t === "file" || t === "audio" || t === "video") && safeUrl(p.fileUrl || p.audioUrl || p.videoUrl)) {
      var u = safeUrl(p.fileUrl || p.audioUrl || p.videoUrl);
      out.html = '<p><a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(p.title || "Open " + t) + "</a></p>";
    }
    return out;
  }
  function cardOf(c) {
    var o = { html: "", options: [] };
    if (c.imageUrl && safeUrl(c.imageUrl)) o.html += '<p><img src="' + esc(safeUrl(c.imageUrl)) + '" alt="" loading="lazy"></p>';
    if (c.title) o.html += '<p class="mc-card-title">' + inline(esc(c.title)) + "</p>";
    if (c.subtitle) o.html += '<p class="mc-card-sub">' + inline(esc(c.subtitle)) + "</p>";
    (c.actions || []).forEach(function (a) {
      if (a.action === "url" && safeUrl(a.value)) o.html += '<p><a href="' + esc(safeUrl(a.value)) + '" target="_blank" rel="noopener noreferrer">' + esc(a.label || a.value) + "</a></p>";
      else o.options.push({ label: a.label || a.value, value: a.value != null ? a.value : a.label });
    });
    return o;
  }

  /* ---------- the chat ---------- */
  function Chat(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.mode = this.opts.mode || "inline";
    this.s = this.load();
    this.nodes = {};          // message id -> {node, mine, at}
    this.list = [];           // rendered messages in order
    this.live = null;         // abort controller for the reply stream
    this.ready = null;
    this.status = "idle";
    this.typingTimer = 0;
    this.waitTimers = [];
    this.waiting = false;
    this.blocked = false;
    this.active = false;
    this.build();
    var self = this;
    document.addEventListener("securitypolicyviolation", function (e) {
      if (String(e.violatedDirective || e.effectiveDirective || "").indexOf("connect-src") === 0 && String(e.blockedURI || "").indexOf("botpress") !== -1) self.blocked = true;
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden && self.active && self.s.convId) self.sync().catch(function () { }); });
  }

  Chat.prototype.load = function () {
    try { var j = JSON.parse(store.get(SESSION_KEY) || "null"); if (j && j.key && j.userId && j.convId) return j; } catch (e) { }
    return {};
  };
  Chat.prototype.save = function () { if (this.s.key) store.set(SESSION_KEY, JSON.stringify(this.s)); };

  Chat.prototype.build = function () {
    var self = this, r = this.root;
    r.classList.add("mschat"); r.setAttribute("data-mode", this.mode);
    r.innerHTML =
      '<div class="mc-head">' + MARK +
      '<div class="mc-title"><b>MoSafety</b><span class="mc-status" data-s="idle" role="status">' + STATUS.idle + "</span></div>" +
      '<div class="mc-tools"><button type="button" class="mc-tool mc-reset">Start over</button>' +
      (this.mode === "dock" ? '<button type="button" class="mc-tool mc-close" aria-label="Close chat">' + CLOSE + "</button>" : "") + "</div></div>" +
      '<div class="mc-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with MoSafety" tabindex="-1"></div>' +
      '<form class="mc-form" autocomplete="off"><label class="visually-hidden" for="mc-in-' + this.mode + '">Your message</label>' +
      '<textarea class="mc-input" id="mc-in-' + this.mode + '" rows="1" maxlength="' + MAXLEN + '" placeholder="Write a message"></textarea>' +
      '<button type="submit" class="mc-send" disabled><span>Send</span>' + SEND + "</button></form>" +
      '<p class="mc-foot">Prototype. Use made-up scenarios. Messages go to the Botpress platform that runs the bot, and emergency alerts are simulated.</p>';
    this.log = r.querySelector(".mc-log");
    this.input = r.querySelector(".mc-input");
    this.sendBtn = r.querySelector(".mc-send");
    this.statusEl = r.querySelector(".mc-status");
    this.resetBtn = r.querySelector(".mc-reset");
    this.typing = el("div", "mc-msg bot mc-typing", '<div class="mc-bubble" aria-hidden="true"><i></i><i></i><i></i></div>');
    this.typing.hidden = true;
    this.log.appendChild(this.typing);

    var form = r.querySelector(".mc-form");
    form.addEventListener("submit", function (e) { e.preventDefault(); self.submit(); });
    this.input.addEventListener("input", function () { self.grow(); self.sendBtn.disabled = !self.input.value.trim(); });
    this.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); self.submit(); }
    });
    this.resetBtn.addEventListener("click", function () {
      if (self.resetBtn.getAttribute("data-armed") === "1") { self.reset(); return; }
      self.resetBtn.setAttribute("data-armed", "1"); self.resetBtn.textContent = "Click again to confirm";
      clearTimeout(self.armTimer);
      self.armTimer = setTimeout(function () { self.resetBtn.removeAttribute("data-armed"); self.resetBtn.textContent = "Start over"; }, 3500);
    });
    var cb = r.querySelector(".mc-close");
    if (cb) cb.addEventListener("click", function () { if (self.opts.onClose) self.opts.onClose(); });
    this.showIntro();
  };

  Chat.prototype.grow = function () {
    var i = this.input; i.style.height = "auto"; i.style.height = Math.min(i.scrollHeight + 2, 140) + "px";
  };

  Chat.prototype.setStatus = function (s) {
    this.status = s; this.statusEl.setAttribute("data-s", s); this.statusEl.textContent = STATUS[s] || "";
  };

  /* empty state */
  Chat.prototype.showIntro = function () {
    if (this.intro) return;
    var self = this;
    var d = el("div", "mc-intro");
    d.innerHTML = '<h3>Hi there! Say hello in English, Français or Kreol</h3>' +
      "<p>MoSafety helps you report bullying, find support, or ask how your information is used. Write as you would to a school counsellor.</p>" +
      '<div class="mc-starters"></div><p class="mc-langs">English · Français · Kreol morisien</p>';
    STARTERS.forEach(function (st) {
      var b = el("button", "mc-choice"); b.type = "button"; b.textContent = st.label;
      b.addEventListener("click", function () { self.send(st.text); });
      d.querySelector(".mc-starters").appendChild(b);
    });
    this.intro = d;
    this.log.insertBefore(d, this.log.firstChild);
  };
  Chat.prototype.hideIntro = function () { if (this.intro) { this.intro.remove(); this.intro = null; } };

  /* ---------- talking to Botpress ---------- */
  Chat.prototype.api = async function (path, o) {
    o = o || {};
    var h = {};
    if (this.s.key) h["x-user-key"] = this.s.key;
    if (o.body !== undefined) h["content-type"] = "application/json";
    var res = await fetch(BASE + path, { method: o.method || "GET", headers: h, body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
    if (!res.ok) { var e = new Error("HTTP " + res.status); e.status = res.status; throw e; }
    return res.json();
  };

  Chat.prototype.ensure = function () {
    var self = this;
    if (this.ready) return this.ready;
    var p = (async function () {
      self.setStatus("wait");
      if (!self.s.key) {
        var u = await self.api("/users", { method: "POST", body: {} });
        self.s = { key: u.key, userId: u.user.id };
      }
      if (!self.s.convId) {
        var c = await self.api("/conversations", { method: "POST", body: {} });
        self.s.convId = c.conversation.id;
      }
      self.save();
      await self.listen();
    })();
    this.ready = p;
    p.catch(function () { if (self.ready === p) self.ready = null; });
    return p;
  };

  /* open the reply stream; resolves once it is open, or after a short wait if it is not */
  Chat.prototype.listen = function () {
    var self = this;
    this.stop();
    var ac = new AbortController(); this.live = ac;
    var conv = this.s.convId, key = this.s.key;
    return new Promise(function (resolve) {
      var settled = false;
      function done(ok) { if (!settled) { settled = true; resolve(ok); } }
      setTimeout(function () { done(false); }, 7000);
      (async function loop() {
        var fails = 0, first = true;
        while (!ac.signal.aborted) {
          try {
            var res = await fetch(BASE + "/conversations/" + conv + "/listen", { headers: { "x-user-key": key, accept: "text/event-stream" }, signal: ac.signal });
            if (res.status === 401 || res.status === 403 || res.status === 404) { self.expired(); done(false); return; }
            if (!res.ok) throw new Error("HTTP " + res.status);
            fails = 0; self.setStatus("on"); done(true);
            if (!first) self.sync().catch(function () { });
            first = false;
            var reader = res.body.getReader(), dec = new TextDecoder(), buf = "", began = true;
            for (;;) {
              var x = await reader.read();
              if (x.done) break;
              buf += dec.decode(x.value, { stream: true });
              if (began) { buf = buf.replace(/^\s*\{\}/, ""); began = false; }
              buf = self.feed(buf);
            }
          } catch (e) {
            if (ac.signal.aborted) return;
            fails++; done(false);
          }
          if (ac.signal.aborted) return;
          if (fails > 0) self.setStatus(fails >= 3 ? "off" : "retry");
          await sleep(document.hidden ? 15000 : Math.min(800 * Math.pow(2, fails), 12000));
        }
      })();
    });
  };
  Chat.prototype.stop = function () { if (this.live) { try { this.live.abort(); } catch (e) { } this.live = null; } };

  Chat.prototype.feed = function (buf) {
    var parts = buf.split(/\r?\n\r?\n/), rest = parts.pop();
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i], k = part.indexOf("event:");
      if (k > 0) part = part.slice(k);
      var ev = "", data = [];
      part.split(/\r?\n/).forEach(function (l) {
        if (l.indexOf("event:") === 0) ev = l.slice(6).trim();
        else if (l.indexOf("data:") === 0) data.push(l.slice(5).replace(/^ /, ""));
      });
      if (!data.length) continue;
      var j; try { j = JSON.parse(data.join("\n")); } catch (e) { continue; }
      this.onEvent(j.type || ev, j.data !== undefined ? j.data : j);
    }
    return rest;
  };

  Chat.prototype.onEvent = function (type, d) {
    if (type === "message_created" && d) this.add(d);
    else if (type === "typing_started") this.showTyping((d && d.timeout ? d.timeout : 6000) + 1500);
    else if (type === "typing_stopped") this.showTyping(0);
  };

  /* fetch the history and add anything we do not have yet */
  Chat.prototype.sync = async function () {
    if (!this.s.convId) return;
    var r = await this.api("/conversations/" + this.s.convId + "/messages");
    var ms = (r.messages || []).slice().reverse();
    for (var i = 0; i < ms.length; i++) this.add(ms[i], true);
    if (!ms.length && !this.list.length) this.showIntro();
  };

  Chat.prototype.expired = function () {
    this.stop(); this.ready = null; this.s = {}; store.del(SESSION_KEY);
  };

  /* ---------- showing messages ---------- */
  Chat.prototype.add = function (m, quiet) {
    if (!m || !m.id || this.nodes[m.id]) return;
    var mine = m.userId === this.s.userId;
    if (mine) {
      // our own message coming back: match it to the one we already drew
      for (var i = this.list.length - 1; i >= 0; i--) {
        var it = this.list[i];
        if (it.mine && it.pending && it.text === (m.payload && m.payload.text)) { this.bind(it, m); return; }
      }
    }
    var d = describe(m.payload);
    if (!d.html && !d.options.length) return;
    this.hideIntro();
    // quick replies that arrive on their own ("Options:") belong under the message just before them
    var prev = this.list[this.list.length - 1];
    if (!mine && !d.html && prev && !prev.mine && !prev.options) {
      prev.options = this.choices(prev.node, d.options);
      this.nodes[m.id] = prev;
      this.waiting = false; this.clearWait(); this.showTyping(0); this.lockOtherChoices(prev); this.scroll();
      return;
    }
    var node = el("div", "mc-msg " + (mine ? "me" : "bot"));
    var meta = el("div", "mc-meta", "<span>" + (mine ? "You" : "MoSafety") + "</span><span>" + hhmm(m.createdAt) + "</span>");
    node.appendChild(meta);
    if (d.html) node.appendChild(el("div", "mc-bubble", d.html));
    var item = { id: m.id, node: node, mine: mine, at: m.createdAt || "", options: null };
    if (d.options.length && !mine) item.options = this.choices(node, d.options);
    this.nodes[m.id] = item;
    this.place(item);
    if (!mine) {
      this.waiting = false; this.clearWait(); this.showTyping(0);
      this.lockOtherChoices(item);
    }
  };

  /* keep messages in time order; the typing dots always stay last */
  Chat.prototype.place = function (item) {
    var near = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 90 || item.mine;
    var at = item.at, idx = this.list.length;
    for (var i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].at && at && this.list[i].at > at) idx = i; else break;
    }
    this.log.insertBefore(item.node, idx < this.list.length ? this.list[idx].node : this.typing);
    this.list.splice(idx, 0, item);
    if (near) this.scroll();
  };
  Chat.prototype.scroll = function () { var l = this.log; l.scrollTop = l.scrollHeight; };

  Chat.prototype.choices = function (node, options) {
    var self = this, box = el("div", "mc-choices");
    box.setAttribute("role", "group"); box.setAttribute("aria-label", "Quick replies");
    options.forEach(function (o) {
      var b = el("button", "mc-choice"); b.type = "button"; b.textContent = o.label; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        self.chosen = b;
        self.send(o.value, o.label);
      });
      box.appendChild(b);
    });
    node.appendChild(box);
    return box;
  };
  Chat.prototype.lockOtherChoices = function (current) {
    for (var i = 0; i < this.list.length; i++) {
      var it = this.list[i];
      if (it !== current && it.options) this.lock(it.options);
    }
  };
  Chat.prototype.lock = function (box) {
    var chosen = this.chosen;
    Array.prototype.forEach.call(box.querySelectorAll("button"), function (b) { b.disabled = true; if (b === chosen) b.setAttribute("aria-pressed", "true"); });
  };
  Chat.prototype.lockAll = function () { for (var i = 0; i < this.list.length; i++) if (this.list[i].options) this.lock(this.list[i].options); };

  Chat.prototype.showTyping = function (ms) {
    var self = this;
    clearTimeout(this.typingTimer);
    if (!ms) { this.typing.hidden = true; return; }
    var near = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 90;
    this.typing.hidden = false;
    if (near) this.scroll();
    this.typingTimer = setTimeout(function () { self.typing.hidden = true; }, ms);
  };

  /* ---------- sending ---------- */
  Chat.prototype.submit = function () {
    var v = this.input.value.trim();
    if (!v) return;
    this.input.value = ""; this.grow(); this.sendBtn.disabled = true;
    this.send(v);
  };

  Chat.prototype.send = async function (text, label) {
    text = String(text || "").trim().slice(0, MAXLEN);
    if (!text) return;
    this.hideIntro(); this.clearAlert(); this.lockAll(); this.chosen = null;
    var item = this.local(label || text, text);
    try {
      await this.ensure();
      var r = await this.api("/messages", { method: "POST", body: { conversationId: this.s.convId, payload: { type: "text", text: text } } });
      this.bind(item, r.message);
      this.expect();
    } catch (e) {
      if (e && (e.status === 401 || e.status === 403 || e.status === 404) && !item.retriedFresh) {
        // the saved visitor is no longer valid: start a fresh one and try once more
        item.retriedFresh = true; this.expired();
        try {
          await this.ensure();
          var r2 = await this.api("/messages", { method: "POST", body: { conversationId: this.s.convId, payload: { type: "text", text: text } } });
          this.bind(item, r2.message); this.expect(); return;
        } catch (e2) { e = e2; }
      }
      await sleep(80);   // let a blocked-by-policy report arrive so the message can say why
      this.fail(item, e);
    }
  };

  Chat.prototype.local = function (shown, sent) {
    var node = el("div", "mc-msg me pending");
    node.appendChild(el("div", "mc-meta", "<span>You</span><span>Sending</span>"));
    var b = el("div", "mc-bubble"); b.textContent = shown; node.appendChild(b);
    var item = { id: "local-" + Date.now() + Math.random(), node: node, mine: true, pending: true, text: sent, sent: sent, at: "", options: null };
    this.place(item);
    return item;
  };
  Chat.prototype.bind = function (item, m) {
    if (!m || item.bound) return;
    item.bound = true; item.pending = false; item.id = m.id; item.at = m.createdAt || item.at;
    this.nodes[m.id] = item;
    item.node.classList.remove("pending", "failed");
    var meta = item.node.querySelector(".mc-meta");
    if (meta) meta.innerHTML = "<span>You</span><span>" + hhmm(m.createdAt) + "</span>";
  };
  Chat.prototype.fail = function (item, e) {
    var self = this;
    item.pending = false; item.node.classList.remove("pending"); item.node.classList.add("failed");
    var meta = item.node.querySelector(".mc-meta");
    meta.innerHTML = "<span>Not sent</span>";
    var rb = el("button", "mc-retry"); rb.type = "button"; rb.textContent = "Try again";
    rb.addEventListener("click", function () {
      var i = self.list.indexOf(item); if (i > -1) self.list.splice(i, 1);
      item.node.remove(); self.send(item.sent);
    });
    meta.appendChild(rb);
    this.problem(e);
    this.setStatus(this.status === "on" ? "on" : "off");
  };

  /* wait for the bot's reply, with fallbacks if the stream is quiet */
  Chat.prototype.expect = function () {
    var self = this;
    this.waiting = true; this.clearWait();
    this.showTyping(12000);
    [3500, 8000, 14000, 22000].forEach(function (ms) {
      self.waitTimers.push(setTimeout(function () { if (self.waiting) self.sync().catch(function () { }); }, ms));
    });
    this.waitTimers.push(setTimeout(function () {
      if (!self.waiting) return;
      self.showTyping(0);
      self.note("MoSafety is taking longer than usual to answer. You can wait, or send your message again.");
    }, 35000));
  };
  Chat.prototype.clearWait = function () { this.waitTimers.forEach(clearTimeout); this.waitTimers = []; this.clearAlert(true); };

  /* ---------- notices ---------- */
  Chat.prototype.note = function (msg) { this.clearAlert(); this.alertEl = el("div", "mc-alert soft", "<p>" + esc(msg) + "</p>"); this.alertEl.setAttribute("role", "status"); this.log.insertBefore(this.alertEl, this.typing); this.scroll(); };
  Chat.prototype.problem = function (e) {
    this.clearAlert();
    var msg, link = true;
    if (this.blocked) msg = "This page is not allowed to contact the chat service, so the chat cannot work here. Open the hosted copy of the site, or use MoSafety directly.";
    else if (e && e.status === 429) { msg = "Too many messages in a short time. Wait a moment, then try again."; link = false; }
    else if (e && e.status >= 500) msg = "The chat service had a problem. Try again in a moment.";
    else msg = "The message did not go through. Check your connection and try again.";
    var a = el("div", "mc-alert", "<p>" + esc(msg) + "</p>");
    a.setAttribute("role", "alert");
    if (link) { var l = el("a", "", "Open MoSafety on its own page"); l.href = OPEN_URL; l.target = "_blank"; l.rel = "noopener noreferrer"; a.appendChild(l); }
    this.alertEl = a; this.log.insertBefore(a, this.typing); this.scroll();
  };
  Chat.prototype.clearAlert = function (onlySoft) {
    if (this.alertEl && (!onlySoft || this.alertEl.classList.contains("soft"))) { this.alertEl.remove(); this.alertEl = null; }
  };

  /* ---------- life cycle ---------- */
  Chat.prototype.activate = function () {
    if (this.active) return;
    this.active = true;
    if (this.s.convId && this.s.key) {
      var self = this;
      this.ensure().then(function () { return self.sync(); }).catch(function () { self.setStatus("off"); });
    }
  };
  Chat.prototype.focus = function () { try { this.input.focus(); } catch (e) { } };
  Chat.prototype.reset = function () {
    this.stop(); this.ready = null; this.s = {}; store.del(SESSION_KEY);
    this.nodes = {}; this.list = []; this.waiting = false; this.clearWait(); this.showTyping(0); this.clearAlert();
    Array.prototype.slice.call(this.log.querySelectorAll(".mc-msg:not(.mc-typing), .mc-alert, .mc-intro")).forEach(function (n) { n.remove(); });
    this.intro = null; this.showIntro(); this.setStatus("idle");
    this.resetBtn.removeAttribute("data-armed"); this.resetBtn.textContent = "Start over";
    this.log.scrollTop = 0;
  };

  /* ---------- placing it on a page ---------- */
  var MSChat = { Chat: Chat, main: null };
  window.MSChat = MSChat;

  function mountInline(host) {
    var c = new Chat(host, { mode: "inline" });
    MSChat.main = c; c.activate();
  }

  function mountDock() {
    var btn = el("button", "mc-launch", '<svg width="26" height="30" viewBox="0 0 34 40" aria-hidden="true"><path d="M17 2C9 2 3 8.4 3 16.2c0 8.2 9 13.6 12.4 15.6l-1.8 3.4h6.8l-1.8-3.4C24 29.8 31 24.4 31 16.2 31 8.4 25 2 17 2Z" fill="#ffd96e" stroke="rgba(0,0,0,.2)" stroke-width="1.2"/><ellipse cx="11.5" cy="10.5" rx="3.6" ry="5.6" fill="#fff" opacity=".6" transform="rotate(24 11.5 10.5)"/></svg><span>Talk to MoSafety</span>');
    btn.type = "button"; btn.setAttribute("aria-haspopup", "dialog"); btn.setAttribute("aria-expanded", "false");
    var panel = el("div", "mc-panel"); panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Chat with MoSafety");
    var host = el("div"); panel.appendChild(host);
    document.body.appendChild(btn); document.body.appendChild(panel);
    var chat = new Chat(host, { mode: "dock", onClose: close });
    MSChat.main = chat;
    function open() {
      panel.hidden = false; btn.hidden = true; btn.setAttribute("aria-expanded", "true");
      store.set(OPEN_KEY, "1"); chat.activate(); chat.scroll(); chat.focus();
    }
    function close() {
      panel.hidden = true; btn.hidden = false; btn.setAttribute("aria-expanded", "false");
      store.set(OPEN_KEY, "0"); try { btn.focus(); } catch (e) { }
    }
    chat.open = open; chat.closeDock = close;
    btn.addEventListener("click", open);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) close(); });
    if (store.get(OPEN_KEY) === "1" && chat.s.convId) { panel.hidden = false; btn.hidden = true; btn.setAttribute("aria-expanded", "true"); chat.activate(); }
  }

  function start() {
    var host = document.getElementById("mschat");
    if (host) mountInline(host); else mountDock();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
