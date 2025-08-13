const baseURL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export type AlertSummary = {
  alert_id: string;
  opinion: string;
  mitigation: string;
  relevant_info: string;
  machine: string;
};

export async function fetchAlerts(): Promise<AlertSummary[]> {
  const res = await fetch(`${baseURL}/alerts`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
