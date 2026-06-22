import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query  = req.nextUrl.searchParams.get("q") || "art";
  const type   = req.nextUrl.searchParams.get("type") || "search";
  const cursor = req.nextUrl.searchParams.get("cursor") || "";

  try {
    let url: string;
    if (type === "author") {
      url = `https://api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(query)}&limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    } else {
      url = `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    }
    const res  = await fetch(url);
    const data = await res.json();

    if (type === "author" && data.feed) {
      return NextResponse.json({
        posts: data.feed.map((f: {post: unknown}) => f.post),
        cursor: data.cursor || null,
      });
    }
    return NextResponse.json({
      posts: data.posts || [],
      cursor: data.cursor || null,
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
