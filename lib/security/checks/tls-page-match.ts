import { resultStatus } from "@/lib/security/check-helpers";
import type { SecurityCheckContext } from "@/lib/security/types";

export async function runTlsPageMatch(ctx: SecurityCheckContext) {
  const label = "TLS page match";
  const weight = 8;

  if (!ctx.page) {
    return resultStatus("tls_page_match", label, weight, "warn", "No active page to verify.");
  }

  const pageUrl = ctx.page.url();
  if (pageUrl.startsWith("https://")) {
    return resultStatus("tls_page_match", label, weight, "pass", "Active browser tab uses HTTPS.");
  }

  if (pageUrl.startsWith("http://")) {
    return resultStatus(
      "tls_page_match",
      label,
      weight,
      "fail",
      "Active tab loaded over plain HTTP.",
    );
  }

  return resultStatus("tls_page_match", label, weight, "warn", "Non-web or blank page.");
}
