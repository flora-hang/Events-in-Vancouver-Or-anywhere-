/*
 * Happenings – sample data
 * ------------------------------------------------------------
 * Cities, categories and sample events.
 *
 * Events use a relative `day` instead of a fixed date so the demo always shows
 * upcoming events:  "today", "tomorrow", "fri", "sat", "sun"
 * ("fri"/"sat"/"sun" mean the coming weekend, or the current one if it is
 * already the weekend). Times are local to `TIME_ZONE`.
 *
 * To use real data, replace SAMPLE_EVENTS with events from an API that have
 * real `start` and `end` timestamps (see README.md).
 */

window.HAPPENINGS_DATA = (function () {
  const TIME_ZONE = "America/Vancouver";

  const ICONS = {
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    food: '<path d="M6 3v7a3 3 0 0 0 6 0V3M9 3v18M17 3c-2 2-2 6 0 8v10"/>',
    arts: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    outdoors: '<path d="M3 20l6-10 4 6 3-4 5 8z"/>',
    markets: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    family: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01"/>'
  };

  const CATEGORIES = {
    music:    { label: "Music",          color: "#7C3AED", tint: "#C4B5FD", icon: ICONS.music },
    food:     { label: "Food & Drink",   color: "#F2711C", tint: "#FCD34D", icon: ICONS.food },
    arts:     { label: "Arts & Culture", color: "#E6457A", tint: "#FBCFE8", icon: ICONS.arts },
    outdoors: { label: "Outdoors",       color: "#1F9D6A", tint: "#A7F3D0", icon: ICONS.outdoors },
    markets:  { label: "Markets",        color: "#D99A00", tint: "#FDE68A", icon: ICONS.markets },
    family:   { label: "Family",         color: "#2D8CF0", tint: "#BFDBFE", icon: ICONS.family }
  };

  const CITIES = [
    { id: "vancouver",       name: "Vancouver",       region: "BC", center: [49.2745, -123.1180], zoom: 13 },
    { id: "north-vancouver", name: "North Vancouver", region: "BC", center: [49.3200, -123.0724], zoom: 13 },
    { id: "burnaby",         name: "Burnaby",         region: "BC", center: [49.2488, -122.9805], zoom: 13 },
    { id: "richmond",        name: "Richmond",        region: "BC", center: [49.1666, -123.1336], zoom: 13 },
    { id: "surrey",          name: "Surrey",          region: "BC", center: [49.1913, -122.8490], zoom: 12 },
    { id: "victoria",        name: "Victoria",        region: "BC", center: [48.4284, -123.3656], zoom: 14 }
  ];

  // Sample events at real places. Event names and details are invented for the demo.
  const SAMPLE_EVENTS = [
    // ---- Vancouver ----
    { id: "jazz-island", title: "Jazz on the Island", category: "music", city: "vancouver",
      venue: "Performance Works", address: "1218 Cartwright St", area: "Granville Island",
      lat: 49.2712, lng: -123.1345, day: "fri", start: "20:00", end: "22:30", price: 28,
      description: "A quartet plays standards and new tunes in a converted warehouse on the water. Bar opens at 7:30.",
      tags: ["live", "jazz", "concert", "night"] },
    { id: "lantern-walk", title: "Lantern Walk at Lost Lagoon", category: "family", city: "vancouver",
      venue: "Lost Lagoon", address: "Stanley Park", area: "Stanley Park",
      lat: 49.2955, lng: -123.1405, day: "sat", start: "18:00", end: "21:00", price: 0,
      description: "Bring a lantern or borrow one at the start. A slow, lit loop around the lagoon with music along the path. Strollers welcome.",
      tags: ["halloween", "kids", "walk", "live music"] },
    { id: "gastown-market", title: "Gastown Vintage & Makers Market", category: "markets", city: "vancouver",
      venue: "Water Street", address: "Water St & Cambie St", area: "Gastown",
      lat: 49.2843, lng: -123.1088, day: "sat", start: "11:00", end: "17:00", price: 0,
      description: "Forty local makers and vintage sellers along the cobblestones: clothes, ceramics, prints and records.",
      tags: ["vintage", "shopping", "local makers"] },
    { id: "food-trucks", title: "Food Truck Night", category: "food", city: "vancouver",
      venue: "Olympic Village Square", address: "1 Athletes Way", area: "False Creek",
      lat: 49.2695, lng: -123.1065, day: "fri", start: "17:00", end: "22:00", price: 0,
      description: "A dozen food trucks, picnic tables and a DJ by the water. Free entry; pay per truck.",
      tags: ["street food", "dj", "outdoor"] },
    { id: "comedy-main", title: "Main Street Comedy Night", category: "arts", city: "vancouver",
      venue: "The Back Room", address: "Main St & E 10th Ave", area: "Mount Pleasant",
      lat: 49.2625, lng: -123.1005, day: "fri", start: "21:30", end: "23:00", price: 15,
      description: "Six comics, one host and a small room. Arrive early for a seat at the front, if you dare.",
      tags: ["stand-up", "live", "comedy"] },
    { id: "run-club", title: "Sunrise Run Club", category: "outdoors", city: "vancouver",
      venue: "Kitsilano Beach", address: "1499 Arbutus St", area: "Kitsilano",
      lat: 49.2748, lng: -123.1528, day: "sun", start: "08:30", end: "09:30", price: 0,
      description: "An easy 5 km along the seawall with a 10 km option. All paces welcome; coffee after.",
      tags: ["running", "fitness", "seawall"] },
    { id: "indie-film", title: "Indie Film Sunday", category: "arts", city: "vancouver",
      venue: "Commercial Drive", address: "Commercial Dr & E 1st Ave", area: "Grandview",
      lat: 49.2705, lng: -123.0695, day: "sun", start: "19:00", end: "21:00", price: 12,
      description: "Three short films by local directors, followed by a Q&A with the filmmakers.",
      tags: ["film", "cinema", "q&a"] },
    { id: "plant-swap", title: "Trout Lake Plant Swap", category: "markets", city: "vancouver",
      venue: "John Hendry Park", address: "3300 Victoria Dr", area: "Trout Lake",
      lat: 49.2560, lng: -123.0640, day: "sun", start: "13:00", end: "16:00", price: 0,
      description: "Bring a cutting, take a cutting. Tables for houseplants, seeds and garden tips.",
      tags: ["plants", "swap", "community"] },
    { id: "brewery-crawl", title: "Brewery District Crawl", category: "food", city: "vancouver",
      venue: "Yeast Van", address: "E Hastings & Commercial", area: "East Vancouver",
      lat: 49.2795, lng: -123.0640, day: "sat", start: "15:00", end: "20:00", price: 35,
      description: "Four craft breweries, four tasting flights and a walking guide. 19+.",
      tags: ["beer", "tasting", "walk"] },
    { id: "photo-walk", title: "Fall Colours Photo Walk", category: "outdoors", city: "vancouver",
      venue: "Queen Elizabeth Park", address: "4600 Cambie St", area: "Riley Park",
      lat: 49.2418, lng: -123.1126, day: "sun", start: "10:00", end: "12:00", price: 0,
      description: "A guided walk through the quarry garden with tips for shooting autumn light on any camera or phone.",
      tags: ["photography", "walk", "gardens"] },
    { id: "costume-parade", title: "Kids Costume Parade", category: "family", city: "vancouver",
      venue: "West 4th Avenue", address: "W 4th Ave & Yew St", area: "Kitsilano",
      lat: 49.2680, lng: -123.1585, day: "sat", start: "16:00", end: "17:30", price: 0,
      description: "Shops hand out treats along West 4th. Costumes encouraged for kids, grown-ups and dogs.",
      tags: ["halloween", "kids", "parade"] },
    { id: "rooftop-dj", title: "Rooftop DJ Night", category: "music", city: "vancouver",
      venue: "Burrard Street rooftop", address: "Burrard St & W Georgia St", area: "Downtown",
      lat: 49.2853, lng: -123.1215, day: "sat", start: "22:00", end: "26:00", price: 20,
      description: "House and disco with city views. Heated patio. 19+.",
      tags: ["dj", "dance", "nightlife", "live"] },
    { id: "altar-workshop", title: "Día de Muertos Altar Workshop", category: "arts", city: "vancouver",
      venue: "Vancouver Public Library, Central", address: "350 W Georgia St", area: "Downtown",
      lat: 49.2797, lng: -123.1155, day: "sat", start: "14:00", end: "16:00", price: 15,
      description: "Make paper flowers and decorations for a community ofrenda. Materials included.",
      tags: ["workshop", "craft", "culture"] },
    { id: "symphony-matinee", title: "Sunday Symphony Matinee", category: "music", city: "vancouver",
      venue: "Orpheum Theatre", address: "601 Smithe St", area: "Downtown",
      lat: 49.2799, lng: -123.1209, day: "sun", start: "14:00", end: "16:00", price: 35,
      description: "An afternoon programme of film scores and classical favourites.",
      tags: ["orchestra", "classical", "live", "concert"] },
    { id: "sunset-ride", title: "Seawall Sunset Ride", category: "outdoors", city: "vancouver",
      venue: "English Bay", address: "Beach Ave & Denman St", area: "West End",
      lat: 49.2866, lng: -123.1430, day: "fri", start: "17:30", end: "19:00", price: 0,
      description: "A relaxed group bike ride around Stanley Park at sunset. Bring lights.",
      tags: ["cycling", "seawall", "sunset"] },
    { id: "chinatown-tour", title: "Chinatown Night Food Tour", category: "food", city: "vancouver",
      venue: "Dr. Sun Yat-Sen Park", address: "578 Carrall St", area: "Chinatown",
      lat: 49.2797, lng: -123.1036, day: "fri", start: "18:00", end: "20:30", price: 45,
      description: "Five stops for dumplings, barbecue and dessert, with stories of the neighbourhood along the way.",
      tags: ["food tour", "walk", "history"] },
    { id: "vinyl-popup", title: "Vinyl & Coffee Pop-up", category: "markets", city: "vancouver",
      venue: "Fraser Street", address: "Fraser St & E 12th Ave", area: "Mount Pleasant",
      lat: 49.2606, lng: -123.0905, day: "sat", start: "10:00", end: "15:00", price: 0,
      description: "Crates of used records, a listening station and pour-over coffee.",
      tags: ["records", "music", "coffee"] },
    { id: "storytime", title: "Storytime & Crafts", category: "family", city: "vancouver",
      venue: "Kitsilano Library", address: "2425 Macdonald St", area: "Kitsilano",
      lat: 49.2645, lng: -123.1680, day: "today", start: "10:30", end: "11:30", price: 0,
      description: "Picture books and a paper-plate craft for ages 3 to 6.",
      tags: ["kids", "books", "library"] },
    { id: "open-mic", title: "Open Mic Night", category: "music", city: "vancouver",
      venue: "The Drive Café", address: "Commercial Dr & Venables St", area: "Grandview",
      lat: 49.2765, lng: -123.0697, day: "today", start: "19:30", end: "22:00", price: 0,
      description: "Sign up at the door for a ten-minute slot. Songs, poems and the occasional kazoo.",
      tags: ["live", "open mic", "acoustic"] },
    { id: "pottery-taster", title: "Pottery Taster Class", category: "arts", city: "vancouver",
      venue: "Strathcona studios", address: "Prior St & Hawks Ave", area: "Strathcona",
      lat: 49.2772, lng: -123.0880, day: "tomorrow", start: "18:30", end: "20:30", price: 40,
      description: "Try the wheel and hand-building in a small group. Pieces are fired and ready in two weeks.",
      tags: ["class", "ceramics", "workshop"] },
    { id: "bird-walk", title: "Jericho Birdwatching Walk", category: "outdoors", city: "vancouver",
      venue: "Jericho Beach Park", address: "3941 Point Grey Rd", area: "Point Grey",
      lat: 49.2725, lng: -123.1980, day: "sat", start: "09:00", end: "11:00", price: 0,
      description: "Look for herons, eagles and migrating ducks with a local naturalist. Binoculars available.",
      tags: ["birds", "nature", "walk"] },
    { id: "riley-market", title: "Riley Park Farmers Market", category: "markets", city: "vancouver",
      venue: "Riley Park", address: "50 E 30th Ave", area: "Riley Park",
      lat: 49.2440, lng: -123.1050, day: "sat", start: "10:00", end: "14:00", price: 0,
      description: "Late-season apples, squash, bread and flowers from farms around the Fraser Valley.",
      tags: ["farmers market", "local food"] },

    // ---- North Vancouver ----
    { id: "shipyards-market", title: "Shipyards Night Market", category: "food", city: "north-vancouver",
      venue: "The Shipyards", address: "125 Victory Ship Way", area: "Lower Lonsdale",
      lat: 49.3095, lng: -123.0790, day: "fri", start: "17:00", end: "22:00", price: 0,
      description: "Food trucks, makers and live music with a view of the city skyline.",
      tags: ["night market", "live music", "street food"] },
    { id: "lynn-hike", title: "Lynn Canyon Guided Hike", category: "outdoors", city: "north-vancouver",
      venue: "Lynn Canyon Park", address: "3690 Park Rd", area: "Lynn Valley",
      lat: 49.3434, lng: -123.0190, day: "sun", start: "10:00", end: "12:00", price: 0,
      description: "A two-hour forest loop over the suspension bridge to Twin Falls.",
      tags: ["hike", "forest", "nature"] },

    // ---- Burnaby ----
    { id: "deer-lake-art", title: "Deer Lake Art Walk", category: "arts", city: "burnaby",
      venue: "Deer Lake Park", address: "6450 Deer Lake Ave", area: "Deer Lake",
      lat: 49.2400, lng: -122.9720, day: "sat", start: "13:00", end: "15:00", price: 0,
      description: "A guided walk past outdoor sculptures and the Burnaby Art Gallery grounds.",
      tags: ["sculpture", "gallery", "walk"] },
    { id: "burnaby-mtn", title: "Burnaby Mountain Sunrise Hike", category: "outdoors", city: "burnaby",
      venue: "Burnaby Mountain Park", address: "100 Centennial Way", area: "Burnaby Mountain",
      lat: 49.2790, lng: -122.9190, day: "sun", start: "07:30", end: "09:30", price: 0,
      description: "Watch the sun come up over the inlet from the top of the mountain.",
      tags: ["hike", "sunrise", "views"] },

    // ---- Richmond ----
    { id: "steveston-walk", title: "Steveston Harbour Walk", category: "outdoors", city: "richmond",
      venue: "Steveston Village", address: "Bayview St & 3rd Ave", area: "Steveston",
      lat: 49.1245, lng: -123.1850, day: "sat", start: "11:00", end: "13:00", price: 0,
      description: "Fishing boats, the cannery and the boardwalk, with a stop for fish and chips.",
      tags: ["walk", "harbour", "history"] },
    { id: "food-street", title: "Asian Street Food Crawl", category: "food", city: "richmond",
      venue: "Alexandra Road", address: "Alexandra Rd & No. 3 Rd", area: "Golden Village",
      lat: 49.1803, lng: -123.1330, day: "fri", start: "18:00", end: "21:00", price: 25,
      description: "Six tasting stops along Richmond's famous food street.",
      tags: ["food tour", "street food"] },

    // ---- Surrey ----
    { id: "holland-movie", title: "Outdoor Movie in Holland Park", category: "family", city: "surrey",
      venue: "Holland Park", address: "13428 Old Yale Rd", area: "City Centre",
      lat: 49.1885, lng: -122.8475, day: "sat", start: "19:00", end: "21:00", price: 0,
      description: "A family film on the big screen. Bring blankets; hot chocolate for sale.",
      tags: ["movie", "kids", "outdoor"] },

    // ---- Victoria ----
    { id: "harbour-buskers", title: "Inner Harbour Buskers", category: "music", city: "victoria",
      venue: "Inner Harbour", address: "Wharf St & Government St", area: "Downtown",
      lat: 48.4220, lng: -123.3700, day: "sat", start: "12:00", end: "16:00", price: 0,
      description: "Street musicians and performers along the causeway in front of the legislature.",
      tags: ["live", "street performers"] },
    { id: "bastion-market", title: "Bastion Square Market", category: "markets", city: "victoria",
      venue: "Bastion Square", address: "Bastion Square", area: "Old Town",
      lat: 48.4262, lng: -123.3690, day: "sun", start: "11:00", end: "16:00", price: 0,
      description: "Artisans, food stalls and live music in Victoria's historic square.",
      tags: ["market", "crafts", "local makers"] }
  ];

  return { TIME_ZONE, CATEGORIES, CITIES, SAMPLE_EVENTS };
})();
