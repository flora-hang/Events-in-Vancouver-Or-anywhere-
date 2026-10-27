# Happenings

A map-first event finder for Vancouver. See what's on around you, preview any event by hovering over its pin, filter and search, then save it and add it to your calendar.

Designed in Pixso, built with plain HTML, CSS and JavaScript (no build step).

## Features

- **Real, interactive map.** Streets, parks and water from OpenStreetMap. Drag, scroll or pinch to zoom; nearby pins group into numbered clusters.
- **Hover previews.** Hovering a pin (or tabbing to it with the keyboard) shows a card with a picture, the event name, time, place, price, a "More info" link and a save button.
- **Filter and search.** Category chips with live counts, keyword search across titles, venues, neighbourhoods and tags, plus "Free only" and time-of-day filters. An on-map bar shows active filters with one-click removal.
- **Dates.** Today, This weekend, or any date range.
- **Any city.** Switch between Vancouver, North Vancouver, Burnaby, Richmond, Surrey and Victoria, or use your current location.
- **Save events.** Saved events persist in the browser and have their own view.
- **Add to calendar.** Google Calendar, Outlook, Apple Calendar or a downloadable `.ics` file, with correct Vancouver times wherever the visitor is.
- **Works on phones.** The list moves under the map and details open full screen.
- **Accessible.** Keyboard navigation for pins, lists and menus; visible focus; Escape closes menus and panels; screen-reader labels.

## Run it

You need an internet connection (the map and fonts load from the web).

**Simplest:** unzip the folder and double-click `index.html`. It opens in your browser.

**With a local server** (closer to how it runs online):

```bash
cd happenings
python3 -m http.server 8000      # or: npx serve
# then open http://localhost:8000
```

> Open the page in Chrome, Safari, Firefox or Edge. Previews inside other apps may block the map.

## Put it online (GitHub Pages)

1. Create a new public repository on GitHub and upload the contents of this folder.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then **Save**.
4. After a minute your site is live at `https://<your-username>.github.io/<repo-name>/`.

Netlify and Vercel also work: drag the folder onto Netlify's dashboard, or import the repo in Vercel.

## Project structure

```
happenings/
├── index.html        Page structure: top bar, map, list panel, details drawer
├── css/styles.css    All styles. Design tokens (colours, fonts, radii) are at the top
├── js/data.js        Cities, categories and sample events
├── js/time.js        Time-zone handling, date formatting, calendar links and .ics files
└── js/app.js         Map, pins, hover card, filters, search, saving, drawer
```

### How it works

1. `data.js` provides events with a relative day (`"fri"`, `"sat"`, `"today"`…) and local times, so the demo always shows upcoming events.
2. `time.js` turns those into exact start and end times in `America/Vancouver`.
3. `app.js` keeps a single `state` object (city, dates, search, categories, filters, view). Every change calls `render()`, which filters the events once and updates the list, the category counts, the filter bar and the map pins together.
4. Saved event IDs and the chosen city are stored in `localStorage`.

## Customize

**Add an event** – copy an entry in `SAMPLE_EVENTS` in `js/data.js`:

```js
{ id: "my-event", title: "Night Market", category: "food", city: "vancouver",
  venue: "Venue name", address: "123 Main St", area: "Neighbourhood",
  lat: 49.28, lng: -123.12, day: "sat", start: "18:00", end: "22:00", price: 0,
  description: "What to expect.", tags: ["market", "street food"],
  url: "https://link-to-the-event-page", image: "images/night-market.jpg" }
```

- `day` can be `"today"`, `"tomorrow"`, `"fri"`, `"sat"`, `"sun"` or a date like `"2026-11-14"`.
- Times past midnight are written as `"25:30"` (1:30 AM the next day).
- `image` is optional. Without it, the event shows illustrated art in its category colour.
- `url` is optional. Without it, "More info" searches for the venue.

**Add a city** – add an entry to `CITIES` with its centre coordinates and zoom level.

**Change the look** – edit the variables at the top of `css/styles.css`. Category colours live in `CATEGORIES` in `data.js`.

## Use real event data

The sample events can be replaced with a live source such as the [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) or Eventbrite. Each event needs the fields above with real `start` and `end` times.

A sketch of the change in `app.js`:

```js
// Instead of building EVENTS from SAMPLE_EVENTS:
const res = await fetch("/api/events?city=vancouver");   // your own small server function
const raw = await res.json();
const EVENTS = raw.map((e) => ({
  id: e.id,
  title: e.name,
  category: mapCategory(e.classification),     // your mapping to music/food/arts/…
  city: "vancouver",
  venue: e.venue.name, address: e.venue.address, area: e.venue.neighbourhood,
  lat: e.venue.lat, lng: e.venue.lng,
  startDate: new Date(e.start), endDate: new Date(e.end),
  price: e.minPrice || 0, priceLabel: e.minPrice ? `$${e.minPrice}` : "Free",
  description: e.description, url: e.url, image: e.image,
  cityName: "Vancouver",
  searchText: `${e.name} ${e.venue.name} ${e.description}`.toLowerCase()
}));
```

Keep API keys on a server (for example a Netlify or Vercel function) rather than in the page, since anything in the browser is public.

## Map tiles

The map uses [OpenFreeMap](https://openfreemap.org): free OpenStreetMap-based map tiles with no API key or sign-up. MapLibre draws them inside Leaflet. If a browser can't draw vector maps (no WebGL), the app falls back to standard OpenStreetMap tiles automatically.

To change the map style, edit the `style` URL in `app.js`. OpenFreeMap also offers `.../styles/positron` (very light, grey) and `.../styles/bright`. For a high-traffic production site you can switch to a provider with an account, such as Mapbox, MapTiler or Google Maps. Keep the attribution in the bottom corner either way.

## Built with

- [Leaflet](https://leafletjs.com) and [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) for the map
- [MapLibre GL](https://maplibre.org) and [maplibre-gl-leaflet](https://github.com/maplibre/maplibre-gl-leaflet)
- Map tiles from [OpenFreeMap](https://openfreemap.org), map data © OpenStreetMap contributors
- Fonts: Outfit and Manrope (Google Fonts)

## Process

<!-- Edit this section in your own words for your application. -->
- **Design:** Pixso. Cover, explore, filter and save/calendar screens. *(Add a link to your Pixso file.)*
- **AI-assisted:** I used Claude to help turn the design into code and to explain the build. *(Describe what you directed, what you changed and what you learned.)*

The events in this demo are sample content at real Vancouver locations.
