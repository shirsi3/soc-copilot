from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import psycopg2
import os

app = FastAPI()

# PostgreSQL configuration from environment
DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "soc_copilot")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres")

class AlertSummary(BaseModel):
    alert_id: str
    opinion: str
    mitigation: str
    relevant_info: str
    machine: str

@app.get("/alerts", response_model=list[AlertSummary])
def get_alerts():
    conn = None
    cursor = None
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        cursor = conn.cursor()
        cursor.execute("SELECT alert_id, opinion, mitigation, relevant_info, machine FROM alerts_summary ORDER BY alert_id DESC;")
        rows = cursor.fetchall()
        return [
            AlertSummary(
                alert_id=row[0],
                opinion=row[1],
                mitigation=row[2],
                relevant_info=row[3],
                machine=row[4]
            ) for row in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
