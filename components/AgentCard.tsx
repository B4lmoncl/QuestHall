"use client";

interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  status: "active" | "idle" | "error";
  avatar: string;
  color: string;
  description: string;
  tasksCompleted: number;
  uptime: string;
  lastSeen: string;
}

const statusConfig = {
  active: { label: "Active", dot: "bg-emerald-400", text: "text-emerald-400" },
  idle: { label: "Idle", dot: "bg-yellow-400", text: "text-yellow-400" },
  error: { label: "Error", dot: "bg-red-400 animate-pulse", text: "text-red-400" },
};

export default function AgentCard({ agent }: { agent: Agent }) {
  const st = statusConfig[agent.status];
  const lastSeen = new Date(agent.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="group relative bg-[#111318] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.14] transition-all duration-200 hover:shadow-[0_0_30px_rgba(0,0,0,0.4)]">
      {/* Subtle glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${agent.color}12 0%, transparent 60%)` }}
      />

      <div className="relative flex items-start gap-4">
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white/90 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${agent.color}cc, ${agent.color}66)` }}
        >
          {agent.avatar}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-white/90 truncate">{agent.name}</h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              <span className={`text-xs font-medium ${st.text}`}>{st.label}</span>
            </div>
          </div>
          <p className="text-xs text-white/40 mt-0.5">{agent.role}</p>
          <p className="text-xs text-white/30 mt-0.5 font-mono">{agent.model}</p>
        </div>
      </div>

      <p className="relative mt-3 text-xs text-white/40 leading-relaxed line-clamp-2">{agent.description}</p>

      <div className="relative mt-4 pt-4 border-t border-white/[0.05] grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-white/30">Completed</p>
          <p className="text-sm font-semibold text-white/70 mt-0.5">{agent.tasksCompleted}</p>
        </div>
        <div>
          <p className="text-xs text-white/30">Uptime</p>
          <p className="text-sm font-semibold text-white/70 mt-0.5">{agent.uptime}</p>
        </div>
        <div>
          <p className="text-xs text-white/30">Last seen</p>
          <p className="text-sm font-semibold text-white/70 mt-0.5">{lastSeen}</p>
        </div>
      </div>
    </div>
  );
}
