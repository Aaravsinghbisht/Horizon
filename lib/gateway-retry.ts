const RETRY_DELAYS_MS = [2000, 5000, 10_000] as const;
export const MAX_GATEWAY_RETRIES = RETRY_DELAYS_MS.length;

const NON_RETRYABLE_PATTERNS = [
  /session.*no longer active/i,
  /session_not_active/i,
  /rejected the provided api key/i,
  /authentication failed/i,
  /invalid api key/i,
  /cancelled/i,
  /canceled/i,
] as const;

const RETRYABLE_PATTERNS = [
  /503/,
  /service temporarily unavailable/i,
  /gateway/i,
  /model_call_failed/i,
  /rate limit/i,
  /overloaded/i,
  /timeout/i,
  /temporarily unavailable/i,
  /credit card/i,
  /customer_verification/i,
] as const;

export function isRetryableGatewayError(message: string, code?: string): boolean {
  const lower = message.toLowerCase();

  if (NON_RETRYABLE_PATTERNS.some((pattern) => pattern.test(lower))) {
    return false;
  }

  if (code === "MODEL_CALL_FAILED") {
    return true;
  }

  return RETRYABLE_PATTERNS.some((pattern) => pattern.test(lower));
}

export function gatewayRetryDelayMs(attempt: number): number {
  return RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 10_000;
}

export function formatGatewayRetryMessage(attempt: number, maxAttempts: number): string {
  return `Gateway busy — retrying (${attempt}/${maxAttempts})…`;
}

export function formatGatewayErrorMessage(message: string, code?: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("credit card") || lower.includes("customer_verification")) {
    return "Vercel AI Gateway needs a credit card on your account before it can run models. Add one in the Vercel dashboard under AI, then try again.";
  }

  if (
    code === "MODEL_CALL_FAILED" ||
    lower.includes("gateway") ||
    lower.includes("rejected the provided api key") ||
    lower.includes("authentication failed") ||
    lower.includes("503") ||
    lower.includes("service temporarily unavailable")
  ) {
    return "AI Gateway could not authenticate. Ensure .env.local has your key, run npm run restart, and add a card at vercel.com/ai if required.";
  }

  if (/session.*no longer active|session_not_active/i.test(lower)) {
    return "Session expired after a server restart. Starting a fresh conversation…";
  }

  return message.length > 0 ? message : "The agent turn failed. Please try again.";
}
