import { isDemoBrowserUrl } from "@/lib/browser-activity";
import { getPreviewPage } from "@/lib/browser-cdp-shared";
import { SECURITY_CHECKS } from "@/lib/security/check-registry";
import { scoreCheckResults, tierFromScore } from "@/lib/security/risk-scorer";
import type {
  SecurityCheckContext,
  SecurityEvaluation,
  SecurityStreamEvent,
} from "@/lib/security/types";

const CHECK_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  at: number;
  url: string;
  evaluation: SecurityEvaluation;
};

const evaluationCache = new Map<string, CacheEntry>();
const activeAbortControllers = new Map<string, AbortController>();

function cacheKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function shouldSkipUrl(url: string): string | undefined {
  if (!url || url === "about:blank") {
    return "Blank page";
  }
  if (url.startsWith("chrome://") || url.startsWith("chrome-untrusted://")) {
    return "Internal browser page";
  }
  if (isDemoBrowserUrl(url)) {
    return "Demo URL";
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Non-web URL";
    }
  } catch {
    return "Invalid URL";
  }
  return undefined;
}

function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    promise
      .then((value) => {
        clearTimeout(timer);
        if (signal) {
          signal.removeEventListener("abort", onAbort);
        }
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        if (signal) {
          signal.removeEventListener("abort", onAbort);
        }
        reject(error);
      });
  });
}

export function registerEvaluationAbort(evalId: string, controller: AbortController): void {
  activeAbortControllers.set(evalId, controller);
}

export function abortEvaluation(evalId: string): void {
  const controller = activeAbortControllers.get(evalId);
  if (controller) {
    controller.abort();
    activeAbortControllers.delete(evalId);
  }
}

export async function runSecurityEvaluation(options: {
  url: string;
  focusUrl?: string;
  evalId?: string;
  signal?: AbortSignal;
  onEvent?: (event: SecurityStreamEvent) => void;
}): Promise<SecurityEvaluation> {
  const skipReason = shouldSkipUrl(options.url);
  if (skipReason) {
    const evaluation: SecurityEvaluation = {
      url: options.url,
      score: 0,
      tier: "safe",
      checks: [],
    };
    options.onEvent?.({ type: "skipped", url: options.url, reason: skipReason });
    options.onEvent?.({ type: "complete", evaluation });
    return evaluation;
  }

  const key = cacheKey(options.url);
  const cached = evaluationCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS && cached.url === options.url) {
    options.onEvent?.({ type: "complete", evaluation: cached.evaluation });
    return cached.evaluation;
  }

  let page: SecurityCheckContext["page"] | undefined;
  const needsPage = SECURITY_CHECKS.some((check) => check.requiresPage);

  if (needsPage) {
    const preview = await getPreviewPage({ focusUrl: options.focusUrl ?? options.url });
    page = preview?.candidate.page;
  }

  const ctx: SecurityCheckContext = {
    url: options.url,
    focusUrl: options.focusUrl,
    page,
  };

  const results: import("@/lib/security/types").SecurityCheckResult[] = [];

  for (const check of SECURITY_CHECKS) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    options.onEvent?.({ type: "check-start", id: check.id, label: check.label });

    let result: import("@/lib/security/types").SecurityCheckResult;
    try {
      result = await withTimeout(check.run(ctx), CHECK_TIMEOUT_MS, options.signal);
    } catch (error) {
      result = {
        id: check.id,
        label: check.label,
        weight: check.weight,
        status: "warn",
        details:
          error instanceof DOMException && error.name === "AbortError"
            ? "Check aborted."
            : "Check timed out or failed.",
      };
    }

    results.push(result);
    options.onEvent?.({ type: "check-result", result });
  }

  const score = scoreCheckResults(results);
  const tier = tierFromScore(score);
  const evaluation: SecurityEvaluation = {
    url: options.url,
    score,
    tier,
    checks: results,
  };

  evaluationCache.set(key, { at: Date.now(), url: options.url, evaluation });
  options.onEvent?.({ type: "complete", evaluation });

  if (options.evalId) {
    activeAbortControllers.delete(options.evalId);
  }

  return evaluation;
}

export function formatStreamLine(event: SecurityStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}
