"use client";
import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Phone, Mail, Globe, Loader2, User, RefreshCw } from "lucide-react";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

type Lead = { id: string; name: string | null; phone: string | null; email: string | null; status: string; score: number };
type Agent = { id: string; name: string; type: string };
type Conversation = {
  id: string;
  channel: string;
  status: string;
  sentiment: string | null;
  last_message_at: string;
  leads: Lead | null;
  agents: Agent | null;
};
type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  webchat: <Globe size={14} />,
  whatsapp: <Phone size={14} />,
  sms: <Phone size={14} />,
  email: <Mail size={14} />,
};

const CHANNEL_COLOR: Record<string, string> = {
  webchat: "var(--accent)",
  whatsapp: "var(--success)",
  sms: "var(--warning)",
  email: "var(--primary)",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  new: { label: "Nuovo", color: "var(--accent)" },
  contacted: { label: "Contattato", color: "var(--warning)" },
  qualified: { label: "Qualificato", color: "var(--primary)" },
  booked: { label: "Prenotato", color: "var(--success)" },
  lost: { label: "Perso", color: "var(--danger)" },
};

const FILTERS = ["Tutte", "Aperte", "Chiuse"] as const;
type Filter = (typeof FILTERS)[number];

function timeAgo(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: it });
  } catch {
    return "";
  }
}

export default function InboxPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<Filter>("Tutte");
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);

  const loadConversations = useCallback(async (wsId: string) => {
    setLoading(true);
    const res = await fetch(`/api/conversations?workspace_id=${wsId}`);
    if (res.ok) setConversations(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    getOrCreateWorkspace().then(wsId => {
      if (wsId) { setWorkspaceId(wsId); loadConversations(wsId); }
    });
  }, [loadConversations]);

  async function openConversation(conv: Conversation) {
    setSelected(conv);
    setMsgLoading(true);
    const res = await fetch(`/api/messages?conversation_id=${conv.id}`);
    if (res.ok) setMessages(await res.json());
    setMsgLoading(false);
  }

  const filtered = conversations.filter(c => {
    if (filter === "Aperte") return c.status === "open";
    if (filter === "Chiuse") return c.status === "closed";
    return true;
  });

  return (
    <div className="flex gap-0 h-[calc(100vh-4rem)] -m-8 overflow-hidden">
      {/* Pannello sinistro — lista conversazioni */}
      <div className="w-80 shrink-0 flex flex-col border-r" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div>
            <h1 className="text-base font-bold">Inbox</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{conversations.length} conversazioni</p>
          </div>
          <button
            onClick={() => workspaceId && loadConversations(workspaceId)}
            className="p-1.5 rounded-lg transition"
            style={{ color: "var(--muted)" }}
            title="Aggiorna"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Filtri */}
        <div className="flex gap-1 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition"
              style={{
                background: filter === f ? "rgba(124,58,237,.18)" : "transparent",
                color: filter === f ? "var(--text)" : "var(--muted)",
              }}>{f}</button>
          ))}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--muted)" }} />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageSquare size={28} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm" style={{ color: "var(--muted)" }}>Nessuna conversazione</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Le conversazioni appariranno qui quando un agente interagisce con un lead.
              </p>
            </div>
          )}

          {!loading && filtered.map(conv => {
            const isActive = selected?.id === conv.id;
            const leadStatus = conv.leads?.status ? STATUS_LABEL[conv.leads.status] : null;
            const chColor = CHANNEL_COLOR[conv.channel] ?? "var(--muted)";

            return (
              <button key={conv.id} onClick={() => openConversation(conv)}
                className="w-full text-left px-4 py-4 border-b transition"
                style={{
                  borderColor: "var(--border)",
                  background: isActive ? "rgba(124,58,237,.1)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                }}>
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl shrink-0 grid place-items-center"
                    style={{ background: `${chColor}1a` }}>
                    <span style={{ color: chColor }}>{CHANNEL_ICON[conv.channel] ?? <MessageSquare size={14} />}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold truncate">
                        {conv.leads?.name ?? "Lead sconosciuto"}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>
                        {timeAgo(conv.last_message_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate" style={{ color: "var(--muted)" }}>
                        {conv.agents?.name ?? "Agente"} · {conv.channel}
                      </span>
                      {leadStatus && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md shrink-0"
                          style={{ background: `${leadStatus.color}1a`, color: leadStatus.color }}>
                          {leadStatus.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pannello destro — thread messaggi */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center" style={{ background: "var(--bg)" }}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4"
              style={{ background: "rgba(124,58,237,.08)" }}>
              <MessageSquare size={28} style={{ color: "var(--primary)" }} />
            </div>
            <p className="font-medium mb-1">Seleziona una conversazione</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Clicca su una conversazione per leggere il thread completo.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col" style={{ background: "var(--bg)" }}>
          {/* Thread header */}
          <div className="px-6 py-4 border-b flex items-center gap-4"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="w-10 h-10 rounded-xl grid place-items-center"
              style={{ background: "rgba(124,58,237,.12)" }}>
              <User size={18} style={{ color: "var(--primary)" }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{selected.leads?.name ?? "Lead sconosciuto"}</span>
                {selected.leads?.status && STATUS_LABEL[selected.leads.status] && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: `${STATUS_LABEL[selected.leads.status].color}1a`,
                      color: STATUS_LABEL[selected.leads.status].color,
                    }}>
                    {STATUS_LABEL[selected.leads.status].label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {selected.leads?.phone && (
                  <span className="text-xs flex items-center gap-1" style={{ color: "var(--muted)" }}>
                    <Phone size={11} />{selected.leads.phone}
                  </span>
                )}
                {selected.leads?.email && (
                  <span className="text-xs flex items-center gap-1" style={{ color: "var(--muted)" }}>
                    <Mail size={11} />{selected.leads.email}
                  </span>
                )}
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  via {selected.agents?.name ?? "Agente"} · {selected.channel}
                </span>
              </div>
            </div>
          </div>

          {/* Messaggi */}
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
            {msgLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin" style={{ color: "var(--muted)" }} />
              </div>
            )}

            {!msgLoading && messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: "var(--muted)" }}>Nessun messaggio in questa conversazione.</p>
              </div>
            )}

            {!msgLoading && messages.map(msg => {
              const isUser = msg.role === "user";
              const isSystem = msg.role === "system" || msg.role === "tool";
              if (isSystem) return null;
              return (
                <div key={msg.id}
                  className="flex flex-col gap-1"
                  style={{ alignItems: isUser ? "flex-end" : "flex-start" }}>
                  <div className="max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={{
                      background: isUser ? "var(--primary)" : "var(--surface)",
                      color: isUser ? "#fff" : "var(--text)",
                      borderBottomRightRadius: isUser ? 4 : undefined,
                      borderBottomLeftRadius: !isUser ? 4 : undefined,
                    }}>
                    {msg.content}
                  </div>
                  <span className="text-xs px-1" style={{ color: "var(--muted)" }}>
                    {isUser ? "Lead" : "Agente"} · {timeAgo(msg.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
