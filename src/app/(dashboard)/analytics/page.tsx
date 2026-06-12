"use client";
import { useState, useEffect } from "react";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { Target, MessageSquare, Users, Calendar, Bot, TrendingUp, Loader2 } from "lucide-react";

type KPI = {
  agents: number; leads: number; conversations: number;
  bookings: number; messages: number; conversionRate: number;
  bookedLeads: number; qualifiedLeads: number;
};
type DayPoint = { date: string; count: number };
type StagePoint = { stage: string; count: number };
type Booking = { start_at: string; service: string; status: string };

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  new:       { label: "Nuovo",       color: "var(--accent)"   },
  contacted: { label: "Contattato",  color: "var(--warning)"  },
  qualified: { label: "Qualificato", color: "var(--primary)"  },
  booked:    { label: "Prenotato",   color: "var(--success)"  },
  lost:      { label: "Perso",       color: "var(--danger)"   },
};

export default function AnalyticsPage() {
  const [data, setData] = useState<{
    kpi: KPI;
    dailyConversations: DayPoint[];
    leadsByStage: StagePoint[];
    recentBookings: Booking[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrCreateWorkspace().then(async wsId => {
      if (!wsId) return;
      const res = await fetch(`/api/analytics?workspace_id=${wsId}`);
      if (res.ok) setData(await res.json());
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--muted)" }} />
      </div>
    );
  }

  if (!data) return null;
  const { kpi, dailyConversations, leadsByStage, recentBookings } = data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Analytics</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Ultimi 30 giorni · dati reali dal tuo workspace</p>
      </div>

      {/* ── Metrica principale ── */}
      <div className="rounded-2xl p-6 mb-6 flex items-center gap-6"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,.15), rgba(6,182,212,.1))", border: "1px solid rgba(124,58,237,.3)" }}>
        <div className="w-14 h-14 rounded-2xl grid place-items-center shrink-0"
          style={{ background: "rgba(124,58,237,.2)" }}>
          <Target size={28} style={{ color: "var(--primary)" }} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--primary)" }}>
            Obiettivo principale
          </p>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-black tracking-tight">{kpi.bookings}</span>
            <span className="text-lg font-semibold mb-1" style={{ color: "var(--muted)" }}>prenotazioni confermate</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: "rgba(255,255,255,.1)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(kpi.conversionRate, 100)}%`, background: "var(--primary)" }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{kpi.conversionRate}% conversione</span>
          </div>
        </div>
      </div>

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users,          label: "Lead totali",        value: kpi.leads,         color: "var(--accent)"   },
          { icon: MessageSquare,  label: "Conversazioni",      value: kpi.conversations, color: "var(--warning)"  },
          { icon: Bot,            label: "Agenti attivi",      value: kpi.agents,        color: "var(--primary)"  },
          { icon: TrendingUp,     label: "Messaggi inviati",   value: kpi.messages,      color: "var(--success)"  },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</span>
            </div>
            <span className="text-3xl font-bold">{value.toLocaleString("it-IT")}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Grafico conversazioni ── */}
        <div className="lg:col-span-2 rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h3 className="font-semibold mb-4 text-sm">Conversazioni — ultimi 30 giorni</h3>
          <ConversationsChart data={dailyConversations} />
        </div>

        {/* ── Lead per stage ── */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h3 className="font-semibold mb-4 text-sm">Lead per stage</h3>
          {leadsByStage.every(s => s.count === 0) ? (
            <div className="flex items-center justify-center h-32 text-sm" style={{ color: "var(--muted)" }}>Nessun lead ancora</div>
          ) : (
            <div className="flex flex-col gap-2">
              {leadsByStage.map(({ stage, count }) => {
                const info = STAGE_LABELS[stage];
                const max = Math.max(...leadsByStage.map(s => s.count), 1);
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: info.color }}>{info.label}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${(count / max) * 100}%`, background: info.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Riepilogo funnel */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>FUNNEL</p>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span style={{ color: "var(--muted)" }}>Qualificati</span>
                <span className="font-semibold" style={{ color: "var(--primary)" }}>{kpi.qualifiedLeads}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted)" }}>Prenotati</span>
                <span className="font-semibold" style={{ color: "var(--success)" }}>{kpi.bookedLeads}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted)" }}>Conversione</span>
                <span className="font-semibold" style={{ color: "var(--primary)" }}>{kpi.conversionRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Prenotazioni recenti ── */}
      {recentBookings.length > 0 && (
        <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
            <Calendar size={15} style={{ color: "var(--success)" }} /> Prenotazioni ultimi 7 giorni
          </h3>
          <div className="flex flex-col gap-2">
            {recentBookings.map((b, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}>
                <div>
                  <span className="text-sm font-medium">{b.service}</span>
                  <span className="text-xs ml-2" style={{ color: "var(--muted)" }}>
                    {new Date(b.start_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(34,197,94,.12)", color: "var(--success)" }}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Grafico SVG conversazioni ─────────────────────────────────────────────────

function ConversationsChart({ data }: { data: DayPoint[] }) {
  const w = 560; const h = 120; const pad = { t: 10, b: 24, l: 8, r: 8 };
  const points = data.slice(-30);
  const max = Math.max(...points.map(p => p.count), 1);
  const xs = (i: number) => pad.l + (i / (points.length - 1 || 1)) * (w - pad.l - pad.r);
  const ys = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);

  const polyline = points.map((p, i) => `${xs(i)},${ys(p.count)}`).join(" ");
  const area = `${xs(0)},${ys(0)} ${polyline} ${xs(points.length - 1)},${ys(0)}`;

  const hasData = points.some(p => p.count > 0);

  // Mostra etichette ogni 7 giorni
  const labels = points.filter((_, i) => i % 7 === 0 || i === points.length - 1);

  return (
    <div>
      {!hasData ? (
        <div className="flex items-center justify-center h-32 text-sm" style={{ color: "var(--muted)" }}>
          Nessuna conversazione ancora
        </div>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#grad)" />
          <polyline points={polyline} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
          {points.map((p, i) => p.count > 0 && (
            <circle key={i} cx={xs(i)} cy={ys(p.count)} r="3" fill="var(--primary)" />
          ))}
          {labels.map((p, i) => (
            <text key={i} x={xs(points.indexOf(p))} y={h - 2}
              textAnchor="middle" fontSize="9" fill="var(--muted)">
              {p.date.slice(5)}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
