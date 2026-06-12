"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2,
  Play, Pause, Zap, Clock, MessageSquare, Mail, Phone, Globe,
} from "lucide-react";
import { getOrCreateWorkspace } from "@/lib/workspace";

// ─── Tipi ────────────────────────────────────────────────────────────────────

type Step = {
  id: string;
  sequence_id: string;
  position: number;
  delay_minutes: number;
  channel: string;
  message: string;
};

type Sequence = {
  id: string;
  name: string;
  trigger_type: string;
  status: string;
  sequence_steps?: { count: number }[];
};

// ─── Config ───────────────────────────────────────────────────────────────────

const TRIGGERS: { key: string; label: string; desc: string }[] = [
  { key: "lead_created",      label: "Lead creato",        desc: "Parte quando un nuovo lead entra in pipeline" },
  { key: "lead_contacted",    label: "Lead contattato",    desc: "Parte quando lo stage passa a Contattato" },
  { key: "lead_qualified",    label: "Lead qualificato",   desc: "Parte quando lo stage passa a Qualificato" },
  { key: "booking_confirmed", label: "Prenotazione fatta", desc: "Parte dopo una prenotazione confermata" },
  { key: "manual",            label: "Manuale",            desc: "Si attiva manualmente dal profilo lead" },
];

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", Icon: Phone,        color: "var(--success)"  },
  { key: "sms",      label: "SMS",      Icon: MessageSquare, color: "var(--warning)"  },
  { key: "email",    label: "Email",    Icon: Mail,          color: "var(--primary)"  },
  { key: "webchat",  label: "Webchat",  Icon: Globe,         color: "var(--accent)"   },
];

