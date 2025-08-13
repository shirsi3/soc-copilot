# ~/soc-copilot/worker/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY file_watcher.py .
COPY process_single_alert.py .

CMD ["python", "file_watcher.py"]
