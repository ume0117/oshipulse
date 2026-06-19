import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const url = `https://api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(query)}&limit=10`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
