"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const core = require("./dates-core");

const CACHE_FILE = path.join(__dirname, "data", "official-dates.json");

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch (err) {
    return { fetchedAt: null, patches: [], sources: [] };
  }
}

function writeCache(data) {
  const tmp = CACHE_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, CACHE_FILE);
}

function fetchText(url) {
  return new Promise(function (resolve, reject) {
    const lib = url.indexOf("https") === 0 ? https : http;
    const req = lib.get(url, {
      headers: { "User-Agent": "ApplyTimeline/1.0 (admissions-date refresh)" }
    }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        fetchText(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(url + " status " + res.statusCode));
        return;
      }
      const chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () { resolve(Buffer.concat(chunks).toString("utf8")); });
    });
    req.setTimeout(15000, function () {
      req.destroy();
      reject(new Error("timeout " + url));
    });
    req.on("error", reject);
  });
}

async function refreshOfficialDates(force) {
  const cache = readCache();
  const next = await core.refreshFromSources(fetchText, cache, force);
  if (next !== cache) writeCache(next);
  return next;
}

module.exports = {
  readCache: readCache,
  refreshOfficialDates: refreshOfficialDates
};
