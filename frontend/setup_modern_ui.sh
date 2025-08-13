#!/usr/bin/env bash
set -euo pipefail

# ===============================
# SOC Co‑Pilot Frontend Modern UI + Dockerization
# Run from repo root (where docker-compose.yml lives)
# ===============================

# ---- Helpers ----
have() { command -v "$1" >/dev/null 2>&1; }
ensure() { if ! have "$1"; then echo "Missing $1. Please install it."; exit 1; fi; }
exists() { [ -e "$1" ]; }

echo "==> Preflight checks"
ensure node
ensure npm

# Detect compose command (v2 preferred)
COMPOSE="docker compose"
if have docker-compose; then COMPOSE="docker-compose"; fi
ensure docker

# Ensure frontend dir exists
FE_DIR="frontend"
if ! exists "$FE_DIR"; then
  echo "Creating $FE_DIR (Vite React scaffold not found)."
  mkdir -p "$FE_DIR/src"
fi

cd "$FE_DIR"

# Detect TS or JS
EXT="jsx"
MAIN_FILE=""
if [ -f "../tsconfig.json" ] || [ -f "tsconfig.json" ]; then EXT="tsx"; fi
if [ -f "src/main.tsx" ]; then MAIN_FILE="src/main.tsx"; EXT="tsx"; fi
if [ -f "src/main.jsx" ]; then MAIN_FILE="src/main.jsx"; EXT="jsx"; fi

# Create basic package.json if missing (Vite style)
if ! exists package.json; then
cat > package.json <<'EOF'
{
  "name": "soc-copilot-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --host --port 4173"
  },
  "dependencies": {},
  "devDependencies": {}
}
EOF
fi

# Create vite config if missing
if ! exists vite.config.ts && ! exists vite.config.js; then
cat > vite.config.ts <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } }
})
EOF
fi

# Install deps
echo "==> Installing UI dependencies"
npm i axios lucide-react
npm i -D vite @vitejs/plugin-react tailwindcss postcss autoprefixer

# Tailwind config
npx tailwindcss init -p >/dev/null 2>&1 || true
cat > tailwind.config.js <<'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: { extend: {} },
  plugins: []
}
EOF

# Global CSS
mkdir -p src
cat > src/index.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light dark; }
EOF

# Ensure index.html exists
if ! exists index.html; then
cat > index.html <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SOC Co‑Pilot</title>
  </head>
  <body class="bg-neutral-50 dark:bg-neutral-950">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF
  # Adjust entry for TSX
  if [ "$EXT" = "tsx" ]; then
    sed -i 's/main.jsx/main.tsx/' index.html
  fi
fi

# Create main file if missing
if [ -z "${MAIN_FILE}" ]; then
  MAIN_FILE="src/main.$EXT"
  cat > "$MAIN_FILE" <<'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
EOF
fi

# Ensure CSS import
if ! grep -q "import './index.css'" "$MAIN_FILE"; then
  sed -i "1i import './index.css'" "$MAIN_FILE"
fi

# Install shadcn/ui (idempotent)
echo "==> Setting up shadcn/ui"
npx shadcn@latest init -y || true
npx shadcn@latest add button card badge input select dropdown-menu avatar || true

# AlertsPage
mkdir -p src/pages
cat > "src/pages/AlertsPage.$EXT" <<'EOF'
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Bell, Shield, Search, Filter, TriangleAlert, CheckCircle2, XCircle, Clock, Cpu, ChevronDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const severityStyles = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const statusIcon = {
  open: <TriangleAlert className="h-4 w-4" />,
  investigating: <Clock className="h-4 w-4" />,
  mitigated: <CheckCircle2 className="h-4 w-4" />,
  closed: <XCircle className="h-4 w-4" />,
};

function inferSeverity(opinion) {
  const text = (opinion || "").toLowerCase();
  if (/critical|ransom|exploit|exfil|domain admin/.test(text)) return "critical";
  if (/high|escalation|persistence|c2|command and control/.test(text)) return "high";
  if (/medium|suspicious|anomal/.test(text)) return "medium";
  return "low";
}

const Navbar = ({ onRefresh }) => (
  <header className="sticky top-0 z-40 w-full backdrop-blur bg-white/70 dark:bg-neutral-900/70 border-b">
    <div className="mx-auto max-w-7xl px-4 flex h-16 items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">SOC Co‑Pilot</span>
          <span className="text-base font-semibold">Alerts</span>
        </div>
        <nav className="hidden md:flex ml-8 gap-1">
          <Button variant="ghost" className="rounded-xl">Alerts</Button>
          <Button variant="ghost" className="rounded-xl">Rules</Button>
          <Button variant="ghost" className="rounded-xl">Dashboards</Button>
          <Button variant="ghost" className="rounded-xl">Settings</Button>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" className="rounded-xl" onClick={onRefresh}>
          <Bell className="mr-2 h-4 w-4" /> Refresh
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback>SH</AvatarFallback>
        </Avatar>
      </div>
    </div>
  </header>
);

