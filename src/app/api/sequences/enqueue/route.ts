export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Mette un lead in tutte le sequenze attive che matchano il trigger.
 * Chiamato automaticamente quando lo stage del lead cambia.
 */
export async function POST(req: NextRequest) {
  try {
    const { leadId, workspaceId, triggerType } = await req.json() as {
      leadId: string;
      workspaceId: string;
      triggerType: string;
    };

    // Trova sequenze attive con quel trigger
    const { data: sequences } = await supabaseAdmin
      .from("sequences")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("trigger_type", triggerType)
      .eq("status", "active");

    if (!sequences || sequences.length === 0) {
      return NextResponse.json({ enqueued: 0 });
    }

    let enqueued = 0;
    const now = new Date();

    for (const seq of sequences) {
      // Verifica che questo lead non sia già in coda per questa sequenza
      const { count } = await supabaseAdmin
        .from("sequence_queue")
        .select("id", { count: "exact", head: true })
        .eq("sequence_id", seq.id)
        .eq("lead_id", leadId)
        .in("status", ["pending", "sent"]);

      if ((count ?? 0) > 0) continue; // già accodato, salta

      const { data: steps } = await supabaseAdmin
        .from("sequence_steps")
        .select("id, position, delay_minutes")
        .eq("sequence_id", seq.id)
        .order("position", { ascending: true });

      if (!steps || steps.length === 0) continue;

      // Calcola scheduled_at per ogni passo sommando i delay dal momento attuale
      let cumulativeMinutes = 0;
      const queueItems = steps.map(step => {
        cumulativeMinutes += step.delay_minutes;
        const scheduledAt = new Date(now.getTime() + cumulativeMinutes * 60 * 1000);
        return {
          workspace_id: workspaceId,
          sequence_id: seq.id,
          step_id: step.id,
          lead_id: leadId,
          scheduled_at: scheduledAt.toISOString(),
          status: "pending",
        };
      });

      const { error } = await supabaseAdmin.from("sequence_queue").insert(queueItems);
      if (!error) enqueued += queueItems.length;
    }

    return NextResponse.json({ enqueued });
  } catch (e: any) {
    console.error("[enqueue] error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
