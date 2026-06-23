import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ oshi: [] });
  const { data } = await supabase
    .from("oshi_list")
    .select("handle")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return NextResponse.json({ oshi: data?.map(d => d.handle) || [] });
}

export async function POST(req: NextRequest) {
  const { userId, handle } = await req.json();
  if (!userId || !handle) return NextResponse.json({ error: "Missing data" }, { status: 400 });
  const { error } = await supabase
    .from("oshi_list")
    .upsert({ user_id: userId, handle }, { onConflict: "user_id,handle" });
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId, handle } = await req.json();
  if (!userId || !handle) return NextResponse.json({ error: "Missing data" }, { status: 400 });
  const { error } = await supabase
    .from("oshi_list")
    .delete()
    .eq("user_id", userId)
    .eq("handle", handle);
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
