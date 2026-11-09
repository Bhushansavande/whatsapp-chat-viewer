/* Chat statistics: who talks most, when, about what. */
(function (root) {
  "use strict";
  var STOP = new Set(("the a an and or but if of to in on at for with from by is are was were be been am i you he she it we they me my your our their this that these those " +
    "not no yes so do does did have has had will would can could just very too also than then there here what when who how why which as up out about into over " +
    "im its dont ok okay hi hello lol haha media omitted attached file image video audio sticker gif deleted message null " +
    "आहे आणि का की हो नाही मी तू तो ती ते हे हा ही या त्या ने ला चा ची चे च").split(" "));

  function stats(parsed) {
    var msgs = parsed.messages, per = {}, months = {}, hours = new Array(24).fill(0), days = new Array(7).fill(0);
    var words = {}, emojis = {}, starts = {}, mediaCount = 0, gapMs = 6 * 3600 * 1000, prev = null, total = 0;
    msgs.forEach(function (m) {
      if (!m.sender) { prev = m; return; }
      var p = per[m.sender] || (per[m.sender] = { messages: 0, words: 0, media: 0, deleted: 0, chars: 0 });
      p.messages++; total++;
      if (m.kind === "media" || m.kind === "omitted") { p.media++; mediaCount++; }
      if (m.kind === "deleted") p.deleted++;
      var d = new Date(m.t), key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      months[key] = (months[key] || 0) + 1; hours[d.getHours()]++; days[d.getDay()]++;
      if (m.kind === "msg" || m.text) {
        var t = m.text || "";
        p.chars += t.length;
        (t.toLowerCase().match(/[\p{L}\p{M}\p{N}']+/gu) || []).forEach(function (w) {
          p.words++;
          if (w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)) words[w] = (words[w] || 0) + 1;
        });
        (t.match(/\p{Extended_Pictographic}/gu) || []).forEach(function (e) { emojis[e] = (emojis[e] || 0) + 1; });
      }
      if (!prev || m.t - prev.t > gapMs) starts[m.sender] = (starts[m.sender] || 0) + 1;
      prev = m;
    });
    function top(o, n) { return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n); }
    var keys = Object.keys(months).sort();
    return {
      total: total, media: mediaCount, per: per, hours: hours, weekdays: days,
      months: keys.map(function (k) { return [k, months[k]]; }),
      topWords: top(words, 20), topEmojis: top(emojis, 10), starters: top(starts, 10),
      first: msgs.length ? msgs[0].t : null, last: msgs.length ? msgs[msgs.length - 1].t : null
    };
  }
  var api = { stats: stats };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.WaStats = api;
})(typeof self !== "undefined" ? self : this);
