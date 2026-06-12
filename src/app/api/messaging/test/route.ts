export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendMessage, type Channel } from "@/lib/messaging";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channel, to } = await req.json() as { channel: Channel; to: string };

  const result = await sendMessage({
    channel,
    to,
    message: `✅ Test Wafiq Agents — canale ${channel} funzionante! (${new Date().toLocaleString("it-IT")})`,
    subject: "Test Wafiq Agents",
  });

  console.log("[messaging/test] result:", JSON.stringify(result));
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
