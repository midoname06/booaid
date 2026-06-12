"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Bot, CheckCircle2, PauseCircle, FileEdit, Loader2, Save, ChevronRight, Sparkles } from "lucide-react";
import type { ChatMessage } from "@/lib/ai/provider";
import { buildSystemPrompt, type AgentConfig } from "@/lib/ai/prompts";
import { getOrCreateWorkspace } from "@/lib/workspace";

type Agent = {
  id: string;
  name: string;
  type: string;
  goal: string;
  status: "draft" | "active" | "paused";
  channels: string[];
  tone: string;
  language: string;
  config: {
    behavior_rules?: string[];
    qualifying_questions?: string[];
    company?: { name: string; services: string[]; hours: string };
  };
};

const EMPTY_FORM = {
  name: "",
  type: "receptionist" as const,
  tone: "Cordiale e professionale",
  goal: "",
  language: "it-IT",
  channels: [] as string[],
  company_name: "",
  company_services: "",
  company_hours: "",
  rules: "",
  questions: "",
};

const STATUS_BADGE: Record<string, { label: string; color: string; Icon: any }> = {
  active: { label: "Attivo", color: "var(--success)", Icon: CheckCircle2 },
  paused: { label: "In pausa", color: "var(--warning)", Icon: PauseCircle },
  draft: { label: "Bozza", color: "var(--muted)", Icon: FileEdit },
};

