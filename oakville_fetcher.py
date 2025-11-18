import requests
import json
from datetime import datetime

def fetch_oakville_schedule():
    url = "https://townofoakville.perfectmind.com/24974/Clients/BookMe4BookingPagesV2/ClassesV2"
    
    # Headers derived from the successful curl command
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    # Payload derived from the successful curl command
    # calendarId and widgetId were found in the page source
    data = {
        "calendarId": "be3ea5f4-ef36-101d-d685-729ff55fe6b0",
        "widgetId": "9defe1d4-77c5-443d-9302-4960d6d2ee7b",
        "numberOfDaysToLoad": "14"
    }

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

def fetch_all_oakville_schedule(days_to_fetch=14):
    url = "https://townofoakville.perfectmind.com/24974/Clients/BookMe4BookingPagesV2/ClassesV2"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    base_data = {
        "calendarId": "be3ea5f4-ef36-101d-d685-729ff55fe6b0",
        "widgetId": "9defe1d4-77c5-443d-9302-4960d6d2ee7b",
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
        # The controller logic implies we might need to increment the date
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
    print("Fetching Oakville Swim Schedule (Target: 14 days)...", flush=True)
    classes = fetch_all_oakville_schedule(14)
    if classes:
        parse_and_display_schedule(classes)
