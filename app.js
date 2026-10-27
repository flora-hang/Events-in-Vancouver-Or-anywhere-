/*
 * Happenings – app
 * ------------------------------------------------------------
 * Map-first event finder. Plain JavaScript, no build step.
 * Depends on: Leaflet, Leaflet.markercluster, data.js, time.js
 */
(function () {
  "use strict";

  const { TIME_ZONE: TZ, CATEGORIES, CITIES, SAMPLE_EVENTS } = window.HAPPENINGS_DATA;
  const T = window.HAPPENINGS_TIME;

  // ---------------------------------------------------------------- helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const ICON = {
    pin: '<path d="M12 21s-7-6.3-7-11.5A7 7 0 0 1 19 9.5C19 14.7 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    ticket: '<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'
  };
  const icon = (name, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable: keep in memory */ }
    }
  };

  // ---------------------------------------------------------------- data
  const now = new Date();
  const anchors = T.anchors(now, TZ);
  const cityById = Object.fromEntries(CITIES.map((c) => [c.id, c]));

  const EVENTS = SAMPLE_EVENTS.map((e) => {
    const day = T.resolveDay(e.day, anchors);
    const startDate = T.timeOn(day, e.start, TZ);
    const endDate = T.timeOn(day, e.end, TZ);
    const city = cityById[e.city];
    return {
      ...e,
      startDate,
      endDate,
      cityName: city.name,
      priceLabel: e.price > 0 ? `$${e.price}` : "Free",
      // Sample events link to a search for the venue. Real events would carry their own page URL.
      url: e.url || `https://www.google.com/search?q=${encodeURIComponent(`${e.venue} ${e.area} ${city.name}`)}`,
      searchText: [e.title, e.venue, e.area, e.address, city.name, CATEGORIES[e.category].label, e.description, ...(e.tags || [])]
        .join(" ").toLowerCase()
    };
  })
    .filter((e) => e.endDate > now)
    .sort((a, b) => a.startDate - b.startDate);

  const eventById = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

  // ---------------------------------------------------------------- state
  const savedCity = store.get("happenings:city", "vancouver");
  const state = {
    cityId: cityById[savedCity] ? savedCity : "vancouver",
    preset: "weekend",          // "today" | "weekend" | "range"
    range: null,                // { from: {y,m,d}, to: {y,m,d} }
    query: "",
    cats: new Set(),
    freeOnly: false,
    tod: new Set(),             // "morning" | "afternoon" | "evening"
    view: "all",                // "all" | "saved"
    selectedId: null,
    hotId: null
  };
  const saved = new Set(store.get("happenings:saved", []));

  // ---------------------------------------------------------------- filtering
  function dateWindow() {
    const { today, friday } = anchors;
    if (state.preset === "today") return { from: T.startOfDay(today, TZ), to: T.startOfDay(T.addDays(today, 1), TZ) };
    if (state.preset === "range" && state.range) {
      return { from: T.startOfDay(state.range.from, TZ), to: T.startOfDay(T.addDays(state.range.to, 1), TZ) };
    }
    return { from: T.startOfDay(friday, TZ), to: T.startOfDay(T.addDays(friday, 3), TZ) };
  }

  const noon = (d) => T.zonedToDate(d.y, d.m, d.d, 12, 0, TZ);
  function dateWindowLabel() {
    const { today, friday } = anchors;
    if (state.preset === "today") return `Today · ${T.shortDay(noon(today), TZ)}`;
    if (state.preset === "range" && state.range) {
      const a = T.shortDay(noon(state.range.from), TZ), b = T.shortDay(noon(state.range.to), TZ);
      return a === b ? a : `${a} – ${b}`;
    }
    return `This weekend · ${T.shortDay(noon(friday), TZ)} – ${T.shortDay(noon(T.addDays(friday, 2)), TZ)}`;
  }

  function timeOfDay(e) {
    const h = T.partsInZone(e.startDate, TZ).hh;
    return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  }

  function queryMatch(e) {
    return state.query.split(/\s+/).filter(Boolean).every((term) => e.searchText.includes(term));
  }

  /** In scope for the current city/date (or saved list), before user filters. */
  function inScope(e) {
    if (state.view === "saved") return saved.has(e.id);
    if (e.city !== state.cityId) return false;
    const w = dateWindow();
    return e.endDate > w.from && e.startDate < w.to;
  }

  /** In scope and matching search + filters, ignoring the category chips. */
  function matchesExceptCategory(e) {
    if (!inScope(e)) return false;
    if (state.freeOnly && e.price > 0) return false;
    if (state.tod.size && !state.tod.has(timeOfDay(e))) return false;
    if (state.query && !queryMatch(e)) return false;
    return true;
  }

  const matches = (e) => matchesExceptCategory(e) && (state.cats.size === 0 || state.cats.has(e.category));
  const hasUserFilters = () => Boolean(state.query || state.cats.size || state.freeOnly || state.tod.size);

  // ---------------------------------------------------------------- map
  const currentCity = () => cityById[state.cityId];
  const map = L.map("map", { zoomControl: false, attributionControl: true, minZoom: 9 })
    .setView(currentCity().center, currentCity().zoom);

  // Light basemap from CARTO (OpenStreetMap data). See README for production tile options.
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  const clusters = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 44,
    spiderfyOnMaxZoom: true,
    iconCreateFunction: (cluster) => L.divIcon({
      html: `<div class="cluster">${cluster.getChildCount()}</div>`,
      className: "cluster-icon",
      iconSize: [42, 42]
    })
  });
  map.addLayer(clusters);

  const markers = new Map();

  function pinClasses(e) {
    return ["pin", saved.has(e.id) ? "is-saved" : "", (state.hotId === e.id || state.selectedId === e.id) ? "is-hot" : ""]
      .filter(Boolean).join(" ");
  }
  function iconFor(e) {
    const c = CATEGORIES[e.category];
    return L.divIcon({
      className: "pin-icon",
      html: `<div class="${pinClasses(e)}" style="--c:${c.color}"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  function markerFor(e) {
    let m = markers.get(e.id);
    if (m) return m;
    m = L.marker([e.lat, e.lng], { icon: iconFor(e), keyboard: true, title: e.title, alt: e.title, riseOnHover: true });
    m.on("mouseover", () => hoverStart(e, m));
    m.on("mouseout", hoverEnd);
    m.on("click", () => openDrawer(e.id));
    m.on("add", () => {
      // Leaflet rebuilds the icon element each time the marker is shown (e.g. when a cluster splits).
      const el = m.getElement();
      if (!el) return;
      el.setAttribute("aria-label", `${e.title}, ${T.shortDay(e.startDate, TZ)}, ${e.area}`);
      el.addEventListener("focus", () => hoverStart(e, m));
      el.addEventListener("blur", hoverEnd);
    });
    markers.set(e.id, m);
    return m;
  }

  /** Update a pin's look without rebuilding it. */
  function refreshPin(id) {
    const e = eventById[id], m = markers.get(id);
    if (!e || !m) return;
    m.options.icon = iconFor(e);          // used the next time the marker is shown
    const pin = m.getElement() && m.getElement().querySelector(".pin");
    if (pin) pin.className = pinClasses(e);
  }

  function setHot(id) {
    const prev = state.hotId;
    state.hotId = id;
    if (prev) refreshPin(prev);
    if (id) refreshPin(id);
    $$(".event-row").forEach((row) => row.classList.toggle("is-active", row.dataset.id === id || row.dataset.id === state.selectedId));
  }

  let youMarker = null;
  function showYou(lat, lng) {
    const icon = L.divIcon({ className: "pin-icon", html: '<div class="you-are-here"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
    if (youMarker) youMarker.setLatLng([lat, lng]);
    else youMarker = L.marker([lat, lng], { icon, keyboard: false, interactive: false, title: "You are here" }).addTo(map);
  }

  /** Fit the map to a set of events, keeping them clear of the side panel. */
  function frameEvents(list) {
    const pts = list.map((e) => [e.lat, e.lng]);
    if (!pts.length) { map.setView(currentCity().center, currentCity().zoom); return; }
    const narrow = window.matchMedia("(max-width: 900px)").matches;
    const left = narrow ? 32 : $(".panel").offsetWidth + 56;
    map.fitBounds(pts, { paddingTopLeft: [left, 72], paddingBottomRight: [narrow ? 32 : 80, 48], maxZoom: 15 });
  }

  // ---------------------------------------------------------------- shared pieces
  function art(e, cls = "") {
    const c = CATEGORIES[e.category];
    const img = e.image ? `<img src="${esc(e.image)}" alt="" loading="lazy" onerror="this.remove()">` : "";
    return `<div class="art ${cls}" style="--c:${c.color};--t:${c.tint}"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg>${img}</div>`;
  }
  const whenText = (e) => `${T.shortDay(e.startDate, TZ)} · ${T.timeRange(e.startDate, e.endDate, TZ)}`;
  const heartBtn = (e) => `<button type="button" class="heart-btn" data-save="${e.id}" aria-pressed="${saved.has(e.id)}" aria-label="${saved.has(e.id) ? "Remove" : "Save"} ${esc(e.title)}">${icon("heart")}</button>`;

  // ---------------------------------------------------------------- hover card
  const card = $("#hover-card");
  let hoverTimer = null;
  let cardEventId = null;

  function hoverStart(e, m) {
    clearTimeout(hoverTimer);
    setHot(e.id);
    showCard(e, m.getLatLng());
  }
  function hoverEnd() {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(hideCard, 180);
  }
  function hideCard() {
    clearTimeout(hoverTimer);
    card.hidden = true;
    cardEventId = null;
    if (state.hotId && state.hotId !== state.selectedId) setHot(null);
  }

  function showCard(e, latlng) {
    const c = CATEGORIES[e.category];
    cardEventId = e.id;
    card.style.setProperty("--c", c.color);
    card.setAttribute("aria-label", `Preview: ${e.title}`);
    card.innerHTML = `
      <div class="media">
        ${art(e)}
        <span class="tag-pill">${esc(c.label)}</span>
        ${heartBtn(e)}
        <span class="price-pill">${esc(e.priceLabel)}</span>
      </div>
      <div class="body">
        <h2>${esc(e.title)}</h2>
        <div class="line">${icon("clock")}${esc(whenText(e))}</div>
        <div class="line muted">${icon("pin")}${esc(e.venue)}, ${esc(e.area)}</div>
        <div class="card-actions">
          <a class="link" href="${esc(e.url)}" target="_blank" rel="noopener">More info ${icon("arrow")}</a>
          <button type="button" class="link quiet" data-calendar="${e.id}">${icon("cal")}Add to calendar</button>
        </div>
      </div>`;
    card.hidden = false;
    positionCard(latlng);
  }

  function positionCard(latlng) {
    const rect = map.getContainer().getBoundingClientRect();
    const p = map.latLngToContainerPoint(latlng);
    const x = rect.left + p.x, y = rect.top + p.y;
    const w = card.offsetWidth, h = card.offsetHeight;
    let side = "above";
    let top = y - 28 - h;
    if (top < rect.top + 8) { side = "below"; top = y + 28; }
    const left = Math.max(8, Math.min(x - w / 2, window.innerWidth - w - 8));
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
    card.dataset.side = side;
    card.style.setProperty("--arrow-x", `${Math.round(Math.max(20, Math.min(w - 20, x - left)))}px`);
  }

  card.addEventListener("mouseenter", () => clearTimeout(hoverTimer));
  card.addEventListener("mouseleave", hoverEnd);
  card.addEventListener("focusin", () => clearTimeout(hoverTimer));
  card.addEventListener("focusout", (ev) => { if (!card.contains(ev.relatedTarget)) hoverEnd(); });
  card.addEventListener("click", (ev) => {
    const cal = ev.target.closest("[data-calendar]");
    if (cal) openDrawer(cal.dataset.calendar, { calendar: true });
  });
  map.on("movestart zoomstart", hideCard);
  window.addEventListener("scroll", hideCard, { passive: true });

  // ---------------------------------------------------------------- drawer
  const drawer = $("#drawer");
  let drawerReturnFocus = null;

  function openDrawer(id, opts = {}) {
    const e = eventById[id];
    if (!e) return;
    hideCard();
    if (!drawer.contains(document.activeElement)) drawerReturnFocus = document.activeElement;
    const prev = state.selectedId;
    state.selectedId = id;
    if (prev) refreshPin(prev);
    setHot(id);
    renderDrawer(e, opts.calendar);
    drawer.hidden = false;
    document.body.classList.add("drawer-open");
    focusOnMap(e);
    $(".close-btn", drawer).focus({ preventScroll: true });
  }

  function closeDrawer() {
    const prev = state.selectedId;
    state.selectedId = null;
    drawer.hidden = true;
    document.body.classList.remove("drawer-open");
    if (prev) refreshPin(prev);
    setHot(null);
    if (drawerReturnFocus && document.contains(drawerReturnFocus)) drawerReturnFocus.focus({ preventScroll: true });
  }

  function focusOnMap(e) {
    const m = markerFor(e);
    const show = () => {
      const narrow = window.matchMedia("(max-width: 900px)").matches;
      const panel = narrow ? 0 : $(".panel").offsetWidth + 40;
      const right = narrow ? 0 : drawer.offsetWidth + 40;
      map.panInside(m.getLatLng(), { paddingTopLeft: [panel, 60], paddingBottomRight: [right, 60] });
    };
    if (clusters.hasLayer(m) && !m.getElement()) clusters.zoomToShowLayer(m, show);
    else show();
  }

  function renderDrawer(e, calendarOpen) {
    const c = CATEGORIES[e.category];
    drawer.style.setProperty("--c", c.color);
    drawer.innerHTML = `
      <div class="media">
        ${art(e)}
        <button type="button" class="close-btn" aria-label="Close details">${icon("x")}</button>
        <span class="tag-pill">${esc(c.label)}</span>
      </div>
      <div class="content">
        <h2 id="drawer-title">${esc(e.title)}</h2>
        <div class="facts">
          <div class="line">${icon("cal")}${esc(T.longDay(e.startDate, TZ))}</div>
          <div class="line">${icon("clock")}${esc(T.timeRange(e.startDate, e.endDate, TZ))}</div>
          <div class="line">${icon("pin")}${esc(e.venue)}, ${esc(e.address)}, ${esc(e.cityName)}</div>
          <div class="line">${icon("ticket")}${esc(e.priceLabel)}</div>
        </div>
        <p class="desc">${esc(e.description)}</p>
        <div class="actions">
          <button type="button" class="btn-save" data-save="${e.id}" aria-pressed="${saved.has(e.id)}">
            ${icon("heart")}<span>${saved.has(e.id) ? "Saved" : "Save"}</span>
          </button>
          <div class="cal-wrap">
            <button type="button" class="btn-cal" id="cal-button" aria-expanded="false" aria-controls="cal-menu">
              ${icon("cal")}Add to calendar${icon("down")}
            </button>
            <div class="popover cal-menu" id="cal-menu" hidden>
              <a class="cal-option" href="${esc(T.googleCalendarUrl(e))}" target="_blank" rel="noopener">
                <span class="logo" style="--bg-logo:#4285F4">${icon("cal")}</span>Google Calendar</a>
              <button type="button" class="cal-option" data-ics="${e.id}">
                <span class="logo" style="--bg-logo:#17161F">${icon("cal")}</span>Apple Calendar</button>
              <a class="cal-option" href="${esc(T.outlookCalendarUrl(e))}" target="_blank" rel="noopener">
                <span class="logo" style="--bg-logo:#0F6CBD">${icon("cal")}</span>Outlook</a>
              <button type="button" class="cal-option" data-ics="${e.id}">
                <span class="logo" style="--bg-logo:#F3F2F7;color:#17161F">${icon("download")}</span>Download .ics file</button>
            </div>
          </div>
        </div>
        <a class="link" href="${esc(e.url)}" target="_blank" rel="noopener">Visit event page ${icon("external")}</a>
      </div>`;
    $(".close-btn", drawer).addEventListener("click", closeDrawer);
    const calBtn = $("#cal-button", drawer), calMenu = $("#cal-menu", drawer);
    calBtn.addEventListener("click", () => togglePopover(calBtn, calMenu));
    if (calendarOpen) togglePopover(calBtn, calMenu, true);
  }

  drawer.addEventListener("click", (ev) => {
    const ics = ev.target.closest("[data-ics]");
    if (ics) {
      downloadIcs(eventById[ics.dataset.ics]);
      closeAllPopovers();
      showToast("Calendar file downloaded. Open it to add the event.");
    } else if (ev.target.closest(".cal-option")) {
      closeAllPopovers();
    }
  });

  function downloadIcs(e) {
    const blob = new Blob([T.icsFile(e)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${e.id}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------------------------------------------------------------- saving
  function toggleSave(id) {
    const e = eventById[id];
    if (!e) return;
    const nowSaved = !saved.has(id);
    nowSaved ? saved.add(id) : saved.delete(id);
    store.set("happenings:saved", [...saved]);
    refreshPin(id);
    // Update every save control for this event in place.
    $$(`[data-save="${id}"]`).forEach((btn) => {
      btn.setAttribute("aria-pressed", String(nowSaved));
      if (btn.classList.contains("heart-btn")) btn.setAttribute("aria-label", `${nowSaved ? "Remove" : "Save"} ${e.title}`);
      const label = btn.querySelector("span");
      if (label && btn.classList.contains("btn-save")) label.textContent = nowSaved ? "Saved" : "Save";
    });
    renderSavedCount();
    if (state.view === "saved") render();
    if (nowSaved) showToast("Saved to your list", { label: "View saved", run: () => setView("saved") });
    else showToast(`Removed “${e.title}” from saved`, { label: "Undo", run: () => toggleSave(id) });
  }

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-save]");
    if (btn) { ev.stopPropagation(); toggleSave(btn.dataset.save); }
  }, true);

  function renderSavedCount() {
    $("#saved-count").textContent = saved.size;
  }

  function setView(view) {
    state.view = view;
    $("#saved-button").setAttribute("aria-pressed", String(view === "saved"));
    frameEvents(render());
  }

  // ---------------------------------------------------------------- toast
  const toast = $("#toast");
  let toastTimer = null;
  function showToast(message, action) {
    clearTimeout(toastTimer);
    toast.innerHTML = `<span class="ok">${icon("check")}</span><span>${esc(message)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
    if (action) $("button", toast).addEventListener("click", () => { toast.hidden = true; action.run(); });
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
  }

  // ---------------------------------------------------------------- popovers
  const openPopovers = new Set();
  function togglePopover(button, pop, force) {
    const open = force !== undefined ? force : pop.hidden;
    if (open) {
      closeAllPopovers(pop);
      pop.hidden = false;
      button.setAttribute("aria-expanded", "true");
      openPopovers.add({ button, pop });
      const first = pop.querySelector("input, button, a");
      if (first && force === undefined) setTimeout(() => first.focus(), 0);
    } else {
      pop.hidden = true;
      button.setAttribute("aria-expanded", "false");
      openPopovers.forEach((p) => { if (p.pop === pop) openPopovers.delete(p); });
    }
  }
  function closeAllPopovers(except) {
    openPopovers.forEach((p) => {
      if (p.pop === except) return;
      p.pop.hidden = true;
      p.button.setAttribute("aria-expanded", "false");
      openPopovers.delete(p);
    });
  }
  document.addEventListener("click", (ev) => {
    openPopovers.forEach((p) => {
      if (!p.pop.contains(ev.target) && !p.button.contains(ev.target)) togglePopover(p.button, p.pop, false);
    });
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    if (openPopovers.size) {
      const last = [...openPopovers].pop();
      togglePopover(last.button, last.pop, false);
      last.button.focus();
    } else if (!card.hidden) hideCard();
    else if (!drawer.hidden) closeDrawer();
  });

  // ---------------------------------------------------------------- city picker
  const cityButton = $("#city-button"), cityMenu = $("#city-menu"), citySearch = $("#city-search");

  function renderCityList() {
    const q = citySearch.value.trim().toLowerCase();
    const w = dateWindow();
    $("#city-list").innerHTML = CITIES
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .map((c) => {
        const n = EVENTS.filter((e) => e.city === c.id && e.endDate > w.from && e.startDate < w.to).length;
        const when = state.preset === "today" ? "today" : state.preset === "weekend" ? "this weekend" : "in these dates";
        return `<li><button type="button" class="city-option" role="option" data-city="${c.id}" aria-selected="${c.id === state.cityId}">
          <span class="pin-box">${icon("pin")}</span>
          <span class="names"><strong>${esc(c.name)}, ${esc(c.region)}</strong><small>${plural(n, "event")} ${when}</small></span>
          <span class="check-mark">${icon("check")}</span></button></li>`;
      }).join("") || `<li class="empty"><span>No matching city yet.</span></li>`;
  }

  function setCity(id, { recenter = true } = {}) {
    if (!cityById[id]) return;
    state.cityId = id;
    store.set("happenings:city", id);
    if (state.view === "saved") { state.view = "all"; $("#saved-button").setAttribute("aria-pressed", "false"); }
    const list = render();
    if (recenter) frameEvents(list);
  }

  cityButton.addEventListener("click", () => { renderCityList(); togglePopover(cityButton, cityMenu); });
  citySearch.addEventListener("input", renderCityList);
  $("#city-list").addEventListener("click", (ev) => {
    const opt = ev.target.closest("[data-city]");
    if (!opt) return;
    togglePopover(cityButton, cityMenu, false);
    setCity(opt.dataset.city);
    cityButton.focus();
  });

  // ---------------------------------------------------------------- location
  function distanceKm([a1, o1], [a2, o2]) {
    const r = Math.PI / 180, dLat = (a2 - a1) * r, dLng = (o2 - o1) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }

  function locate({ chooseCity }) {
    if (!("geolocation" in navigator)) { showToast("Your browser can't share its location."); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const here = [pos.coords.latitude, pos.coords.longitude];
      showYou(...here);
      const nearest = CITIES.map((c) => ({ c, d: distanceKm(here, c.center) })).sort((a, b) => a.d - b.d)[0];
      if (nearest.d > 60) {
        map.setView(here, 13);
        showToast("Happenings doesn't cover your area yet. Showing where you are.");
        return;
      }
      if (chooseCity || nearest.c.id !== state.cityId) setCity(nearest.c.id, { recenter: false });
      map.setView(here, 14);
    }, () => {
      showToast("Couldn't get your location. Check the location permission for this site.");
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  $("#use-location").addEventListener("click", () => { togglePopover(cityButton, cityMenu, false); locate({ chooseCity: true }); });
  $("#locate").addEventListener("click", () => locate({ chooseCity: false }));
  $("#zoom-in").addEventListener("click", () => map.zoomIn());
  $("#zoom-out").addEventListener("click", () => map.zoomOut());

  // ---------------------------------------------------------------- search
  const search = $("#search");
  let searchTimer = null;
  search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = search.value.trim().toLowerCase(); render(); }, 120);
  });
  search.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && search.value) { ev.stopPropagation(); search.value = ""; state.query = ""; render(); }
  });

  // ---------------------------------------------------------------- dates
  const datePopover = $("#date-popover"), pickDates = $("#pick-dates");
  const dateFrom = $("#date-from"), dateTo = $("#date-to");
  dateFrom.min = dateTo.min = T.isoDate(anchors.today);
  dateFrom.value = T.isoDate(anchors.friday);
  dateTo.value = T.isoDate(T.addDays(anchors.friday, 2));

  function setPreset(preset) {
    state.preset = preset;
    $$(".seg").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.preset === preset)));
    if (state.view === "saved") { state.view = "all"; $("#saved-button").setAttribute("aria-pressed", "false"); }
    render();
  }

  $$(".seg[data-preset='today'], .seg[data-preset='weekend']").forEach((b) =>
    b.addEventListener("click", () => setPreset(b.dataset.preset)));
  pickDates.addEventListener("click", () => togglePopover(pickDates, datePopover));
  dateFrom.addEventListener("change", () => { if (dateTo.value < dateFrom.value) dateTo.value = dateFrom.value; dateTo.min = dateFrom.value; });
  datePopover.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const parse = (v) => { const [y, m, d] = v.split("-").map(Number); return { y, m, d }; };
    if (!dateFrom.value || !dateTo.value) return;
    state.range = { from: parse(dateFrom.value), to: parse(dateTo.value < dateFrom.value ? dateFrom.value : dateTo.value) };
    togglePopover(pickDates, datePopover, false);
    setPreset("range");
  });

  // ---------------------------------------------------------------- filters popover
  const filtersButton = $("#filters-button"), filtersPopover = $("#filters-popover");
  filtersButton.addEventListener("click", () => togglePopover(filtersButton, filtersPopover));
  $("#free-only").addEventListener("change", (ev) => { state.freeOnly = ev.target.checked; render(); });
  $$("input[name='tod']").forEach((cb) => cb.addEventListener("change", () => {
    cb.checked ? state.tod.add(cb.value) : state.tod.delete(cb.value);
    render();
  }));

  function clearFilters() {
    state.query = ""; search.value = "";
    state.cats.clear();
    state.freeOnly = false; $("#free-only").checked = false;
    state.tod.clear(); $$("input[name='tod']").forEach((cb) => { cb.checked = false; });
    render();
  }

  // ---------------------------------------------------------------- saved button
  $("#saved-button").addEventListener("click", () => setView(state.view === "saved" ? "all" : "saved"));

  // ---------------------------------------------------------------- render
  const chipsEl = $("#chips"), listEl = $("#event-list"), filterBar = $("#filter-bar");

  function renderChips(base) {
    const counts = {};
    base.forEach((e) => { counts[e.category] = (counts[e.category] || 0) + 1; });
    chipsEl.innerHTML =
      `<button type="button" class="chip" data-cat="" aria-pressed="${state.cats.size === 0}">All <span class="count">${base.length}</span></button>` +
      Object.entries(CATEGORIES).map(([id, c]) => {
        const n = counts[id] || 0, on = state.cats.has(id);
        return `<button type="button" class="chip" data-cat="${id}" aria-pressed="${on}" ${!n && !on ? "disabled" : ""} style="--c:${c.color}">
          <span class="swatch"></span>${esc(c.label)} <span class="count">${n}</span></button>`;
      }).join("");
  }
  chipsEl.addEventListener("click", (ev) => {
    const chip = ev.target.closest("[data-cat]");
    if (!chip) return;
    const id = chip.dataset.cat;
    if (!id) state.cats.clear();
    else state.cats.has(id) ? state.cats.delete(id) : state.cats.add(id);
    render();
    const again = chipsEl.querySelector(`[data-cat="${id}"]`);
    if (again) again.focus();
  });

  function renderList(list) {
    if (!list.length) {
      const savedEmpty = state.view === "saved" && !saved.size;
      listEl.innerHTML = `<li class="empty">
        <strong>${savedEmpty ? "Nothing saved yet" : "No events match"}</strong>
        <span>${savedEmpty ? "Tap the heart on any event to keep it here." : "Try another date, a different search or fewer filters."}</span>
        ${hasUserFilters() ? '<button type="button" class="btn-primary" data-clear>Clear filters</button>' : ""}
      </li>`;
      return;
    }
    listEl.innerHTML = list.map((e) => {
      const c = CATEGORIES[e.category];
      const place = state.view === "saved" && e.city !== state.cityId ? `${e.area}, ${e.cityName}` : e.area;
      const active = e.id === state.selectedId || e.id === state.hotId;
      return `<li class="event-row${active ? " is-active" : ""}" data-id="${e.id}" style="--c:${c.color}">
        ${art(e, "thumb")}
        <div class="info">
          <span class="cat-label">${esc(c.label)}</span>
          <h3><button type="button" data-open="${e.id}">${esc(e.title)}</button></h3>
          <span class="meta">${esc(whenText(e))}</span>
          <span class="meta">${esc(place)} · ${esc(e.priceLabel)}</span>
        </div>
        ${heartBtn(e)}
      </li>`;
    }).join("");
  }
  listEl.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-clear]")) { clearFilters(); return; }
    const row = ev.target.closest(".event-row");
    if (row && !ev.target.closest("[data-save]")) openDrawer(row.dataset.id);
  });
  listEl.addEventListener("mouseover", (ev) => {
    const row = ev.target.closest(".event-row");
    if (row && row.dataset.id !== state.hotId) setHot(row.dataset.id);
  });
  listEl.addEventListener("mouseleave", () => setHot(state.selectedId));

  function renderFilterBar(shown) {
    if (state.view === "saved" || !hasUserFilters()) { filterBar.hidden = true; return; }
    const total = EVENTS.filter(inScope).length;
    const pills = [];
    if (state.query) pills.push(`<button type="button" class="filter-pill" data-remove="query" aria-label="Remove search">“${esc(state.query)}” ${icon("x")}</button>`);
    if (state.cats.size) pills.push(`<button type="button" class="filter-pill" data-remove="cats" aria-label="Remove category filter">${[...state.cats].map((c) => esc(CATEGORIES[c].label)).join(" + ")} ${icon("x")}</button>`);
    if (state.freeOnly) pills.push(`<button type="button" class="filter-pill" data-remove="free" aria-label="Remove free only">Free only ${icon("x")}</button>`);
    if (state.tod.size) pills.push(`<button type="button" class="filter-pill" data-remove="tod" aria-label="Remove time of day">${[...state.tod].map((t) => t[0].toUpperCase() + t.slice(1)).join(" + ")} ${icon("x")}</button>`);
    filterBar.innerHTML = `<span>Showing <b>${shown} of ${total}</b> ${total === 1 ? "event" : "events"}</span>${pills.join("")}<button type="button" class="link" data-remove="all">Clear all</button>`;
    filterBar.hidden = false;
  }
  filterBar.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-remove]");
    if (!b) return;
    const what = b.dataset.remove;
    if (what === "all") return clearFilters();
    if (what === "query") { state.query = ""; search.value = ""; }
    if (what === "cats") state.cats.clear();
    if (what === "free") { state.freeOnly = false; $("#free-only").checked = false; }
    if (what === "tod") { state.tod.clear(); $$("input[name='tod']").forEach((cb) => { cb.checked = false; }); }
    render();
  });

  function renderMarkers(list) {
    hideCard();
    clusters.clearLayers();
    clusters.addLayers(list.map(markerFor));
  }

  function render() {
    const base = EVENTS.filter(matchesExceptCategory);
    const list = base.filter((e) => state.cats.size === 0 || state.cats.has(e.category));

    $("#city-label").textContent = `${currentCity().name}, ${currentCity().region}`;
    $("#panel-title").textContent = state.view === "saved" ? "Saved events" : plural(list.length, "event");
    $("#panel-sub").textContent = state.view === "saved"
      ? (saved.size ? `${plural(list.length, "saved event")} · all cities and dates` : "Your saved events appear here")
      : dateWindowLabel();
    $("#filters-dot").hidden = !(state.freeOnly || state.tod.size);
    pickDates.textContent = state.preset === "range" && state.range ? dateWindowLabel() : "Pick dates";

    renderChips(base);
    renderList(list);
    renderFilterBar(list.length);
    renderMarkers(list);
    renderSavedCount();
    return list;
  }

  // ---------------------------------------------------------------- go
  frameEvents(render());
  window.HAPPENINGS_APP = { state, map, events: EVENTS, render }; // handy for debugging in the console
})();
