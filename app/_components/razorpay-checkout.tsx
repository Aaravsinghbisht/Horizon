"use client";

import type { EveMessageInputRequest } from "eve/react";
import {
  formatInrFromPaise,
  parseOrderAmountPaise,
} from "@/lib/payment/checkout-hitl";
import { CreditCardIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-razorpay-checkout]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay script failed"));
    document.body.appendChild(script);
  });
}

export function RazorpayCheckout({
  checkoutRequest,
  disabled,
  onPaymentSuccess,
}: {
  readonly checkoutRequest: EveMessageInputRequest;
  readonly disabled?: boolean;
  readonly onPaymentSuccess: (paymentId: string) => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountPaise = parseOrderAmountPaise(checkoutRequest.prompt);
  const amountLabel = formatInrFromPaise(amountPaise);

  const openCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await loadRazorpayScript();

      const orderResponse = await fetch("/api/payment/create-order", {
        body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const orderBody = (await orderResponse.json()) as {
        ok: boolean;
        demo?: boolean;
        keyId?: string;
        order?: { id: string; amount: number; currency: string };
        error?: string;
      };

      if (!orderResponse.ok || !orderBody.ok || !orderBody.order || !orderBody.keyId) {
        throw new Error(orderBody.error ?? "Could not create payment order");
      }

      if (orderBody.demo || orderBody.keyId === "demo") {
        const demoPaymentId = `demo_pay_${Date.now()}`;
        await onPaymentSuccess(demoPaymentId);
        return;
      }

      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        throw new Error("Razorpay checkout unavailable");
      }

      const razorpay = new Razorpay({
        amount: orderBody.order.amount,
        currency: orderBody.order.currency,
        description: "Secure checkout via Compositer",
        handler: async (response: RazorpayHandlerResponse) => {
          try {
            const verifyResponse = await fetch("/api/payment/verify", {
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
              headers: { "Content-Type": "application/json" },
              method: "POST",
            });

            const verifyBody = (await verifyResponse.json()) as {
              ok: boolean;
              paymentId?: string;
              error?: string;
            };

            if (!verifyResponse.ok || !verifyBody.ok) {
              throw new Error(verifyBody.error ?? "Payment verification failed");
            }

            await onPaymentSuccess(verifyBody.paymentId ?? response.razorpay_payment_id);
          } catch (verifyError) {
            setError(
              verifyError instanceof Error ? verifyError.message : "Payment verification failed",
            );
          } finally {
            setLoading(false);
          }
        },
        key: orderBody.keyId,
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        name: "Compositer",
        order_id: orderBody.order.id,
        theme: { color: "#0f766e" },
      });

      razorpay.open();
      setLoading(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open Razorpay checkout");
      setLoading(false);
    }
  }, [amountPaise, onPaymentSuccess]);

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-3 text-sm">
      <div className="flex items-start gap-3">
        <CreditCardIcon className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="font-medium text-emerald-950 dark:text-emerald-50">
              Site rated SAFE — pay via Compositer Razorpay
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Do not use the merchant checkout button. Order total: {amountLabel}
            </p>
          </div>
          <Button disabled={disabled || loading} onClick={() => void openCheckout()} size="sm" type="button">
            {loading ? "Opening checkout…" : `Pay ${amountLabel} with Razorpay`}
          </Button>
          {error ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
