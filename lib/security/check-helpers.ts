import type { CheckStatus } from "@/lib/security/types";

export function registrableDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split(".");
  if (parts.length <= 2) {
    return hostname.toLowerCase();
  }
  return parts.slice(-2).join(".");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i += 1) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
}

export function hostnameFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

export function resultStatus(
  id: import("@/lib/security/types").SecurityCheckId,
  label: string,
  weight: number,
  status: CheckStatus,
  details: string,
): import("@/lib/security/types").SecurityCheckResult {
  return { id, label, status, details, weight };
}

export const KNOWN_BRANDS = [
  "amazon",
  "google",
  "paypal",
  "microsoft",
  "apple",
  "facebook",
  "instagram",
  "netflix",
  "bank",
  "chase",
  "wellsfargo",
  "flipkart",
  "paytm",
  "razorpay",
] as const;

export const BRAND_ALLOWLIST = new Set([
  "amazon.com",
  "amazon.in",
  "google.com",
  "paypal.com",
  "microsoft.com",
  "apple.com",
  "facebook.com",
  "instagram.com",
  "netflix.com",
  "flipkart.com",
  "paytm.com",
  "razorpay.com",
  "example.com",
  "example.org",
  "iana.org",
]);
