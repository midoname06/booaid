import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cerca workspace esistente
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) {
    return NextResponse.json({ workspace_id: membership.workspace_id });
  }

  // Primo accesso: crea workspace
  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .insert({ name: "Il mio workspace", owner_id: user.id })
    .select()
    .single();

  if (wsErr || !ws) {
    console.error("[workspace API] insert error:", wsErr);
    return NextResponse.json({ error: wsErr?.message }, { status: 500 });
  }

  await supabase.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: "owner",
  });

  return NextResponse.json({ workspace_id: ws.id });
}
