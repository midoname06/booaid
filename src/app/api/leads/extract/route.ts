export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { extractAndUpdateLead } from "@/lib/ai/extract-lead";

export async function POST(req: NextRequest) {
  try {
    const { leadId, messages } = await req.json();
    await extractAndUpdateLead(leadId, messages);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[extract] error:", e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
