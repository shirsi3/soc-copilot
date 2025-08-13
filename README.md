# SOC Co-Pilot
SOC Co-Pilot is an AI-powered threat detection and response assistant designed to support Security Operations Center (SOC) analysts. This project integrates advanced log analysis, natural language processing, and MITRE AI enrichment to provide human-readable summaries and actionable recommendations for security alerts.
Built using Wazuh, FastAPI, PostgreSQL, React, and Ollama (Phi-3), SOC Co-Pilot bridges the gap between raw security logs and analyst-ready insights. It enhances situational awareness, speeds up triage, and promotes more consistent and informed decision-making within the SOC.

## This is our demo for our course SPR888 in IFS at Seneca College, and this Docker container is a mock example of how we want our capstone idea to work

SOC Co-Pilot is an AI-powered threat detection and response assistant designed to support Security Operations Center (SOC) analysts. This project integrates advanced log analysis, natural language processing, and MITRE ATT&CK-based enrichment to provide human-readable summaries and actionable recommendations for security alerts.

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

> **Note:** Wazuh must be installed on the host system (outside the Docker environment). SOC Co-Pilot listens for alerts from this external Wazuh deployment.

### Installation Steps

1. Download the Wazuh installation assistant:

```bash
curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh
sudo bash ./wazuh-install.sh -a


# ------------------------------------------
# SOC Co-Pilot Setup Script (Ubuntu Host)
# ------------------------------------------

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install -y docker.io docker-compose

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Install Ollama (AI model backend)
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama in the background
ollama serve &

# Pull the Phi-3 Mini model
ollama pull phi3:mini

# Clone the SOC Co-Pilot repository
git clone https://github.com/shirsi3/soc-copilot.git
cd soc-copilot

# Start all containers
docker compose up -d

# Optional: Test Ollama response
curl http://localhost:11434/api/generate -d '{
  "model": "phi3:mini",
  "prompt": "Explain zero trust in cybersecurity.",
  "stream": false
}'


## Starting and Monitoring SOC Co-Pilot

### Start All Containers

From the root of the `soc-copilot` directory:

```bash
docker compose up -d

docker compose logs -f

When you run `docker compose up -d`, the following services will be launched:

## Access Points

After setup, use the following URLs to access different parts of the system:

| Component              | URL                              | Description                                       |
|------------------------|-----------------------------------|---------------------------------------------------|
| SOC Co-Pilot Dashboard | http://localhost:8080             | Main web interface for viewing enriched alerts    |
| FastAPI Swagger Docs   | http://localhost:8000/docs        | Interactive documentation for API testing         |
| FastAPI Alert API      | http://localhost:8000/alerts      | Raw JSON output of all enriched alerts            |
| Ollama API             | http://localhost:11434            | REST API used by the worker to query the AI model |
| Wazuh Dashboard        | https://<your-wazuh-server-ip>    | External Wazuh dashboard (installed separately)   |

> Replace `localhost` with your VM’s IP address if accessing remotely.

- **`ollama`**  
  The AI model backend that runs **Phi-3 Mini**. This container handles all natural language processing tasks, such as summarizing alerts, mapping to MITRE ATT&CK, and generating mitigation advice.

- **`soc-copilot-worker`**  
  A background processor that listens for new alerts, enriches them using the Ollama AI model, and stores the results in the PostgreSQL database. It automates the alert triage process.

- **`soc-copilot-backend`**  
  A **FastAPI** service that exposes RESTful endpoints to interact with alerts and enrichment results. It acts as the bridge between the frontend, the database, and the AI worker.

- **`soc-copilot-frontend`**  
  A **React + Vite** dashboard that provides a clean web interface to visualize, filter, and understand enriched security alerts.

- **`postgres`**  
  A **PostgreSQL** database that stores all alert data, enrichment summaries, mitigation steps, and any metadata used by the system.


