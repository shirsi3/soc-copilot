FROM python:3.11-slim

WORKDIR /app
COPY . .

# Install system dependencies required for psycopg2
RUN apt-get update && apt-get install -y gcc libpq-dev build-essential

# Install Python dependencies
RUN pip install fastapi uvicorn psycopg2

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
