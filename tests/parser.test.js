const test = require("node:test");
const assert = require("node:assert");
const { parse } = require("../docs/parser.js");
const { stats } = require("../docs/stats.js");

const ANDROID_US = [
  "12/31/23, 9:45 PM - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.",
  "12/31/23, 9:45 PM - Asha: Happy new year!",
  "12/31/23, 9:46 PM - Ravi: Same to you",
  "see you tomorrow",
  "1/1/24, 12:05 AM - Asha: IMG-20240101-WA0001.jpg (file attached)",
  "Look at this",
  "1/1/24, 12:06 PM - Ravi: <Media omitted>",
  "1/1/24, 12:07 PM - Ravi: This message was deleted",
].join("\n");

test("android US format: 12h clock, month first, continuation lines", () => {
  const r = parse(ANDROID_US);
  assert.equal(r.dateOrder, "MDY");
  assert.equal(r.count, 6);
  assert.equal(r.messages[0].kind, "system");
  assert.equal(r.messages[1].sender, "Asha");
  assert.equal(new Date(r.messages[1].t).getHours(), 21);
  assert.equal(r.messages[2].text, "Same to you\nsee you tomorrow");
  assert.equal(new Date(r.messages[3].t).getHours(), 0);   // 12:05 AM
  assert.equal(r.messages[3].kind, "media");
  assert.equal(r.messages[3].file, "IMG-20240101-WA0001.jpg");
  assert.equal(r.messages[3].text, "Look at this");
  assert.equal(new Date(r.messages[4].t).getHours(), 12);  // 12:06 PM
  assert.equal(r.messages[4].kind, "omitted");
  assert.equal(r.messages[5].kind, "deleted");
});

test("android 24h day-first format (India/Europe)", () => {
  const r = parse("31/12/2023, 21:45 - Mama: शुभ रात्री\n01/01/2024, 08:00 - Mama: Good morning");
  assert.equal(r.dateOrder, "DMY");
  assert.ok(r.dateOrderCertain);
  assert.equal(new Date(r.messages[0].t).getDate(), 31);
  assert.equal(r.messages[0].text, "शुभ रात्री");
});

test("iPhone bracket format with invisible marks and attachments", () => {
  const t = "‎[31/12/23, 21:45:03] Asha: Hello\n‎[31/12/23, 21:46:10] Asha: ‎<attached: 00000012-PHOTO-2023-12-31-21-46-10.jpg>\n[01/01/24, 8:00:00 am] Ravi: ‎image omitted";
  const r = parse(t);
  assert.equal(r.count, 3);
  assert.equal(r.messages[1].kind, "media");
  assert.equal(r.messages[1].file, "00000012-PHOTO-2023-12-31-21-46-10.jpg");
  assert.equal(r.messages[2].kind, "omitted");
  assert.equal(new Date(r.messages[2].t).getHours(), 8);
});

test("narrow no-break space before PM (newer Android)", () => {
  const r = parse("12/31/23, 9:45 PM - Asha: hi");
  assert.equal(r.count, 1);
  assert.equal(new Date(r.messages[0].t).getHours(), 21);
});

test("dot separators and 2-digit years", () => {
  const r = parse("31.12.23, 21:45 - A: x");
  assert.equal(new Date(r.messages[0].t).getFullYear(), 2023);
});

test("ambiguous dates default to day first and say so", () => {
  const r = parse("01/02/23, 10:00 - A: x");
  assert.equal(r.dateOrder, "DMY");
  assert.equal(r.dateOrderCertain, false);
  assert.equal(new Date(r.messages[0].t).getMonth(), 1);
  const r2 = parse("01/02/23, 10:00 - A: x", { dateOrder: "MDY" });
  assert.equal(new Date(r2.messages[0].t).getMonth(), 0);
});

test("system message without sender; colon in a long text is not a sender", () => {
  const r = parse("1/2/23, 10:00 - Asha added Ravi\n1/2/23, 10:01 - Asha: note: remember this");
  assert.equal(r.messages[0].kind, "system");
  assert.equal(r.messages[1].sender, "Asha");
  assert.equal(r.messages[1].text, "note: remember this");
});

test("empty, garbage and huge input do not crash", () => {
  assert.equal(parse("").count, 0);
  assert.equal(parse("hello\nworld").count, 0);
  const big = Array.from({ length: 50000 }, (_, i) => `1/1/23, 10:${String(i % 60).padStart(2, "0")} AM - A: m${i}`).join("\n");
  const t0 = Date.now();
  assert.equal(parse(big).count, 50000);
  assert.ok(Date.now() - t0 < 5000);
});

test("statistics", () => {
  const s = stats(parse(ANDROID_US));
  assert.equal(s.total, 5);
  assert.equal(s.per.Asha.messages, 2);
  assert.equal(s.per.Ravi.messages, 3);
  assert.equal(s.media, 2);
  assert.ok(s.months.length === 2);
  assert.equal(s.per.Ravi.deleted, 1);
  const e = stats(parse("1/1/23, 10:00 AM - A: 😀😀 great great day\n1/1/23, 10:01 AM - B: great"));
  assert.deepEqual(e.topWords[0], ["great", 3]);
  assert.deepEqual(e.topEmojis[0], ["😀", 2]);
});
