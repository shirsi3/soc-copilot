#!/usr/bin/env python3
import json
import os
import requests
import sys
import psycopg2
import time

# === CONFIGURATION ===
ALERTS_FILE = "/var/ossec/logs/alerts/alerts.json"
OLLAMA_URL = "http://ollama:11434"
MODEL_NAME = "phi3:mini"

POSTGRES_HOST = "postgres"
POSTGRES_PORT = 5432
POSTGRES_DB = "soc_copilot"
POSTGRES_USER = "postgres"
POSTGRES_PASSWORD = "postgres"

MAX_DB_RETRIES = 10
RETRY_DELAY = 3  # seconds
# ======================

def read_alert(alert_id):
    with open(ALERTS_FILE) as f:
        for line in f:
            if not line.strip():
                continue
            try:
                alert = json.loads(line)
                if str(alert.get("id", "")) == alert_id:
                    return alert
            except json.JSONDecodeError:
                continue
    return None

def call_ollama(prompt):
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": MODEL_NAME, "prompt": prompt, "stream": False}
        )
        response.raise_for_status()
        result = response.json()
        return result.get("response", "No response field in Ollama reply.")
    except Exception as e:
        print(f"Error calling Ollama: {e}")
        return "ERROR"

def clean(text):
    return text.replace("\\n", " ").replace("\n", " ").replace("'", "''").strip()

def connect_to_postgres():
    for attempt in range(1, MAX_DB_RETRIES + 1):
        try:
            conn = psycopg2.connect(
                host=POSTGRES_HOST,
                port=POSTGRES_PORT,
                dbname=POSTGRES_DB,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD
            )
            print("Connected to PostgreSQL.")
            return conn
        except psycopg2.OperationalError as e:
            print(f"Attempt {attempt}: PostgreSQL not ready ({e})")
            time.sleep(RETRY_DELAY)
    print("Failed to connect to PostgreSQL after multiple retries.")
    return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: process_single_alert.py <alert_id>")
        sys.exit(1)

    alert_id = sys.argv[1]
    print(f"Processing alert {alert_id}")

    alert = read_alert(alert_id)
    if not alert:
        print(f"Alert {alert_id} not found.")
        sys.exit(1)

    prompt = f"""
You are a cybersecurity analyst. Analyze this alert and generate:

1. An opinion on what this alert means.
2. Recommended mitigation steps.
3. Any relevant info about the alert.
4. Identify the machine name involved.

Here is the alert JSON:
{json.dumps(alert, indent=2)}
    """

    ai_response = call_ollama(prompt)
    print(f"Ollama response:\n{ai_response}")

    parts = ai_response.strip().split("\n")
    opinion = clean(parts[0] if len(parts) > 0 else "")
    mitigation = clean(parts[1] if len(parts) > 1 else "")
    relevant_info = clean(parts[2] if len(parts) > 2 else "")
    machine = alert.get("agent", {}).get("name", "unknown")

    conn = connect_to_postgres()
    if not conn:
        print("Skipping DB insert due to connection failure.")
        sys.exit(1)

    try:
        cursor = conn.cursor()

        cursor.execute(f"SELECT 1 FROM alerts_summary WHERE alert_id = '{alert_id}'")
        if cursor.fetchone() is None:
            insert_sql = f"""
            INSERT INTO alerts_summary (alert_id, opinion, mitigation, relevant_info, machine) VALUES (
                '{alert_id}',
                '{opinion}',
                '{mitigation}',
                '{relevant_info}',
                '{machine}'
            );
            """.strip()
            cursor.execute(insert_sql)
            conn.commit()
            print("Inserted into PostgreSQL database.")
        else:
            print(f"Alert {alert_id} already exists. Skipping insert.")

    except Exception as e:
        print(f"Error inserting into PostgreSQL: {e}")
        conn.rollback()
    finally:
        if 'cursor' in locals():
            cursor.close()
        conn.close()
