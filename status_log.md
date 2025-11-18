# Project Status Log

## Oakville Swim Schedule
**Status:** Complete (Data Extraction Verified)

### Achievements
- **API Discovery:** Identified the hidden API endpoint used by the PerfectMind widget: `https://townofoakville.perfectmind.com/24974/Clients/BookMe4BookingPagesV2/ClassesV2`.
- **Authentication/Authorization:** Confirmed that the API is public and requires specific `calendarId` and `widgetId` parameters, but no complex auth tokens.
- **Pagination Logic:** Reverse-engineered the pagination mechanism. The API returns a `nextKey` (field: `after`) which must be passed to subsequent requests along with the last fetched `dateString` to retrieve the next batch of results.
- **Data Coverage:** Verified that the fetcher retrieves all swim types (Length, Leisure, Combo, etc.) across all 5 major pool locations.
- **Fetcher Script:** Created `oakville_fetcher.py` which programmatically fetches the schedule for any specified duration (tested with 14+ days).

### Current Artifacts
- `oakville_fetcher.py`: Python script to fetch and parse the schedule.
- `oakville_curl.html`: Raw HTML source (reference).
- `oakville_controller.js`: Client-side controller logic (reference).

## Burlington Swim Schedule
**Status:** Complete (Data Extraction Verified)

### Achievements
- **API Re-use:** Successfully adapted the Oakville fetcher logic for Burlington, as both use the PerfectMind platform.
- **Data Verification:** Confirmed that the Burlington API (`https://cityofburlington.perfectmind.com/22818/...`) returns the same JSON structure.
- **Coverage:** Verified fetching of all swim types (Lap Swim, Fun Swim, Combo Swim, etc.) across major pools (Aldershot, Angela Coughlan, Centennial, Tansley Woods).
- **Fetcher Script:** Created `burlington_fetcher.py` which successfully paginates and retrieves future schedules.

## Next Steps
- Investigate Mississauga (Active Network).
- Design the aggregation database/storage.
