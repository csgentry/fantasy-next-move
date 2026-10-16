import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: "Historical Yahoo imports are outside the initial product. Connect a current league when Yahoo access is enabled." }, {status: 410, headers: {"Cache-Control": "private, no-store"}});
}
