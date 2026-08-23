"use client";

import { SECURITY_CHECKS } from "@/lib/security/check-registry";
import type { SecurityMonitorState } from "@/lib/security/use-security-monitor";
import { SecurityFadingCheckCard } from "./security-fading-check-card";
import { cn } from "@/lib/utils";

export function SecurityPanel({
  security,
}: {
  readonly security: SecurityMonitorState;
}) {
  if (security.phase === "idle" && !security.url) {
    return null;
  }

  const tierLabel =
    security.tier === "danger"
      ? "DANGER"
      : security.tier === "review"
        ? "REVIEW"
        : security.phase === "scanning"
          ? "SCANNING"
          : "SAFE";

  const tierClass =
    security.tier === "danger"
      ? "bg-red-500/15 text-red-700 dark:text-red-300"
      : security.tier === "review"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : security.phase === "scanning"
          ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";

  const scanKey = security.url ?? "scan";

  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Site checks</span>
        <span className={cn("rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide", tierClass)}>
          {tierLabel}
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">{security.score}/100</span>
        {security.url ? (
          <span className="min-w-0 truncate text-muted-foreground/80">{security.url}</span>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" key={scanKey}>
        {SECURITY_CHECKS.map((definition) => (
          <SecurityFadingCheckCard
            checkId={definition.id}
            entry={security.checks.get(definition.id)}
            key={definition.id}
            label={definition.label}
            scanKey={scanKey}
          />
        ))}
      </div>
    </div>
  );
}
