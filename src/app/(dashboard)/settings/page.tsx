"use client";
import { useState, useEffect, Suspense } from "react";
import {
  Calendar, CheckCircle2, XCircle, Loader2, ExternalLink,
  Mail, Phone, MessageSquare, Send,
} from "lucide-react";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { useSearchParams } from "next/navigation";

type Integration = { provider: string; status: string };
type ProviderStatus = { email: boolean; sms: boolean; whatsapp: boolean };

function SettingsContent() {
  const searchParams = useSearchParams();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<"connected" | "error" | null>(null);
  const [testState, setTestState] = useState<Record<string, "idle" | "loading" | "ok" | "error">>({});
  const [testTo, setTestTo] = useState({ email: "", sms: "", whatsapp: "" });

  useEffect(() => {
    if (searchParams.get("connected") === "google") setBanner("connected");
    if (searchParams.get("error") === "google") setBanner("error");
  }, [searchParams]);

  useEffect(() => {
    getOrCreateWorkspace().then(async wsId => {
      if (!wsId) return;
      setWorkspaceId(wsId);
      const [intRes, msgRes] = await Promise.all([
        fetch(`/api/integrations?workspace_id=${wsId}`),
        fetch("/api/messaging/status"),
      ]);
      if (intRes.ok) setIntegrations(await intRes.json());
      if (msgRes.ok) setProviderStatus(await msgRes.json());
      setLoading(false);
    });
  }, []);

  const googleStatus = integrations.find(i => i.provider === "google_calendar")?.status ?? "disconnected";
  const isGoogleConnected = googleStatus === "connected";

  function connectGoogle() {
    if (!workspaceId) return;
    window.location.href = `/api/integrations/google?workspace_id=${workspaceId}`;
  }

  async function testChannel(channel: "email" | "sms" | "whatsapp") {
    const to = testTo[channel];
    if (!to.trim()) return;
    setTestState(s => ({ ...s, [channel]: "loading" }));
    try {
      const res = await fetch("/api/messaging/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, to }),
      });
      setTestState(s => ({ ...s, [channel]: res.ok ? "ok" : "error" }));
    } catch {
      setTestState(s => ({ ...s, [channel]: "error" }));
    }
    setTimeout(() => setTestState(s => ({ ...s, [channel]: "idle" })), 3000);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Impostazioni</h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>Gestisci integrazioni e provider di messaggistica.</p>

      {banner === "connected" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
          style={{ background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.25)" }}>
          <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
          <span className="text-sm" style={{ color: "var(--success)" }}>Google Calendar connesso!</span>
        </div>
      )}
      {banner === "error" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)" }}>
          <XCircle size={16} style={{ color: "var(--danger)" }} />
          <span className="text-sm" style={{ color: "var(--danger)" }}>Errore durante la connessione. Riprova.</span>
        </div>
      )}

      {/* ── Google Calendar ──────────────────────── */}
      <Section title="Integrazioni" subtitle="Connetti account esterni per prenotazioni e sincronizzazione.">
        <IntegrationRow
          icon={<Calendar size={20} style={{ color: "#EA4335" }} />}
          iconBg="rgba(234,67,53,.12)"
          label="Google Calendar"
          desc="Prenotazioni reali, disponibilità, sync eventi."
          connected={isGoogleConnected}
          loading={loading}
          onConnect={connectGoogle}
          onReconnect={connectGoogle}
        />
      </Section>

      {/* ── Messaggistica ────────────────────────── */}
      <Section title="Messaggistica" subtitle="Provider per email, SMS e WhatsApp nelle sequenze follow-up.">

        <MessagingRow
          icon={<Mail size={18} />}
          label="Email — Resend"
          channel="email"
          placeholder="test@esempio.com"
          configured={providerStatus?.email ?? false}
          loading={loading}
          envVars={["RESEND_API_KEY", "EMAIL_FROM"]}
          testState={testState["email"] ?? "idle"}
          testTo={testTo.email}
          onTestToChange={v => setTestTo(p => ({ ...p, email: v }))}
          onTest={() => testChannel("email")}
        />

        <div className="border-t" style={{ borderColor: "var(--border)" }} />

        <MessagingRow
          icon={<MessageSquare size={18} />}
          label="SMS — Twilio"
          channel="sms"
          placeholder="+39 333 1234567"
          configured={providerStatus?.sms ?? false}
          loading={loading}
          envVars={["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_SMS_FROM"]}
          testState={testState["sms"] ?? "idle"}
          testTo={testTo.sms}
          onTestToChange={v => setTestTo(p => ({ ...p, sms: v }))}
          onTest={() => testChannel("sms")}
        />

        <div className="border-t" style={{ borderColor: "var(--border)" }} />

        <MessagingRow
          icon={<Phone size={18} />}
          label="WhatsApp — Twilio"
          channel="whatsapp"
          placeholder="+39 333 1234567"
          configured={providerStatus?.whatsapp ?? false}
          loading={loading}
          envVars={["TWILIO_WHATSAPP_FROM"]}
          testState={testState["whatsapp"] ?? "idle"}
          testTo={testTo.whatsapp}
          onTestToChange={v => setTestTo(p => ({ ...p, whatsapp: v }))}
          onTest={() => testChannel("whatsapp")}
        />
      </Section>

      {/* ── Variabili env ────────────────────────── */}
      <div className="mt-4 rounded-xl p-4 text-xs" style={{ background: "var(--surface)", color: "var(--muted)" }}>
        <p className="font-semibold mb-2" style={{ color: "var(--text)" }}>Variabili .env.local richieste</p>
        {[
          "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI",
          "RESEND_API_KEY, EMAIL_FROM",
          "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM, TWILIO_WHATSAPP_FROM",
          "QUEUE_PROCESS_SECRET  (opzionale, protegge /api/queue/process)",
        ].map(v => (
          <p key={v} className="font-mono mt-1">{v}</p>
        ))}
      </div>
    </div>
  );
}

