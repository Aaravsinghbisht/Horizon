import {
  BRAND_ALLOWLIST,
  hostnameFromUrl,
  registrableDomain,
  resultStatus,
} from "@/lib/security/check-helpers";
import type { SecurityCheckContext } from "@/lib/security/types";

const PATH_KEYWORDS = [
  "verify",
  "login",
  "signin",
  "sign-in",
  "account",
  "secure",
  "update",
  "confirm",
  "wallet",
  "banking",
];

export async function runPhishingUrlPath(ctx: SecurityCheckContext) {
  const label = "Phishing URL path";
  const weight = 10;

  try {
    const parsed = new URL(ctx.url);
    const hostname = parsed.hostname.toLowerCase();
    const registrable = registrableDomain(hostname);

    if (BRAND_ALLOWLIST.has(registrable) || BRAND_ALLOWLIST.has(hostname)) {
      return resultStatus(
        "phishing_url_path",
        label,
        weight,
        "pass",
        "Known brand host with normal path.",
      );
    }

    const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
    const matches = PATH_KEYWORDS.filter((kw) => pathAndQuery.includes(kw));

    if (matches.length >= 2) {
      return resultStatus(
        "phishing_url_path",
        label,
        weight,
        "fail",
        `Suspicious path keywords: ${matches.join(", ")}.`,
      );
    }

    if (matches.length === 1) {
      return resultStatus(
        "phishing_url_path",
        label,
        weight,
        "warn",
        `Suspicious path keyword: ${matches[0]}.`,
      );
    }

    return resultStatus("phishing_url_path", label, weight, "pass", "URL path looks normal.");
  } catch {
    return resultStatus("phishing_url_path", label, weight, "warn", "Could not parse URL.");
  }
}
