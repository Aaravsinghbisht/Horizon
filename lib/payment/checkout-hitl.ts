import type { EveMessageInputRequest } from "eve/react";

const CHECKOUT_PROMPT_RE =
  /checkout|payment|order total|ready to pay|pay via compositer|cart total|confirm purchase|complete payment/i;

const RAZORPAY_OPTION_RE = /razorpay|compositer|secure checkout|^pay\b/i;

export function isCheckoutPaymentHitl(request: EveMessageInputRequest): boolean {
  if (!CHECKOUT_PROMPT_RE.test(request.prompt)) {
    return false;
  }

  const hasPayOption =
    request.options?.some(
      (option) => RAZORPAY_OPTION_RE.test(option.label) || option.id === "pay",
    ) ?? false;

  return hasPayOption || request.allowFreeform === true;
}

export function findCheckoutPaymentRequest(
  requests: readonly EveMessageInputRequest[],
): EveMessageInputRequest | undefined {
  return requests.find(isCheckoutPaymentHitl);
}

export function parseOrderAmountPaise(prompt: string): number {
  const patterns = [
    /₹\s*([\d,]+(?:\.\d{1,2})?)/,
    /INR\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:total|amount)[^\d₹]*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:INR|₹)/i,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match?.[1]) {
      const value = Number.parseFloat(match[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0) {
        return Math.round(value * 100);
      }
    }
  }

  return 10000;
}

export function formatInrFromPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    style: "currency",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