const CHANNELS = ["webchat", "whatsapp", "sms", "email"];
const TYPES = [
  { value: "receptionist", label: "Receptionist" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Supporto" },
  { value: "reactivation", label: "Riattivazione" },
];

export default function AgentsPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const loadAgents = useCallback(async (wsId: string) => {
    const res = await fetch(`/api/agents?workspace_id=${wsId}`);
    if (res.ok) setAgents(await res.json());
  }, []);

  useEffect(() => {
    getOrCreateWorkspace().then(wsId => {
      if (wsId) { setWorkspaceId(wsId); loadAgents(wsId); }
    });
  }, [loadAgents]);

  function selectAgent(agent: Agent) {
    setSelected(agent);
    setForm({
      name: agent.name,
      type: agent.type as any,
      tone: agent.tone ?? "",
      goal: agent.goal ?? "",
      language: agent.language ?? "it-IT",
      channels: agent.channels ?? [],
      company_name: agent.config?.company?.name ?? "",
      company_services: agent.config?.company?.services?.join(", ") ?? "",
      company_hours: agent.config?.company?.hours ?? "",
      rules: agent.config?.behavior_rules?.join("\n") ?? "",
      questions: agent.config?.qualifying_questions?.join("\n") ?? "",
    });
    setMessages([{ role: "assistant", content: `Ciao! Sono ${agent.name}. Come posso aiutarti?` }]);
    setShowForm(true);
  }

  function newAgent() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setMessages([{ role: "assistant", content: "Ciao! Come posso aiutarti?" }]);
    setShowForm(true);
  }

  function buildConfig(): AgentConfig {
    return {
      name: form.name || "Agente",
      type: form.type,
      tone: form.tone,
      goal: form.goal,
      language: form.language,
      company: {
        name: form.company_name,
        services: form.company_services.split(",").map(s => s.trim()).filter(Boolean),
        hours: form.company_hours,
      },
      qualifyingQuestions: form.questions.split("\n").map(s => s.trim()).filter(Boolean),
      behaviorRules: form.rules.split("\n").map(s => s.trim()).filter(Boolean),
      bookingConditions: "Proponi uno slot solo se disponibile da almeno 2 ore",
    };
  }

  async function save() {
    if (!workspaceId || !form.name.trim()) return;
    setSaving(true); setSaveError("");
    const payload = {
      workspace_id: workspaceId,
      name: form.name,
      type: form.type,
      tone: form.tone,
      goal: form.goal,
      language: form.language,
      channels: form.channels,
      status: selected?.status ?? "draft",
      config: {
        company: {
          name: form.company_name,
          services: form.company_services.split(",").map(s => s.trim()).filter(Boolean),
          hours: form.company_hours,
        },
        behavior_rules: form.rules.split("\n").map(s => s.trim()).filter(Boolean),
        qualifying_questions: form.questions.split("\n").map(s => s.trim()).filter(Boolean),
      },
    };

    const res = await fetch("/api/agents", {
      method: selected ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selected ? { id: selected.id, ...payload } : payload),
    });

    if (!res.ok) {
      const err = await res.json();
      setSaveError(err.error ?? "Errore salvataggio");
    } else {
      const saved = await res.json();
      if (!selected) setSelected(saved);
      await loadAgents(workspaceId);
    }
    setSaving(false);
  }

  async function enhance() {
    setEnhancing(true);
    try {
      const res = await fetch("/api/agents/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          company_name: form.company_name,
          company_services: form.company_services,
          company_hours: form.company_hours,
          goal: form.goal,
          tone: form.tone,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({
          ...prev,
          goal: data.goal || prev.goal,
          tone: data.tone || prev.tone,
          rules: data.rules || prev.rules,
          questions: data.questions || prev.questions,
        }));
      }
    } finally {
      setEnhancing(false);
    }
  }

  async function sendChat() {
    if (!input.trim()) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: input }];
    setMessages(next); setInput(""); setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentConfig: buildConfig(), messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.text || "(nessuna risposta)" }]);
    } finally { setChatLoading(false); }
  }

  const f = (k: keyof typeof EMPTY_FORM, v: string | string[]) =>
    setForm(prev => ({ ...prev, [k]: v }));
  const toggleChannel = (ch: string) =>
    f("channels", form.channels.includes(ch) ? form.channels.filter(c => c !== ch) : [...form.channels, ch]);

  return (
    <div className="flex gap-6 h-full">
      {/* Lista agenti */}
      <div className="w-60 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold">Agenti</h1>
          <button onClick={newAgent}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-white"
            style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
            <Plus size={13} /> Nuovo
          </button>
        </div>

        {agents.length === 0 && (
          <div className="text-center py-8 text-sm rounded-2xl border"
            style={{ color: "var(--muted)", borderColor: "var(--border)", background: "var(--surface)" }}>
            <Bot size={26} className="mx-auto mb-2 opacity-40" />
            Nessun agente.<br />Creane uno!
          </div>
        )}

        {agents.map(agent => {
          const badge = STATUS_BADGE[agent.status] ?? STATUS_BADGE.draft;
          const { Icon } = badge;
          const isActive = selected?.id === agent.id;
          return (
            <button key={agent.id} onClick={() => selectAgent(agent)}
              className="text-left rounded-2xl p-4 border transition w-full"
              style={{
                borderColor: isActive ? "var(--primary)" : "var(--border)",
                background: isActive ? "rgba(124,58,237,.1)" : "var(--surface)",
              }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold truncate">{agent.name}</span>
                <ChevronRight size={13} style={{ color: "var(--muted)" }} />
              </div>
              <div className="flex items-center gap-1.5">
                <Icon size={11} style={{ color: badge.color }} />
                <span className="text-xs" style={{ color: badge.color }}>{badge.label}</span>
              </div>
              {agent.channels?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {agent.channels.map((ch: string) => (
                    <span key={ch} className="text-xs px-1.5 py-0.5 rounded-md"
                      style={{ background: "var(--surface-2)", color: "var(--muted)" }}>{ch}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Area principale */}
      {!showForm ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4"
              style={{ background: "rgba(124,58,237,.12)" }}>
              <Bot size={32} style={{ color: "var(--primary)" }} />
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Seleziona un agente o creane uno nuovo
            </p>
            <button onClick={newAgent}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
              <Plus size={14} className="inline mr-1" />Crea il primo agente
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid lg:grid-cols-2 gap-6 min-h-0">
          {/* Form */}
          <div className="rounded-2xl border overflow-y-auto p-6 flex flex-col gap-5"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{selected ? "Modifica agente" : "Nuovo agente"}</h2>
              <button
                type="button"
                onClick={enhance}
                disabled={enhancing || !form.name.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition disabled:opacity-40"
                style={{
                  borderColor: "var(--primary)",
                  color: enhancing ? "var(--muted)" : "var(--primary)",
                  background: enhancing ? "transparent" : "rgba(124,58,237,.08)",
                }}
                title="Compila automaticamente obiettivo, tono, regole e domande con l'AI"
              >
                {enhancing
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Sparkles size={12} />}
                {enhancing ? "Miglioramento..." : "Migliora con AI"}
              </button>
            </div>

            <Field label="Nome agente">
              <input value={form.name} onChange={e => f("name", e.target.value)}
                placeholder="es. Foued Receptionist"
                className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent"
                style={{ borderColor: "var(--border)" }} />
            </Field>

            <Field label="Tipo">
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => f("type", t.value)}
                    className="py-2 rounded-xl text-sm font-medium border transition"
                    style={{
                      borderColor: form.type === t.value ? "var(--primary)" : "var(--border)",
                      background: form.type === t.value ? "rgba(124,58,237,.15)" : "transparent",
                      color: form.type === t.value ? "var(--text)" : "var(--muted)",
                    }}>{t.label}</button>
                ))}
              </div>
            </Field>

            <Field label="Obiettivo">
              <input value={form.goal} onChange={e => f("goal", e.target.value)}
                placeholder="es. Prenotare appuntamenti riempiendo le fasce libere"
                className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent"
                style={{ borderColor: "var(--border)" }} />
            </Field>

            <Field label="Tono">
              <input value={form.tone} onChange={e => f("tone", e.target.value)}
                placeholder="es. Cordiale e professionale"
                className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent"
                style={{ borderColor: "var(--border)" }} />
            </Field>

            <Field label="Canali">
              <div className="flex gap-2 flex-wrap">
                {CHANNELS.map(ch => (
                  <button key={ch} onClick={() => toggleChannel(ch)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium border transition"
                    style={{
                      borderColor: form.channels.includes(ch) ? "var(--accent)" : "var(--border)",
                      background: form.channels.includes(ch) ? "rgba(6,182,212,.12)" : "transparent",
                      color: form.channels.includes(ch) ? "var(--accent)" : "var(--muted)",
                    }}>{ch}</button>
                ))}
              </div>
            </Field>

            <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--muted)" }}>CONTESTO AZIENDA</p>
              <div className="flex flex-col gap-3">
                <Field label="Nome azienda">
                  <input value={form.company_name} onChange={e => f("company_name", e.target.value)}
                    placeholder="es. Barbiere Foued"
                    className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent"
                    style={{ borderColor: "var(--border)" }} />
                </Field>
                <Field label="Servizi (separati da virgola)">
                  <input value={form.company_services} onChange={e => f("company_services", e.target.value)}
                    placeholder="es. taglio, barba, colore"
                    className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent"
                    style={{ borderColor: "var(--border)" }} />
                </Field>
                <Field label="Orari">
                  <input value={form.company_hours} onChange={e => f("company_hours", e.target.value)}
                    placeholder="es. Mar-Sab 9-19"
                    className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent"
                    style={{ borderColor: "var(--border)" }} />
                </Field>
              </div>
            </div>

            <Field label="Regole comportamento (una per riga)">
              <textarea value={form.rules} onChange={e => f("rules", e.target.value)}
                rows={3} placeholder={"Rispondi in italiano\nNon promettere sconti"}
                className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent resize-none"
                style={{ borderColor: "var(--border)" }} />
            </Field>

            <Field label="Domande di qualifica (una per riga)">
              <textarea value={form.questions} onChange={e => f("questions", e.target.value)}
                rows={3} placeholder={"Per quale servizio?\nGiorno o fascia preferita?"}
                className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent resize-none"
                style={{ borderColor: "var(--border)" }} />
            </Field>

            {saveError && (
              <p className="text-xs px-3 py-2 rounded-xl"
                style={{ background: "rgba(239,68,68,.12)", color: "var(--danger)" }}>{saveError}</p>
            )}

            <button onClick={save} disabled={saving || !form.name.trim()}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Salvataggio..." : selected ? "Salva modifiche" : "Crea agente"}
            </button>
          </div>

          {/* Chat preview */}
          <div className="rounded-2xl border flex flex-col"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2"
              style={{ borderColor: "var(--border)" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
              <span className="text-sm font-medium">Anteprima dal vivo</span>
              <span className="text-xs ml-auto" style={{ color: "var(--muted)" }}>Claude · AI reale</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-0" style={{ maxHeight: "calc(100vh - 280px)" }}>
              {messages.map((m, i) => (
                <div key={i} className="max-w-[80%] px-3 py-2 rounded-2xl text-sm"
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    background: m.role === "user" ? "var(--primary)" : "var(--surface-2)",
                  }}>{m.content}</div>
              ))}
              {chatLoading && (
                <div className="flex gap-1 px-3 py-2 rounded-2xl self-start"
                  style={{ background: "var(--surface-2)" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: "var(--muted)", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !chatLoading && sendChat()}
                placeholder="Scrivi un messaggio di test..."
                className="flex-1 px-3 py-2 rounded-xl text-sm border bg-transparent"
                style={{ borderColor: "var(--border)" }} />
              <button onClick={sendChat} disabled={chatLoading}
                className="px-4 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
                Invia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</label>
      {children}
    </div>
  );
}
