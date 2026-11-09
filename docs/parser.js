/* WhatsApp "Export chat" parser. Understands the Android and iPhone text formats in many
   languages' date styles. Pure functions, no dependencies, runs in the browser and in Node. */
(function (root) {
  "use strict";

  var DATE = "(\\d{1,4}[/.\\-]\\d{1,2}[/.\\-]\\d{1,4})";
  var TIME = "(\\d{1,2}[:.]\\d{2}(?:[:.]\\d{2})?)(?:\\s*([AaPp]\\.?\\s?[Mm]\\.?))?";
  var RE_ANDROID = new RegExp("^" + DATE + ",?\\s+" + TIME + "\\s+-\\s+([\\s\\S]*)$");
  var RE_IOS = new RegExp("^\\[" + DATE + ",?\\s+" + TIME + "\\]\\s+([\\s\\S]*)$");
  var OMITTED = /^(?:<Media omitted>|(?:image|video|audio|sticker|GIF|document|Contact card|voice call|video call)? ?omitted)$/i;
  var DELETED = /^(?:This message was deleted|You deleted this message|🚫 This message was deleted|🚫 You deleted this message)\.?$/;

  function clean(line) {
    return line.replace(/[‎‏‪-‮﻿]/g, "").replace(/[  ]/g, " ").replace(/\r$/, "");
  }

  function splitHeader(line) {
    var m = RE_IOS.exec(line), ios = true;
    if (!m) { m = RE_ANDROID.exec(line); ios = false; }
    if (!m) return null;
    return { date: m[1], time: m[2], ampm: m[3] || "", rest: m[4], ios: ios };
  }

  // Which of the first two numbers is the day? Look at every date in the file.
  function detectOrder(headers) {
    var firstOver12 = false, secondOver12 = false, ymd = false;
    headers.forEach(function (h) {
      var p = h.date.split(/[/.\-]/).map(Number);
      if (String(h.date.split(/[/.\-]/)[0]).length === 4) { ymd = true; return; }
      if (p[0] > 12) firstOver12 = true;
      if (p[1] > 12) secondOver12 = true;
    });
    if (ymd) return { order: "YMD", certain: true };
    if (firstOver12 && !secondOver12) return { order: "DMY", certain: true };
    if (secondOver12 && !firstOver12) return { order: "MDY", certain: true };
    return { order: "DMY", certain: !firstOver12 && !secondOver12 ? false : false };
  }

  function toDate(h, order) {
    var raw = h.date.split(/[/.\-]/), p = raw.map(Number), d, mo, y;
    if (raw[0].length === 4) { y = p[0]; mo = p[1]; d = p[2]; }
    else if (order === "MDY") { mo = p[0]; d = p[1]; y = p[2]; }
    else { d = p[0]; mo = p[1]; y = p[2]; }
    if (y < 100) y += 2000;
    var t = h.time.split(/[:.]/).map(Number), hh = t[0], mm = t[1], ss = t[2] || 0;
    if (h.ampm) {
      var pm = /^p/i.test(h.ampm);
      if (hh === 12) hh = pm ? 12 : 0; else if (pm) hh += 12;
    }
    return new Date(y, mo - 1, d, hh, mm, ss);
  }

  function parse(text, opts) {
    opts = opts || {};
    var lines = String(text).split("\n");
    var raw = [];                                   // {header, lines[]}
    lines.forEach(function (ln) {
      var c = clean(ln), h = splitHeader(c);
      if (h) raw.push({ h: h, body: [h.rest] });
      else if (raw.length) raw[raw.length - 1].body.push(c);
    });
    var det = detectOrder(raw.map(function (r) { return r.h; }));
    var order = opts.dateOrder || det.order;
    var messages = [], senders = {};
    raw.forEach(function (r) {
      var body = r.body.join("\n").replace(/\n+$/, "");
      var date = toDate(r.h, order);
      if (isNaN(date.getTime())) return;
      var sender = null, textOut = body, ix = body.indexOf(": ");
      var nl = body.indexOf("\n");
      if (ix > 0 && ix <= 60 && (nl < 0 || ix < nl)) { sender = body.slice(0, ix); textOut = body.slice(ix + 2); }
      var msg = { t: date.getTime(), sender: sender, text: textOut, kind: sender ? "msg" : "system", file: null };
      if (sender) {
        senders[sender] = (senders[sender] || 0) + 1;
        var first = textOut.split("\n")[0], rest = textOut.split("\n").slice(1).join("\n");
        var m;
        if ((m = /^(.+?) \(file attached\)$/.exec(first))) { msg.kind = "media"; msg.file = m[1]; msg.text = rest; }
        else if ((m = /^<attached: (.+)>$/.exec(first))) { msg.kind = "media"; msg.file = m[1]; msg.text = rest; }
        else if (OMITTED.test(first)) { msg.kind = "omitted"; msg.text = rest; }
        else if (DELETED.test(first)) { msg.kind = "deleted"; }
        else if (first === "null") { msg.kind = "omitted"; }
      }
      messages.push(msg);
    });
    return { messages: messages, senders: senders, dateOrder: order, dateOrderCertain: det.certain, count: messages.length };
  }

  var api = { parse: parse, clean: clean };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.WaParser = api;
})(typeof self !== "undefined" ? self : this);
