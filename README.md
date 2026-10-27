# Happenings

A map-first event finder for Vancouver. See what's on around you, preview any event by hovering over its pin, filter and search, then save it and add it to your calendar.

All events are real. Live concerts, sports and shows come from Ticketmaster and refresh every hour. Free community events, like farmers markets and festivals, are checked against their organizers' pages.

Designed in Pixso, built with plain HTML, CSS and JavaScript (no build step).

## Features

- **Real, interactive map.** Streets, parks and water from OpenStreetMap. Drag, scroll or pinch to zoom; nearby pins group into numbered clusters.
- **Real events, kept current.** A GitHub Actions job fetches upcoming events from the Ticketmaster Discovery API every hour and republishes the site.
- **Hover previews.** Hovering a pin (or tabbing to it with the keyboard) shows a card with a picture, the event name, time, place, price, a link to tickets or the event page, and a save button.
- **Filter and search.** Category chips with live counts, keyword search across titles, venues, performers and tags, plus "Free only" and time-of-day filters. An on-map bar shows active filters with one-click removal.
- **Dates.** Today, This weekend, or any date range.
- **One city or several.** Pick any mix of Vancouver, North Vancouver, Burnaby, Richmond, Surrey and Victoria, or use your current location.
- **Save events.** Saved events persist in the browser and have their own view.
- **Add to calendar.** Google Calendar, Outlook, Apple Calendar or a downloadable `.ics` file, with correct Vancouver times wherever the visitor is.
- **Works on phones.** The list moves under the map and details open full screen.
- **Accessible.** Keyboard navigation for pins, lists and menus; visible focus; Escape closes menus and panels; screen-reader labels.

## Run it

You need an internet connection (the map and fonts load from the web).

**Simplest:** unzip the folder and double-click `index.html`. You'll see the community events. Live events only load when the site is served (online, or with the local server below), because browsers block reading `data/events.json` from a double-clicked file.

**With a local server:**

```bash
cd happenings
python3 -m http.server 8000      # or: npx serve
# then open http://localhost:8000
```

To fill in live events locally, run the feed once with your key (see below):

```bash
TICKETMASTER_API_KEY=your_key node scripts/fetch-events.mjs
```

## Put it online with live events (GitHub Pages)

You'll need a free Ticketmaster developer key. The key stays private in GitHub; it never appears in the website.

### 1. Get a Ticketmaster API key

