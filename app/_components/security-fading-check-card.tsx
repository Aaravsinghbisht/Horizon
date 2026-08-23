"use client";

import type { SecurityCheckId, SecurityCheckResult } from "@/lib/security/types";
import { useEffect, useRef, useState } from "react";
import { SecurityCheckCard } from "./security-check-card";
import { cn } from "@/lib/utils";

const FADE_DELAY_MS = 4500;
const FADE_DURATION_MS = 500;

function isCompletedCheck(
  entry: SecurityCheckResult | "running" | undefined,
): entry is SecurityCheckResult {
  return entry !== undefined && entry !== "running" && entry.details !== "Waiting…";
}

export function SecurityFadingCheckCard({
  checkId,
  entry,
  label,
  scanKey,
}: {
  readonly checkId: SecurityCheckId;
  readonly entry: SecurityCheckResult | "running" | undefined;
  readonly label: string;
  readonly scanKey: string;
}) {
  const [visible, setVisible] = useState(true);
  const [fading, setFadeOut] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanKeyRef = useRef(scanKey);

  useEffect(() => {
    if (lastScanKeyRef.current !== scanKey) {
      lastScanKeyRef.current = scanKey;
      setVisible(true);
      setFadeOut(false);
    }
  }, [scanKey]);

  useEffect(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (entry === "running") {
      setVisible(true);
      setFadeOut(false);
      return;
    }

    if (!isCompletedCheck(entry)) {
      return;
    }

    fadeTimerRef.current = setTimeout(() => {
      setFadeOut(true);
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, FADE_DURATION_MS);
    }, FADE_DELAY_MS);

    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [entry, checkId, scanKey]);

  if (!visible) {
    return null;
  }

  if (!entry || (entry !== "running" && entry.details === "Waiting…")) {
    return null;
  }

  return (
    <div
      className={cn(
        "transition-all ease-out",
        fading ? "pointer-events-none scale-[0.98] opacity-0" : "scale-100 opacity-100",
      )}
      style={{ transitionDuration: `${FADE_DURATION_MS}ms` }}
    >
      <SecurityCheckCard entry={entry} label={label} />
    </div>
  );
}