// ─── Componenti helper ────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden mb-6" style={{ borderColor: "var(--border)" }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{subtitle}</p>
      </div>
      <div style={{ background: "var(--surface)" }}>{children}</div>
    </div>
  );
}

function IntegrationRow({ icon, iconBg, label, desc, connected, loading, onConnect, onReconnect }: {
  icon: React.ReactNode; iconBg: string; label: string; desc: string;
  connected: boolean; loading: boolean; onConnect: () => void; onReconnect: () => void;
}) {
  return (
    <div className="px-6 py-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: iconBg }}>{icon}</div>
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {loading ? <Loader2 size={16} className="animate-spin" style={{ color: "var(--muted)" }} /> :
          connected ? (
            <>
              <StatusBadge ok />
              <button onClick={onReconnect} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                <ExternalLink size={11} /> Riconnetti
              </button>
            </>
          ) : (
            <button onClick={onConnect}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
              <ExternalLink size={14} /> Connetti
            </button>
          )}
      </div>
    </div>
  );
}

function MessagingRow({ icon, label, channel, placeholder, configured, loading, envVars, testState, testTo, onTestToChange, onTest }: {
  icon: React.ReactNode; label: string; channel: string; placeholder: string;
  configured: boolean; loading: boolean; envVars: string[];
  testState: "idle" | "loading" | "ok" | "error";
  testTo: string; onTestToChange: (v: string) => void; onTest: () => void;
}) {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg grid place-items-center"
            style={{ background: configured ? "rgba(34,197,94,.12)" : "var(--surface-2)", color: configured ? "var(--success)" : "var(--muted)" }}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {loading ? "..." : configured ? "Configurato" : `Manca: ${envVars.join(", ")}`}
            </p>
          </div>
        </div>
        {!loading && <StatusBadge ok={configured} />}
      </div>

      {/* Test rapido */}
      <div className="flex gap-2 mt-2">
        <input
          value={testTo}
          onChange={e => onTestToChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-xl text-xs border bg-transparent"
          style={{ borderColor: "var(--border)" }}
        />
        <button
          onClick={onTest}
          disabled={testState === "loading" || !testTo.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border disabled:opacity-40 transition"
          style={{
            borderColor: testState === "ok" ? "var(--success)" : testState === "error" ? "var(--danger)" : "var(--border)",
            color: testState === "ok" ? "var(--success)" : testState === "error" ? "var(--danger)" : "var(--muted)",
          }}>
          {testState === "loading" ? <Loader2 size={12} className="animate-spin" /> :
           testState === "ok" ? <CheckCircle2 size={12} /> :
           testState === "error" ? <XCircle size={12} /> :
           <Send size={12} />}
          {testState === "ok" ? "Inviato!" : testState === "error" ? "Errore" : "Test"}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: ok ? "var(--success)" : "var(--border)" }} />
      <span className="text-xs font-medium" style={{ color: ok ? "var(--success)" : "var(--muted)" }}>
        {ok ? "Attivo" : "Non configurato"}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  return <Suspense><SettingsContent /></Suspense>;
}
