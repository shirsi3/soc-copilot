import { useEffect, useState } from "react";
import { fetchAlerts, AlertSummary } from "../services/api";

export default function AlertsTable() {
  const [data, setData] = useState<AlertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const filtered = data.filter(a =>
    [a.alert_id, a.machine, a.opinion, a.mitigation, a.relevant_info]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  if (loading) return <div style={{ padding: 16 }}>Loading alerts…</div>;
  if (err) return <div style={{ padding: 16, color: "crimson" }}>Error: {err}</div>;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>SOC Co‑Pilot — Alerts</h1>
      <input
        placeholder="Filter by id, machine, opinion…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: 8, marginBottom: 12, width: "100%", maxWidth: 420 }}
      />
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <Th>Alert ID</Th>
              <Th>Machine</Th>
              <Th>Opinion</Th>
              <Th>Mitigation</Th>
              <Th>Relevant Info</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.alert_id}>
                <Td>{a.alert_id}</Td>
                <Td>{a.machine}</Td>
                <Td>{a.opinion}</Td>
                <Td>{a.mitigation}</Td>
                <Td>{a.relevant_info}</Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><Td colSpan={5}>No matches.</Td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>{children}</th>;
}
function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} style={{ borderBottom: "1px solid #eee", padding: 8, verticalAlign: "top" }}>{children}</td>;
}
