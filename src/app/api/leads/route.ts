export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

const STATUS_TO_TRIGGER: Record<string, string> = {
  new:       "lead_created",
  contacted: "lead_contacted",
  qualified: "lead_qualified",
  booked:    "booking_confirmed",
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const status = req.nextUrl.searchParams.get("status");
  let query = supabase
    .from("leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabase
    .from("leads")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...rest } = await req.json();

  // Leggi lo status precedente per rilevare cambiamenti
  const { data: before } = await supabase
    .from("leads")
    .select("status, workspace_id")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("leads")
    .update(rest)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-enqueue se lo status è cambiato e c'è un trigger associato
  if (before && rest.status && before.status !== rest.status) {
    const triggerType = STATUS_TO_TRIGGER[rest.status];
    if (triggerType && before.workspace_id) {
      supabaseAdmin
        .from("sequences")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", before.workspace_id)
        .eq("trigger_type", triggerType)
        .eq("status", "active")
        .then(({ count }) => {
          if ((count ?? 0) > 0) {
            fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/sequences/enqueue`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ leadId: id, workspaceId: before.workspace_id, triggerType }),
            }).catch(() => {});
          }
        });
    }
  }

  return NextResponse.json(data);
}
