import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { handle, password } = await req.json();

    // Blueskyで認証
    const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: handle, password }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "ログインに失敗しました" }, { status: 401 });
    }

    const session = await res.json();

    // Supabaseにユーザーを保存
    const { data, error } = await supabase
      .from("users")
      .upsert({
        bluesky_handle: session.handle,
        bluesky_did: session.did,
      }, { onConflict: "bluesky_did" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      user: {
        id: data.id,
        handle: session.handle,
        did: session.did,
        displayName: session.displayName,
        avatar: session.avatar,
        accessJwt: session.accessJwt,
      }
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
