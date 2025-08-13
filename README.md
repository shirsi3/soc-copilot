# SOC Co-Pilot

SOC Co-Pilot is an AI-powered threat detection and response assistant designed to support Security Operations Center (SOC) analysts. This project integrates advanced log analysis, natural language processing, and AI enrichment to provide human-readable summaries and actionable recommendations for security alerts.

Built using Wazuh, FastAPI, PostgreSQL, React, and Ollama (Phi-3), SOC Co-Pilot bridges the gap between raw security logs and analyst-ready insights. It enhances situational awareness, speeds up triage, and promotes more consistent and informed decision-making within the SOC.

## Course Information

This is our demo for the course **SPR888 in IFS at Seneca College**. This Docker container represents a mock example of how we envision our capstone idea functioning.

---

## Virtual Machine Setup

### Ubuntu VM (SOC Co-Pilot + Wazuh Host)

| Component         | Specification       |
|------------------|---------------------|
| Memory           | 16 GB               |
| Processors       | 4                   |
| Hard Disk        | 60 GB               |
| Network Adapter  | NAT                 |
| OS               | Ubuntu 22.04+       |

### Kali Linux VM (Attacker)

| Component         | Specification       |
|------------------|---------------------|
| Memory           | 2 GB                |
| Processors       | 4                   |
| Hard Disk        | 80 GB               |
| Network Adapter  | NAT                 |
| OS               | Kali Linux (latest) |

---

## How to Install Wazuh (Outside Docker)

> Wazuh must be installed on the **host system**, outside the Docker environment. SOC Co-Pilot listens for alerts from this external Wazuh deployment.

### Installation Steps

```bash
# Download the Wazuh installation assistant
curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh

# Run the script to install Wazuh components (indexer, server, dashboard)
sudo bash ./wazuh-install.sh -a
```

After the installation completes, save the following:

- Wazuh Dashboard URL (e.g., `https://<your-server-ip>`)
- Default admin username
- Randomly generated password

---

## How to Set Up SOC Co-Pilot (Command by Command)

### 1. Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Docker and Docker Compose

```bash
sudo apt install -y docker.io docker-compose
```

### 3. Enable and start Docker

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

### 4. Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 5. Start Ollama in the background

```bash
ollama serve &
```

### 6. Pull the Phi-3 Mini model

```bash
ollama pull phi3:mini
```

### 7. Clone the SOC Co-Pilot repository

```bash
git clone https://github.com/shirsi3/soc-copilot.git
cd soc-copilot
```

### 8. Start Docker containers

```bash
docker compose up -d
```

### 9. (Optional) Test Ollama response

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "phi3:mini",
  "prompt": "Explain zero trust in cybersecurity.",
  "stream": false
}'
```

---

## Starting and Monitoring SOC Co-Pilot

### Start All Containers

```bash
docker compose up -d
```

### Check Logs for All Containers

```bash
docker compose logs -f
```

### Check Logs for a Specific Container

```bash
docker compose logs -f soc-copilot-backend
```

Replace `soc-copilot-backend` with:
- `soc-copilot-worker`
- `soc-copilot-frontend`
- `ollama`
- `postgres`

---

## Access Points

| Component              | URL                              | Description                                       |
|------------------------|-----------------------------------|---------------------------------------------------|
| SOC Co-Pilot Dashboard | http://localhost:8080             | Web interface for viewing enriched alerts         |
| FastAPI Swagger Docs   | http://localhost:8000/docs        | API documentation interface                       |
| FastAPI Alert API      | http://localhost:8000/alerts      | Raw JSON response of enriched alerts              |
| Ollama API             | http://localhost:11434            | AI model REST API                                 |
| Wazuh Dashboard        | https://<your-wazuh-server-ip>    | Wazuh dashboard (outside Docker)                  |

> Replace `localhost` with your VM’s IP address if accessing from another machine.

---

## Container Descriptions

- **`ollama`**  
  Runs the Phi-3 Mini AI model for enrichment tasks.

- **`soc-copilot-worker`**  
  Background processor that enriches alerts using Ollama and stores them in PostgreSQL.

- **`soc-copilot-backend`**  
  FastAPI backend exposing RESTful APIs like `/alerts`.

- **`soc-copilot-frontend`**  
  React + Vite dashboard to view enriched alerts.

- **`postgres`**  
  PostgreSQL database storing alerts, enrichment data, and system metadata.

