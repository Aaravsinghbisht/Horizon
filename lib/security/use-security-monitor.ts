"use client";

import { SECURITY_CHECKS } from "@/lib/security/check-registry";
import type {
  RiskTier,
  SecurityCheckId,
  SecurityCheckResult,
  SecurityStreamEvent,
} from "@/lib/security/types";
import { useCallback, useEffect, useRef, useState } from "react";

export type SecurityPhase = "idle" | "scanning" | "safe" | "review" | "blocked";

export type SecurityMonitorState = {
  phase: SecurityPhase;
  url?: string;
  score: number;
  tier: RiskTier | null;
  checks: Map<SecurityCheckId, SecurityCheckResult | "running">;
  evalId?: string;
  error?: string;
};

const DEBOUNCE_MS = 800;

function initialChecks(): Map<SecurityCheckId, SecurityCheckResult | "running"> {
  const map = new Map<SecurityCheckId, SecurityCheckResult | "running">();
  for (const check of SECURITY_CHECKS) {
    map.set(check.id, {
      id: check.id,
      label: check.label,
      status: "pass",
      details: "Waiting…",
      weight: check.weight,
    });
  }
  return map;
}

export function useSecurityMonitor(options: {
  enabled: boolean;
  focusUrl?: string;
  onComplete?: (tier: RiskTier, score: number) => void;
}) {
  const [state, setState] = useState<SecurityMonitorState>({
    phase: "idle",
    score: 0,
    tier: null,
    checks: initialChecks(),
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const evalIdRef = useRef<string | undefined>(undefined);
  const lastUrlRef = useRef<string | undefined>(undefined);
  const onCompleteRef = useRef(options.onComplete);
  onCompleteRef.current = options.onComplete;

  const stopScan = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (evalIdRef.current) {
      void fetch("/api/security/stop", {
        body: JSON.stringify({ evalId: evalIdRef.current }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      evalIdRef.current = undefined;
    }
  }, []);

  const runEvaluation = useCallback(
    async (url: string, focusUrl?: string) => {
      stopScan();

      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        phase: "scanning",
        url,
        score: 0,
        tier: null,
        checks: initialChecks(),
      });

      try {
        const response = await fetch("/api/security/evaluate", {
          body: JSON.stringify({ url, focusUrl }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Security evaluate failed (${response.status})`);
        }

        const evalId = response.headers.get("X-Security-Eval-Id");
        evalIdRef.current = evalId ?? undefined;

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response stream");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.trim().length === 0) {
              continue;
            }

            const event = JSON.parse(line) as SecurityStreamEvent;

            if (event.type === "check-start") {
              setState((current) => {
                const checks = new Map(current.checks);
                checks.set(event.id, "running");
                return { ...current, checks };
              });
            } else if (event.type === "check-result") {
              setState((current) => {
                const checks = new Map(current.checks);
                checks.set(event.result.id, event.result);
                return { ...current, checks };
              });
            } else if (event.type === "complete") {
              const { evaluation } = event;
              const phase: SecurityPhase =
                evaluation.tier === "danger"
                  ? "blocked"
                  : evaluation.tier === "review"
                    ? "review"
                    : "safe";

              setState({
                phase,
                url: evaluation.url,
                score: evaluation.score,
                tier: evaluation.tier,
                checks: new Map(
                  evaluation.checks.map((check) => [check.id, check] as const),
                ),
                evalId: evalIdRef.current,
              });

              onCompleteRef.current?.(evaluation.tier, evaluation.score);
            } else if (event.type === "skipped") {
              setState({
                phase: "safe",
                url: event.url,
                score: 0,
                tier: "safe",
                checks: initialChecks(),
              });
              onCompleteRef.current?.("safe", 0);
            } else if (event.type === "error") {
              setState((current) => ({
                ...current,
                phase: "idle",
                error: event.message,
              }));
            }
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setState((current) => ({
          ...current,
          phase: "idle",
          error: error instanceof Error ? error.message : "Security scan failed",
        }));
      } finally {
        abortRef.current = null;
      }
    },
    [stopScan],
  );

  useEffect(() => {
    if (!options.enabled || !options.focusUrl) {
      lastUrlRef.current = undefined;
      return;
    }

    const url = options.focusUrl;
    if (url === lastUrlRef.current) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      lastUrlRef.current = url;
      void runEvaluation(url, url);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [options.enabled, options.focusUrl, runEvaluation]);

  useEffect(() => () => stopScan(), [stopScan]);

  const resetSecurity = useCallback(() => {
    stopScan();
    lastUrlRef.current = undefined;
    setState({
      phase: "idle",
      score: 0,
      tier: null,
      checks: initialChecks(),
    });
  }, [stopScan]);

  const acknowledgeReview = useCallback(() => {
    setState((current) => ({
      ...current,
      phase: "safe",
    }));
  }, []);

  const setBlocked = useCallback(() => {
    setState((current) => ({
      ...current,
      phase: "blocked",
      tier: "danger",
    }));
  }, []);

  return {
    security: state,
    resetSecurity,
    acknowledgeReview,
    setBlocked,
    stopScan,
  };
}
