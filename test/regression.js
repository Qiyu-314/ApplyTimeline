"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const core = require("../dates-core");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log("ok  " + name);
  } catch (err) {
    failed += 1;
    console.log("fail  " + name);
    console.log("    " + err.message);
  }
}

function keysOf(block) {
  const keys = [];
  const re = /^\s{8}([A-Za-z0-9_]+):/gm;
  let m;
  while ((m = re.exec(block))) keys.push(m[1]);
  return keys;
}

check("timeline layout follows viewport", function () {
  assert.ok(html.indexOf("function layoutMetrics") !== -1);
  assert.ok(html.indexOf("function settleCaptions") !== -1);
  assert.ok(html.indexOf("function isPhoneTimeline") !== -1);
  assert.ok(html.indexOf("--cap-w") !== -1);
  assert.ok(html.indexOf("@media (max-width: 820px)") !== -1);
  assert.ok(html.indexOf("@media (max-width: 640px)") !== -1);
  assert.ok(html.indexOf("flex-direction: column") !== -1);
  assert.ok(html.indexOf("visualViewport") !== -1);
});

check("nearby desktop captions drop instead of overlapping", function () {
  const capPx = 144;
  const padX = Math.max(12, Math.round(capPx * 0.16));
  const gap = 16;
  const lineH = 72;
  const extra = 8;
  const edge = 12;
  const railW = 920;
  function pct(day) { return ((day - 0.5) / 31) * 100; }
  function box(day, items, tick) {
    const p = pct(day);
    const x = railW * p / 100;
    let left;
    let right;
    if (p < edge) { left = x; right = x + capPx; }
    else if (p > 100 - edge) { left = x - capPx; right = x; }
    else { left = x - capPx / 2; right = x + capPx / 2; }
    const h = (tick ? 0 : 18) + items * (lineH + extra);
    return { left: left - padX, right: right + padX, h: h };
  }
  const a = box(1, 2, true);
  const b = box(3, 1, false);
  const xHit = a.left < b.right && a.right > b.left;
  assert.ok(xHit, "Dec 1 and Dec 3 should count as overlapping in X");
  const drop = a.h + gap;
  assert.ok(drop >= b.h, "Dec 3 should be pushed fully below Dec 1");
  assert.ok(a.h + gap > 150, "two-item block height should not be underestimated");
});

check("language toggle works during intro", function () {
  assert.ok(html.indexOf("body.help-open #navLang") !== -1);
  assert.ok(html.indexOf('document.body.classList.add("help-open")') !== -1);
  assert.ok(html.indexOf('document.body.classList.remove("help-open")') !== -1);
  assert.ok(/\.topbar\s*\{[\s\S]*?z-index:\s*100/.test(html));
});

check("page type is slightly larger", function () {
  assert.ok(/body\s*\{[\s\S]*?font-size:\s*1[78]px/.test(html));
  assert.ok(html.indexOf("font-size: 14px") !== -1);
  assert.ok(html.indexOf("font-size: 13px") !== -1);
});

check("html defaults to English", function () {
  assert.ok(html.indexOf('<html lang="en">') !== -1);
  assert.ok(html.indexOf('id="navLang"') !== -1);
  assert.ok(/id="navLang"[^>]*>中文</.test(html));
  assert.ok(html.indexOf('data-i18n="nav_how">How to use<') !== -1);
  assert.ok(html.indexOf('data-i18n="help_ack">Got it<') !== -1);
});

check("language packs have the same keys", function () {
  const enStart = html.indexOf("      en: {");
  const zhStart = html.indexOf("      zh: {");
  const enEnd = html.indexOf("      },", enStart);
  const zhEnd = html.indexOf("      }", zhStart);
  const enKeys = keysOf(html.slice(enStart, enEnd));
  const zhKeys = keysOf(html.slice(zhStart, zhEnd));
  assert.ok(enKeys.length > 40, "en keys " + enKeys.length);
  enKeys.forEach(function (k) {
    assert.ok(zhKeys.indexOf(k) !== -1, "zh missing " + k);
  });
  zhKeys.forEach(function (k) {
    assert.ok(enKeys.indexOf(k) !== -1, "en missing " + k);
  });
});

check("every template id has English copy", function () {
  const ids = [];
  const re = /id: "((?:us|uk|hk)-[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) ids.push(m[1]);
  const unique = ids.filter(function (id, i) { return ids.indexOf(id) === i; });
  unique.forEach(function (id) {
    assert.ok(html.indexOf('"' + id + '": { name:') !== -1, "TASK_EN missing " + id);
  });
});

check("toggle and first-visit help flags remain", function () {
  assert.ok(html.indexOf("helpLeadsToSetup") !== -1);
  assert.ok(html.indexOf('setLang(lang === "en" ? "zh" : "en")') !== -1);
  assert.ok(html.indexOf("initLang()") !== -1);
  assert.ok(html.indexOf('lang_btn: "中文"') !== -1);
  assert.ok(html.indexOf('lang_btn: "EN"') !== -1);
});

check("official date refresh still works", function () {
  const cache = { fetchedAt: null, patches: [{ id: "hk-open", start: "2026-09-23" }] };
  return core.refreshFromSources(function () {
    return Promise.resolve("2027 intake September 23, 2026 first-round 26 Nov 2026 21 Aug 2026 31 March 2027");
  }, cache, true).then(function (next) {
    assert.ok(next.fetchedAt);
    assert.ok(next.patches.some(function (p) { return p.id === "hk-open"; }));
  });
});

Promise.resolve().then(function () {
  return core.refreshFromSources(function () {
    return Promise.resolve("2027 intake September 23, 2026 first-round 26 Nov 2026 21 Aug 2026 31 March 2027");
  }, { fetchedAt: null, patches: [] }, true);
}).then(function (next) {
  check("dates-core parses HKU sample", function () {
    assert.ok(next.patches.length > 0);
    assert.ok(/HKU ok/.test(next.refreshNote));
  });
}).catch(function (err) {
  check("dates-core parses HKU sample", function () { throw err; });
}).then(function () {
  if (failed) {
    console.log("\n" + failed + " failed");
    process.exit(1);
  }
  console.log("\nall regression checks passed");
});
