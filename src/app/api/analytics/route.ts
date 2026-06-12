import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalAgents },
    { count: totalLeads },
    { count: totalConversations },
    { count: totalBookings },
    { count: bookedLeads },
    { count: qualifiedLeads },
    { data: recentConversations },
    { data: leadsByStage },
    { data: recentBookings },
    { data: convIds },
  ] = await Promise.all([
    supabase.from("agents").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "booked"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "qualified"),
    supabase.from("conversations").select("last_message_at").eq("workspace_id", workspaceId)
      .gte("last_message_at", thirtyDaysAgo).order("last_message_at", { ascending: true }),
    supabase.from("leads").select("status").eq("workspace_id", workspaceId),
    supabase.from("bookings").select("start_at, service, status").eq("workspace_id", workspaceId)
      .gte("start_at", sevenDaysAgo).order("start_at", { ascending: false }).limit(10),
    supabase.from("conversations").select("id").eq("workspace_id", workspaceId),
  ]);

  const ids = (convIds ?? []).map((c: { id: string }) => c.id);
  const { count: totalMessages } = ids.length > 0
    ? await supabase.from("messages").select("id", { count: "exact", head: true }).in("conversation_id", ids)
    : { count: 0 };

  const conversionRate = (totalLeads ?? 0) > 0
    ? Math.round(((bookedLeads ?? 0) / (totalLeads ?? 1)) * 100)
    : 0;

  // Aggrega conversazioni per giorno (ultimi 30 giorni)
  const dailyConversations: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dailyConversations[d.toISOString().slice(0, 10)] = 0;
  }
  (recentConversations ?? []).forEach((c: any) => {
    const day = c.last_message_at?.slice(0, 10);
    if (day && day in dailyConversations) dailyConversations[day]++;
  });

  // Lead per stage
  const stageCount: Record<string, number> = { new: 0, contacted: 0, qualified: 0, booked: 0, lost: 0 };
  (leadsByStage ?? []).forEach((l: any) => { if (l.status in stageCount) stageCount[l.status]++; });

  return NextResponse.json({
    kpi: {
      agents: totalAgents ?? 0,
      leads: totalLeads ?? 0,
      conversations: totalConversations ?? 0,
      bookings: totalBookings ?? 0,
      messages: totalMessages ?? 0,
      conversionRate,
      bookedLeads: bookedLeads ?? 0,
      qualifiedLeads: qualifiedLeads ?? 0,
    },
    dailyConversations: Object.entries(dailyConversations).map(([date, count]) => ({ date, count })),
    leadsByStage: Object.entries(stageCount).map(([stage, count]) => ({ stage, count })),
    recentBookings: recentBookings ?? [],
  });
}
