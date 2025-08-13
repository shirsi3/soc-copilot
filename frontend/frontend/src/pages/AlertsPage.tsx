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
