"use client";

import { useEffect, useState, useCallback } from "react";
import AgentCard from "@/components/AgentCard";
import StatBar from "@/components/StatBar";

interface Agent {
  id: string;
  name: string;
  status: "online" | "working" | "idle" | "offline";
  platform: string | null;
  uptime: number;
  currentJobDuration: number;
  jobsCompleted: number;
  revenue: number;
  health: "ok" | "needs_checkin" | "broken";
  lastUpdate: string | null;
  role?: string;
  avatar?: string;
  color?: string;
  pendingCommands?: number;
}

async function fetchAgents(): Promise<Agent[]> {
  try {
    const r = await fetch(`/api/agents`, { signal: AbortSignal.timeout(2000) });
    if (r.ok) return r.json();
  } catch { /* API not running */ }
  try {
    const r = await fetch(`/data/agents.json`);
    if (r.ok) {
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    }
  } catch { /* ignore */ }
  return [];
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [apiLive, setApiLive] = useState(false);

  const refresh = useCallback(async () => {
    const a = await fetchAgents();
    setAgents(a);
    try {
      const r = await fetch(`/api/health`, { signal: AbortSignal.timeout(1500) });
      setApiLive(r.ok);
    } catch { setApiLive(false); }
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(() => {
      if (lastRefresh) setSecondsAgo(Math.floor((Date.now() - lastRefresh.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastRefresh]);

  const activeCount = agents.filter((a) => a.status === "online" || a.status === "working").length;
  const workingCount = agents.filter((a) => a.status === "working").length;
  const idleCount = agents.filter((a) => a.status === "idle").length;
  const totalRevenue = agents.reduce((sum, a) => sum + (a.revenue ?? 0), 0);
  const totalJobs = agents.reduce((sum, a) => sum + (a.jobsCompleted ?? 0), 0);
  const needsAttention = agents.filter((a) => a.health === "needs_checkin" || a.health === "broken").length;

  const lastUpdatedStr = lastRefresh
    ? secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`
    : "—";

  return (
    <div className="min-h-screen" style={{ background: "#1a1a1a", color: "#e8e8e8" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{
          background: "rgba(26,26,26,0.97)",
          borderBottom: "1px solid rgba(255,68,68,0.15)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs"
              style={{ background: "linear-gradient(135deg, #ff4444, #cc2200)", boxShadow: "0 0 12px rgba(255,68,68,0.35)" }}
            >
              OC
            </div>
            <span className="font-semibold text-sm tracking-tight" style={{ color: "#e8e8e8" }}>
              Agent Dashboard
            </span>
            <span
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{ color: "#ff4444", background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.18)" }}
            >
              Revenue Team
            </span>
          </div>

          <div className="flex items-center gap-4">
            {needsAttention > 0 && (
              <div
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                {needsAttention} need attention
              </div>
            )}
            <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{
                  background: apiLive ? "#22c55e" : "rgba(255,255,255,0.15)",
                  boxShadow: apiLive ? "0 0 6px #22c55e" : "none",
                }}
              />
              {apiLive ? "API Live" : "Static"}
            </div>
            <div className="text-xs font-mono flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
              <span
                className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
                style={{ background: "rgba(255,102,51,0.5)" }}
              />
              Updated {lastUpdatedStr}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#f0f0f0" }}>
            Operations Center
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            Live revenue agent overview
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBar
            label="Agents"
            value={loading ? "—" : agents.length}
            sub={`${activeCount} online`}
          />
          <StatBar
            label="Working"
            value={loading ? "—" : workingCount}
            sub={`${idleCount} idle`}
            accent="#ff6633"
          />
          <StatBar
            label="Jobs Done"
            value={loading ? "—" : totalJobs}
            sub="all agents"
            accent="rgba(255,255,255,0.6)"
          />
          <StatBar
            label="Revenue"
            value={loading ? "—" : `$${totalRevenue.toFixed(2)}`}
            sub="total generated"
            accent="#22c55e"
          />
        </div>

        {/* Agent Roster */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                Agent Roster
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                {loading ? "Loading…" : agents.length > 0 ? `${agents.length} agents registered` : "Waiting for agents to check in"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#22c55e" }} />
                Online
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#ff6633" }} />
                Working
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#eab308" }} />
                Idle
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "rgba(255,255,255,0.2)" }} />
                Offline
              </span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : agents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
            </div>
          ) : (
            <EmptyState
              message="No agents have checked in yet."
              sub={`POST /api/agent/:name/status  →  { status, platform, uptime, jobsCompleted, revenue, health }`}
            />
          )}
        </section>
      </main>

      <footer className="mt-12 py-6" style={{ borderTop: "1px solid rgba(255,68,68,0.07)" }}>
        <div
          className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          <span>OpenClaw · Agent Dashboard · Revenue Team</span>
          <div className="flex items-center gap-4" style={{ color: "rgba(255,68,68,0.35)" }}>
            <span>GET /api/agents</span>
            <span>POST /api/agent/:name/status</span>
            <span>GET /api/agent/:name</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="rounded-xl p-8 text-center" style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>{message}</p>
      {sub && <p className="text-xs mt-2 font-mono" style={{ color: "rgba(255,68,68,0.3)" }}>{sub}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl animate-pulse"
      style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.05)", height: 260 }}
    />
  );
}
