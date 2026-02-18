import requests
import json
from datetime import datetime, timedelta

BASE_URL = "https://anc.ca.apm.activecommunities.com/activemississauga"

# All 21 Mississauga centre IDs from the Drop In Programs calendar (calendar_id: 1).
# We pass them all and filter by pool-based facilities on our side.
ALL_CENTER_IDS = [
    290, 248, 261, 240, 403, 267, 250, 243, 252, 253,
    125, 65, 100, 119, 401, 82, 396, 91, 128, 106, 110
]


def fetch_schedule(days=14):
    """Fetch Mississauga swim schedule and return a normalized list of events.

    Returns a list of dicts with keys:
        city, center, facility, activity, date, start_time, end_time, source
    """
    start = datetime.now()
    end = start + timedelta(days=days)

    payload = {
        "calendar_id": 1,
        "center_ids": ALL_CENTER_IDS,
        "display_all": 0,
        "search_start_time": start.strftime("%Y-%m-%d 00:00:00"),
        "search_end_time": end.strftime("%Y-%m-%d 23:59:59"),
        "facility_ids": [],
        "activity_category_ids": [],
        "activity_sub_category_ids": [],
        "activity_ids": [],
        "activity_min_age": None,
        "activity_max_age": None,
        "event_type_ids": []
    }

    print(
        f"Fetching Mississauga schedule "
        f"({start.strftime('%Y-%m-%d')} to {end.strftime('%Y-%m-%d')})...",
        flush=True
    )

    try:
        response = requests.post(
            f"{BASE_URL}/rest/onlinecalendar/multicenter/events?locale=en-US",
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Mississauga schedule: {e}", flush=True)
        return []

    events = []
    center_events = data.get("body", {}).get("center_events", [])

    for center in center_events:
        center_name = center.get("center_name", "")
        for event in center.get("events", []):
            # Only keep pool-based events (excludes gyms, arenas, fitness studios, etc.)
            facilities = event.get("facilities", [])
            pool_facilities = [f for f in facilities if "Pool" in f.get("facility_name", "")]
            if not pool_facilities:
                continue

            # Parse start/end datetimes from "YYYY-MM-DD HH:MM:SS"
            try:
                start_dt = datetime.strptime(event["start_time"], "%Y-%m-%d %H:%M:%S")
                end_dt = datetime.strptime(event["end_time"], "%Y-%m-%d %H:%M:%S")
            except (KeyError, ValueError):
                continue

            # The API doesn't strictly honour the date range — filter both ends ourselves
            if start_dt.date() < start.date() or start_dt.date() > end.date():
                continue

            events.append({
                "city": "Mississauga",
                "center": center_name,
                "facility": pool_facilities[0]["facility_name"],
                "activity": event.get("title", ""),
                "date": start_dt.strftime("%Y-%m-%d"),
                "start_time": start_dt.strftime("%H:%M"),
                "end_time": end_dt.strftime("%H:%M"),
                "source": "active_communities"
            })

    print(
        f"Found {len(events)} pool events across {len(center_events)} centres.",
        flush=True
    )
    return events


if __name__ == "__main__":
    events = fetch_schedule(14)

    with open("mississauga_schedule.json", "w") as f:
        json.dump(events, f, indent=2)

    print(f"\nSaved {len(events)} events to mississauga_schedule.json")

    if events:
        print("\nSample events:")
        for e in events[:5]:
            print(
                f"  {e['date']} {e['start_time']}-{e['end_time']} "
                f"| {e['activity']} @ {e['facility']} ({e['center']})"
            )
