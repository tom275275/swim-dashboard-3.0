# 🏊 Swim Dashboard 3.0

> A unified public swim schedule for Oakville, Burlington, and Mississauga — aggregated daily and displayed in a live web dashboard.

**🔗 Live dashboard:** https://dashboard-red-two-63.vercel.app

---

## 🌊 What it does

Fetches swim class data from three Ontario municipalities via their public REST APIs, normalises it into a common format, and serves it through a Next.js dashboard. The schedule refreshes automatically every morning at **7 AM ET** via GitHub Actions.

---

## 🛠️ Tech stack

| Layer | Tech |
|---|---|
| Data fetching | Python 3 + `requests` |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Hosting | Vercel (auto-deploys on push to `main`) |
| Refresh | GitHub Actions (daily cron) |

---

## 🚀 Getting started

### Run the fetchers

```bash
# Check dependencies (only `requests` is needed)
python check_dependencies.py

# Run individual fetchers
python oakville_fetcher.py
python burlington_fetcher.py
python mississauga_fetcher.py

# Run the full aggregator (combines all three into schedule.json)
python aggregator.py
python aggregator.py --days 28  # optional: fetch beyond the default 14 days
```

### Run the dashboard locally

```bash
cd dashboard
npm install
npm run dev  # opens localhost:3000
```

---

## 🏗️ Architecture

Three fetchers pull from public APIs → aggregator combines them → result is committed to the repo so Vercel can serve it statically.

| Fetcher | Municipality | API |
|---|---|---|
| `oakville_fetcher.py` | 🔵 Oakville | PerfectMind (tenant 24974) |
| `burlington_fetcher.py` | 🟢 Burlington | PerfectMind (tenant 22818) |
| `mississauga_fetcher.py` | 🟣 Mississauga | Active Communities |

All fetchers return a normalised list of events with keys: `city`, `center`, `facility`, `activity`, `date`, `start_time`, `end_time`, `source`.

---

## ✨ Dashboard features

- 👨‍👩‍👧 **Family / Adult mode** — Family shows leisure and fun swim sessions; Adult shows fitness and lane sessions
- 📅 **Date tabs** — Today + next 3 days
- 🏙️ **City filter** — All / Oakville / Burlington / Mississauga
- ⏱️ **Open Now / Starting Soon** — highlights sessions active or starting within 90 minutes (Today only)
- ⭐ **Sensory Swim badge** — highlights all sensory swim sessions
