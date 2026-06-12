"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Hotel, RotateCcw, ChevronRight, ChevronLeft, Check, Loader2, MessageSquare } from "lucide-react";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import type { ChatMessage } from "@/lib/ai/provider";

// ─── Tipi ────────────────────────────────────────────────────────────────────

type TemplateKey = "barbiere" | "hotel" | "riattivazione";

type WizardData = {
  template: TemplateKey | null;
  company_name: string;
  company_services: string;
  company_hours: string;
  agent_name: string;
  agent_type: string;
  tone: string;
  goal: string;
  language: string;
  rules: string;
  questions: string;
  channels: string[];
};

const EMPTY: WizardData = {
  template: null,
  company_name: "", company_services: "", company_hours: "",
  agent_name: "", agent_type: "receptionist",
  tone: "", goal: "", language: "it-IT",
  rules: "", questions: "", channels: [],
};

// ─── Template predefiniti ─────────────────────────────────────────────────────

const TEMPLATES: Record<TemplateKey, Partial<WizardData>> = {
  barbiere: {
    agent_type: "receptionist",
    agent_name: "Assistente Barbiere",
    tone: "Cordiale, diretto e professionale",
    goal: "Prenotare appuntamenti riempiendo le fasce libere e rispondere a domande su servizi e prezzi",
    company_services: "taglio uomo, barba, rasatura, colore, trattamenti capelli",
    company_hours: "Mar-Sab 9:00-19:00, chiuso Dom-Lun",
    rules: "Rispondi sempre in italiano\nProponi sempre uno slot specifico disponibile\nNon promettere sconti non autorizzati\nSe non conosci il prezzo, di' di chiedere in sede",
    questions: "Per quale servizio vuoi prenotare?\nHai una data o fascia oraria preferita?\nCome ti chiami?",
    channels: ["webchat", "whatsapp"],
  },
  hotel: {
    agent_type: "receptionist",
    agent_name: "Concierge Virtuale",
    tone: "Elegante, accogliente e professionale",
    goal: "Gestire richieste di prenotazione, informare su disponibilità e servizi, assistere gli ospiti",
    company_services: "camere standard e suite, colazione inclusa, spa, parcheggio, transfer aeroporto",
    company_hours: "Reception attiva 24/7, check-in 15:00, check-out 11:00",
    rules: "Rispondi in italiano e inglese in base alla lingua del cliente\nVerifica sempre disponibilità prima di confermare\nRaccogli sempre nome, date e numero ospiti\nPer gruppi superiori a 10 persone, scala a un operatore umano",
    questions: "Quali date stai pensando per il soggiorno?\nQuante persone?\nPreferisci camera singola, doppia o suite?",
    channels: ["webchat", "email"],
  },
  riattivazione: {
    agent_type: "reactivation",
    agent_name: "Agente Riattivazione",
    tone: "Caloroso, personale e motivante",
    goal: "Ricontattare clienti inattivi, proporre un'offerta personalizzata e fissare un nuovo appuntamento",
    company_services: "tutti i servizi del negozio",
    company_hours: "orari standard di apertura",
    rules: "Inizia sempre con il nome del cliente se disponibile\nProponi un'offerta o promozione concreta\nCrea senso di urgenza senza essere aggressivo\nSe il cliente risponde negativamente, concludi con un saluto cordiale",
    questions: "Quando sei stato/a da noi l'ultima volta?\nSei interessato/a a un appuntamento questa settimana?\nC'è un servizio specifico che ti piacerebbe provare?",
    channels: ["whatsapp", "sms"],
  },
};

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { key: "template", label: "Template" },
  { key: "azienda",  label: "Azienda" },
  { key: "agente",   label: "Agente" },
  { key: "canali",   label: "Canali" },
  { key: "preview",  label: "Attiva" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

const CHANNELS = ["webchat", "whatsapp", "sms", "email"];

// ─── Componente principale ────────────────────────────────────────────────────

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>("template");
  const [data, setData] = useState<WizardData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Ciao! Come posso aiutarti?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const stepIndex = STEPS.findIndex(s => s.key === step);

  function set<K extends keyof WizardData>(k: K, v: WizardData[K]) {
    setData(prev => ({ ...prev, [k]: v }));
  }

  function applyTemplate(key: TemplateKey) {
    const tpl = TEMPLATES[key];
    setData(prev => ({ ...prev, ...tpl, template: key }));
  }

  function toggleChannel(ch: string) {
    set("channels", data.channels.includes(ch)
      ? data.channels.filter(c => c !== ch)
      : [...data.channels, ch]);
  }

  function next() {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  }

  function back() {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  }

  async function sendPreviewChat() {
    if (!chatInput.trim()) return;
    const next: ChatMessage[] = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(next);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentConfig: {
            name: data.agent_name || "Agente",
            type: data.agent_type,
            tone: data.tone,
            goal: data.goal,
            language: data.language,
            company: {
              name: data.company_name,
              services: data.company_services.split(",").map(s => s.trim()).filter(Boolean),
              hours: data.company_hours,
            },
            qualifyingQuestions: data.questions.split("\n").map(s => s.trim()).filter(Boolean),
            behaviorRules: data.rules.split("\n").map(s => s.trim()).filter(Boolean),
            bookingConditions: "Proponi uno slot solo se disponibile",
          },
          messages: next,
        }),
      });
      const result = await res.json();
      setChatMessages([...next, { role: "assistant", content: result.text || "(nessuna risposta)" }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function activate() {
    setSaving(true);
    const wsId = await getOrCreateWorkspace();
    if (!wsId) { setSaving(false); return; }

    const payload = {
      workspace_id: wsId,
      name: data.agent_name || "Agente",
      type: data.agent_type,
      tone: data.tone,
      goal: data.goal,
      language: data.language,
      channels: data.channels,
      status: "active",
      config: {
        company: {
          name: data.company_name,
          services: data.company_services.split(",").map(s => s.trim()).filter(Boolean),
          hours: data.company_hours,
        },
        behavior_rules: data.rules.split("\n").map(s => s.trim()).filter(Boolean),
        qualifying_questions: data.questions.split("\n").map(s => s.trim()).filter(Boolean),
      },
    };

    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) router.push("/agents");
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Crea il tuo sistema AI</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Segui i passaggi per configurare e attivare il tuo agente in pochi minuti.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const done = i < stepIndex;
          const active = s.key === step;
          return (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    background: done ? "var(--success)" : active ? "var(--primary)" : "var(--surface)",
                    color: done || active ? "#fff" : "var(--muted)",
                    border: done || active ? "none" : "1px solid var(--border)",
                  }}>
                  {done ? <Check size={14} /> : i + 1}
                </div>
                <span className="text-xs font-medium whitespace-nowrap"
                  style={{ color: active ? "var(--text)" : "var(--muted)" }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-2 mb-4 transition-all"
                  style={{ background: done ? "var(--success)" : "var(--border)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Template ─────────────────────────────── */}
      {step === "template" && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Scegli il tuo settore</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Seleziona un template per pre-configurare tutto. Potrai modificare ogni dettaglio nei passaggi successivi.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {([
              { key: "barbiere" as TemplateKey,     Icon: Scissors,   label: "Barbiere / Salone",     desc: "Prenotazioni, disponibilità, servizi e prezzi. Ottimizzato per WhatsApp." },
              { key: "hotel" as TemplateKey,         Icon: Hotel,      label: "Hotel / B&B",           desc: "Gestione ospiti, check-in/out, servizi extra. Multilingua." },
              { key: "riattivazione" as TemplateKey, Icon: RotateCcw,  label: "Riattivazione clienti", desc: "Recupera clienti inattivi con messaggi personalizzati e offerte." },
            ]).map(({ key, Icon, label, desc }) => {
              const isSelected = data.template === key;
              return (
                <button key={key}
                  onClick={() => { applyTemplate(key); }}
                  className="text-left rounded-2xl border p-5 transition-all"
                  style={{
                    borderColor: isSelected ? "var(--primary)" : "var(--border)",
                    background: isSelected ? "rgba(124,58,237,.1)" : "var(--surface)",
                    boxShadow: isSelected ? "0 0 0 1px var(--primary)" : undefined,
                  }}>
                  <div className="w-10 h-10 rounded-xl grid place-items-center mb-4"
                    style={{ background: isSelected ? "rgba(124,58,237,.2)" : "var(--surface-2)" }}>
                    <Icon size={20} style={{ color: isSelected ? "var(--primary)" : "var(--muted)" }} />
                  </div>
                  <p className="font-semibold mb-1">{label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{desc}</p>
                  {isSelected && (
                    <div className="flex items-center gap-1 mt-3">
                      <Check size={12} style={{ color: "var(--primary)" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--primary)" }}>Selezionato</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step 2: Azienda ──────────────────────────────── */}
      {step === "azienda" && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Il tuo business</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Queste informazioni vengono usate dall'agente per rispondere correttamente ai clienti.
          </p>
          <div className="rounded-2xl border p-6 flex flex-col gap-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <Field label="Nome azienda">
              <input value={data.company_name} onChange={e => set("company_name", e.target.value)}
                placeholder="es. Barbiere Foued" className="input" />
            </Field>
            <Field label="Servizi offerti (separati da virgola)">
              <input value={data.company_services} onChange={e => set("company_services", e.target.value)}
                placeholder="es. taglio, barba, colore" className="input" />
            </Field>
            <Field label="Orari di apertura">
              <input value={data.company_hours} onChange={e => set("company_hours", e.target.value)}
                placeholder="es. Mar-Sab 9:00-19:00" className="input" />
            </Field>
          </div>
        </div>
      )}

      {/* ── Step 3: Agente ───────────────────────────────── */}
      {step === "agente" && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Il tuo agente</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Dai un nome e una personalità al tuo assistente AI.
          </p>
          <div className="rounded-2xl border p-6 flex flex-col gap-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <Field label="Nome agente">
              <input value={data.agent_name} onChange={e => set("agent_name", e.target.value)}
                placeholder="es. Assistente Foued" className="input" />
            </Field>
            <Field label="Obiettivo principale">
              <input value={data.goal} onChange={e => set("goal", e.target.value)}
                placeholder="es. Prenotare appuntamenti e rispondere alle domande dei clienti" className="input" />
            </Field>
            <Field label="Tono comunicativo">
              <input value={data.tone} onChange={e => set("tone", e.target.value)}
                placeholder="es. Cordiale e professionale" className="input" />
            </Field>
            <Field label="Regole di comportamento (una per riga)">
              <textarea value={data.rules} onChange={e => set("rules", e.target.value)}
                rows={4} className="input resize-none" />
            </Field>
            <Field label="Domande di qualifica (una per riga)">
              <textarea value={data.questions} onChange={e => set("questions", e.target.value)}
                rows={3} className="input resize-none" />
            </Field>
          </div>
        </div>
      )}

      {/* ── Step 4: Canali ───────────────────────────────── */}
      {step === "canali" && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Dove risponde il tuo agente?</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Seleziona i canali su cui attiverò il sistema. Puoi aggiungerne altri in seguito.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "webchat",  label: "Chat Web",  desc: "Widget sul tuo sito web",         color: "var(--accent)"   },
              { key: "whatsapp", label: "WhatsApp",  desc: "Numero WhatsApp Business",         color: "var(--success)"  },
              { key: "sms",      label: "SMS",        desc: "Messaggi SMS diretti",             color: "var(--warning)"  },
              { key: "email",    label: "Email",      desc: "Inbox email dedicata",             color: "var(--primary)"  },
            ]).map(({ key, label, desc, color }) => {
              const on = data.channels.includes(key);
              return (
                <button key={key} onClick={() => toggleChannel(key)}
                  className="text-left rounded-2xl border p-4 transition-all"
                  style={{
                    borderColor: on ? color : "var(--border)",
                    background: on ? `${color}12` : "var(--surface)",
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{label}</span>
                    <div className="w-5 h-5 rounded-md border grid place-items-center transition-all"
                      style={{
                        borderColor: on ? color : "var(--border)",
                        background: on ? color : "transparent",
                      }}>
                      {on && <Check size={11} color="#fff" />}
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>{desc}</p>
                </button>
              );
            })}
          </div>
          {data.channels.length === 0 && (
            <p className="text-xs mt-3 px-1" style={{ color: "var(--warning)" }}>
              Seleziona almeno un canale per procedere.
            </p>
          )}
        </div>
      )}

      {/* ── Step 5: Preview & Attiva ─────────────────────── */}
      {step === "preview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Riepilogo */}
          <div className="rounded-2xl border p-5 flex flex-col gap-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h3 className="font-semibold text-sm">Riepilogo sistema</h3>
            <Row label="Agente" value={data.agent_name || "—"} />
            <Row label="Azienda" value={data.company_name || "—"} />
            <Row label="Obiettivo" value={data.goal || "—"} />
            <Row label="Tono" value={data.tone || "—"} />
            <Row label="Canali" value={data.channels.join(", ") || "—"} />
            <Row label="Orari" value={data.company_hours || "—"} />
          </div>

          {/* Preview chat */}
          <div className="rounded-2xl border flex flex-col" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
              <span className="text-sm font-medium">Prova il tuo agente</span>
              <span className="text-xs ml-auto" style={{ color: "var(--muted)" }}>AI reale</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2" style={{ minHeight: 200, maxHeight: 320 }}>
              {chatMessages.map((m, i) => (
                <div key={i} className="max-w-[85%] px-3 py-2 rounded-2xl text-sm"
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    background: m.role === "user" ? "var(--primary)" : "var(--surface-2)",
                    color: m.role === "user" ? "#fff" : "var(--text)",
                  }}>{m.content}</div>
              ))}
              {chatLoading && (
                <div className="flex gap-1 px-3 py-2 rounded-2xl self-start" style={{ background: "var(--surface-2)" }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: "var(--muted)", animationDelay: `${i*0.15}s` }} />
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !chatLoading && sendPreviewChat()}
                placeholder="Scrivi un messaggio di test..."
                className="flex-1 px-3 py-2 rounded-xl text-sm border bg-transparent"
                style={{ borderColor: "var(--border)" }} />
              <button onClick={sendPreviewChat} disabled={chatLoading}
                className="px-3 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--primary)" }}>
                <MessageSquare size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigazione ──────────────────────────────────── */}
      <div className="flex items-center justify-between mt-8">
        <button onClick={back} disabled={step === "template"}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border disabled:opacity-30"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          <ChevronLeft size={16} /> Indietro
        </button>

        {step !== "preview" ? (
          <button onClick={next}
            disabled={
              (step === "template" && !data.template) ||
              (step === "canali" && data.channels.length === 0)
            }
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
            Avanti <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={activate} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))" }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? "Attivazione..." : "Attiva sistema"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Componenti helper ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm py-1 border-b last:border-0"
      style={{ borderColor: "var(--border)" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-right font-medium" style={{ maxWidth: "60%" }}>{value}</span>
    </div>
  );
}
