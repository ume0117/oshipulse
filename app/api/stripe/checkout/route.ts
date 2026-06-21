import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY is not set" }, { status: 500 });
    }
    if (!process.env.STRIPE_PRICE_ID) {
      return NextResponse.json({ error: "STRIPE_PRICE_ID is not set" }, { status: 500 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { userId } = await req.json();
    const origin = req.headers.get("origin") || "https://oshipulse-git-main-4-real-s-projects.vercel.app";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: { userId: userId || "anonymous" },
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error("Stripe error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
