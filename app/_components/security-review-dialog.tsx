"use client";

import type { SecurityCheckResult } from "@/lib/security/types";
import { SecurityCheckCard } from "./security-check-card";
import { ShieldAlertIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SecurityReviewDialog({
  open,
  score,
  url,
  warnChecks,
  onContinue,
  onStop,
}: {
  readonly open: boolean;
  readonly score: number;
  readonly url?: string;
  readonly warnChecks: readonly SecurityCheckResult[];
  readonly onContinue: () => void;
  readonly onStop: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="sm:max-w-lg"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <ShieldAlertIcon className="size-5" />
            Site may be risky ({score}/100)
          </DialogTitle>
          <DialogDescription className="text-left">
            Medium risk detected. Review the checks below, then continue or stop.
            {url ? (
              <span className="mt-1 block truncate text-muted-foreground text-xs">{url}</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {warnChecks.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {warnChecks.slice(0, 6).map((check) => (
              <SecurityCheckCard entry={check} key={check.id} label={check.label} />
            ))}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button onClick={onStop} type="button" variant="outline">
            Stop session
          </Button>
          <Button onClick={onContinue} type="button">
            Continue anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
