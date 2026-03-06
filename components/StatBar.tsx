interface StatBarProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

export default function StatBar({ label, value, sub, accent = "text-white/80" }: StatBarProps) {
  return (
    <div className="bg-[#111318] border border-white/[0.06] rounded-2xl px-5 py-4 flex flex-col gap-0.5">
      <p className="text-xs text-white/30 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
    </div>
  );
}
