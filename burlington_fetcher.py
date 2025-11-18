import requests
import json
from datetime import datetime, timedelta

def fetch_page(url, headers, base_data, date_string=None, after=None, page=0):
    data = base_data.copy()
    if date_string:
        data['dateString'] = date_string
    if after:
        data['after'] = after
    data['page'] = str(page)
    
    print(f"Fetching page {page} starting {date_string} (after: {after})...", flush=True)
    
    try:
        response = requests.post(url, headers=headers, data=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}", flush=True)
        return None

def fetch_all_burlington_schedule(days_to_fetch=14):
    # Updated URL for Burlington (Tenant ID 22818)
    url = "https://cityofburlington.perfectmind.com/22818/Clients/BookMe4BookingPagesV2/ClassesV2"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    # Updated IDs from user provided URL
    base_data = {
        "calendarId": "598fc12b-1445-4708-8de3-4a997690a6a3",
        "widgetId": "9fa0aeb1-bf02-4386-8a83-3a6749a37571",
    }

    all_classes = []
    current_date = datetime.now()
    end_date = current_date + timedelta(days=days_to_fetch)
    
    next_key = None
    page = 0
    last_fetched_date_str = None
    
    # Initial fetch
    while True:
        # Format date for API
        date_string = last_fetched_date_str if last_fetched_date_str else current_date.strftime('%Y-%m-%d')
        
        json_data = fetch_page(url, headers, base_data, date_string, next_key, page)
        
        if not json_data or 'classes' not in json_data or not json_data['classes']:
            print("No more classes found.", flush=True)
            break
            
        new_classes = json_data['classes']
        all_classes.extend(new_classes)
        print(f"  Got {len(new_classes)} classes.", flush=True)
        
        # Update pagination info
        next_key = json_data.get('nextKey')
        
        # Find the last date in this batch to know where to start next if needed
        if new_classes:
            last_class = new_classes[-1]
            # OccurrenceDate is YYYYMMDD
            occ_date = last_class.get('OccurrenceDate')
            if occ_date:
                last_date_dt = datetime.strptime(occ_date, '%Y%m%d')
                if last_date_dt >= end_date:
                    print("Reached target end date.", flush=True)
                    break
                
                # The controller adds 1 day to the last date
                next_start_date = last_date_dt + timedelta(days=1)
                last_fetched_date_str = next_start_date.strftime('%Y-%m-%d')
        
        if not next_key and not new_classes:
             break
             
        page += 1
        
        # Safety break
        if page > 10:
            print("Safety break: too many pages.", flush=True)
            break

    return all_classes

def parse_and_display_schedule(classes):
    print(f"\nTotal Results Fetched: {len(classes)}", flush=True)
    
    # Analyze coverage
    event_types = set()
    locations = set()
    dates = set()
    
    for session in classes:
        event_types.add(session.get('EventName', 'Unknown'))
        locations.add(session.get('Location', 'Unknown'))
        dates.add(session.get('FormattedStartDate', 'Unknown'))

    print("\n--- Swim Types Found ---", flush=True)
    for et in sorted(event_types):
        print(f"- {et}", flush=True)

    print("\n--- Locations Found ---", flush=True)
    for loc in sorted(locations):
        print(f"- {loc}", flush=True)

    print(f"\n--- Date Range ---", flush=True)
    print(f"Unique Days: {len(dates)}", flush=True)
    
    raw_dates = [session.get('OccurrenceDate') for session in classes if session.get('OccurrenceDate')]
    if raw_dates:
        print(f"From: {min(raw_dates)} To: {max(raw_dates)}", flush=True)

if __name__ == "__main__":
    print("Fetching Burlington Swim Schedule (Target: 14 days)...", flush=True)
    classes = fetch_all_burlington_schedule(14)
    if classes:
        parse_and_display_schedule(classes)
