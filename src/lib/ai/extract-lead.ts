import { getProvider } from "./provider";
import { supabaseAdmin } from "@/lib/supabase";

export async function extractAndUpdateLead(
  leadId: string,
  messages: { role: string; content: string }[]
): Promise<void> {
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("name, phone, email, status")
    .eq("id", leadId)
    .single();

  if (!lead) return;

  const missingFields = [
    !lead.name && "nome",
    !lead.phone && "telefono",
    !lead.email && "email",
  ].filter(Boolean);

  if (missingFields.length === 0) return;

  const transcript = messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(-20)
    .map(m => `${m.role === "user" ? "Cliente" : "Agente"}: ${m.content}`)
    .join("\n");

  const llm = getProvider();
  const result = await llm.complete({
    system: `Sei un estrattore di dati. Analizza la conversazione e restituisci SOLO un oggetto JSON valido. Se un campo non è presente usa null. Nessun testo aggiuntivo.`,
    messages: [
      {
        role: "user",
        content: `Estrai dalla conversazione: ${missingFields.join(", ")}.

CONVERSAZIONE:
${transcript}

JSON da restituire:
{${!lead.name ? '\n  "name": "nome o null",' : ""}${!lead.phone ? '\n  "phone": "telefono o null",' : ""}${!lead.email ? '\n  "email": "email o null"' : ""}
}`,
      },
    ],
  });

  let extracted: Record<string, string | null> = {};
  try {
    const raw = result.text.trim().replace(/```json|```/g, "").trim();
    extracted = JSON.parse(raw);
  } catch {
    return;
  }

  const updates: Record<string, string> = {};
  for (const [k, v] of Object.entries(extracted)) {
    if (v && typeof v === "string" && v !== "null") updates[k] = v;
  }

  if (Object.keys(updates).length > 0) {
    if (lead.status === "new") updates.status = "contacted";
    await supabaseAdmin.from("leads").update(updates).eq("id", leadId);
  }
}
