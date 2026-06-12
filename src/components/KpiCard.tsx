export default function KpiCard({ value, label, trend }: { value: string; label: string; trend?: string }) {
  return (
    <div className="rounded-2xl p-5 border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>{label}</div>
      {trend && <div className="text-xs mt-2" style={{ color: "var(--success)" }}>▲ {trend}</div>}
    </div>
  );
}
