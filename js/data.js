/*
 * Happenings – cities, categories and community events
 * ------------------------------------------------------------
 * Two kinds of events appear on the map:
 *
 *  1. Live events (concerts, sports, theatre…) from data/events.json.
 *     That file is rebuilt every hour by scripts/fetch-events.mjs, which reads
 *     the Ticketmaster Discovery API. See README.md for setup.
 *
 *  2. Community events (below): real, mostly free local events such as farmers
 *     markets and festivals. Each one was checked against its official page.
 *     They are written as schedules, so they stay correct week to week:
 *
 *     weekly:  [{ from, until, days: ["sat"], start: "10:00", end: "14:00", except: ["2026-12-26"] }]
 *              Repeats on the given weekdays between `from` and `until` (inclusive).
 *     dates:   [{ date: "2026-11-21", start: "12:00", end: "20:00" }]
 *              Specific days.
 *     span:    { from: "2026-11-16", until: "2026-12-24", hours: "Hours vary by day" }
 *              One listing covering several days when daily times aren't fixed.
 *
 *     Times are local to TIME_ZONE. Check each event's page and update the
 *     schedule when a new season is announced.
 */

window.HAPPENINGS_DATA = (function () {
  const TIME_ZONE = "America/Vancouver";

  const ICONS = {
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    food: '<path d="M6 3v7a3 3 0 0 0 6 0V3M9 3v18M17 3c-2 2-2 6 0 8v10"/>',
    arts: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    sports: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    outdoors: '<path d="M3 20l6-10 4 6 3-4 5 8z"/>',
    markets: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    family: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01"/>'
  };

  const CATEGORIES = {
    music:    { label: "Music",          color: "#7C3AED", tint: "#C4B5FD", icon: ICONS.music },
    arts:     { label: "Arts & Culture", color: "#E6457A", tint: "#FBCFE8", icon: ICONS.arts },
    sports:   { label: "Sports",         color: "#0E8C9A", tint: "#99F6E4", icon: ICONS.sports },
    food:     { label: "Food & Drink",   color: "#F2711C", tint: "#FCD34D", icon: ICONS.food },
    markets:  { label: "Markets",        color: "#D99A00", tint: "#FDE68A", icon: ICONS.markets },
    family:   { label: "Family",         color: "#2D8CF0", tint: "#BFDBFE", icon: ICONS.family },
    outdoors: { label: "Outdoors",       color: "#1F9D6A", tint: "#A7F3D0", icon: ICONS.outdoors }
  };

  // `radiusKm` and `aliases` are used by the live feed to find each city's events.
  const CITIES = [
    { id: "vancouver",       name: "Vancouver",       region: "BC", center: [49.2745, -123.1180], zoom: 13, radiusKm: 12 },
    { id: "north-vancouver", name: "North Vancouver", region: "BC", center: [49.3200, -123.0724], zoom: 13, radiusKm: 8 },
    { id: "burnaby",         name: "Burnaby",         region: "BC", center: [49.2488, -122.9805], zoom: 13, radiusKm: 10 },
    { id: "richmond",        name: "Richmond",        region: "BC", center: [49.1666, -123.1336], zoom: 13, radiusKm: 10 },
    { id: "surrey",          name: "Surrey",          region: "BC", center: [49.1913, -122.8490], zoom: 12, radiusKm: 18 },
    { id: "victoria",        name: "Victoria",        region: "BC", center: [48.4284, -123.3656], zoom: 14, radiusKm: 10,
      aliases: ["Saanich", "Oak Bay", "Esquimalt"] }
  ];

  const VFM = "Vancouver Farmers Markets";

  const COMMUNITY_EVENTS = [
    // ---------------- Vancouver Farmers Markets (eatlocal.org) ----------------
    { id: "downtown-farmers-market", title: "Downtown Farmers Market", category: "markets", city: "vancouver",
      venue: "šxʷƛ̓ənəq Xwtl’e7énḵ Square", address: "Hornby St & W Georgia St", area: "Downtown",
      lat: 49.2833, lng: -123.1208, price: 0,
      url: "https://eatlocal.org/markets/downtown/",
      description: `${VFM}' midweek market beside the Vancouver Art Gallery: produce, baked goods and prepared food.`,
      tags: ["farmers market", "produce", "local food"],
      weekly: [{ from: "2026-05-13", until: "2026-12-23", days: ["wed"], start: "14:00", end: "18:00" }] },

    { id: "west-end-farmers-market", title: "West End Farmers Market", category: "markets", city: "vancouver",
      venue: "Comox St (Bute to Thurlow)", address: "1100 Comox St", area: "West End",
      lat: 49.2817, lng: -123.1306, price: 0,
      url: "https://eatlocal.org/markets/west-end/",
      description: `A Saturday street market in the West End run by ${VFM}.`,
      tags: ["farmers market", "produce", "local food"],
      weekly: [{ from: "2026-05-02", until: "2026-10-31", days: ["sat"], start: "09:00", end: "14:00" }] },

    { id: "trout-lake-farmers-market", title: "Trout Lake Farmers Market", category: "markets", city: "vancouver",
      venue: "Trout Lake (John Hendry Park)", address: "Lakewood Dr & E 13th Ave", area: "Grandview",
      lat: 49.2575, lng: -123.0623, price: 0,
      url: "https://eatlocal.org/markets/trout-lake/",
      description: `Vancouver's longest-running farmers market, beside the lake at John Hendry Park. Run by ${VFM}.`,
      tags: ["farmers market", "produce", "local food"],
      weekly: [{ from: "2026-04-04", until: "2026-10-31", days: ["sat"], start: "09:00", end: "14:00" }] },

    { id: "riley-park-farmers-market", title: "Riley Park Farmers Market", category: "markets", city: "vancouver",
      venue: "Riley Park", address: "50 E 30th Ave & Ontario St", area: "Riley Park",
      lat: 49.2425, lng: -123.1049, price: 0,
      url: "https://eatlocal.org/markets/riley-park/",
      description: `${VFM}' Saturday market: produce, bread, flowers and prepared food from local farms and makers.`,
      tags: ["farmers market", "produce", "local food"],
      weekly: [{ from: "2026-04-04", until: "2026-10-31", days: ["sat"], start: "10:00", end: "14:00" }] },

    { id: "riley-park-winter-market", title: "Riley Park Winter Farmers Market", category: "markets", city: "vancouver",
      venue: "Riley Park", address: "50 E 30th Ave & Ontario St", area: "Riley Park",
      lat: 49.2425, lng: -123.1049, price: 0,
      url: "https://eatlocal.org/markets/riley-park-winter/",
      description: `${VFM}' winter market: storage crops, greens, baking, preserves and hot food all season.`,
      tags: ["farmers market", "winter market", "produce", "local food"],
      weekly: [{ from: "2026-11-07", until: "2027-03-27", days: ["sat"], start: "10:00", end: "14:00",
                 except: ["2026-12-26", "2027-01-02"] }] },

    { id: "kitsilano-farmers-market", title: "Kitsilano Farmers Market", category: "markets", city: "vancouver",
      venue: "Kitsilano Community Centre", address: "Larch St & W 10th Ave", area: "Kitsilano",
      lat: 49.2632, lng: -123.1626, price: 0,
      url: "https://eatlocal.org/markets/kitsilano/",
      description: `A Sunday market in Kitsilano run by ${VFM}.`,
      tags: ["farmers market", "produce", "local food"],
      weekly: [{ from: "2026-05-03", until: "2026-11-01", days: ["sun"], start: "10:00", end: "14:00" }] },

    { id: "kitsilano-winter-market", title: "Kitsilano Winter Farmers Market", category: "markets", city: "vancouver",
      venue: "Kitsilano Secondary School", address: "W 10th Ave & Trafalgar St", area: "Kitsilano",
      lat: 49.2627, lng: -123.1665, price: 0,
      url: "https://eatlocal.org/markets/kitsilano-winter/",
      description: `${VFM}' Sunday winter market on the west side.`,
      tags: ["farmers market", "winter market", "produce", "local food"],
      weekly: [{ from: "2026-11-08", until: "2027-04-25", days: ["sun"], start: "10:00", end: "14:00",
                 except: ["2026-12-27", "2027-01-03"] }] },

    { id: "mount-pleasant-farmers-market", title: "Mount Pleasant Farmers Market", category: "markets", city: "vancouver",
      venue: "Dude Chilling Park", address: "E 8th Ave & Guelph St", area: "Mount Pleasant",
      lat: 49.2641, lng: -123.0935, price: 0,
      url: "https://eatlocal.org/markets/mount-pleasant/",
      description: `A neighbourhood Sunday market in Dude Chilling Park, run by ${VFM}.`,
      tags: ["farmers market", "produce", "local food"],
      weekly: [{ from: "2026-05-03", until: "2026-11-01", days: ["sun"], start: "10:00", end: "14:00" }] },

    // ---------------- Festivals and seasonal events ----------------
    { id: "eastside-culture-crawl", title: "Eastside Culture Crawl", category: "arts", city: "vancouver",
      venue: "Open studios across East Vancouver", address: "Columbia St to Victoria Dr, First Ave to the waterfront",
      area: "Strathcona & East Van", lat: 49.2770, lng: -123.0849, price: 0,
      url: "https://culturecrawl.ca/",
      description: "Four days of open artist studios: hundreds of artists show and sell work in their own spaces. Free admission.",
      tags: ["art", "open studios", "artists", "free"],
      dates: [
        { date: "2026-11-19", start: "17:00", end: "22:00" },
        { date: "2026-11-20", start: "17:00", end: "22:00" },
        { date: "2026-11-21", start: "11:00", end: "18:00" },
        { date: "2026-11-22", start: "11:00", end: "18:00" }
      ] },

    { id: "vancouver-christmas-market", title: "Vancouver Christmas Market", category: "markets", city: "vancouver",
      venue: "Jack Poole Plaza", address: "1055 Canada Pl", area: "Coal Harbour",
      lat: 49.2892, lng: -123.1170, price: null, priceLabel: "Tickets",
      url: "https://www.vancouverchristmasmarket.com/",
      description: "A German-style holiday market on the waterfront, with wooden stalls, food and mulled wine. Admission by timed ticket; check the site for daily hours.",
      tags: ["christmas", "holiday market", "festive"],
      span: { from: "2026-11-16", until: "2026-12-24", hours: "Hours vary by day" } },

    { id: "burnaby-festive-village", title: "Festive Village at Burnaby Village Museum", category: "family", city: "burnaby",
      venue: "Burnaby Village Museum", address: "6501 Deer Lake Ave", area: "Deer Lake",
      lat: 49.2394, lng: -122.9593, price: 0,
      url: "https://burnaby.ca/recreation-and-arts/events/heritage-christmas",
      description: "The heritage village lit up for the holidays. Free gate admission; carousel rides cost extra.",
      tags: ["christmas", "lights", "museum", "kids", "free"],
      weekly: [
        { from: "2026-11-25", until: "2026-12-13", days: ["wed", "thu", "fri", "sat", "sun"], start: "14:00", end: "21:00" },
        { from: "2026-12-16", until: "2027-01-03", days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], start: "14:00", end: "21:00",
          except: ["2026-12-24", "2026-12-25"] }
      ] },

    { id: "surrey-tree-lighting", title: "Surrey Tree Lighting Festival & Holiday Market", category: "family", city: "surrey",
      venue: "Surrey Civic Plaza", address: "13450 104 Ave", area: "City Centre",
      lat: 49.1902, lng: -122.8486, price: 0,
      url: "https://www.surrey.ca/news-events/events/surrey-tree-lighting-festival-holiday-market-2026",
      description: "Surrey's free two-day holiday festival with a holiday market and the lighting of the city's Christmas tree.",
      tags: ["christmas", "tree lighting", "holiday market", "free"],
      dates: [
        { date: "2026-11-21", start: "12:00", end: "20:00" },
        { date: "2026-11-22", start: "12:00", end: "20:00" }
      ] }
  ];

  return { TIME_ZONE, CATEGORIES, CITIES, COMMUNITY_EVENTS };
})();

// Let Node scripts (the live feed) read the same city list.
if (typeof module !== "undefined") module.exports = window.HAPPENINGS_DATA;
