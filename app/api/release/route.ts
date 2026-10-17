import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public deployment identity only. Never return environment values or secrets.
export function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    environment: process.env.VERCEL_ENV || "development"
  }, { headers: { "Cache-Control": "no-store" } });
}
