"use client";

interface CurrentQuest {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  status: "running" | "paused";
  priority: "critical" | "high" | "medium" | "low";
  startedAt: string;
  progress: number;
  tags: string[];
}

const priorityConfig = {
  critical: { text: "text-red-400", bar: "bg-red-400", badge: "text-red-400 bg-red-400/10 border-red-400/20" },
  high: { text: "text-orange-400", bar: "bg-orange-400", badge: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  medium: { text: "text-yellow-400", bar: "bg-yellow-400", badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  low: { text: "text-slate-400", bar: "bg-slate-400", badge: "text-slate-400 bg-slate-400/10 border-slate-400/20" },
};

function elapsedTime(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function CurrentQuestCard({ quest }: { quest: CurrentQuest }) {
  const cfg = priorityConfig[quest.priority];

  return (
    <div className="bg-[#111318] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Animated running indicator */}
            <span className="flex-shrink-0 relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs text-emerald-400 font-medium">Running</span>
          </div>
          <p className="text-sm font-medium text-white/85 leading-snug">{quest.title}</p>
        </div>
        <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${cfg.badge} capitalize`}>
          {quest.priority}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-white/30">Progress</span>
          <span className={`text-xs font-mono font-semibold ${cfg.text}`}>{quest.progress}%</span>
        </div>
        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${cfg.bar} transition-all duration-500`}
            style={{ width: `${quest.progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {quest.tags.map((tag) => (
            <span key={tag} className="text-xs text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-xs text-white/25">{quest.agentName}</p>
          <p className="text-xs font-mono text-white/30 mt-0.5">{elapsedTime(quest.startedAt)} elapsed</p>
        </div>
      </div>
    </div>
  );
}
