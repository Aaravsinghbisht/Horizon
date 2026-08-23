import { hostnameFromUrl, resultStatus } from "@/lib/security/check-helpers";
import type { SecurityCheckContext } from "@/lib/security/types";

const SUSPICIOUS_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq", ".zip", ".mov", ".top"];
const IP_HOST_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

export async function runSuspiciousTld(ctx: SecurityCheckContext) {
  const label = "Suspicious TLD";
  const weight = 8;
  const hostname = hostnameFromUrl(ctx.url);

  if (!hostname) {
    return resultStatus("suspicious_tld", label, weight, "warn", "Could not parse hostname.");
  }

  if (IP_HOST_RE.test(hostname)) {
    return resultStatus(
      "suspicious_tld",
      label,
      weight,
      "fail",
      "Site uses raw IP address instead of a domain.",
    );
  }

  const lower = hostname.toLowerCase();
  for (const tld of SUSPICIOUS_TLDS) {
    if (lower.endsWith(tld)) {
      return resultStatus(
        "suspicious_tld",
        label,
        weight,
        "fail",
        `High-risk TLD "${tld}" detected.`,
      );
    }
  }

  return resultStatus("suspicious_tld", label, weight, "pass", "TLD looks conventional.");
}
