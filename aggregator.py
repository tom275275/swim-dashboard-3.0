"""
aggregator.py - Unified swim schedule aggregator

Fetches swim schedules from Oakville, Burlington, and Mississauga,
normalizes them to a common format, and saves to schedule.json.

Usage:
    python aggregator.py
    python aggregator.py --days 28   (optional: how many days ahead to fetch)
"""

import json
import sys
from datetime import datetime

from oakville_fetcher import fetch_schedule as fetch_oakville
from burlington_fetcher import fetch_schedule as fetch_burlington
from mississauga_fetcher import fetch_schedule as fetch_mississauga


def main(days=14):
    print(f"=== Swim Schedule Aggregator (next {days} days) ===\n")

    print("--- Oakville ---")
    oakville_events = fetch_oakville(days)
    print(f"Oakville: {len(oakville_events)} events\n")

    print("--- Burlington ---")
    burlington_events = fetch_burlington(days)
    print(f"Burlington: {len(burlington_events)} events\n")

    print("--- Mississauga ---")
    mississauga_events = fetch_mississauga(days)
    print(f"Mississauga: {len(mississauga_events)} events\n")

    all_events = oakville_events + burlington_events + mississauga_events
    all_events.sort(key=lambda e: (e["date"], e["start_time"]))

    output = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "days_fetched": days,
        "total_events": len(all_events),
        "events": all_events
    }

    with open("schedule.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"=== Done: {len(all_events)} total events saved to schedule.json ===")
    print(f"  Oakville:    {len(oakville_events)}")
    print(f"  Burlington:  {len(burlington_events)}")
    print(f"  Mississauga: {len(mississauga_events)}")


if __name__ == "__main__":
    days = 14
    if len(sys.argv) == 3 and sys.argv[1] == "--days":
        try:
            days = int(sys.argv[2])
        except ValueError:
            print("Invalid --days value, using default of 14.")
    main(days)
