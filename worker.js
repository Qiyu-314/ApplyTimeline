import seed from "./data/official-dates.json";
import core from "./dates-core.js";

const { refreshFromSources } = core;
const CACHE_KEY = new Request("https://applytimeline.help/__cache/official-dates.json");

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function fetchText(url) {
  return fetch(url, {
    headers: { "User-Agent": "ApplyTimeline/1.0 (admissions-date refresh)" },
    redirect: "follow"
  }).then(function (res) {
    if (!res.ok) throw new Error(url + " status " + res.status);
    return res.text();
  });
}

async function readCached() {
  const hit = await caches.default.match(CACHE_KEY);
  if (!hit) return null;
  try {
    return await hit.json();
  } catch (err) {
    return null;
  }
}

async function writeCached(data) {
  await caches.default.put(CACHE_KEY, new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=21600"
    }
  }));
}

async function getDates(force) {
  const cached = (await readCached()) || seed;
  const next = await refreshFromSources(fetchText, cached, force);
  if (!cached.fetchedAt || next.fetchedAt !== cached.fetchedAt) {
    await writeCached(next);
  }
  return next;
}

async function handleApi(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "GET" && path === "/api/health") {
    return json({ ok: true, name: "ApplyTimeline" });
  }

  if (request.method === "GET" && path === "/api/dates") {
    return json(await getDates(false));
  }

  if (request.method === "POST" && path === "/api/dates/refresh") {
    return json(await getDates(true));
  }

  return json({ ok: false, error: "not found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.indexOf("/api/") === 0) {
      try {
        return await handleApi(request);
      } catch (err) {
        return json({ ok: false, error: "refresh failed" }, 502);
      }
    }
    if (env && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  },

  async scheduled() {
    await getDates(true);
  }
};
