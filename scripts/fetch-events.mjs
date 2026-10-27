#!/usr/bin/env node
/*
 * Happenings – live event feed
 * ------------------------------------------------------------
 * Fetches upcoming events for each city from the Ticketmaster Discovery API
 * and writes them to data/events.json, which the website reads.
 *
 * GitHub Actions runs this every hour (.github/workflows/update-events.yml).
 * To run it yourself:
 *
 *   TICKETMASTER_API_KEY=your_key node scripts/fetch-events.mjs
 *
 * Needs Node 18 or newer (for built-in fetch). No packages to install.
 *
 * Settings (environment variables):
 *   TICKETMASTER_API_KEY   required; without it the script leaves the file unchanged
 *   DAYS_AHEAD             how far ahead to look (default 60)
 *   TICKETMASTER_BASE_URL  override the API address (used for testing)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(ROOT, "data", "events.json");
const API = (process.env.TICKETMASTER_BASE_URL || "https://app.ticketmaster.com/discovery/v2").replace(/\/$/, "");
const KEY = (process.env.TICKETMASTER_API_KEY || "").trim();
const DAYS_AHEAD = Number(process.env.DAYS_AHEAD) || 60;
const PAGE_SIZE = 200;      // the API's maximum
const MAX_PAGES = 4;        // the API returns at most 1,000 results per search
const PAUSE_MS = 250;       // stay well under 5 requests per second

// ---------------------------------------------------------------- cities
// Read the city list from the website's own data file, so there's one list to edit.
function loadCities() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(join(ROOT, "js", "data.js"), "utf8"), sandbox);
  return sandbox.window.HAPPENINGS_DATA.CITIES;
}

// ---------------------------------------------------------------- helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isoNoMillis = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
const norm = (s) => String(s || "").trim().toLowerCase();
const clean = (s) => (s && !/^undefined$/i.test(s) ? s : "");

/** Geohash for the API's geoPoint search (precision 9 ≈ 5 m). */
function geohash(lat, lng, precision = 9) {
  const chars = "0123456789bcdefghjkmnpqrstuvwxyz";
  let latR = [-90, 90], lngR = [-180, 180], hash = "", bit = 0, ch = 0, even = true;
  while (hash.length < precision) {
    const r = even ? lngR : latR, v = even ? lng : lat, mid = (r[0] + r[1]) / 2;
    if (v >= mid) { ch = (ch << 1) | 1; r[0] = mid; } else { ch <<= 1; r[1] = mid; }
    even = !even;
    if (++bit === 5) { hash += chars[ch]; bit = 0; ch = 0; }
  }
  return hash;
}

/** GET with retries for rate limits and temporary errors. */
async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) return res.json();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 4) {
      const body = (await res.text()).slice(0, 300);
      throw new Error(`Ticketmaster API returned ${res.status}: ${body}`);
    }
    await sleep(1000 * 2 ** attempt);
  }
}

// ---------------------------------------------------------------- mapping
/** Ticketmaster classification → one of the site's categories. */
function categoryOf(cls) {
  const segment = norm(cls?.segment?.name);
  const genre = norm(cls?.genre?.name);
  if (cls?.family || /family|children/.test(genre)) return "family";
  if (segment === "music") return "music";
  if (segment === "sports") return "sports";
  if (/food|drink|culinary/.test(genre)) return "food";
  if (/market|fair/.test(genre)) return "markets";
  if (/outdoor|nature/.test(genre)) return "outdoors";
  return "arts";   // Arts & Theatre, Film, Comedy, Miscellaneous
}

/** Typical length when Ticketmaster gives no end time. */
const DEFAULT_HOURS = { music: 3, sports: 3, family: 2, arts: 2.5 };

/** Pick a wide image around 640 px. */
function pickImage(images = []) {
  const wide = images.filter((i) => i.ratio === "16_9" && !i.fallback);
  const pool = wide.length ? wide : images;
  if (!pool.length) return "";
  const sorted = [...pool].sort((a, b) => (a.width || 0) - (b.width || 0));
  return (sorted.find((i) => (i.width || 0) >= 640) || sorted[sorted.length - 1]).url || "";
}

/** Shorten long text at a sentence or word boundary. */
function shorten(text, max = 320) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return stop > max * 0.5 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** Map a Ticketmaster city name onto one of the site's cities. */
function cityIdFor(name, cities) {
  const n = norm(name);
  const c = cities.find((city) => norm(city.name) === n || (city.aliases || []).some((a) => norm(a) === n));
  return c ? c.id : null;
}

