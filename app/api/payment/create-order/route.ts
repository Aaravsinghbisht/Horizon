import { getRazorpayConfig } from "@/lib/payment/razorpay-config";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CreateOrderBody = {
  amount?: number;
  currency?: string;
};

export async function POST(request: Request) {
  let body: CreateOrderBody;

  try {
    body = (await request.json()) as CreateOrderBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { keyId, keySecret, currency, configured } = getRazorpayConfig();

  const amount =
    typeof body.amount === "number" && body.amount > 0 ? Math.round(body.amount) : 10000;
  const orderCurrency = body.currency?.trim() || currency;

  if (!configured || !keyId || !keySecret) {
    return NextResponse.json({
      ok: true,
      demo: true,
      keyId: "demo",
      order: {
        amount,
        currency: orderCurrency,
        id: `demo_order_${Date.now()}`,
      },
    });
  }

  const receipt = `compositer_${Date.now()}`;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    body: JSON.stringify({
      amount,
      currency: orderCurrency,
      receipt,
    }),
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const data = (await response.json()) as {
    id?: string;
    amount?: number;
    currency?: string;
    error?: { description?: string };
  };

  if (!response.ok || !data.id) {
    return NextResponse.json(
      {
        ok: false,
        error: data.error?.description ?? "Failed to create Razorpay order",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    keyId,
    order: {
      amount: data.amount ?? amount,
      currency: data.currency ?? orderCurrency,
      id: data.id,
    },
  });
}
