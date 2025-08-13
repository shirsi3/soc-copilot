#!/usr/bin/env python3

import time
import json
import os
import requests

# === CONFIGURATION ===
ALERTS_FILE = "/var/ossec/logs/alerts/alerts.json"
CHECKPOINT_FILE = "/app/wazuh_pipeline/last_processed_alert_id.txt"
AI_PENDING_DIR = "/app/wazuh_pipeline/ai_pending"
AI_INPUTS_DIR = "/app/wazuh_pipeline/ai_inputs"
POLL_INTERVAL_SECONDS = 2
SEVERITY_THRESHOLD = 3

# === FUNCTIONS ===

def trigger_processor(alert_id):
    try:
        result = os.system(f"python /app/process_single_alert.py {alert_id}")
        if result != 0:
            print(f"[!] Failed to trigger processor for alert {alert_id}")
        else:
            print(f"[+] Processed alert {alert_id} via processor script")
    except Exception as e:
        print(f"[!] Error running processor: {e}")

def process_alerts():
    # Skip if alerts.json is missing or empty
    if not os.path.exists(ALERTS_FILE) or os.path.getsize(ALERTS_FILE) == 0:
        print("[!] alerts.json is missing or empty — skipping")
        return

    last_id = 0
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, "r") as f:
                last_id = int(f.read().strip())
        except Exception:
            last_id = 0

    alerts = []
    try:
        with open(ALERTS_FILE, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    alerts.append(json.loads(line))
                except json.JSONDecodeError as e:
                    print(f"[!] Skipping malformed line: {e}")
    except Exception as e:
        print(f"[!] Failed to read alerts.json: {e}")
        return

    # Always copy alerts.json for backup/reference
    try:
        os.makedirs(AI_INPUTS_DIR, exist_ok=True)
        os.system(f"cp {ALERTS_FILE} {AI_INPUTS_DIR}/alerts.json")
        print(f"[+] Copied alerts.json → ai_inputs")
    except Exception as e:
        print(f"[!] Failed to copy alerts.json: {e}")

    new_alerts = [
        a for a in alerts
        if int(float(a.get("id", 0))) > last_id and int(a.get("rule", {}).get("level", 0)) >= SEVERITY_THRESHOLD
    ]

    if new_alerts:
        print(f"[+] Found {len(new_alerts)} new alerts above severity {SEVERITY_THRESHOLD}")
        os.makedirs(AI_PENDING_DIR, exist_ok=True)

        for a in new_alerts:
            aid = str(a["id"])
            pending_file = f"{AI_PENDING_DIR}/alert_{aid}.txt"
            try:
                with open(pending_file, "w") as f:
                    f.write(aid)
                print(f"[+] Queued alert {aid} → {pending_file}")
            except Exception as e:
                print(f"[!] Failed to write to pending file: {e}")
                continue

            # Trigger single alert processor
            trigger_processor(aid)
            time.sleep(0.5)

        # Update checkpoint
        max_id = max(int(float(a["id"])) for a in new_alerts)
        try:
            with open(CHECKPOINT_FILE, "w") as f:
                f.write(str(max_id))
            print(f"[+] Updated checkpoint → {CHECKPOINT_FILE}")
        except Exception as e:
            print(f"[!] Failed to write checkpoint: {e}")
    else:
        print("[~] No new high-severity alerts.")

# === MAIN LOOP ===
if __name__ == "__main__":
    print(f"[+] Starting watcher on {ALERTS_FILE}")
    print(f"[+] Polling every {POLL_INTERVAL_SECONDS} seconds...\n")
    while True:
        try:
            process_alerts()
            time.sleep(POLL_INTERVAL_SECONDS)
        except Exception as e:
            print(f"[!] Error in process_alerts(): {e}")
            time.sleep(5)
