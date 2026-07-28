import { NextResponse } from "next/server";
import { clearYahooToken } from "@/lib/yahoo/auth";

export async function POST() {
  await clearYahooToken();
  return NextResponse.json({ disconnected: true });
}
