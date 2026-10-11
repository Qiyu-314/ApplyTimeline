"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const refreshDates = require("./refresh-dates");
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const COOKIE_NAME = "at_sid";
const MAX_BODY = 512 * 1024;
const ALLOWED_REGIONS = { us: true, hk: true, uk: true, all: true };

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({ sessions: {} }, null, 2), "utf8");
  }
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return { sessions: {} };
    if (!data.sessions || typeof data.sessions !== "object") data.sessions = {};
    return data;
  } catch (err) {
    return { sessions: {} };
  }
}

function writeStore(data) {
  ensureStore();
  const tmp = STORE_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, STORE_FILE);
}

function parseCookies(header) {
  const out = {};
  String(header || "").split(";").forEach(function (part) {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

function cookieHeader(sid) {
  return (
    COOKIE_NAME + "=" + encodeURIComponent(sid) +
    "; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000"
  );
}

function getOrCreateSession(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  let sid = cookies[COOKIE_NAME];
  const store = readStore();
  if (!sid || !store.sessions[sid]) {
    sid = crypto.randomUUID();
    store.sessions[sid] = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: null,
      todos: {}
    };
    writeStore(store);
  }
  res.setHeader("Set-Cookie", cookieHeader(sid));
  return { sid: sid, session: store.sessions[sid], store: store };
}

function sendJson(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, code, text, type) {
  res.writeHead(code, { "Content-Type": (type || "text/plain; charset=utf-8") });
  res.end(text);
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on("data", function (chunk) {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", function () {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function cleanProfile(input) {
  const age = Number(input && input.age);
  const region = input && input.region;
  if (!Number.isInteger(age) || age < 12 || age > 22) return null;
  if (!ALLOWED_REGIONS[region]) return null;
  return { age: age, region: region };
}

function serveIndex(res) {
  const file = path.join(ROOT, "index.html");
  fs.readFile(file, function (err, buf) {
    if (err) {
      sendText(res, 500, "index.html missing");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(buf);
  });
}

function notFound(res) {
  sendJson(res, 404, { ok: false, error: "not found" });
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const pathname = url.pathname;

  if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
    serveIndex(res);
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, name: "ApplyTimeline" });
    return;
  }

  if (req.method === "GET" && pathname === "/api/dates") {
    refreshDates.refreshOfficialDates(false).then(function (data) {
      sendJson(res, 200, data);
    }).catch(function () {
      sendJson(res, 200, refreshDates.readCache());
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/dates/refresh") {
    refreshDates.refreshOfficialDates(true).then(function (data) {
      sendJson(res, 200, data);
    }).catch(function (err) {
      sendJson(res, 502, { ok: false, error: String(err.message || err) });
    });
    return;
  }

  if (pathname === "/api/state" && req.method === "GET") {
    const ctx = getOrCreateSession(req, res);
    sendJson(res, 200, {
      ok: true,
      profile: ctx.session.profile || null,
      todos: ctx.session.todos || {}
    });
    return;
  }

  if (pathname === "/api/profile" && req.method === "PUT") {
    readBody(req).then(function (body) {
      const profile = cleanProfile(body);
      if (!profile) {
        sendJson(res, 400, { ok: false, error: "invalid profile" });
        return;
      }
      const ctx = getOrCreateSession(req, res);
      ctx.session.profile = profile;
      ctx.session.updatedAt = new Date().toISOString();
      ctx.store.sessions[ctx.sid] = ctx.session;
      writeStore(ctx.store);
      sendJson(res, 200, { ok: true, profile: profile });
    }).catch(function () {
      sendJson(res, 400, { ok: false, error: "invalid body" });
    });
    return;
  }

  if (pathname === "/api/todos" && req.method === "PUT") {
    readBody(req).then(function (body) {
      const year = Number(body && body.entryYear);
      const checks = body && body.checks;
      if (!Number.isInteger(year) || year < 2020 || year > 2040) {
        sendJson(res, 400, { ok: false, error: "invalid entryYear" });
        return;
      }
      if (!checks || typeof checks !== "object" || Array.isArray(checks)) {
        sendJson(res, 400, { ok: false, error: "invalid checks" });
        return;
      }
      const ctx = getOrCreateSession(req, res);
      if (!ctx.session.todos) ctx.session.todos = {};
      ctx.session.todos[String(year)] = checks;
      ctx.session.updatedAt = new Date().toISOString();
      ctx.store.sessions[ctx.sid] = ctx.session;
      writeStore(ctx.store);
      sendJson(res, 200, { ok: true });
    }).catch(function () {
      sendJson(res, 400, { ok: false, error: "invalid body" });
    });
    return;
  }

  notFound(res);
});

server.listen(PORT, function () {
  console.log("ApplyTimeline 后端已启动");
  console.log("打开网站： http://localhost:" + PORT);
  refreshDates.refreshOfficialDates(false).catch(function () {});
  setInterval(function () {
    refreshDates.refreshOfficialDates(false).catch(function () {});
  }, 6 * 60 * 60 * 1000);
});
