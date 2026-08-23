import { resultStatus } from "@/lib/security/check-helpers";
import type { SecurityCheckContext } from "@/lib/security/types";

export async function runRedirectDepth(ctx: SecurityCheckContext) {
  const label = "Redirect depth";
  const weight = 8;

  if (!ctx.page) {
    return resultStatus("redirect_depth", label, weight, "warn", "No active page to inspect.");
  }

  try {
    const redirectCount = await ctx.page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (!nav) {
        return 0;
      }
      return nav.redirectCount ?? 0;
    });

    if (redirectCount > 2) {
      return resultStatus(
        "redirect_depth",
        label,
        weight,
        "fail",
        `${redirectCount} redirects detected — possible redirect chain.`,
      );
    }

    if (redirectCount > 1) {
      return resultStatus(
        "redirect_depth",
        label,
        weight,
        "warn",
        `${redirectCount} redirects detected.`,
      );
    }

    return resultStatus("redirect_depth", label, weight, "pass", "Redirect chain is short.");
  } catch {
    return resultStatus("redirect_depth", label, weight, "warn", "Could not read navigation timing.");
  }
}