1. Go to [developer.ticketmaster.com](https://developer.ticketmaster.com/products-and-docs/apis/getting-started/) and register (or log in).
2. Open **My Apps**. Your default app shows a **Consumer Key**. That's your API key.

Every key includes 5,000 requests a day. The hourly update uses roughly 150–300.

### 2. Upload the project

Upload everything in this folder to your repository: `index.html`, `README.md`, and the `css`, `js`, `data` and `scripts` folders.

The update job lives in a hidden folder, `.github`, which file browsers usually don't show. The easiest way to add it:

1. In your repository, click **Add file → Create new file**.
2. Type the name `.github/workflows/update-events.yml` (the slashes create the folders).
3. Paste in the contents of that file from this project and click **Commit changes**.

### 3. Add the key as a secret

1. In the repository, go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `TICKETMASTER_API_KEY`. Secret: your Consumer Key. Click **Add secret**.

### 4. Let the job publish the site

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

### 5. Run it once

1. Open the **Actions** tab and choose **Update events and deploy**.
2. Click **Run workflow**. After a minute or two it shows a green check, and your site has live events.

From then on it runs every hour on its own, and again whenever you push changes.

**Good to know**

- If Ticketmaster can't be reached, that hour's run stops before publishing, so the site keeps its last good list.
- GitHub pauses scheduled jobs in public repositories after 60 days with no commits. You'll get an email; re-enable it from the **Actions** tab.
- GitHub may start scheduled runs a few minutes late at busy times.

## Project structure

```
happenings/
├── index.html                          Page structure: top bar, map, list panel, details drawer
├── css/styles.css                      All styles. Design tokens are at the top
├── js/data.js                          Cities, categories and community events
├── js/time.js                          Time zones, date formatting, calendar links and .ics files
├── js/app.js                           Map, pins, hover card, filters, search, saving, drawer
├── data/events.json                    Live events (written by the feed script)
├── scripts/fetch-events.mjs            Fetches live events from Ticketmaster
└── .github/workflows/update-events.yml Runs the feed hourly and publishes the site
```

### How it works

1. **Live events.** `scripts/fetch-events.mjs` searches Ticketmaster around each city for the next 60 days. It maps each event to a category, drops cancelled or postponed shows and venues outside the covered cities, removes duplicate listings, and writes `data/events.json`. The GitHub Actions workflow runs it hourly and publishes the result.
2. **Community events.** `js/data.js` stores them as schedules (for example "Saturdays 10 AM–2 PM from Nov 7 to Mar 27, except Dec 26"), and the app turns those into dated listings.
3. **Display.** `app.js` shows community events right away, then adds the live feed when it loads. Every change of city, date, search or filter calls `render()`, which updates the list, category counts, filter bar and map pins together.
4. **Honest details.** When Ticketmaster gives no end time, the app shows only the start time. When it gives no price, the app says "Tickets" rather than guessing. A $0 price from Ticketmaster usually means unpublished, so live events are never labelled free.

## Add or update community events

Community events are in `COMMUNITY_EVENTS` in `js/data.js`. Each one should link to its official page, and its schedule should match that page.

```js
{ id: "my-market", title: "Night Market", category: "markets", city: "vancouver",
  venue: "Venue name", address: "123 Main St", area: "Neighbourhood",
  lat: 49.28, lng: -123.12, price: 0,                 // 0 = free; or a number; or null + priceLabel: "Tickets"
  url: "https://official-event-page",
  description: "What to expect.", tags: ["market", "street food"],
  image: "images/night-market.jpg",                    // optional

  // Use one of these schedule styles:
  weekly: [{ from: "2026-11-07", until: "2027-03-27", days: ["sat"], start: "10:00", end: "14:00",
             except: ["2026-12-26"] }],
  // dates: [{ date: "2026-11-21", start: "12:00", end: "20:00" }],
  // span:  { from: "2026-11-16", until: "2026-12-24", hours: "Hours vary by day" }
}
```

- Times are Vancouver time. Write times past midnight as `"25:30"` (1:30 AM the next day).
- Category ids: `music`, `arts`, `sports`, `food`, `markets`, `family`, `outdoors`.
- When a new season is announced, update the dates. Past dates drop off automatically.

**Add a city** – add an entry to `CITIES` in `js/data.js` with its centre, zoom level and search radius. The live feed picks it up on its next run.

**Change the look** – edit the variables at the top of `css/styles.css`. Category colours live in `CATEGORIES` in `data.js`.

## Map tiles

The map uses [OpenFreeMap](https://openfreemap.org): free OpenStreetMap-based map tiles with no API key or sign-up. MapLibre draws them inside Leaflet. If a browser can't draw vector maps (no WebGL), the app falls back to standard OpenStreetMap tiles automatically.

To change the map style, edit the `style` URL in `app.js`. OpenFreeMap also offers `.../styles/positron` (very light, grey) and `.../styles/bright`.

## Built with

- [Leaflet](https://leafletjs.com) and [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) for the map
- [MapLibre GL](https://maplibre.org) and [maplibre-gl-leaflet](https://github.com/maplibre/maplibre-gl-leaflet)
- Map tiles from [OpenFreeMap](https://openfreemap.org), map data © OpenStreetMap contributors
- Live event data from the [Ticketmaster Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
- GitHub Actions and GitHub Pages for hourly updates and hosting
- Fonts: Outfit and Manrope (Google Fonts)

## Process

<!-- Edit this section in your own words for your application. -->
- **Design:** Pixso. Cover, explore, filter and save/calendar screens. *(Add a link to your Pixso file.)*
- **AI-assisted:** I used Claude to help turn the design into code, connect a live data source and explain the build. *(Describe what you directed, what you changed and what you learned.)*
