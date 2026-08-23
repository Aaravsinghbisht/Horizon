import {
  BRAND_ALLOWLIST,
  KNOWN_BRANDS,
  hostnameFromUrl,
  levenshtein,
  registrableDomain,
  resultStatus,
} from "@/lib/security/check-helpers";
import type { SecurityCheckContext } from "@/lib/security/types";

export async function runTyposquatting(ctx: SecurityCheckContext) {
  const label = "Typosquatting";
  const weight = 12;
  const hostname = hostnameFromUrl(ctx.url);

  if (!hostname) {
    return resultStatus("typosquatting", label, weight, "warn", "Could not parse hostname.");
  }

  const registrable = registrableDomain(hostname);
  if (BRAND_ALLOWLIST.has(registrable) || BRAND_ALLOWLIST.has(hostname)) {
    return resultStatus("typosquatting", label, weight, "pass", "Hostname matches a known brand domain.");
  }

  const hostBase = hostname.replace(/^www\./, "").split(".")[0] ?? hostname;

  for (const brand of KNOWN_BRANDS) {
    const distance = levenshtein(hostBase, brand);
    if (distance > 0 && distance <= 2 && hostBase.length >= 4) {
      return resultStatus(
        "typosquatting",
        label,
        weight,
        "fail",
        `Hostname "${hostBase}" closely resembles "${brand}" (distance ${distance}).`,
      );
    }
    if (distance === 1 && hostBase.includes(brand.slice(0, 4))) {
      return resultStatus(
        "typosquatting",
        label,
        weight,
        "warn",
        `Hostname may impersonate "${brand}".`,
      );
    }
  }

  return resultStatus("typosquatting", label, weight, "pass", "No typosquatting pattern detected.");
}
