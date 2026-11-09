(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var state = { text: "", parsed: null, filtered: [], shown: 0, media: {}, me: null };
  var PAGE = 300;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fail(msg) { var e = $("err"); e.textContent = msg; e.hidden = !msg; }
  function pad(n) { return String(n).padStart(2, "0"); }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  function mediaUrl(name) {
    var e = state.media[name];
    if (!e) return null;
    return e;
  }

  function highlight(text, q) {
    var h = esc(text);
    if (!q) return h;
    var re = new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    try { return h.replace(re, function (m) { return "<mark>" + m + "</mark>"; }); } catch (e) { return h; }
  }

  function apply() {
    var q = $("q").value.trim().toLowerCase(), who = $("who").value, from = $("from").value, to = $("to").value;
    var f = from ? new Date(from + "T00:00:00").getTime() : -Infinity;
    var t = to ? new Date(to + "T23:59:59").getTime() : Infinity;
    state.filtered = state.parsed.messages.filter(function (m) {
      if (m.t < f || m.t > t) return false;
      if (who && m.sender !== who) return false;
      if (q && (m.text || "").toLowerCase().indexOf(q) < 0 && (m.sender || "").toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    state.shown = 0; $("list").innerHTML = "";
    $("count").textContent = state.filtered.length.toLocaleString() + " messages";
    more();
  }

  function more() {
    var q = $("q").value.trim(), out = [], end = Math.min(state.filtered.length, state.shown + PAGE), last = null;
    if (state.shown > 0) last = dayKey(state.filtered[state.shown - 1].t);
    for (var i = state.shown; i < end; i++) {
      var m = state.filtered[i], dk = dayKey(m.t);
      if (dk !== last) { out.push('<li class="day">' + new Date(m.t).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }) + "</li>"); last = dk; }
      var time = new Date(m.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (!m.sender) { out.push('<li class="sys">' + highlight(m.text, q) + "</li>"); continue; }
      var body = "";
      if (m.kind === "media") {
        var u = mediaUrl(m.file);
        body = u ? '<span class="chip">' + esc(m.file) + "</span>" + '<div data-media="' + esc(m.file) + '"></div>' : '<span class="chip">attachment: ' + esc(m.file) + "</span>";
        if (m.text) body += "<div>" + highlight(m.text, q) + "</div>";
      } else if (m.kind === "omitted") body = '<span class="chip">media not included</span>' + (m.text ? "<div>" + highlight(m.text, q) + "</div>" : "");
      else if (m.kind === "deleted") body = '<i class="muted">message deleted</i>';
      else body = highlight(m.text, q);
      out.push('<li class="m' + (m.sender === state.me ? " me" : "") + '"><span class="time">' + time + '</span><span class="who">' + esc(m.sender) + "</span><br>" + body + "</li>");
    }
    $("list").insertAdjacentHTML("beforeend", out.join(""));
    state.shown = end; $("more").hidden = end >= state.filtered.length;
    attachMedia();
  }

  var urls = {};
  function attachMedia() {
    var nodes = document.querySelectorAll("#list [data-media]:empty");
    Array.prototype.forEach.call(nodes, function (n) {
      var name = n.getAttribute("data-media"), e = state.media[name];
      if (!e) return;
      var show = function (u) {
        var ext = name.split(".").pop().toLowerCase(), el;
        if (/^(jpe?g|png|webp|gif)$/.test(ext)) { el = document.createElement("img"); el.loading = "lazy"; el.alt = name; }
        else if (/^(mp4|3gp|mov|webm)$/.test(ext)) { el = document.createElement("video"); el.controls = true; el.preload = "none"; }
        else if (/^(mp3|m4a|ogg|opus|aac|wav)$/.test(ext)) { el = document.createElement("audio"); el.controls = true; el.preload = "none"; }
        else return;
        el.src = u; n.appendChild(el);
      };
      if (urls[name]) return show(urls[name]);
      WaZip.extract(e.bytes, e.entry).then(function (b) {
        var type = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", "3gp": "video/3gpp", mov: "video/quicktime", webm: "video/webm", mp3: "audio/mpeg", m4a: "audio/mp4", ogg: "audio/ogg", opus: "audio/ogg", aac: "audio/aac", wav: "audio/wav" }[name.split(".").pop().toLowerCase()];
        if (!type) return;
        urls[name] = URL.createObjectURL(new Blob([b], { type: type }));
        show(urls[name]);
      }).catch(function () {});
    });
  }

  function bars(rows, max) {
    return rows.map(function (r) { return '<div class="barrow"><span class="l">' + esc(r[0]) + '</span><i data-w="' + Math.max(2, Math.round(r[1] / max * 100)) + '"></i><span>' + r[1].toLocaleString() + "</span></div>"; }).join("");
  }

  function renderStats() {
    var s = WaStats.stats(state.parsed), days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var who = Object.keys(s.per).sort(function (a, b) { return s.per[b].messages - s.per[a].messages; });
    var maxM = Math.max.apply(null, s.months.map(function (m) { return m[1]; }).concat([1]));
    var h = '<div class="grid"><div><div class="big">' + s.total.toLocaleString() + '</div>messages</div><div><div class="big">' + who.length + '</div>people</div><div><div class="big">' + s.media + "</div>photos / media</div>";
    if (s.first) h += '<div><div class="big">' + Math.max(1, Math.round((s.last - s.first) / 86400000)) + "</div>days covered</div>";
    h += "</div><h3>Who writes most</h3><table><tr><th>Person</th><th>Messages</th><th>Words</th><th>Avg words</th><th>Started chats</th></tr>";
    who.forEach(function (n) { var p = s.per[n], st = s.starters.filter(function (x) { return x[0] === n; })[0]; h += "<tr><td>" + esc(n) + "</td><td>" + p.messages.toLocaleString() + "</td><td>" + p.words.toLocaleString() + "</td><td>" + (p.messages ? (p.words / p.messages).toFixed(1) : 0) + "</td><td>" + (st ? st[1] : 0) + "</td></tr>"; });
    h += "</table><h3>Messages per month</h3>" + bars(s.months, maxM);
    h += "<h3>By hour of day</h3>" + bars(s.hours.map(function (v, i) { return [pad(i) + ":00", v]; }), Math.max.apply(null, s.hours.concat([1])));
    h += "<h3>By weekday</h3>" + bars(s.weekdays.map(function (v, i) { return [days[i], v]; }), Math.max.apply(null, s.weekdays.concat([1])));
    if (s.topWords.length) h += "<h3>Most used words</h3><p>" + s.topWords.map(function (w) { return '<span class="chip">' + esc(w[0]) + " &times; " + w[1] + "</span>"; }).join(" ") + "</p>";
    if (s.topEmojis.length) h += "<h3>Most used emoji</h3><p>" + s.topEmojis.map(function (w) { return '<span class="chip">' + esc(w[0]) + " &times; " + w[1] + "</span>"; }).join(" ") + "</p>";
    $("stats").innerHTML = h;
    Array.prototype.forEach.call(document.querySelectorAll("#stats i[data-w]"), function (i) { i.style.width = i.getAttribute("data-w") + "%"; });
  }

  function load(text) {
    state.parsed = WaParser.parse(text, state.order ? { dateOrder: state.order } : {});
    if (!state.parsed.count) { fail("No WhatsApp messages were found in this file. Please choose the .txt or .zip made by \"Export chat\"."); return false; }
    fail("");
    var senders = Object.keys(state.parsed.senders).sort();
    $("who").innerHTML = '<option value="">Everyone</option>' + senders.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + "</option>"; }).join("");
    state.me = null;
    var amb = !state.parsed.dateOrderCertain && state.parsed.dateOrder !== "YMD";
    $("order").hidden = !amb; $("warn").hidden = !amb;
    if (amb) $("order").value = state.parsed.dateOrder;
    $("drop").hidden = true; $("view").hidden = false;
    renderStats(); apply();
    return true;
  }

  function handle(file) {
    if (!file) return;
    state.order = null; state.media = {}; urls = {};
    var isZip = /\.zip$/i.test(file.name) || file.type === "application/zip";
    file.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      if (!isZip) { state.text = new TextDecoder("utf-8").decode(bytes); return load(state.text); }
      var entries = WaZip.list(bytes), chat = null;
      entries.forEach(function (e) {
        var base = e.name.split("/").pop();
        if (/\.txt$/i.test(base) && (!chat || /chat/i.test(base))) chat = e;
        else if (base && !/\/$/.test(e.name)) state.media[base] = { entry: e, bytes: bytes };
      });
      if (!chat) throw new Error("This zip file has no chat .txt inside.");
      return WaZip.extract(bytes, chat).then(function (b) { state.text = new TextDecoder("utf-8").decode(b); return load(state.text); });
    }).catch(function (e) { fail(e && e.message ? e.message : "Could not read this file."); });
  }

  $("file").addEventListener("change", function () { handle(this.files[0]); });
  var pick = document.querySelector(".pick");
  ["dragover", "dragenter"].forEach(function (ev) { pick.addEventListener(ev, function (e) { e.preventDefault(); pick.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { pick.addEventListener(ev, function () { pick.classList.remove("over"); }); });
  pick.addEventListener("drop", function (e) { e.preventDefault(); handle(e.dataTransfer.files[0]); });
  ["q", "who", "from", "to"].forEach(function (id) { $(id).addEventListener("input", apply); });
  $("order").addEventListener("change", function () { state.order = this.value; var keep = this.value; load(state.text); $("order").value = keep; });
  $("more").addEventListener("click", more);
  $("list").addEventListener("click", function (e) {
    var li = e.target.closest("li.m"); if (!li) return;
    var w = li.querySelector(".who"); if (!w) return;
    state.me = state.me === w.textContent ? null : w.textContent;
    Array.prototype.forEach.call(document.querySelectorAll("#list li.m"), function (x) { x.classList.toggle("me", x.querySelector(".who").textContent === state.me); });
  });
  function tab(chat) { $("chat").hidden = !chat; $("stats").hidden = chat; $("t-chat").setAttribute("aria-selected", chat); $("t-stats").setAttribute("aria-selected", !chat); }
  $("t-chat").addEventListener("click", function () { tab(true); });
  $("t-stats").addEventListener("click", function () { tab(false); });
})();
