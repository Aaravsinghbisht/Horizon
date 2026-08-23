export type SecurityCheckId =
  | "https_transport"
  | "tls_page_match"
  | "typosquatting"
  | "homograph_domain"
  | "suspicious_tld"
  | "phishing_url_path"
  | "redirect_depth"
  | "credential_form_risk"
  | "cross_origin_submit"
  | "phishing_page_text";

export type CheckStatus = "pass" | "warn" | "fail";

export type RiskTier = "safe" | "review" | "danger";

export type SecurityCheckResult = {
  id: SecurityCheckId;
  label: string;
  status: CheckStatus;
  details: string;
  weight: number;
};

export type SecurityEvaluation = {
  url: string;
  score: number;
  tier: RiskTier;
  checks: SecurityCheckResult[];
};

export type SecurityStreamEvent =
  | { type: "check-start"; id: SecurityCheckId; label: string }
  | { type: "check-result"; result: SecurityCheckResult }
  | { type: "complete"; evaluation: SecurityEvaluation }
  | { type: "skipped"; url: string; reason: string }
  | { type: "error"; message: string };

export type SecurityCheckContext = {
  url: string;
  focusUrl?: string;
  page?: import("puppeteer-core").Page;
};

export type SecurityCheckDefinition = {
  id: SecurityCheckId;
  label: string;
  weight: number;
  requiresPage: boolean;
  run: (ctx: SecurityCheckContext) => Promise<SecurityCheckResult>;
};
