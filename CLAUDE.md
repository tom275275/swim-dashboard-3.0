# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

A swim schedule aggregator that fetches and normalizes swimming class data from three Ontario municipalities: Oakville, Burlington, and Mississauga. The goal is a unified dashboard of public swim schedules across these cities.

## Tech Stack

- **Python 3** — all fetchers are standalone scripts
- **`requests`** — REST API calls for all three cities (no browser automation needed)
- No build step; no package manager

## Running the Fetchers

```bash
# Check that required libraries are installed (only requests is needed)
python check_dependencies.py

# Run individual fetchers (each prints a summary and saves a JSON file)
python oakville_fetcher.py
python burlington_fetcher.py
python mississauga_fetcher.py    # saves to mississauga_schedule.json

# Run the full aggregator (combines all three into schedule.json)
python aggregator.py
python aggregator.py --days 28   # optional: fetch more than the default 14 days
```

## Architecture

**Four fetchers + one aggregator:**

| File | Method | API |
|------|--------|-----|
| `oakville_fetcher.py` | REST POST with pagination | PerfectMind (`perfectmind.com`, tenant 24974) |
| `burlington_fetcher.py` | REST POST with pagination | PerfectMind (`perfectmind.com`, tenant 22818) |
| `mississauga_fetcher.py` | REST POST, no pagination | Active Communities (`apm.activecommunities.com`) |
| `ymca_fetcher.py` | Static weekly schedule generation | None (no API) |
| `aggregator.py` | Calls all four, combines + sorts output | — |

**Oakville/Burlington pattern** — identical structure, different `calendarId`/`widgetId`/tenant URL:
1. POST to PerfectMind endpoint with a date range
2. Extract classes from `json_data['classes']`
3. Paginate via `json_data.get('nextKey')` — when exhausted, advance `dateString` by 1 day
4. Safety break at page > 10 or reaching the target end date
5. `fetch_schedule(days)` wraps the raw fetch and returns normalized event dicts

**Mississauga pattern** — Active Communities REST API (no browser needed):
1. POST to `/rest/onlinecalendar/multicenter/events` with all 21 centre IDs and a date range
2. API is public and unauthenticated — confirmed to work with only `Content-Type: application/json`
3. Filter pool-only events by checking `"Pool" in facility_name`
4. Additional client-side date filtering (API doesn't strictly honour the date range params)
5. `calendar_id: 1` = "Drop In Programs" (the calendar that includes swim events)

**Unified data model** — all three fetchers' `fetch_schedule()` functions return lists of dicts with these keys:
```
city, center, facility, activity, date (YYYY-MM-DD), start_time (HH:MM), end_time (HH:MM), source
```

`aggregator.py` combines these lists, sorts by `(date, start_time)`, and writes `schedule.json`.

`oakville_controller.js` and `*.html` files are **reference artifacts** from reverse-engineering — not executed code.

## Key Conventions

- All fetchers are self-contained with `if __name__ == "__main__"` entry points
- Each fetcher exposes `fetch_schedule(days=14)` returning a normalized `list[dict]` — this is what `aggregator.py` imports
- The original `fetch_all_*_schedule()` functions in the PerfectMind fetchers remain for standalone diagnostic use
- Date format in PerfectMind API: `'%Y%m%d'` for `OccurrenceDate`, `'%I:%M %p'` for times
- Console output uses `flush=True` to ensure visibility during long runs
- JSON files in the repo root are outputs — safe to overwrite when re-running

## Mississauga Active Communities API Reference

**Events endpoint:**
```
POST https://anc.ca.apm.activecommunities.com/activemississauga/rest/onlinecalendar/multicenter/events?locale=en-US
Content-Type: application/json
```
Key body fields: `calendar_id` (1 = Drop In Programs), `center_ids` (array of ints), `search_start_time`, `search_end_time`.

**All 21 centre IDs:** `[290, 248, 261, 240, 403, 267, 250, 243, 252, 253, 125, 65, 100, 119, 401, 82, 396, 91, 128, 106, 110]`

**Centres with pools (11):** Burnhamthorpe (290), Carmen Corbasson (248), Churchill Meadows (261), Clarkson (240), Erin Meadows (267), Frank McKechnie (243), Huron Park (252), Malton (125), Meadowvale (119), Mississauga Valley (82), River Grove (110).

## Frontend Dashboard

**Location:** `dashboard/` — Next.js 16 app (TypeScript + Tailwind CSS)

**Deployed at:** https://dashboard-red-two-63.vercel.app (Vercel, auto-deploys on push to `main`)

### Running locally
```bash
cd dashboard
npm install
npm run dev   # opens localhost:3000
```

### Dashboard features
- **Family / Adult mode toggle** — Family shows leisure/fun sessions; Adult shows fitness/lane sessions
- **Date tabs** — Today + next 3 days
- **City filter chips** — All / Oakville (blue) / Burlington (green) / Mississauga (purple)
- **Open Now / Starting Soon** — highlights sessions active or starting within 90 min (Today only)
- **Sensory Swim badge** — ⭐ amber highlight on all sensory swim sessions

### Activity classification (in `dashboard/app/page.tsx`)
Family mode shows activities whose name contains: `fun swim`, `fun & lane swim`, `lane & fun`, `parent & tot`, `sensory`, `leisure swim`, `combo swim`.
Adult mode shows everything else.

**Known issue (to fix):** `Lane & Leisure Swim` and `Adult Leisure Swim` are currently appearing in Family mode because they match the `leisure swim` keyword. All activity names need to be reviewed and explicitly classified before the filter logic is finalised.

### Data refresh
- **GitHub Actions** (`.github/workflows/refresh-schedule.yml`) runs daily at 7 AM ET
- Runs `python aggregator.py`, copies output to `dashboard/public/schedule.json`, commits + pushes
- Vercel detects the push and redeploys (~1 min)
- `dashboard/public/schedule.json` is committed to the repo (NOT gitignored) so Vercel can serve it statically
