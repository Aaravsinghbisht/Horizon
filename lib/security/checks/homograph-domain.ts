import { hostnameFromUrl, resultStatus } from "@/lib/security/check-helpers";
import type { SecurityCheckContext } from "@/lib/security/types";

export async function runHomographDomain(ctx: SecurityCheckContext) {
  const label = "Homograph domain";
  const weight = 10;
  const hostname = hostnameFromUrl(ctx.url);

  if (!hostname) {
    return resultStatus("homograph_domain", label, weight, "warn", "Could not parse hostname.");
  }

  if (hostname.startsWith("xn--") || hostname.includes("xn--")) {
    return resultStatus(
      "homograph_domain",
      label,
      weight,
      "fail",
      "Punycode hostname may hide homograph attack.",
    );
  }

  const hasLatin = /[a-z]/i.test(hostname);
  const hasNonLatin = /[^\x00-\x7F]/.test(hostname);
  if (hasLatin && hasNonLatin) {
    return resultStatus(
      "homograph_domain",
      label,
      weight,
      "fail",
      "Mixed-script hostname detected.",
    );
  }

  return resultStatus("homograph_domain", label, weight, "pass", "Hostname scripts look normal.");
}
