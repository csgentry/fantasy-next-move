import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clearYahooToken } from "@/lib/yahoo/auth";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    await clearYahooToken(data.user.id);
    const { error } = await supabase.from("connected_accounts").delete().eq("user_id", data.user.id).eq("provider", "yahoo");
    if (error) throw error;
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to disconnect Yahoo." }, { status: 500 });
  }
}
