import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "art";
  const type  = req.nextUrl.searchParams.get("type") || "search";

  try {
    let url: string;
    if (type === "author") {
      // アカウントの投稿を取得
      url = `https://api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(query)}&limit=20`;
    } else {
      // キーワード検索
      url = `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=20`;
    }
    const res  = await fetch(url, { next: { revalidate: 30 } });
    const data = await res.json();

    // getAuthorFeedはfeed[]を返すので統一
    if (type === "author" && data.feed) {
      return NextResponse.json({ posts: data.feed.map((f: {post: unknown}) => f.post) });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
