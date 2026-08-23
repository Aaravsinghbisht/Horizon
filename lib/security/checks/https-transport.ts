import {
  hostnameFromUrl,
  resultStatus,
} from "@/lib/security/check-helpers";
import type { SecurityCheckContext } from "@/lib/security/types";

export async function runHttpsTransport(ctx: SecurityCheckContext) {
  const label = "HTTPS transport";
  const weight = 10;

  try {
    const parsed = new URL(ctx.url);
    if (parsed.protocol === "https:") {
      return resultStatus("https_transport", label, weight, "pass", "Connection uses HTTPS.");
    }
    return resultStatus(
      "https_transport",
      label,
      weight,
      "fail",
      "Page URL is not HTTPS — credentials may be exposed.",
    );
  } catch {
    return resultStatus("https_transport", label, weight, "warn", "Could not parse URL.");
  }
}
