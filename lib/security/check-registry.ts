import { runCredentialFormRisk } from "@/lib/security/checks/credential-form-risk";
import { runCrossOriginSubmit } from "@/lib/security/checks/cross-origin-submit";
import { runHomographDomain } from "@/lib/security/checks/homograph-domain";
import { runHttpsTransport } from "@/lib/security/checks/https-transport";
import { runPhishingPageText } from "@/lib/security/checks/phishing-page-text";
import { runPhishingUrlPath } from "@/lib/security/checks/phishing-url-path";
import { runRedirectDepth } from "@/lib/security/checks/redirect-depth";
import { runSuspiciousTld } from "@/lib/security/checks/suspicious-tld";
import { runTlsPageMatch } from "@/lib/security/checks/tls-page-match";
import { runTyposquatting } from "@/lib/security/checks/typosquatting";
import type { SecurityCheckDefinition } from "@/lib/security/types";

export const SECURITY_CHECKS: SecurityCheckDefinition[] = [
  {
    id: "https_transport",
    label: "HTTPS transport",
    weight: 10,
    requiresPage: false,
    run: runHttpsTransport,
  },
  {
    id: "tls_page_match",
    label: "TLS page match",
    weight: 8,
    requiresPage: true,
    run: runTlsPageMatch,
  },
  {
    id: "typosquatting",
    label: "Typosquatting",
    weight: 12,
    requiresPage: false,
    run: runTyposquatting,
  },
  {
    id: "homograph_domain",
    label: "Homograph domain",
    weight: 10,
    requiresPage: false,
    run: runHomographDomain,
  },
  {
    id: "suspicious_tld",
    label: "Suspicious TLD",
    weight: 8,
    requiresPage: false,
    run: runSuspiciousTld,
  },
  {
    id: "phishing_url_path",
    label: "Phishing URL path",
    weight: 10,
    requiresPage: false,
    run: runPhishingUrlPath,
  },
  {
    id: "redirect_depth",
    label: "Redirect depth",
    weight: 8,
    requiresPage: true,
    run: runRedirectDepth,
  },
  {
    id: "credential_form_risk",
    label: "Credential form risk",
    weight: 14,
    requiresPage: true,
    run: runCredentialFormRisk,
  },
  {
    id: "cross_origin_submit",
    label: "Cross-origin submit",
    weight: 10,
    requiresPage: true,
    run: runCrossOriginSubmit,
  },
  {
    id: "phishing_page_text",
    label: "Phishing page text",
    weight: 8,
    requiresPage: true,
    run: runPhishingPageText,
  },
];
