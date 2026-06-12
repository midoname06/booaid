import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { workspaceId, leadId, agentId, service, start, end, calendarTokens } = await req.json();

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials(calendarTokens);
  const calendar = google.calendar({ version: "v3", auth });

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: { summary: `${service} — Wafiq`, start: { dateTime: start }, end: { dateTime: end } },
  });

  const { data, error } = await supabaseAdmin.from("bookings").insert({
    workspace_id: workspaceId, lead_id: leadId, agent_id: agentId,
    service, start_at: start, end_at: end, status: "confirmed",
    external_event_id: event.data.id,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
