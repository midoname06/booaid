import { NextRequest, NextResponse } from "next/server";
import { makeOAuth2Client } from "@/lib/google-calendar";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const workspaceId = searchParams.get("state");

  if (!code || !workspaceId) {
    return NextResponse.redirect(`${origin}/settings?error=google`);
  }

  try {
    const auth = makeOAuth2Client();
    const { tokens } = await auth.getToken(code);

    await supabaseAdmin
      .from("integrations")
      .upsert(
        {
          workspace_id: workspaceId,
          provider: "google_calendar",
          credentials: tokens,
          status: "connected",
        },
        { onConflict: "workspace_id,provider" }
      );

    return NextResponse.redirect(`${origin}/settings?connected=google`);
  } catch {
    return NextResponse.redirect(`${origin}/settings?error=google`);
  }
}
