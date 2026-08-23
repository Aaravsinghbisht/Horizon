import { registrableDomain, resultStatus } from "@/lib/security/check-helpers";
import type { SecurityCheckContext } from "@/lib/security/types";

export async function runCrossOriginSubmit(ctx: SecurityCheckContext) {
  const label = "Cross-origin submit";
  const weight = 10;

  if (!ctx.page) {
    return resultStatus("cross_origin_submit", label, weight, "warn", "No active page to inspect.");
  }

  try {
    const pageHost = new URL(ctx.page.url()).hostname.toLowerCase();
    const pageRegistrable = registrableDomain(pageHost);

    const externalActions = await ctx.page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll("form"));
      const external: string[] = [];

      for (const form of forms) {
        const action = form.getAttribute("action");
        if (!action || action.startsWith("#") || action.startsWith("javascript:")) {
          continue;
        }
        try {
          const target = new URL(action, window.location.href);
          external.push(target.hostname);
        } catch {
          external.push("invalid");
        }
      }

      return external;
    });

    const suspicious = externalActions.filter((host) => {
      if (!host || host === "invalid") {
        return false;
      }
      const hostLower = host.toLowerCase();
      return registrableDomain(hostLower) !== pageRegistrable && hostLower !== pageHost;
    });

    if (suspicious.length > 0) {
      return resultStatus(
        "cross_origin_submit",
        label,
        weight,
        "fail",
        `Form submits to external host: ${suspicious[0]}.`,
      );
    }

    return resultStatus("cross_origin_submit", label, weight, "pass", "Forms submit to same origin.");
  } catch {
    return resultStatus("cross_origin_submit", label, weight, "warn", "Could not inspect form actions.");
  }
}
