# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

A swim schedule aggregator that fetches and normalizes swimming class data from three Ontario municipalities: Oakville, Burlington, and Mississauga. The goal is a unified dashboard of public swim schedules across these cities.

## Tech Stack

- **Python 3** — all fetchers are standalone scripts
- **`requests`** — REST API calls to PerfectMind (Oakville, Burlington)
- **`playwright`** — browser automation for Mississauga (headless Chromium)
- No build step; no package manager

## Running the Fetchers

```bash
# Check that required libraries are installed
python check_dependencies.py

# Install Playwright's Chromium browser (one-time setup)
playwright install chromium

# Run individual fetchers
python oakville_fetcher.py
python burlington_fetcher.py
python mississauga_fetcher.py  # async; saves to mississauga_schedule.json
```

## Architecture

**Three independent fetchers** — one per municipality — each producing normalized schedule data:

| Fetcher | Method | API |
|---------|--------|-----|
| `oakville_fetcher.py` | REST POST with pagination | PerfectMind (`perfectmind.com`) |
| `burlington_fetcher.py` | REST POST with pagination | PerfectMind (same platform, different tenant) |
| `mississauga_fetcher.py` | Playwright browser automation | Active Communities (`apm.activecommunities.com`) |

**Oakville/Burlington pattern** — identical structure, different `calendarId`/`widgetId`/tenant URL:
1. POST to PerfectMind endpoint with a date range
2. Extract classes from `json_data['classes']`
3. Paginate via `json_data.get('nextKey')` — when exhausted, advance `dateString` by 1 day
4. Safety break at page > 10 or reaching the target end date

**Mississauga pattern** — PerfectMind not used here:
1. Playwright navigates the Active Communities calendar widget
2. Clicks through weeks; extracts events from `aria-label` attributes
3. Regex parses the aria-label string: `"Center [Name] [Date] [Time] Activity [Name] [Location]"`
4. Saves parsed list of dicts to `mississauga_schedule.json`

`oakville_controller.js` and `*.html` files are **reference artifacts** from reverse-engineering — not executed code.

## Key Conventions

- All fetchers are self-contained scripts with `if __name__ == "__main__"` entry points (or async equivalents)
- Date format in PerfectMind API: `'%Y%m%d'` for `dateString`, `'%Y-%m-%d'` for internal tracking
- Playwright pages use explicit waits (`wait_for_selector`) with timeouts; wrapped in try/except
- Console output uses `flush=True` to ensure visibility during long runs
- JSON files in the repo root are outputs/snapshots — safe to overwrite when re-running

## Next Development Phase

The fetcher layer is complete. The intended next step is designing an **aggregation and storage layer** (combining data from all three cities), followed by a frontend dashboard to display the unified results.
