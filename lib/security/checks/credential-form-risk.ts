import {
  BRAND_ALLOWLIST,
  KNOWN_BRANDS,
  hostnameFromUrl,
  levenshtein,
  registrableDomain,
  resultStatus,
} from "@/lib/security/check-helpers";
import type { SecurityCheckContext } from "@/lib/security/types";

export async function runCredentialFormRisk(ctx: SecurityCheckContext) {
  const label = "Credential form risk";
  const weight = 14;

  if (!ctx.page) {
    return resultStatus("credential_form_risk", label, weight, "warn", "No active page to inspect.");
  }

  const hostname = hostnameFromUrl(ctx.url);
  const registrable = hostname ? registrableDomain(hostname) : undefined;
  const onAllowlist =
    hostname &&
    (BRAND_ALLOWLIST.has(registrable ?? "") || BRAND_ALLOWLIST.has(hostname));

  try {
    const hasPassword = await ctx.page.evaluate(() => {
      return document.querySelectorAll('input[type="password"]').length > 0;
    });

    if (!hasPassword) {
      return resultStatus(
        "credential_form_risk",
        label,
        weight,
        "pass",
        "No password field on page.",
      );
    }

    if (onAllowlist) {
      return resultStatus(
        "credential_form_risk",
        label,
        weight,
        "pass",
        "Password field on known trusted domain.",
      );
    }

    const hostBase = hostname?.replace(/^www\./, "").split(".")[0] ?? "";
    for (const brand of KNOWN_BRANDS) {
      const distance = levenshtein(hostBase, brand);
      if (distance <= 2 && hostBase.length >= 4) {
        return resultStatus(
          "credential_form_risk",
          label,
          weight,
          "fail",
          "Password field on site that may impersonate a known brand.",
        );
      }
    }

    if (!ctx.url.startsWith("https://")) {
      return resultStatus(
        "credential_form_risk",
        label,
        weight,
        "fail",
        "Password field on non-HTTPS page.",
      );
    }

    return resultStatus(
      "credential_form_risk",
      label,
      weight,
      "warn",
      "Password field on unrecognized domain.",
    );
  } catch {
    return resultStatus("credential_form_risk", label, weight, "warn", "Could not inspect forms.");
  }
}
