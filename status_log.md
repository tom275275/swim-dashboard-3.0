# Project Status Log

## Oakville Swim Schedule
**Status:** Complete (Data Extraction Verified)

### Achievements
- **API Discovery:** Identified the hidden API endpoint used by the PerfectMind widget: `https://townofoakville.perfectmind.com/24974/Clients/BookMe4BookingPagesV2/ClassesV2`.
- **Authentication/Authorization:** Confirmed that the API is public and requires specific `calendarId` and `widgetId` parameters, but no complex auth tokens.
- **Pagination Logic:** Reverse-engineered the pagination mechanism. The API returns a `nextKey` (field: `after`) which must be passed to subsequent requests along with the last fetched `dateString` to retrieve the next batch of results.
- **Data Coverage:** Verified that the fetcher retrieves all swim types (Length, Leisure, Combo, etc.) across all 5 major pool locations.
- **Fetcher Script:** `oakville_fetcher.py` fetches the schedule for any specified duration (default 14 days).
- **Normalized Output:** Added `fetch_schedule(days)` function returning a unified event format shared by all three cities.

### Artifacts
- `oakville_fetcher.py`: Python script to fetch and parse the schedule.
- `oakville_curl.html`: Raw HTML source (reference).
- `oakville_controller.js`: Client-side controller logic (reference).

---

## Burlington Swim Schedule
**Status:** Complete (Data Extraction Verified)

### Achievements
- **API Re-use:** Successfully adapted the Oakville fetcher logic for Burlington, as both use the PerfectMind platform.
- **Data Verification:** Confirmed that the Burlington API (`https://cityofburlington.perfectmind.com/22818/...`) returns the same JSON structure.
- **Coverage:** Verified fetching of all swim types (Lap Swim, Fun Swim, Combo Swim, etc.) across major pools (Aldershot, Angela Coughlan, Centennial, Tansley Woods).
- **Normalized Output:** Added `fetch_schedule(days)` function returning a unified event format.

### Artifacts
- `burlington_fetcher.py`: Python script to fetch and parse the schedule.

---

## Mississauga Swim Schedule
**Status:** Complete (REST API — browser automation no longer used)

### Achievements
- **API Discovery (session 2026-02-18):** Using the Chrome DevTools MCP to inspect live network traffic, discovered that the Active Communities platform exposes a full REST API at `/rest/onlinecalendar/multicenter/events`. This was previously unknown — earlier attempts used brittle Playwright browser automation.
- **Session-free access confirmed:** Tested the API via Playwright's server-side request context (equivalent to Python's `requests`) with no cookies or session tokens. Returns HTTP 200 with clean JSON — no browser required.
- **Centre discovery:** Identified all 21 Mississauga centres via the `/rest/onlinecalendar/filters` endpoint. 10 of these have pools; the rest are arenas, gyms, and libraries. All 21 are passed to the API and pool events are filtered client-side by `"Pool" in facility_name`.
- **Swim centres with pools (10):** Burnhamthorpe, Carmen Corbasson, Churchill Meadows, Clarkson, Erin Meadows, Frank McKechnie, Huron Park, Malton, Meadowvale, Mississauga Valley, River Grove.
- **Fetcher rewrite:** `mississauga_fetcher.py` replaced entirely — ~160 lines of async Playwright code reduced to ~80 lines of standard `requests.post()`.

### Key API Details
- **Endpoint:** `POST https://anc.ca.apm.activecommunities.com/activemississauga/rest/onlinecalendar/multicenter/events?locale=en-US`
- **calendar_id:** `1` = Drop In Programs (includes all swim events)
- **Authentication:** None — public API, no session required
- **Date filtering:** API does not strictly honour `search_start_time`/`search_end_time`; additional client-side filtering applied

### Artifacts
- `mississauga_fetcher.py`: Rewritten REST-based fetcher.
- `mississauga_schedule.json`: Output file (generated, safe to overwrite).
- `mississauga_*.html`: HTML snapshots from earlier investigation (reference only).

---

## Aggregation Layer
**Status:** Complete

### Achievements
- **Unified data model:** All three `fetch_schedule()` functions return the same dict schema: `city, center, facility, activity, date, start_time, end_time, source`.
- **Aggregator script:** `aggregator.py` imports all three fetchers, combines results, sorts by `(date, start_time)`, and writes `schedule.json` with a metadata header.
- **Verified output:** `schedule.json` contains ~1550 events from all three cities for a 14-day window with no past events and no non-pool Mississauga events.

### Artifacts
- `aggregator.py`: Main aggregation script. Run with `python aggregator.py`.
- `schedule.json`: Combined output (generated, safe to overwrite).

---

## Next Steps
- Build the **frontend dashboard** — read `schedule.json` and display a filterable view (by city, activity, date, time of day).
