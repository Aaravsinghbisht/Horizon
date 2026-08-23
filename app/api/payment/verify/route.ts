import { createHmac } from "node:crypto";
import { getRazorpayConfig } from "@/lib/payment/razorpay-config";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type VerifyBody = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export async function POST(request: Request) {
  let body: VerifyBody;

  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const orderId = body.razorpay_order_id?.trim();
  const paymentId = body.razorpay_payment_id?.trim();
  const signature = body.razorpay_signature?.trim();

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json(
      { ok: false, error: "Missing Razorpay payment fields" },
      { status: 400 },
    );
  }

  if (orderId.startsWith("demo_order_")) {
    return NextResponse.json({
      ok: true,
      demo: true,
      paymentId,
    });
  }

  const { keySecret, configured } = getRazorpayConfig();
  if (!configured || !keySecret) {
    return NextResponse.json({ ok: false, error: "Razorpay not configured" }, { status: 503 });
  }

  const expected = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expected !== signature) {
    return NextResponse.json({ ok: false, error: "Invalid payment signature" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    paymentId,
  });
}
