"use client";

import type { SecurityCheckResult } from "@/lib/security/types";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export function checkRiskPoints(entry: SecurityCheckResult): number {
  if (entry.status === "fail") {
    return entry.weight;
  }
  if (entry.status === "warn") {
    return Math.round(entry.weight / 2);
  }
  return 0;
}

export function checkRatingLabel(entry: SecurityCheckResult | "running" | undefined): string {
  if (entry === "running") {
    return "Scanning";
  }
  if (!entry) {
    return "Pending";
  }
  if (entry.status === "fail") {
    return "High risk";
  }
  if (entry.status === "warn") {
    return "Caution";
  }
  return "Safe";
}

function ratingClass(entry: SecurityCheckResult | "running" | undefined): string {
  if (entry === "running") {
    return "bg-blue-500/12 text-blue-700 dark:text-blue-300";
  }
  if (!entry) {
    return "bg-muted text-muted-foreground";
  }
  if (entry.status === "fail") {
    return "bg-red-500/12 text-red-700 dark:text-red-300";
  }
  if (entry.status === "warn") {
    return "bg-amber-500/12 text-amber-800 dark:text-amber-200";
  }
  return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
}

export function SecurityCheckCard({
  className,
  entry,
  label,
}: {
  readonly className?: string;
  readonly entry: SecurityCheckResult | "running" | undefined;
  readonly label: string;
}) {
  const rating = checkRatingLabel(entry);
  const points =
    entry && entry !== "running" ? checkRiskPoints(entry) : null;
  const reasoning =
    entry === "running"
      ? "Running this check…"
      : entry
        ? entry.details
        : "Waiting to run…";

  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-xs",
        entry === "running" && "border-blue-500/25 bg-blue-500/5",
        entry && entry !== "running" && entry.status === "fail" && "border-red-500/25 bg-red-500/5",
        entry && entry !== "running" && entry.status === "warn" && "border-amber-500/25 bg-amber-500/5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-snug text-foreground">{label}</p>
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            ratingClass(entry),
          )}
        >
          {entry === "running" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2Icon className="size-3 animate-spin" />
              {rating}
            </span>
          ) : (
            <>
              {points !== null ? `${points} · ` : ""}
              {rating}
            </>
          )}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
        {reasoning}
      </p>
    </div>
  );
}
