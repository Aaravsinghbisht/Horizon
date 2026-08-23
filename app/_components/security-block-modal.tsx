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

export function SecurityBlockModal({
  open,
  score,
  url,
  failedChecks,
  onClose,
}: {
  readonly open: boolean;
  readonly score: number;
  readonly url?: string;
  readonly failedChecks: readonly SecurityCheckResult[];
  readonly onClose: () => void;
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
          <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <ShieldAlertIcon className="size-5" />
            This site is not safe
          </DialogTitle>
          <DialogDescription className="text-left">
            Session stopped — critical risk score {score}/100.
            {url ? (
              <span className="mt-1 block truncate text-muted-foreground text-xs">{url}</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {failedChecks.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {failedChecks.map((check) => (
              <SecurityCheckCard entry={check} key={check.id} label={check.label} />
            ))}
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={onClose} type="button" variant="destructive">
            Close session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
