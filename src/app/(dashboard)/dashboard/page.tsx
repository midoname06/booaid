"use client";
import { useEffect, useState } from "react";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { Loader2 } from "lucide-react";

type KPI = {
  agents: number; leads: number; conversations: number;
  bookings: number; messages: number; conversionRate: number;
};

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <p className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-3xl font-bold tracking-tight">{typeof value === "number" ? value.toLocaleString("it-IT") : value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--success)" }}>↑ {sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrCreateWorkspace().then(async wsId => {
      if (!wsId) { setLoading(false); return; }
      const res = await fetch(`/api/analytics?workspace_id=${wsId}`);
      if (res.ok) {
        const data = await res.json();
        setKpi(data.kpi);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Panoramica · ultimi 30 giorni</p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <Loader2 size={16} className="animate-spin" /> Caricamento...
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard value={kpi?.agents ?? 0}         label="Agenti creati" />
          <KpiCard value={kpi?.conversations ?? 0}  label="Conversazioni gestite" />
          <KpiCard value={kpi?.messages ?? 0}       label="Messaggi inviati" />
          <KpiCard value={kpi?.leads ?? 0}          label="Lead totali" />
          <KpiCard value={kpi?.bookings ?? 0}       label="Appuntamenti prenotati" />
          <KpiCard value={`${kpi?.conversionRate ?? 0}%`} label="Tasso conversione" />
        </div>
      )}
    </div>
  );
}
