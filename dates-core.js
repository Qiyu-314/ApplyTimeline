"use strict";

const STALE_MS = 6 * 60 * 60 * 1000;
const HKU_URL = "https://admissions.hku.hk/apply/international-qualifications";
const UCAS_URL = "https://www.ucas.com/advisers/help-and-training/key-dates-timeline";

function addYear(iso, years) {
  return iso.replace(/^(\d{4})/, function (_, y) { return String(Number(y) + years); });
}

function parseHku(html) {
  const patches = [];
  const open = html.match(/2027 intake[\s\S]{0,180}?September\s+(\d{1,2}),\s+(20\d{2})/i);
  if (open) {
    const day = String(open[1]).padStart(2, "0");
    patches.push({ id: "hk-open", start: open[2] + "-09-" + day, predicted: false });
  }
  const first = html.match(/(\d{1,2})\s+Nov(?:ember)?[\s\S]{0,40}?20(\d{2})[\s\S]{0,80}?first-round/i)
    || html.match(/26 Nov[\s\S]{0,40}(20\d{2})/i);
  if (first) {
    const year = first[1] && first[1].length === 4 ? first[1] : (first[2] ? "20" + first[2] : null);
    if (year) {
      const y = Number(String(year).length === 2 ? "20" + year : year);
      patches.push({ id: "hk-first-round", start: addYear(y + "-11-26T12:00", 1), predicted: true });
      patches.push({ id: "hk-docs", start: addYear(y + "-12-03", 1), predicted: true });
      patches.push({ id: "hk-first-results", start: addYear(y + "-12-08", 1), predicted: true });
    }
  }
  const close = html.match(/21 Aug[\s\S]{0,40}(20\d{2})/i);
  if (close) {
    patches.push({ id: "hk-close", start: addYear(close[1] + "-08-21T12:00", 1), predicted: true });
  }
  const wait = html.match(/31 March (20\d{2})/i);
  if (wait) {
    patches.push({ id: "hk-waitlist", start: addYear(wait[1] + "-03-31", 1), predicted: true });
  }
  return patches;
}

function parseUcas(html) {
  const patches = [];
  if (/search tool displays 2027 courses[\s\S]{0,40}Apr(?:il)?\s*28/i.test(html) || /Apr(?:il)? 28[\s\S]{0,80}2027 courses/i.test(html)) {
    patches.push({ id: "uk-ucas-search", start: "2026-04-28", predicted: false });
  }
  if (/Undergraduate applications open for 2027[\s\S]{0,40}May 12/i.test(html) || /May 12[\s\S]{0,80}2027 entry/i.test(html)) {
    patches.push({ id: "uk-ucas-form", start: "2026-05-12", predicted: false });
  }
  if (/Completed undergraduate applications can be submitted[\s\S]{0,40}Sep(?:tember)? 01/i.test(html) || /Sep(?:t)?\.? 01[\s\S]{0,80}submitted to UCAS/i.test(html)) {
    patches.push({ id: "uk-ucas-submit", start: "2026-09-01", predicted: false });
  }
  if (/15 October 2026[\s\S]{0,120}Oxford and Cambridge/i.test(html) || /Oct(?:ober)? 15[\s\S]{0,80}Oxford and Cambridge/i.test(html)) {
    patches.push({ id: "uk-oxbridge-med", start: "2026-10-16T01:00", predicted: false });
  }
  if (/Jan(?:uary)? 13[\s\S]{0,80}Equal consideration[\s\S]{0,80}2027/i.test(html) || /13[\s\S]{0,20}Equal consideration date for applications for most undergraduate/i.test(html)) {
    patches.push({ id: "uk-ucas-ecd", start: "2027-01-14T02:00", predicted: false });
  }
  return patches;
}

function mergePatches(base, extra) {
  const map = {};
  (base || []).concat(extra || []).forEach(function (p) {
    if (p && p.id) map[p.id] = Object.assign({}, map[p.id] || {}, p);
  });
  return Object.keys(map).map(function (k) { return map[k]; });
}

async function refreshFromSources(fetchText, cache, force) {
  const age = cache && cache.fetchedAt ? Date.now() - Date.parse(cache.fetchedAt) : Infinity;
  if (!force && cache && cache.fetchedAt && age < STALE_MS) return cache;

  const extras = [];
  const notes = [];
  try {
    extras.push.apply(extras, parseHku(await fetchText(HKU_URL)));
    notes.push("HKU ok");
  } catch (err) {
    notes.push("HKU fail");
  }
  try {
    extras.push.apply(extras, parseUcas(await fetchText(UCAS_URL)));
    notes.push("UCAS ok");
  } catch (err) {
    notes.push("UCAS fail");
  }

  return Object.assign({}, cache || {}, {
    fetchedAt: new Date().toISOString(),
    refreshNote: notes.join(", "),
    patches: mergePatches((cache && cache.patches) || [], extras)
  });
}

module.exports = {
  STALE_MS: STALE_MS,
  HKU_URL: HKU_URL,
  UCAS_URL: UCAS_URL,
  parseHku: parseHku,
  parseUcas: parseUcas,
  mergePatches: mergePatches,
  refreshFromSources: refreshFromSources
};
