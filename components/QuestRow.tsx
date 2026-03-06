"use client";

interface Quest {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  status: "completed" | "failed";
  priority: "critical" | "high" | "medium" | "low";
  completedAt: string;
  durationMs: number;
  tokensUsed: number;
  tags: string[];
  error?: string;
}

const priorityConfig = {
  critical: "text-red-400 bg-red-400/10 border-red-400/20",
  high: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  low: "text-slate-400 bg-slate-400/10 border-slate-400/20",
};

function formatDuration(ms: number): string {
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function QuestRow({ quest }: { quest: Quest }) {
  const time = new Date(quest.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="group flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-0">
      {/* Status icon */}
      <div className="flex-shrink-0 mt-0.5">
        {quest.status === "completed" ? (
          <div className="w-5 h-5 rounded-full bg-emerald-400/15 flex items-center justify-center">
            <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-red-400/15 flex items-center justify-center">
            <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-white/80 font-medium leading-snug truncate">{quest.title}</p>
            {quest.error && (
              <p className="text-xs text-red-400/70 mt-0.5 truncate">{quest.error}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-xs text-white/30">{quest.agentName}</span>
              <span className="text-white/20 text-xs">·</span>
              {quest.tags.map((tag) => (
                <span key={tag} className="text-xs text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${priorityConfig[quest.priority]} capitalize`}>
              {quest.priority}
            </span>
            <span className="text-xs text-white/25 font-mono">{time}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 hidden sm:flex items-center gap-4 text-right">
        <div>
          <p className="text-xs text-white/25">Duration</p>
          <p className="text-xs font-mono text-white/50">{formatDuration(quest.durationMs)}</p>
        </div>
        <div>
          <p className="text-xs text-white/25">Tokens</p>
          <p className="text-xs font-mono text-white/50">{formatTokens(quest.tokensUsed)}</p>
        </div>
      </div>
    </div>
  );
}
