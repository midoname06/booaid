"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { User, Phone, Mail, Star, Loader2, RefreshCw, MessageSquare } from "lucide-react";
import { getOrCreateWorkspace } from "@/lib/workspace";
import Link from "next/link";

type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  score: number;
  source: string | null;
  created_at: string;
};

const STAGES: { key: string; label: string; color: string; bg: string }[] = [
  { key: "new",       label: "Nuovo",      color: "var(--accent)",   bg: "rgba(6,182,212,.08)"   },
  { key: "contacted", label: "Contattato", color: "var(--warning)",  bg: "rgba(245,158,11,.08)"  },
  { key: "qualified", label: "Qualificato",color: "var(--primary)",  bg: "rgba(124,58,237,.08)"  },
  { key: "booked",    label: "Prenotato",  color: "var(--success)",  bg: "rgba(34,197,94,.08)"   },
  { key: "lost",      label: "Perso",      color: "var(--danger)",   bg: "rgba(239,68,68,.08)"   },
];

export default function PipelinePage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const dragLeadRef = useRef<Lead | null>(null);

  const loadLeads = useCallback(async (wsId: string) => {
    setLoading(true);
    const res = await fetch(`/api/leads?workspace_id=${wsId}`);
    if (res.ok) setLeads(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    getOrCreateWorkspace().then(wsId => {
      if (wsId) { setWorkspaceId(wsId); loadLeads(wsId); }
    });
  }, [loadLeads]);

  async function moveLeadToStage(leadId: string, newStatus: string) {
    // Ottimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, status: newStatus }),
    });
  }

  function onDragStart(lead: Lead) {
    setDragId(lead.id);
    dragLeadRef.current = lead;
  }

  function onDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    setOverStage(stageKey);
  }

  function onDrop(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    if (dragLeadRef.current && dragLeadRef.current.status !== stageKey) {
      moveLeadToStage(dragLeadRef.current.id, stageKey);
    }
    setDragId(null);
    setOverStage(null);
    dragLeadRef.current = null;
  }

  function onDragEnd() {
    setDragId(null);
    setOverStage(null);
    dragLeadRef.current = null;
  }

  const byStage = (key: string) => leads.filter(l => l.status === key);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--muted)" }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Pipeline Lead</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {leads.length} lead totali · trascina per cambiare stage
          </p>
        </div>
        <button
          onClick={() => workspaceId && loadLeads(workspaceId)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          <RefreshCw size={14} /> Aggiorna
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 200px)" }}>
        {STAGES.map(stage => {
          const stageLeads = byStage(stage.key);
          const isOver = overStage === stage.key;

          return (
            <div
              key={stage.key}
              onDragOver={e => onDragOver(e, stage.key)}
              onDrop={e => onDrop(e, stage.key)}
              className="flex flex-col rounded-2xl border transition-all"
              style={{
                minWidth: 240,
                flex: "1 1 0",
                borderColor: isOver ? stage.color : "var(--border)",
                background: isOver ? stage.bg : "var(--surface)",
                boxShadow: isOver ? `0 0 0 2px ${stage.color}40` : undefined,
              }}>

              {/* Intestazione colonna */}
              <div className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                  <span className="text-sm font-semibold">{stage.label}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: stage.bg, color: stage.color }}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Card leads */}
              <div className="flex flex-col gap-2 p-3 flex-1">
                {stageLeads.length === 0 && (
                  <div className="flex-1 flex items-center justify-center py-8 rounded-xl border-2 border-dashed"
                    style={{ borderColor: isOver ? stage.color : "var(--border)", opacity: isOver ? 1 : 0.4 }}>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      {isOver ? "Rilascia qui" : "Nessun lead"}
                    </p>
                  </div>
                )}

                {stageLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => onDragStart(lead)}
                    onDragEnd={onDragEnd}
                    className="rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--bg)",
                      opacity: dragId === lead.id ? 0.4 : 1,
                      transform: dragId === lead.id ? "scale(0.97)" : undefined,
                    }}>

                    {/* Nome lead */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
                          style={{ background: stage.bg }}>
                          <User size={13} style={{ color: stage.color }} />
                        </div>
                        <span className="text-sm font-semibold leading-tight">
                          {lead.name ?? "Lead anonimo"}
                        </span>
                      </div>
                      {lead.score > 0 && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Star size={10} style={{ color: "var(--warning)" }} />
                          <span className="text-xs" style={{ color: "var(--warning)" }}>{lead.score}</span>
                        </div>
                      )}
                    </div>

                    {/* Contatti */}
                    {(lead.phone || lead.email) && (
                      <div className="flex flex-col gap-1 mb-2">
                        {lead.phone && (
                          <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                            <Phone size={10} /> {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                            <Mail size={10} /> {lead.email}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer: source + link inbox */}
                    <div className="flex items-center justify-between mt-1">
                      {lead.source && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md"
                          style={{ background: "var(--surface)", color: "var(--muted)" }}>
                          {lead.source}
                        </span>
                      )}
                      <Link
                        href="/inbox"
                        className="ml-auto flex items-center gap-1 text-xs"
                        style={{ color: "var(--primary)" }}
                        title="Vedi conversazioni">
                        <MessageSquare size={11} /> Chat
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
