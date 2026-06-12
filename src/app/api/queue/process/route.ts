import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Protezione: solo chiamate con il secret corretto (da Vercel cron o chiamata manuale)
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.QUEUE_PROCESS_SECRET;
  if (!secret) return true; // in dev senza secret, passa sempre
  const header = req.headers.get("x-queue-secret");
  return header === secret;
}

function interpolate(message: string, lead: Record<string, string | null>): string {
  return message
    .replace(/\{nome\}/gi, lead.name ?? "")
    .replace(/\{telefono\}/gi, lead.phone ?? "")
    .replace(/\{email\}/gi, lead.email ?? "")
    .replace(/\{data\}/gi, new Date().toLocaleDateString("it-IT"));
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // Leggi tutti gli item pending il cui orario è passato
    const { data: items, error: fetchErr } = await supabaseAdmin
      .from("sequence_queue")
      .select(`
        id, workspace_id, lead_id,
        leads ( id, name, phone, email ),
        sequence_steps ( id, channel, message )
      `)
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .limit(50);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!items || items.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let processed = 0;
    let failed = 0;

    for (const item of items) {
      const lead = item.leads as unknown as Record<string, string | null> | null;
      const step = item.sequence_steps as unknown as { id: string; channel: string; message: string } | null;

      if (!step || !lead) {
        await supabaseAdmin
          .from("sequence_queue")
          .update({ status: "failed" })
          .eq("id", item.id);
        failed++;
        continue;
      }

      const message = interpolate(step.message, lead);

      try {
        // Dispatch al canale corretto — importato da lib/messaging (costruito al punto 4)
        // Per ora logga e segna come inviato
        const { sendMessage } = await import("@/lib/messaging");
        await sendMessage({
          channel: step.channel as "email" | "sms" | "whatsapp" | "webchat",
          to: step.channel === "email" ? (lead.email ?? "") : (lead.phone ?? ""),
          message,
          leadName: lead.name ?? undefined,
        });

        await supabaseAdmin
          .from("sequence_queue")
          .update({ status: "sent" })
          .eq("id", item.id);
        processed++;
      } catch (sendErr: any) {
        console.error(`[queue] send failed for item ${item.id}:`, sendErr?.message);
        await supabaseAdmin
          .from("sequence_queue")
          .update({ status: "failed" })
          .eq("id", item.id);
        failed++;
      }
    }

    return NextResponse.json({ processed, failed, total: items.length });
  } catch (e: any) {
    console.error("[queue/process] error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
