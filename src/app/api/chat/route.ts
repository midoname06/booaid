import { NextRequest, NextResponse } from "next/server";
import { getProvider, type Tool, type ChatMessage } from "@/lib/ai/provider";
import { buildSystemPrompt, type AgentConfig } from "@/lib/ai/prompts";
import { supabaseAdmin } from "@/lib/supabase";
import { extractAndUpdateLead } from "@/lib/ai/extract-lead";
import { checkAvailability, createCalendarBooking } from "@/lib/google-calendar";

const tools: Tool[] = [
  {
    name: "check_availability",
    description: "Controlla gli slot liberi nel calendario per un giorno/servizio.",
    input_schema: {
      type: "object",
      properties: { date: { type: "string" }, service: { type: "string" } },
      required: ["date"],
    },
  },
  {
    name: "create_booking",
    description: "Crea un appuntamento confermato sul calendario.",
    input_schema: {
      type: "object",
      properties: {
        start: { type: "string" }, service: { type: "string" },
        name: { type: "string" }, phone: { type: "string" },
      },
      required: ["start", "service", "name"],
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  context: { workspaceId: string; leadId: string; agentId?: string }
): Promise<string> {
  if (name === "check_availability") {
    return checkAvailability(
      context.workspaceId,
      input.date as string,
      input.service as string | undefined
    );
  }
  if (name === "create_booking") {
    const { bookingId } = await createCalendarBooking({
      workspaceId: context.workspaceId,
      leadId: context.leadId,
      agentId: context.agentId,
      start: input.start as string,
      service: input.service as string,
      name: input.name as string,
      phone: input.phone as string | undefined,
    });
    return bookingId
      ? `Appuntamento confermato e salvato (ID: ${bookingId}).`
      : "Appuntamento registrato nel sistema.";
  }
  return "Tool non riconosciuto.";
}

async function getOrCreateConversation(opts: {
  workspaceId: string;
  agentId?: string;
  conversationId?: string;
  channel: string;
}): Promise<{ conversationId: string; leadId: string }> {
  const { workspaceId, agentId, conversationId, channel } = opts;

  if (conversationId) {
    const { data } = await supabaseAdmin
      .from("conversations")
      .select("id, lead_id")
      .eq("id", conversationId)
      .single();
    if (data) return { conversationId: data.id, leadId: data.lead_id };
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .insert({ workspace_id: workspaceId, status: "new", source: channel })
    .select()
    .single();

  const { data: conv } = await supabaseAdmin
    .from("conversations")
    .insert({
      workspace_id: workspaceId,
      agent_id: agentId ?? null,
      lead_id: lead!.id,
      channel,
      status: "open",
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { conversationId: conv!.id, leadId: lead!.id };
}

async function saveMessage(opts: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
}) {
  await supabaseAdmin.from("messages").insert({
    conversation_id: opts.conversationId,
    role: opts.role,
    content: opts.content,
  });
  await supabaseAdmin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", opts.conversationId);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agentConfig,
      messages,
      workspaceId,
      agentId,
      conversationId: incomingConvId,
      channel = "webchat",
    } = body as {
      agentConfig: AgentConfig;
      messages: ChatMessage[];
      workspaceId?: string;
      agentId?: string;
      conversationId?: string;
      channel?: string;
    };

    const system = buildSystemPrompt(agentConfig);
    const llm = getProvider();

    // Modalità persistente
    if (workspaceId) {
      const { conversationId, leadId } = await getOrCreateConversation({
        workspaceId, agentId, conversationId: incomingConvId, channel,
      });

      const lastUser = [...messages].reverse().find(m => m.role === "user");
      if (lastUser) {
        await saveMessage({ conversationId, role: "user", content: lastUser.content });
      }

      // Loop agentico: esegui i tool finché l'AI non produce solo testo
      let currentMessages = [...messages];
      let finalText = "";
      let allToolCalls: { name: string; input: Record<string, unknown> }[] = [];

      for (let i = 0; i < 5; i++) { // max 5 iterazioni di sicurezza
        const result = await llm.complete({ system, messages: currentMessages, tools });
        allToolCalls = [...allToolCalls, ...result.toolCalls];

        if (result.toolCalls.length === 0) {
          finalText = result.text;
          break;
        }

        // Esegui i tool e aggiungi i risultati ai messaggi
        const toolResults = await Promise.all(
          result.toolCalls.map(tc =>
            executeTool(tc.name, tc.input, { workspaceId, leadId, agentId })
          )
        );

        // Aggiungi risposta AI (con tool use) e risultati tool alla storia
        currentMessages = [
          ...currentMessages,
          { role: "assistant" as const, content: result.text || `[tool: ${result.toolCalls.map(t => t.name).join(", ")}]` },
          ...toolResults.map((r, idx) => ({
            role: "user" as const,
            content: `[Risultato ${result.toolCalls[idx].name}]: ${r}`,
          })),
        ];

        if (i === 4) finalText = result.text; // sicurezza: usa l'ultimo testo
      }

      if (finalText) {
        await saveMessage({ conversationId, role: "assistant", content: finalText });
      }

      const userMessages = messages.filter(m => m.role === "user");
      if (userMessages.length >= 2) {
        const allMessages = [
          ...messages,
          ...(finalText ? [{ role: "assistant" as const, content: finalText }] : []),
        ];
        extractAndUpdateLead(leadId, allMessages).catch(() => {});
      }

      return NextResponse.json({ text: finalText, toolCalls: allToolCalls, conversationId, leadId });
    }

    // Modalità effimera (preview builder) — nessuna esecuzione tool reale
    const result = await llm.complete({ system, messages, tools });
    return NextResponse.json(result);

  } catch (e: any) {
    console.error("[chat] error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "Errore AI", text: "", toolCalls: [] }, { status: 500 });
  }
}
