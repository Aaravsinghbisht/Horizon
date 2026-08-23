import { resultStatus } from "@/lib/security/check-helpers";
import type { SecurityCheckContext } from "@/lib/security/types";

const PHISHING_PHRASES = [
  "verify your account",
  "confirm your password",
  "account suspended",
  "unusual activity",
  "update your payment",
  "confirm identity",
  "security alert",
  "login to continue",
];

export async function runPhishingPageText(ctx: SecurityCheckContext) {
  const label = "Phishing page text";
  const weight = 8;

  if (!ctx.page) {
    return resultStatus("phishing_page_text", label, weight, "warn", "No active page to inspect.");
  }

  try {
    const text = await ctx.page.evaluate(() => {
      const title = document.title ?? "";
      const body = (document.body?.innerText ?? "").slice(0, 4000).toLowerCase();
      return `${title.toLowerCase()} ${body}`;
    });

    const matches = PHISHING_PHRASES.filter((phrase) => text.includes(phrase));

    if (matches.length >= 2) {
      return resultStatus(
        "phishing_page_text",
        label,
        weight,
        "fail",
        `Phishing phrases found: ${matches.slice(0, 3).join("; ")}.`,
      );
    }

    if (matches.length === 1) {
      return resultStatus(
        "phishing_page_text",
        label,
        weight,
        "warn",
        `Suspicious phrase: "${matches[0]}".`,
      );
    }

    return resultStatus("phishing_page_text", label, weight, "pass", "No phishing phrases detected.");
  } catch {
    return resultStatus("phishing_page_text", label, weight, "warn", "Could not read page text.");
  }
}
