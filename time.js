/*
 * Happenings – time zone and calendar helpers
 * ------------------------------------------------------------
 * Events are scheduled in the city's local time (America/Vancouver), no matter
 * where the visitor is. These helpers convert between that zone and real
 * instants, format dates for display, and build calendar links / .ics files.
 */

window.HAPPENINGS_TIME = (function () {
  const pad = (n) => String(n).padStart(2, "0");

  /** Calendar date parts {y, m, d, hh, mm, weekday} of an instant, as seen in `tz`. */
  function partsInZone(date, tz) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", weekday: "short"
    });
    const p = {};
    for (const { type, value } of fmt.formatToParts(date)) p[type] = value;
    return {
      y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +p.minute, ss: +p.second,
      weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday)
    };
  }

  /** The instant at which the wall clock in `tz` shows y-m-d hh:mm. */
  function zonedToDate(y, m, d, hh, mm, tz) {
    // Start from the same wall time read as UTC, then correct by the zone offset.
    // Two passes handle the hours around daylight saving changes.
    let guess = Date.UTC(y, m - 1, d, hh, mm);
    for (let i = 0; i < 2; i++) {
      const p = partsInZone(new Date(guess), tz);
      const asUTC = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
      guess += Date.UTC(y, m - 1, d, hh, mm) - asUTC;
    }
    return new Date(guess);
  }

  /** Add whole days to a calendar date {y, m, d} (no time zone involved). */
  function addDays({ y, m, d }, n) {
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }

  /** Today's calendar date in `tz`, plus the Friday that starts "this weekend". */
  function anchors(now, tz) {
    const t = partsInZone(now, tz);
    const today = { y: t.y, m: t.m, d: t.d };
    // Fri=5, Sat=6, Sun=0. During a weekend, "this weekend" is the current one.
    const back = { 5: 0, 6: 1, 0: 2 }[t.weekday];
    const friday = back !== undefined ? addDays(today, -back) : addDays(today, 5 - t.weekday);
    return { today, friday };
  }

  /** Resolve a relative day key ("today", "tomorrow", "fri", "sat", "sun") to a calendar date. */
  function resolveDay(key, a) {
    switch (key) {
      case "today": return a.today;
      case "tomorrow": return addDays(a.today, 1);
      case "fri": return a.friday;
      case "sat": return addDays(a.friday, 1);
      case "sun": return addDays(a.friday, 2);
      default: {
        // Also accept an explicit "YYYY-MM-DD".
        const [y, m, d] = String(key).split("-").map(Number);
        if (!y || !m || !d) throw new Error("Unknown day: " + key);
        return { y, m, d };
      }
    }
  }

  /** "HH:MM" on a calendar date → instant. Hours of 24 or more roll into the next day. */
  function timeOn(date, hhmm, tz) {
    let [hh, mm] = hhmm.split(":").map(Number);
    const extra = Math.floor(hh / 24);
    hh = hh % 24;
    const day = addDays(date, extra);
    return zonedToDate(day.y, day.m, day.d, hh, mm, tz);
  }

  /** Start of a calendar date (00:00) in `tz`. */
  function startOfDay(date, tz) { return zonedToDate(date.y, date.m, date.d, 0, 0, tz); }

  /** "YYYY-MM-DD" for a calendar date. */
  const isoDate = ({ y, m, d }) => `${y}-${pad(m)}-${pad(d)}`;

  // ---------- display formatting ----------
  const fmtCache = {};
  function fmt(opts, tz) {
    const key = tz + JSON.stringify(opts);
    return fmtCache[key] || (fmtCache[key] = new Intl.DateTimeFormat("en-CA", { timeZone: tz, ...opts }));
  }
  const shortDay = (date, tz) => fmt({ weekday: "short", month: "short", day: "numeric" }, tz).format(date);
  const longDay = (date, tz) => fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" }, tz).format(date);
  const clock = (date, tz) => fmt({ hour: "numeric", minute: "2-digit", hour12: true }, tz)
    .format(date).replace(/\s?a\.m\./i, " AM").replace(/\s?p\.m\./i, " PM");

  /** "8:00 – 10:30 PM" style range (drops the first AM/PM when both match). */
  function timeRange(start, end, tz) {
    const a = clock(start, tz), b = clock(end, tz);
    if (a.slice(-2) === b.slice(-2)) return `${a.slice(0, -3)} – ${b}`;
    return `${a} – ${b}`;
  }

  // ---------- calendar export ----------
  const utcStamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  function googleCalendarUrl(ev) {
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: ev.title,
      dates: `${utcStamp(ev.startDate)}/${utcStamp(ev.endDate)}`,
      details: `${ev.description}\n\n${ev.url}`,
      location: `${ev.venue}, ${ev.address}`
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  function outlookCalendarUrl(ev) {
    const params = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: ev.title,
      startdt: ev.startDate.toISOString(),
      enddt: ev.endDate.toISOString(),
      body: `${ev.description}\n\n${ev.url}`,
      location: `${ev.venue}, ${ev.address}`
    });
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
  }

  /** Escape text for an iCalendar property value (RFC 5545 §3.3.11). */
  const icsEscape = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

  /** Fold lines longer than 75 octets (RFC 5545 §3.1). */
  function fold(line) {
    const bytes = new TextEncoder().encode(line);
    if (bytes.length <= 75) return line;
    const out = []; let cur = ""; let len = 0;
    for (const ch of line) {
      const n = new TextEncoder().encode(ch).length;
      if (len + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; len = 0; }
      cur += ch; len += n;
    }
    out.push(cur);
    return out.join("\r\n ");
  }

  function icsFile(ev, now = new Date()) {
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Happenings//Event finder//EN",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${ev.id}-${utcStamp(ev.startDate)}@happenings.app`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${utcStamp(ev.startDate)}`,
      `DTEND:${utcStamp(ev.endDate)}`,
      `SUMMARY:${icsEscape(ev.title)}`,
      `LOCATION:${icsEscape(`${ev.venue}, ${ev.address}`)}`,
      `DESCRIPTION:${icsEscape(ev.description)}`,
      `URL:${ev.url}`,
      `GEO:${ev.lat};${ev.lng}`,
      "END:VEVENT", "END:VCALENDAR"
    ];
    return lines.map(fold).join("\r\n") + "\r\n";
  }

  return {
    partsInZone, zonedToDate, addDays, anchors, resolveDay, timeOn, startOfDay, isoDate,
    shortDay, longDay, clock, timeRange, googleCalendarUrl, outlookCalendarUrl, icsFile, utcStamp
  };
})();
