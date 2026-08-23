import type { RiskTier, SecurityCheckResult } from "@/lib/security/types";

const REVIEW_THRESHOLD = 26;
const DANGER_THRESHOLD = 61;

export function scoreCheckResults(checks: readonly SecurityCheckResult[]): number {
  let score = 0;

  for (const check of checks) {
    if (check.status === "fail") {
      score += check.weight;
    } else if (check.status === "warn") {
      score += check.weight / 2;
    }
  }

  return Math.min(100, Math.round(score));
}

export function tierFromScore(score: number): RiskTier {
  if (score >= DANGER_THRESHOLD) {
    return "danger";
  }
  if (score >= REVIEW_THRESHOLD) {
    return "review";
  }
  return "safe";
}

export function scoreToTier(score: number): RiskTier {
  return tierFromScore(score);
}
