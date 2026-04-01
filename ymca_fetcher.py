"""
ymca_fetcher.py - YMCA Oakville swim schedule

Generates swim events from the YMCA Oakville Leisure Pool's fixed weekly
schedule. No API is required — the schedule repeats weekly.

Usage:
    python ymca_fetcher.py
"""

from datetime import datetime, timedelta

# Weekly schedule: day-of-week (0=Monday ... 6=Sunday) -> (start_time, end_time)
# Times are in 24-hour HH:MM format.
WEEKLY_SCHEDULE = {
    0: ("19:00", "20:30"),  # Monday
    1: ("16:00", "20:30"),  # Tuesday
    2: ("19:00", "20:30"),  # Wednesday
    3: ("16:00", "20:30"),  # Thursday
    4: ("19:00", "20:30"),  # Friday
    5: ("12:15", "15:00"),  # Saturday
    6: ("09:00", "15:00"),  # Sunday
}


def fetch_schedule(days=14):
    """Return YMCA Oakville Family Swim events for the next `days` days."""
    events = []
    today = datetime.now().date()

    for i in range(days):
        d = today + timedelta(days=i)
        start, end = WEEKLY_SCHEDULE[d.weekday()]
        events.append({
            "city": "YMCA",
            "center": "YMCA Oakville",
            "facility": "Leisure Pool",
            "activity": "Family Swim",
            "date": d.strftime("%Y-%m-%d"),
            "start_time": start,
            "end_time": end,
            "source": "static",
        })

    return events


if __name__ == "__main__":
    print("--- YMCA Oakville ---", flush=True)
    schedule = fetch_schedule()
    print(f"Generated {len(schedule)} events", flush=True)
    for e in schedule[:5]:
        print(f"  {e['date']} ({e['start_time']}–{e['end_time']})  {e['activity']}", flush=True)
    if len(schedule) > 5:
        print(f"  ... and {len(schedule) - 5} more", flush=True)
