import { useState } from "react";
import { Cpu, LineChart, Settings, Search } from "lucide-react";
import AlertsView from "./components/AlertsView";

type TabKey = "alerts" | "explore" | "trends" | "settings";

export default function App() {
  const [tab, setTab] = useState<TabKey>("alerts");

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-bg/70 border-b border-stroke">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-lg">
              <Cpu className="h-5 w-5 text-bg" />
            </div>
            <h1 className="text-xl tracking-widest font-semibold">
              <span className="text-neutral-300">SOC </span>
              <span className="text-accent">CO</span>
              <span className="text-neutral-300"> </span>
              <span className="text-accent2">PILOT</span>
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <button
              className={`tab ${tab === "alerts" ? "tab-active" : ""}`}
              onClick={() => setTab("alerts")}
            >
              <Search className="h-4 w-4" /> Alerts
            </button>
            <button
              className={`tab ${tab === "explore" ? "tab-active" : ""}`}
              onClick={() => setTab("explore")}
            >
              <Search className="h-4 w-4" /> Explore
            </button>
            <button
              className={`tab ${tab === "trends" ? "tab-active" : ""}`}
              onClick={() => setTab("trends")}
            >
              <LineChart className="h-4 w-4" /> Trends
            </button>
            <button
              className={`tab ${tab === "settings" ? "tab-active" : ""}`}
              onClick={() => setTab("settings")}
            >
              <Settings className="h-4 w-4" /> Settings
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === "alerts" && <AlertsView />}

        {tab === "explore" && (
          <section className="card p-6">
            <h2 className="text-lg font-semibold mb-2">Explore</h2>
            <p className="text-neutral-400">
              Advanced query builder coming next. For now, use filters on the Alerts tab.
            </p>
          </section>
        )}

        {tab === "trends" && (
          <section className="card p-6">
            <h2 className="text-lg font-semibold mb-2">Trends</h2>
            <p className="text-neutral-400">
              Charts (alerts over time, top machines) will appear here.
            </p>
          </section>
        )}

        {tab === "settings" && (
          <section className="card p-6 space-y-3">
            <h2 className="text-lg font-semibold">Settings</h2>
            <div className="text-sm text-neutral-400">
              API Base:{" "}
              <span className="badge">
                {import.meta.env.VITE_API_BASE_URL || "/api"}
              </span>
            </div>
            <p className="text-neutral-400 text-sm">
              Theme: Dark. Auto‑refresh and presets coming next.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
