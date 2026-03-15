"use client";

import type { LeaderboardEntry, Agent, User } from "@/app/types";
import { getLbLevel } from "@/app/utils";

const agentMetaLb: Record<string, { avatar: string; color: string }> = {
  nova:  { avatar: "NO", color: "#8b5cf6" },
  hex:   { avatar: "HX", color: "#10b981" },
  echo:  { avatar: "EC", color: "#ef4444" },
  pixel: { avatar: "PX", color: "#f59e0b" },
  atlas: { avatar: "AT", color: "#6366f1" },
  lyra:  { avatar: "LY",  color: "#e879f9" },
  forge: { avatar: "FG",  color: "#f59e0b" },
};

const RANK_ICONS = ["/images/icons/ui-rank-gold.png", "/images/icons/ui-rank-silver.png", "/images/icons/ui-rank-bronze.png"];
const RankMedal = ({ rank }: { rank: number }) => rank <= 3
  ? <img src={RANK_ICONS[rank - 1]} alt={`#${rank}`} width={24} height={24} style={{ imageRendering: "auto" as const }} />
  : <span>#{rank}</span>;

// ─── Forge Temperature tiers ─────────────────────────────────────────────────

const FORGE_TIERS = [
  { min: 0,   label: "Cold",      color: "#4b5563" },
  { min: 20,  label: "Smoldering", color: "#78716c" },
  { min: 40,  label: "Warming",   color: "#b45309" },
  { min: 60,  label: "Burning",   color: "#ea580c" },
  { min: 80,  label: "Blazing",   color: "#f97316" },
  { min: 100, label: "White-hot", color: "#e0f0ff" },
];

function getForgeTier(temp: number) {
  for (let i = FORGE_TIERS.length - 1; i >= 0; i--) {
    if (temp >= FORGE_TIERS[i].min) return FORGE_TIERS[i];
  }
  return FORGE_TIERS[0];
}

// ─── Extended entry type for player mode ─────────────────────────────────────

