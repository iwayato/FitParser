import os
import zipfile
import io
from garminconnect import Garmin

import dotenv
dotenv.load_dotenv()

# --- CONFIGURATION ---
GARMIN_EMAIL = os.getenv("GARMIN_EMAIL", "your_email@example.com")
GARMIN_PASSWORD = os.getenv("GARMIN_PASSWORD", "your_password")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DASHBOARD_UPLOAD_PATH = os.getenv("FIT_FILE_FOLDER_PATH", os.path.join(BASE_DIR, "..", "files"))

first_run = True

def get_synced_ids():
    return {os.path.splitext(name)[0] for name in os.listdir(DASHBOARD_UPLOAD_PATH) if name.lower().endswith('.fit')}

def get_activities(client, number = 10, all=False):
    if all:
        all_activities = []
        start = 0
        limit = 100 # Maximize the chunk size for speed

        while True:
            # Get a chunk of activities
            activities = client.get_activities(start, limit)
            
            # If the list is empty, we've reached the end of the history
            if not activities:
                break
            
            all_activities.extend(activities)
            
            # Move the starting point forward for the next request
            start += limit

        return all_activities
    else:
        return client.get_activities(0, number)


def main(retries = 5):
    try:
        client = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
        client.login()

        # 1. Get activities from Garmin Connect
        print("Fetching activities from Garmin Connect...")
        all_activities = get_activities(client, all=first_run)

        print(f"Done! Total activities found: {len(all_activities)}")

        synced_ids = get_synced_ids()

        for activity in all_activities:
            activity_id = str(activity["activityId"])
            
            if activity_id in synced_ids:
                print(f"Skipping {activity_id}: Already synced.")
                continue

            print(f"New activity found! ID: {activity_id}. Downloading .FIT file...")

            
            # 3. Download the FIT file binary
            fit_data = client.download_activity(activity_id, dl_fmt=client.ActivityDownloadFormat.ORIGINAL)

            # Debug: Check the downloaded data
            print(f"Downloaded {len(fit_data)} bytes for {activity_id}")
            if len(fit_data) > 0:
                if fit_data.startswith(b'<'):
                    continue
                elif fit_data.startswith(b'PK'):
                    print(f"Downloaded data is a ZIP file for {activity_id}, extracting...")
                    # Unzip the data
                    with zipfile.ZipFile(io.BytesIO(fit_data), 'r') as zip_ref:
                        # Find the FIT file inside the ZIP
                        fit_files = [name for name in zip_ref.namelist() if name.lower().endswith('.fit')]
                        if not fit_files:
                            print(f"No FIT file found in ZIP for {activity_id}")
                            continue
                        fit_filename = fit_files[0]
                        with zip_ref.open(fit_filename) as fit_file:
                            fit_data = fit_file.read()
                        print(f"Extracted {fit_filename} from ZIP, {len(fit_data)} bytes")
                elif not fit_data.startswith(b'.FIT'):
                    print(f"Warning: Downloaded data does not start with FIT header for {activity_id}")
                    continue

            # Check if download succeeded
            if not fit_data or len(fit_data) < 100:
                print(f"Skipping {activity_id}: Downloaded data too small or empty ({len(fit_data) if fit_data else 0} bytes)")
                continue

            # 4. Save the FIT file to the dashboard upload folder
            fit_file_path = os.path.join(DASHBOARD_UPLOAD_PATH, f"{activity_id}.fit")
            with open(fit_file_path, "wb") as fit_file:
                fit_file.write(fit_data)
            print(f"Saved {activity_id}.fit ({len(fit_data)} bytes) to {DASHBOARD_UPLOAD_PATH}")


    except Exception as e:
        print(f"An error occurred: {type(e).__name__} {e}")
        retries -= 1
        if retries == 0:
            raise Exception("Maximum retry attempts reached. Exiting.")
        print(f"Retrying... ({5 - retries}/5)")

if __name__ == "__main__":
    import time 
    while True:
        main()
        first_run = False
        print("Sleeping for 10 minutes before checking for new activities...")
        time.sleep(600)