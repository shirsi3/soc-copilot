import { useEffect, useMemo, useState } from "react";
import { fetchAlerts, AlertSummary } from "../services/api";
import { Download, RefreshCw, X } from "lucide-react";

export default function AlertsView() {
  const [data, setData] = useState<AlertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [machine, setMachine] = useState<string>("all");
  const [selected, setSelected] = useState<AlertSummary | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const alerts = await fetchAlerts();
      setData(alerts);
    } catch (e: any) {
      setErr(e?.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const machines = useMemo(() => {
    const set = new Set(data.map(d => d.machine).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [data]);

  const filtered = useMemo(() => data.filter(a => {
    const txt = [a.alert_id, a.machine, a.opinion, a.mitigation, a.relevant_info].join(" ").toLowerCase();
    const matchText = txt.includes(query.toLowerCase());
    const matchMachine = machine === "all" ? true : a.machine === machine;
    return matchText && matchMachine;
  }), [data, query, machine]);

  function exportCSV(rows: AlertSummary[]) {
    const headers = ["alert_id","machine","opinion","mitigation","relevant_info"];
    const csv = [headers.join(","), ...rows.map(r =>
      headers.map(h => JSON.stringify((r as any)[h] ?? "").replace(/\u2028|\u2029/g," ")).join(",")
    )].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "alerts.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input
            className="input"
            placeholder="Filter by id, machine, opinion…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select className="input sm:w-56" value={machine} onChange={e => setMachine(e.target.value)}>
            {machines.map(m => <option key={m} value={m}>{m === "all" ? "All machines" : m}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button className="btn" onClick={() => exportCSV(filtered)}>
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-4">
        {loading ? (
          <div className="text-neutral-400">Loading alerts…</div>
        ) : err ? (
          <div className="text-red-400">Error: {err}</div>
        ) : filtered.length === 0 ? (
          <div className="text-neutral-400">No matches.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="pr-4">Alert ID</th>
                  <th className="pr-4">Machine</th>
                  <th className="pr-4">Opinion</th>
                  <th className="pr-4">Mitigation</th>
                  <th>Relevant Info</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.alert_id} className="hover:bg-white/5 cursor-pointer"
                      onClick={() => setSelected(a)}>
                    <td className="pr-4"><span className="badge">{a.alert_id}</span></td>
                    <td className="pr-4">{a.machine}</td>
                    <td className="pr-4">{truncate(a.opinion)}</td>
                    <td className="pr-4">{truncate(a.mitigation)}</td>
                    <td>{truncate(a.relevant_info)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-panel border-l border-stroke p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-neutral-400">Alert</div>
                <div className="text-lg font-semibold">{selected.alert_id}</div>
              </div>
              <button className="btn" onClick={() => setSelected(null)}><X className="h-4 w-4" /> Close</button>
            </div>
            <div className="space-y-4">
              <Field label="Machine" value={selected.machine} />
              <Field label="Opinion" value={selected.opinion} />
              <Field label="Mitigation" value={selected.mitigation} />
              <Field label="Relevant Info" value={selected.relevant_info} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-neutral-400 mb-1">{label}</div>
      <div className="bg-black/20 rounded-xl border border-stroke p-3 leading-relaxed">
        {value || <span className="text-neutral-500">—</span>}
      </div>
    </div>
  );
}

function truncate(s: string, n = 140) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}
