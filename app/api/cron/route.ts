import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 全ユーザーの推しリストを取得
    const { data: oshiData } = await supabase
      .from("oshi_list")
      .select("user_id, handle");

    if (!oshiData || oshiData.length === 0) {
      return NextResponse.json({ ok: true, message: "No oshi registered" });
    }

    let notified = 0;

    for (const oshi of oshiData) {
      // 推しの最新投稿を取得
      const res = await fetch(
        `https://api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${oshi.handle}&limit=1`
      );
      const data = await res.json();
      if (!data.feed || data.feed.length === 0) continue;

      const latestPost = data.feed[0].post;
      const latestUri  = latestPost.uri;

      // 最後に見た投稿と比較
      const { data: lastSeen } = await supabase
        .from("oshi_last_seen")
        .select("last_uri")
        .eq("user_id", oshi.user_id)
        .eq("oshi_handle", oshi.handle)
        .single();

      if (lastSeen?.last_uri === latestUri) continue;

      // 新着あり！最終確認を更新
      await supabase.from("oshi_last_seen").upsert({
        user_id: oshi.user_id,
        oshi_handle: oshi.handle,
        last_uri: latestUri,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,oshi_handle" });

      // Push通知を取得して送信
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", oshi.user_id);

      if (!subs) continue;

      const authorName = latestPost.author?.displayName || oshi.handle;
      const postText   = latestPost.record?.text?.slice(0, 60) || "";

      for (const { subscription } of subs) {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: `${authorName} が投稿しました！`,
              body: postText,
              url: `https://bsky.app/profile/${oshi.handle}`,
            })
          );
          notified++;
        } catch (e) {
          console.error("Push error:", e);
        }
      }
    }

    return NextResponse.json({ ok: true, notified });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
