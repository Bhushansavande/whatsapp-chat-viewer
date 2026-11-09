/* Reads a .zip file in the browser (WhatsApp "Export chat > Include media" makes one).
   Supports stored and deflate entries; uses the built-in DecompressionStream. */
(function (root) {
  "use strict";
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  function list(bytes) {
    var end = -1;
    for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (u32(bytes, i) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw new Error("not a zip file");
    var n = u16(bytes, end + 10), off = u32(bytes, end + 16), entries = [];
    for (var k = 0; k < n; k++) {
      if (u32(bytes, off) !== 0x02014b50) throw new Error("damaged zip directory");
      var flags = u16(bytes, off + 8), method = u16(bytes, off + 10), csize = u32(bytes, off + 20), usize = u32(bytes, off + 24);
      var nl = u16(bytes, off + 28), el = u16(bytes, off + 30), cl = u16(bytes, off + 32), lh = u32(bytes, off + 42);
      var name = new TextDecoder(flags & 0x800 ? "utf-8" : "utf-8").decode(bytes.subarray(off + 46, off + 46 + nl));
      entries.push({ name: name, method: method, csize: csize, usize: usize, lh: lh });
      off += 46 + nl + el + cl;
    }
    return entries;
  }

  function dataOf(bytes, e) {
    var p = e.lh;
    if (u32(bytes, p) !== 0x04034b50) throw new Error("damaged zip entry");
    var start = p + 30 + u16(bytes, p + 26) + u16(bytes, p + 28);
    return bytes.subarray(start, start + e.csize);
  }

  function extract(bytes, e) {
    var raw = dataOf(bytes, e);
    if (e.method === 0) return Promise.resolve(raw);
    if (e.method !== 8) return Promise.reject(new Error("unsupported compression in " + e.name));
    var ds = new DecompressionStream("deflate-raw");
    var stream = new Blob([raw]).stream().pipeThrough(ds);
    return new Response(stream).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }

  var api = { list: list, extract: extract };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.WaZip = api;
})(typeof self !== "undefined" ? self : this);