type PlayerEntry = LeaderboardEntry & {
  classId?: string | null;
  forgeTemp?: number;
  gold?: number;
  companion?: { type: string; name: string; emoji: string } | null;
  earnedAchievements?: unknown[];
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function LeaderboardView({ entries, agents, mode = "agents", users = [], classes = [] }: {
  entries: LeaderboardEntry[];
  agents: Agent[];
  mode?: "agents" | "players";
  users?: User[];
  classes?: { id: string; fantasy: string; icon: string }[];
}) {
  const classMap = new Map(classes.map(c => [c.id, c]));
  const agentIdSet = new Set(agents.map(a => a.id));

  // Build user lookup for player mode (to get extra fields not on LeaderboardEntry)
  const userMap = new Map(users.map(u => [u.id, u]));

  let merged: PlayerEntry[];
  if (mode === "players") {
    merged = users
      .filter(u => !agentIdSet.has(u.id))
      .map((u) => ({
        rank: 0,
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        color: u.color,
        xp: u.xp ?? 0,
        questsCompleted: u.questsCompleted ?? 0,
        classId: u.classId ?? null,
        forgeTemp: u.forgeTemp ?? 0,
        gold: u.gold ?? u.currencies?.gold ?? 0,
        companion: u.companion ?? null,
        earnedAchievements: u.earnedAchievements ?? [],
      }))
      .sort((a, b) => b.xp - a.xp || b.questsCompleted - a.questsCompleted)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  } else {
    const agentEntries = entries.filter(e => agentIdSet.has(e.id));
    merged = (agentEntries.length > 0 ? agentEntries : agents.map((a) => ({
      rank: 0,
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      color: a.color,
      xp: a.xp ?? 0,
      questsCompleted: a.questsCompleted ?? 0,
    }))).sort((a, b) => b.xp - a.xp || b.questsCompleted - a.questsCompleted).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  if (merged.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>{mode === "players" ? "No players registered yet." : "No agents registered yet."}</p>
      </div>
    );
  }

  const top3 = merged.slice(0, 3);
  const isPlayerMode = mode === "players";

  return (
    <div className="space-y-6">
      {/* ── Podium ── */}
      <div className="flex items-end justify-center gap-4">
        {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry) => {
          const rank = entry.rank;
          const heights: Record<number, string> = { 1: "h-32", 2: "h-24", 3: "h-20" };
          const podiumHeightClass = heights[rank] ?? "h-16";
          const meta = agentMetaLb[entry.id?.toLowerCase()] ?? { avatar: entry.avatar ?? entry.id?.slice(0, 2).toUpperCase() ?? "??", color: entry.color ?? "#666" };
          const color = entry.color ?? meta.color;
          const lvl = getLbLevel(entry.xp);
          const cls = isPlayerMode && entry.classId ? classMap.get(entry.classId) : null;
          const forge = isPlayerMode ? getForgeTier(entry.forgeTemp ?? 0) : null;
          return (
            <div key={entry.id} className="flex flex-col items-center gap-2" style={{ minWidth: 100 }}>
              <div className="text-lg"><RankMedal rank={rank} /></div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, boxShadow: `0 6px 20px ${color}60` }}
              >
                {entry.avatar ?? meta.avatar}
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-xs font-bold" style={{ color: "#f0f0f0" }}>{entry.name}</p>
                {cls && <p className="text-xs" style={{ color: "rgba(167,139,250,0.7)", fontSize: 10 }}>{cls.icon} {cls.fantasy}</p>}
                <p className="text-xs" style={{ color: lvl.color }}>{lvl.name}</p>
                <div className="flex items-center justify-center gap-2 mt-0.5">
                  <span className="text-xs font-mono font-bold" style={{ color: "#a855f7" }}>{entry.xp} XP</span>
                  {isPlayerMode && <span className="text-xs font-mono font-bold" style={{ color: "#fbbf24" }}>{entry.gold ?? 0}g</span>}
                </div>
                {forge && (
                  <p className="text-xs font-semibold" style={{ color: forge.color, fontSize: 10 }}>{forge.label}</p>
                )}
              </div>
              <div
                className={`w-full rounded-t-lg flex items-center justify-center ${podiumHeightClass}`}
                style={{ background: `linear-gradient(180deg, ${color}20 0%, ${color}08 100%)`, border: `1px solid ${color}30`, borderBottom: "none" }}
              >
                <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>#{rank}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Player Cards List ── */}
      <div className="space-y-2">
        {merged.map((entry) => {
          const meta = agentMetaLb[entry.id?.toLowerCase()] ?? { avatar: entry.avatar ?? entry.id?.slice(0, 2).toUpperCase() ?? "??", color: entry.color ?? "#666" };
          const color = entry.color ?? meta.color;
          const lvl = getLbLevel(entry.xp);
          const isTop = entry.rank <= 3;
          const cls = isPlayerMode && entry.classId ? classMap.get(entry.classId) : null;
          const forge = isPlayerMode ? getForgeTier(entry.forgeTemp ?? 0) : null;
          const forgeTemp = entry.forgeTemp ?? 0;
          const achievementCount = entry.earnedAchievements?.length ?? 0;

          return (
            <div
              key={entry.id}
              className="rounded-xl px-4 py-3"
              style={{
                background: isTop ? `linear-gradient(135deg, ${color}0a, ${color}04)` : "#1a1a1a",
                border: isTop ? `1px solid ${color}25` : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Row 1: Rank + Avatar + Name/Class + Level */}
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className="w-8 flex-shrink-0 text-center">
                  <span className="text-sm font-bold" style={{ color: entry.rank <= 3 ? ["#f59e0b", "#9ca3af", "#cd7f32"][entry.rank - 1] : "rgba(255,255,255,0.25)" }}>
                    <RankMedal rank={entry.rank} />
                  </span>
                </div>

                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, color: "#fff" }}
                >
                  {entry.avatar ?? meta.avatar}
                </div>

                {/* Name + Class */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold truncate" style={{ color: "#f0f0f0" }}>{entry.name}</p>
                    {isPlayerMode && cls && (
                      <span className="text-xs flex-shrink-0" style={{ color: "rgba(167,139,250,0.7)", fontSize: 10 }}>{cls.icon} {cls.fantasy}</span>
                    )}
                    {isPlayerMode && !cls && (
                      <span className="text-xs flex-shrink-0 italic" style={{ color: "rgba(255,255,255,0.15)", fontSize: 10 }}>No Class</span>
                    )}
                  </div>
                  {/* Level */}
                  <p className="text-xs font-medium" style={{ color: lvl.color }}>{lvl.name}</p>
                </div>

                {/* XP + Gold (desktop) */}
                <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-mono font-bold" style={{ color: "#a855f7" }}>{entry.xp} XP</span>
                  {isPlayerMode && <span className="text-xs font-mono font-bold" style={{ color: "#fbbf24" }}>{entry.gold ?? 0}g</span>}
                  <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{entry.questsCompleted} Quests</span>
                </div>
              </div>

              {/* Row 2: Stats bar (player mode) */}
              {isPlayerMode && (
                <div className="flex items-center gap-3 mt-2 ml-[76px] flex-wrap">
                  {/* XP + Gold (mobile) */}
                  <div className="flex sm:hidden items-center gap-2">
                    <span className="text-xs font-mono font-bold" style={{ color: "#a855f7" }}>{entry.xp} XP</span>
                    <span className="text-xs font-mono font-bold" style={{ color: "#fbbf24" }}>{entry.gold ?? 0}g</span>
                    <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{entry.questsCompleted} Q</span>
                  </div>

                  {/* Forge Temperature bar */}
                  {forge && (
                    <div className="flex items-center gap-1.5">
                      <div className="rounded-full overflow-hidden" style={{ width: 48, height: 6, background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(forgeTemp, 4)}%`, background: forge.color, transition: "width 0.3s" }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: forge.color, fontSize: 10 }}>{forge.label}</span>
                    </div>
                  )}

                  {/* Companion */}
                  {entry.companion?.name && (
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
                      {entry.companion.emoji} {entry.companion.name}
                    </span>
                  )}

                  {/* Achievements */}
                  {achievementCount > 0 && (
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
                      {achievementCount} Achievement{achievementCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}

              {/* Row 2: Agents mode — simple XP bar */}
              {!isPlayerMode && (
                <div className="mt-1.5 ml-[76px]">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, background: "rgba(255,255,255,0.06)", maxWidth: 120 }}>
                      <div className="h-full rounded-full" style={{ width: `${merged[0]?.xp ? (entry.xp / merged[0].xp) * 100 : 0}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
                    </div>
                    <div className="flex sm:hidden items-center gap-2">
                      <span className="text-xs font-mono font-bold" style={{ color: "#a855f7" }}>{entry.xp} XP</span>
                      <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{entry.questsCompleted} Q</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
