import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ is_pro: false });

  const { data } = await supabase
    .from("users")
    .select("is_pro")
    .eq("id", userId)
    .single();

  return NextResponse.json({ is_pro: data?.is_pro || false });
}
