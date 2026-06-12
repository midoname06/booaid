import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("sequence_queue")
    .select(`
      id, scheduled_at, status, created_at,
      leads ( id, name, phone, email ),
      sequence_steps ( channel, message, delay_minutes ),
      sequences ( name )
    `)
    .eq("workspace_id", workspaceId)
    .order("scheduled_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