function toEvent(ev, cities) {
  const status = ev.dates?.status?.code;
  if (status === "cancelled" || status === "postponed") return null;

  const venue = ev._embedded?.venues?.[0];
  const lat = Number(venue?.location?.latitude), lng = Number(venue?.location?.longitude);
  if (!venue || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const city = cityIdFor(venue.city?.name, cities);
  if (!city) return null;   // outside the cities the site covers

  const cls = (ev.classifications || []).find((c) => c.primary) || ev.classifications?.[0];
  const category = categoryOf(cls);
  const segment = clean(cls?.segment?.name), genre = clean(cls?.genre?.name), subGenre = clean(cls?.subGenre?.name);
  const performers = (ev._embedded?.attractions || []).map((a) => a.name).filter(Boolean);

  const prices = (ev.priceRanges || []).filter((p) => typeof p.min === "number");
  const min = prices.length ? Math.min(...prices.map((p) => p.min)) : null;
  const max = prices.length ? Math.max(...prices.map((p) => (typeof p.max === "number" ? p.max : p.min))) : null;

  const venueName = venue.name || "Venue";
  const fallbackText = `${genre || segment || "Event"} at ${venueName}.`;
  const base = {
    id: `tm-${ev.id}`,
    title: ev.name,
    category,
    city,
    venue: venueName,
    address: [venue.address?.line1, venue.city?.name].filter(Boolean).join(", "),
    area: venue.city?.name || "",
    lat, lng,
    // A $0 price from Ticketmaster usually means "not published", so it's never shown as free.
    price: min > 0 ? min : null,
    priceMax: min > 0 ? max : null,
    currency: prices[0]?.currency || "CAD",
    url: ev.url || "",
    image: pickImage(ev.images),
    description: shorten(ev.info || ev.description || ev.pleaseNote || "") || fallbackText,
    tags: [segment, genre, subGenre, ...performers].filter(Boolean)
  };

  const start = ev.dates?.start || {};
  if (start.dateTime && !start.timeTBA && !start.noSpecificTime) {
    const startDate = new Date(start.dateTime);
    const endDate = ev.dates?.end?.dateTime ? new Date(ev.dates.end.dateTime) : null;
    const hasEnd = endDate && endDate > startDate;
    return {
      ...base,
      start: startDate.toISOString(),
      end: (hasEnd ? endDate : new Date(+startDate + (DEFAULT_HOURS[category] || 2.5) * 3600e3)).toISOString(),
      endEstimated: !hasEnd
    };
  }
  if (start.localDate && !start.dateTBD && !start.dateTBA) {
    return { ...base, allDay: true, date: start.localDate, lastDate: ev.dates?.end?.localDate || start.localDate };
  }
  return null;   // no date yet
}

// ---------------------------------------------------------------- fetching
async function fetchCity(city, from, to) {
  const found = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      apikey: KEY,
      geoPoint: geohash(city.center[0], city.center[1]),
      radius: String(city.radiusKm || 15),
      unit: "km",
      countryCode: "CA",
      startDateTime: isoNoMillis(from),
      endDateTime: isoNoMillis(to),
      sort: "date,asc",
      size: String(PAGE_SIZE),
      page: String(page),
      locale: "*"
    });
    const data = await getJson(`${API}/events.json?${params}`);
    found.push(...(data._embedded?.events || []));
    const totalPages = data.page?.totalPages ?? 0;
    await sleep(PAUSE_MS);
    if (page + 1 >= totalPages) break;
  }
  return found;
}

async function main() {
  if (!KEY) {
    console.warn("TICKETMASTER_API_KEY is not set, so data/events.json was left unchanged.");
    console.warn("See README.md → 'Live events' to add the key.");
    return;
  }
  const cities = loadCities();
  const from = new Date();
  const to = new Date(+from + DAYS_AHEAD * 864e5);

  const byId = new Map();
  const seen = new Set();
  for (const city of cities) {
    const raw = await fetchCity(city, from, to);
    let kept = 0;
    for (const ev of raw) {
      const e = toEvent(ev, cities);
      if (!e || byId.has(e.id)) continue;
      // Ticketmaster sometimes lists one show several times (packages, resale).
      const key = `${norm(e.title)}|${norm(e.venue)}|${e.start || e.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      byId.set(e.id, e);
      kept++;
    }
    console.log(`${city.name}: ${raw.length} found, ${kept} added`);
  }

  const events = [...byId.values()].sort((a, b) => String(a.start || a.date).localeCompare(String(b.start || b.date)));
  const output = {
    generatedAt: new Date().toISOString(),
    source: "Ticketmaster Discovery API",
    daysAhead: DAYS_AHEAD,
    count: events.length,
    events
  };
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(output, null, 1) + "\n");
  console.log(`Wrote ${events.length} events to data/events.json`);
}

main().catch((err) => {
  // Failing here stops the deploy, so the live site keeps its last good list.
  console.error(err.message || err);
  process.exit(1);
});
