"use client";

import { useState } from "react";

interface Quest {
  id: string;
  title: string;
  description?: string;
  why?: string;
  agentId: string | null;
  agentName: string | null;
  status: "pending" | "running" | "completed" | "failed";
  priority: "critical" | "high" | "medium" | "low";
  tags: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  progress: number;
  output?: string | null;
}

const priorityConfig = {
  critical: { color: "#ff4444", bg: "rgba(255,68,68,0.08)", border: "rgba(255,68,68,0.25)" },
  high:     { color: "#ff6633", bg: "rgba(255,102,51,0.08)", border: "rgba(255,102,51,0.25)" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)" },
  low:      { color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)" },
};

const statusConfig = {
  pending:   { label: "Pending",   color: "#eab308", dot: "#eab308" },
  running:   { label: "Running",   color: "#22c55e", dot: "#22c55e" },
  completed: { label: "Completed", color: "rgba(255,255,255,0.4)", dot: "#22c55e" },
  failed:    { label: "Failed",    color: "#ff4444", dot: "#ff4444" },
};

function elapsed(from: string | null): string {
  if (!from) return "—";
  const diff = Date.now() - new Date(from).getTime();
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (m > 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function QuestCard({ quest, compact = false }: { quest: Quest; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const p = priorityConfig[quest.priority] ?? priorityConfig.medium;
  const st = statusConfig[quest.status] ?? statusConfig.pending;
  const hasDetails = !!(quest.description || quest.why || quest.output);

  return (
    <div
      className="rounded-2xl transition-all duration-200"
      style={{
        background: "#111111",
        border: `1px solid rgba(255,68,68,0.2)`,
        boxShadow: quest.status === "running" ? "0 0 16px rgba(34,197,94,0.08)" : "none",
      }}
    >
      {/* Main row */}
      <div
        className={`flex items-start gap-3 p-4 ${hasDetails && !compact ? "cursor-pointer" : ""}`}
        onClick={() => hasDetails && !compact && setExpanded((v) => !v)}
      >
        {/* Status dot */}
        <div className="flex-shrink-0 mt-1">
          {quest.status === "running" ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: st.dot }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: st.dot }} />
            </span>
          ) : (
            <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ background: st.dot }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug" style={{ color: compact ? "rgba(255,255,255,0.6)" : "#e8e8e8" }}>
              {quest.title}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded capitalize"
                style={{ color: p.color, background: p.bg, border: `1px solid ${p.border}` }}
              >
                {quest.priority}
              </span>
              {hasDetails && !compact && (
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {expanded ? "▲" : "▼"}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-xs font-medium" style={{ color: st.color }}>{st.label}</span>
            {quest.agentName && (
              <>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{quest.agentName}</span>
              </>
            )}
            {quest.status === "running" && quest.startedAt && (
              <>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{elapsed(quest.startedAt)} elapsed</span>
              </>
            )}
            {quest.completedAt && (
              <>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {new Date(quest.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </>
            )}
            {quest.tags.map((tag) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded" style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)" }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Progress bar (running only) */}
          {quest.status === "running" && quest.progress > 0 && (
            <div className="mt-2">
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${quest.progress}%`, background: "linear-gradient(90deg, #ff4444, #ff6633)" }}
                />
              </div>
              <p className="text-xs mt-1 font-mono" style={{ color: "#ff6633" }}>{quest.progress}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div
          className="px-4 pb-4"
          style={{ borderTop: "1px solid rgba(255,68,68,0.1)" }}
        >
          <div className="pt-3 space-y-3">
            {quest.description && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(255,68,68,0.7)" }}>
                  What
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{quest.description}</p>
              </div>
            )}
            {quest.why && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(255,68,68,0.7)" }}>
                  Why
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{quest.why}</p>
              </div>
            )}
            {quest.output && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(255,68,68,0.7)" }}>
                  Output
                </p>
                <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {quest.output.length > 500 ? quest.output.slice(0, 500) + "…" : quest.output}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