const AlertCard = ({ alert }) => {
  const sev = alert.severity || inferSeverity(alert.opinion);
  return (
    <Card className="rounded-2xl hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Cpu className="h-4 w-4" />
          <span className="truncate">{alert.alert_id || "Alert"}</span>
        </CardTitle>
        <div className="flex gap-2">
          <Badge className={`rounded-full text-xs ${severityStyles[sev]}`}>{sev.toUpperCase()}</Badge>
          <Badge variant="outline" className="rounded-full text-xs">{alert.machine || "unknown-host"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alert.opinion && <p className="text-sm line-clamp-3">{alert.opinion}</p>}
        {alert.relevant_info && <p className="text-sm line-clamp-4">{alert.relevant_info}</p>}
        {alert.mitigation && <p className="text-sm font-medium">{alert.mitigation}</p>}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs">
            {statusIcon[alert.status || "open"]}
            <span>{alert.status || "open"}</span>
            <span>• {new Date(alert.timestamp || Date.now()).toLocaleString()}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-xl">
                Actions <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Mark Investigating</DropdownMenuItem>
              <DropdownMenuItem>Mark Mitigated</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Close</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AlertsPage() {
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");

  async function fetchAlerts() {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/alerts`);
      const normalized = (data || []).map((a, idx) => ({
        ...a,
        id: a.alert_id || idx,
        status: a.status || "open",
        timestamp: a.timestamp || Date.now() - idx * 1000 * 60 * 7,
        severity: a.severity || inferSeverity(a.opinion),
      }));
      setAlerts(normalized);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAlerts(); }, []);

  const filtered = useMemo(() => {
    let out = alerts;
    const qq = q.trim().toLowerCase();
    if (qq) {
      out = out.filter((a) =>
        [a.alert_id, a.opinion, a.mitigation, a.relevant_info, a.machine]
          .filter(Boolean)
          .some((t) => String(t).toLowerCase().includes(qq))
      );
    }
    if (severity !== "all") out = out.filter((a) => (a.severity || "").toLowerCase() === severity);
    if (status !== "all") out = out.filter((a) => (a.status || "open").toLowerCase() === status);

    if (sort === "newest") out = [...out].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    else if (sort === "oldest") out = [...out].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    else if (sort === "severity") {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      out = [...out].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
    }
    return out;
  }, [alerts, q, severity, status, sort]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <Navbar onRefresh={fetchAlerts} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Alert Inbox</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Triage, search, and act on AI‑enriched Wazuh alerts.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="rounded-xl" onClick={fetchAlerts}><Bell className="mr-2 h-4 w-4" />Sync</Button>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search alerts, host, text…"
                  className="pl-9 rounded-xl"
                />
              </div>
              <Button variant="outline" className="rounded-xl">
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="mitigated">Mitigated</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="severity">Severity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <section className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl h-48 animate-pulse bg-neutral-200/60 dark:bg-neutral-800/60" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-10 text-center text-neutral-500 dark:text-neutral-400">
                No alerts match your filters.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((a) => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
EOF

# Basic App that renders the page
cat > "src/App.$EXT" <<EOF
import React from 'react'
import AlertsPage from './pages/AlertsPage'

export default function App() { return <AlertsPage /> }
EOF

# Ensure .env exists for Vite build-time API base
if ! exists .env; then
cat > .env <<'EOF'
VITE_API_BASE=http://localhost:8000
EOF
fi

echo "==> Final npm install"
npm install

# ---- Dockerfile & .dockerignore ----
echo "==> Writing Dockerfile (+ .dockerignore) for frontend"
cat > Dockerfile <<'EOF'
# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY vite.config.* ./
COPY tsconfig*.json ./
COPY . .
RUN npm ci || npm install
RUN npm run build

# --- Runtime stage (Nginx) ---
FROM nginx:alpine
# Copy build artefacts
COPY --from=builder /app/dist /usr/share/nginx/html
# Replace default nginx config for single-page app routing and caching
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

cat > .dockerignore <<'EOF'
node_modules
dist
.git
.gitignore
Dockerfile
npm-debug.log
EOF

# nginx.conf for SPA + caching
cat > nginx.conf <<'EOF'
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache immutable assets
  location ~* \.(?:js|css|woff2|png|jpg|jpeg|gif|svg)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }
}
EOF

cd ..

# ---- docker-compose.yml update (add 'frontend' service) ----
echo "==> Updating docker-compose.yml (adding 'frontend' service if missing)"
if ! exists docker-compose.yml; then
  # Create minimal compose if missing
  cat > docker-compose.yml <<'EOF'
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      # If your API is another compose service named 'api', switch to http://api:8000 before building
      - VITE_API_BASE=http://localhost:8000
    restart: unless-stopped
EOF
else
  # If frontend service exists, skip; else append
  if ! grep -qE '^\s*frontend:\s*$' docker-compose.yml; then
    # Append a safely-indented service block
    cat >> docker-compose.yml <<'EOF'

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE=http://localhost:8000
    restart: unless-stopped
EOF
  else
    echo "   'frontend' service already present. Not duplicating."
  fi
fi

echo "==> All done.

Next steps:
  1) If your FastAPI is part of compose and its service name is 'api',
     set VITE_API_BASE to 'http://api:8000' in frontend/.env, then rebuild.
       echo \"VITE_API_BASE=http://api:8000\" > frontend/.env

  2) Build & run the frontend:
       $COMPOSE build frontend
       $COMPOSE up -d frontend
       open http://localhost:3000

  3) If you change .env or code, rebuild:
       $COMPOSE build frontend && $COMPOSE up -d frontend
"
