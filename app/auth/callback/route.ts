import { safeNextPath, siteOrigin } from "../../../lib/site-origin";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = safeNextPath(requestedNext);
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin));
    } catch {
      // Keep configuration/provider failures inside the sign-in recovery flow.
    }
  }
  return NextResponse.redirect(new URL("/login?error=Unable to complete sign-in.", origin));
}