function delayLabel(minutes: number): string {
  if (minutes === 0) return "Subito";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${minutes / 60} ore`;
  return `${minutes / 1440} giorni`;
}

const DELAY_PRESETS = [
  { label: "Subito",    value: 0 },
  { label: "15 min",   value: 15 },
  { label: "1 ora",    value: 60 },
  { label: "3 ore",    value: 180 },
  { label: "1 giorno", value: 1440 },
  { label: "3 giorni", value: 4320 },
];

// ─── Componente principale ────────────────────────────────────────────────────

export default function SequencesPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selected, setSelected] = useState<Sequence | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState("lead_created");

  const loadSequences = useCallback(async (wsId: string) => {
    setLoading(true);
    const res = await fetch(`/api/sequences?workspace_id=${wsId}`);
    if (res.ok) setSequences(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    getOrCreateWorkspace().then(wsId => {
      if (wsId) { setWorkspaceId(wsId); loadSequences(wsId); }
    });
  }, [loadSequences]);

  async function openSequence(seq: Sequence) {
    setSelected(seq);
    setStepsLoading(true);
    const res = await fetch(`/api/sequences/steps?sequence_id=${seq.id}`);
    if (res.ok) setSteps(await res.json());
    setStepsLoading(false);
  }

  async function createSequence() {
    if (!workspaceId || !newName.trim()) return;
    const res = await fetch("/api/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, name: newName, trigger_type: newTrigger, status: "draft" }),
    });
    if (res.ok) {
      const seq = await res.json();
      setShowNew(false);
      setNewName("");
      await loadSequences(workspaceId);
      openSequence(seq);
    }
  }

  async function toggleStatus() {
    if (!selected) return;
    const newStatus = selected.status === "active" ? "paused" : "active";
    await fetch("/api/sequences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, status: newStatus }),
    });
    const updated = { ...selected, status: newStatus };
    setSelected(updated);
    setSequences(prev => prev.map(s => s.id === selected.id ? updated : s));
  }

  async function deleteSequence(id: string) {
    await fetch(`/api/sequences?id=${id}`, { method: "DELETE" });
    if (selected?.id === id) { setSelected(null); setSteps([]); }
    if (workspaceId) await loadSequences(workspaceId);
  }

  function addStep() {
    if (!selected) return;
    const newStep: Step = {
      id: `new-${Date.now()}`,
      sequence_id: selected.id,
      position: steps.length,
      delay_minutes: steps.length === 0 ? 0 : 1440,
      channel: "whatsapp",
      message: "",
    };
    setSteps(prev => [...prev, newStep]);
  }

  function updateStep(idx: number, patch: Partial<Step>) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const next = [...steps];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= steps.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setSteps(next.map((s, i) => ({ ...s, position: i })));
  }

  async function removeStep(idx: number) {
    const step = steps[idx];
    if (!step.id.startsWith("new-")) {
      await fetch(`/api/sequences/steps?id=${step.id}`, { method: "DELETE" });
    }
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, position: i })));
  }

  async function saveSteps() {
    if (!selected) return;
    setSaving(true);
    for (let i = 0; i < steps.length; i++) {
      const s = { ...steps[i], position: i };
      if (s.id.startsWith("new-")) {
        const res = await fetch("/api/sequences/steps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sequence_id: selected.id, position: s.position, delay_minutes: s.delay_minutes, channel: s.channel, message: s.message }),
        });
        if (res.ok) {
          const saved = await res.json();
          setSteps(prev => prev.map((step, idx) => idx === i ? { ...saved } : step));
        }
      } else {
        await fetch("/api/sequences/steps", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: s.id, position: s.position, delay_minutes: s.delay_minutes, channel: s.channel, message: s.message }),
        });
      }
    }
    setSaving(false);
  }

  const triggerLabel = (key: string) => TRIGGERS.find(t => t.key === key)?.label ?? key;

  return (
    <div className="flex gap-6 h-full">
      {/* Lista sequenze */}
      <div className="w-64 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold">Follow-up</h1>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-white"
            style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
            <Plus size={13} /> Nuova
          </button>
        </div>

        {showNew && (
          <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "var(--primary)", background: "rgba(124,58,237,.06)" }}>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Nome sequenza..." className="input text-sm" autoFocus />
            <select value={newTrigger} onChange={e => setNewTrigger(e.target.value)}
              className="input text-sm" style={{ cursor: "pointer" }}>
              {TRIGGERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={createSequence} disabled={!newName.trim()}
                className="flex-1 py-2 rounded-xl text-xs font-medium text-white disabled:opacity-40"
                style={{ background: "var(--primary)" }}>Crea</button>
              <button onClick={() => setShowNew(false)}
                className="px-3 py-2 rounded-xl text-xs" style={{ color: "var(--muted)" }}>Annulla</button>
            </div>
          </div>
        )}

        {loading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color: "var(--muted)" }} /></div>}

        {!loading && sequences.length === 0 && (
          <div className="text-center py-8 rounded-2xl border text-sm" style={{ color: "var(--muted)", borderColor: "var(--border)", background: "var(--surface)" }}>
            <Zap size={24} className="mx-auto mb-2 opacity-30" />
            Nessuna sequenza.<br />Creane una!
          </div>
        )}

        {sequences.map(seq => {
          const isActive = selected?.id === seq.id;
          return (
            <div key={seq.id} onClick={() => openSequence(seq)}
              className="rounded-2xl border p-4 cursor-pointer transition group"
              style={{
                borderColor: isActive ? "var(--primary)" : "var(--border)",
                background: isActive ? "rgba(124,58,237,.08)" : "var(--surface)",
              }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-semibold">{seq.name}</span>
                <button onClick={e => { e.stopPropagation(); deleteSequence(seq.id); }}
                  className="opacity-0 group-hover:opacity-100 transition p-0.5 rounded"
                  style={{ color: "var(--danger)" }}>
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: seq.status === "active" ? "rgba(34,197,94,.12)" : "rgba(148,163,184,.1)",
                    color: seq.status === "active" ? "var(--success)" : "var(--muted)",
                  }}>
                  {seq.status === "active" ? "Attiva" : seq.status === "paused" ? "In pausa" : "Bozza"}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {triggerLabel(seq.trigger_type)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor steps */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: "rgba(124,58,237,.08)" }}>
              <Zap size={28} style={{ color: "var(--primary)" }} />
            </div>
            <p className="font-medium mb-1">Seleziona una sequenza</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>o creane una nuova per iniziare.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{selected.name}</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                Trigger: <strong>{triggerLabel(selected.trigger_type)}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleStatus}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition"
                style={{
                  borderColor: selected.status === "active" ? "var(--warning)" : "var(--success)",
                  color: selected.status === "active" ? "var(--warning)" : "var(--success)",
                }}>
                {selected.status === "active" ? <><Pause size={14} /> Metti in pausa</> : <><Play size={14} /> Attiva</>}
              </button>
              <button onClick={saveSteps} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salva
              </button>
            </div>
          </div>

          {/* Passi */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {stepsLoading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color: "var(--muted)" }} /></div>}

            {!stepsLoading && steps.length === 0 && (
              <div className="text-center py-12 rounded-2xl border-2 border-dashed" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--muted)" }}>Nessun passo. Aggiungine uno per iniziare.</p>
              </div>
            )}

            {steps.map((step, idx) => {
              const ch = CHANNELS.find(c => c.key === step.channel) ?? CHANNELS[0];
              const { Icon } = ch;
              return (
                <div key={step.id} className="flex gap-3 items-start">
                  {/* Connettore timeline */}
                  <div className="flex flex-col items-center gap-1 pt-4 shrink-0">
                    <div className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold"
                      style={{ background: "rgba(124,58,237,.15)", color: "var(--primary)" }}>
                      {idx + 1}
                    </div>
                    {idx < steps.length - 1 && <div className="w-px flex-1 min-h-4" style={{ background: "var(--border)" }} />}
                  </div>

                  {/* Card step */}
                  <div className="flex-1 rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Delay */}
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} style={{ color: "var(--muted)" }} />
                        <select
                          value={step.delay_minutes}
                          onChange={e => updateStep(idx, { delay_minutes: Number(e.target.value) })}
                          className="text-xs rounded-lg px-2 py-1.5 border bg-transparent"
                          style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                          {DELAY_PRESETS.map(p => (
                            <option key={p.value} value={p.value}>{idx === 0 ? "Subito" : p.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Canale */}
                      <div className="flex gap-1.5">
                        {CHANNELS.map(c => (
                          <button key={c.key} onClick={() => updateStep(idx, { channel: c.key })}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition"
                            style={{
                              borderColor: step.channel === c.key ? c.color : "var(--border)",
                              background: step.channel === c.key ? `${c.color}18` : "transparent",
                              color: step.channel === c.key ? c.color : "var(--muted)",
                            }}>
                            <c.Icon size={11} /> {c.label}
                          </button>
                        ))}
                      </div>

                      {/* Azioni */}
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                          className="p-1 rounded disabled:opacity-30" style={{ color: "var(--muted)" }}>
                          <ChevronUp size={15} />
                        </button>
                        <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}
                          className="p-1 rounded disabled:opacity-30" style={{ color: "var(--muted)" }}>
                          <ChevronDown size={15} />
                        </button>
                        <button onClick={() => removeStep(idx)}
                          className="p-1 rounded" style={{ color: "var(--danger)" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Messaggio */}
                    <textarea
                      value={step.message}
                      onChange={e => updateStep(idx, { message: e.target.value })}
                      placeholder={`Scrivi il messaggio ${ch.label}...`}
                      rows={3}
                      className="input resize-none text-sm"
                    />
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Usa <code style={{ background: "var(--surface-2)", padding: "1px 4px", borderRadius: 4 }}>{"{nome}"}</code>,{" "}
                      <code style={{ background: "var(--surface-2)", padding: "1px 4px", borderRadius: 4 }}>{"{servizio}"}</code>,{" "}
                      <code style={{ background: "var(--surface-2)", padding: "1px 4px", borderRadius: 4 }}>{"{data}"}</code> come variabili.
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Aggiungi passo */}
            <button onClick={addStep}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-medium transition"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
              <Plus size={15} /> Aggiungi passo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
