import {authenticatedDestination} from "@/lib/auth-destination";
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
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        const destination=next==='/update-password'?next:await authenticatedDestination(supabase,data.user.id,next);
        return NextResponse.redirect(new URL(destination, origin));
      }
    } catch {
      // Keep configuration/provider failures inside the sign-in recovery flow.
    }
  }
  return NextResponse.redirect(new URL("/login?error=Unable to complete sign-in.", origin));
}
