"use client";

import type { EveMessageInputRequest } from "eve/react";
import { HandHelpingIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getFormLikePendingRequests,
  parseFieldsJson,
  stripFieldsJsonFromPrompt,
} from "@/lib/hitl-ui";

export function HitlFormDialog({
  canRespond,
  focusUrl,
  pendingRequests,
  onRespond,
}: {
  readonly canRespond: boolean;
  readonly focusUrl?: string;
  readonly pendingRequests: readonly EveMessageInputRequest[];
  readonly onRespond: (responses: {
    optionId?: string;
    requestId: string;
    text?: string;
  }[]) => void | Promise<void>;
}) {
  const formRequests = useMemo(
    () => getFormLikePendingRequests(pendingRequests),
    [pendingRequests],
  );
  const activeRequest = formRequests[0];

  if (!activeRequest) {
    return null;
  }

  return (
    <HitlFormDialogContent
      canRespond={canRespond}
      focusUrl={focusUrl}
      key={activeRequest.requestId}
      onRespond={onRespond}
      request={activeRequest}
    />
  );
}

function HitlFormDialogContent({
  canRespond,
  focusUrl,
  onRespond,
  request,
}: {
  readonly canRespond: boolean;
  readonly focusUrl?: string;
  readonly onRespond: (responses: {
    optionId?: string;
    requestId: string;
    text?: string;
  }[]) => void | Promise<void>;
  readonly request: EveMessageInputRequest;
}) {
  const fields = parseFieldsJson(request.prompt);
  const displayPrompt = stripFieldsJsonFromPrompt(request.prompt);
  const hasOptions = (request.options?.length ?? 0) > 0;
  const acceptsFreeform = request.allowFreeform === true || !hasOptions;
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields ?? []) {
      initial[field.id] = "";
    }
    return initial;
  });
  const [freeformText, setFreeformText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitStructured = async () => {
    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(fieldValues)) {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        values[key] = trimmed;
      }
    }

    if (Object.keys(values).length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      await fetch("/api/browser/fill-form", {
        body: JSON.stringify({
          focusUrl,
          fields: values,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      await onRespond([
        {
          requestId: request.requestId,
          text: JSON.stringify(values),
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const submitFreeform = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onRespond([{ requestId: request.requestId, text: trimmed }]);
      setFreeformText("");
    } finally {
      setSubmitting(false);
    }
  };

  const submitOption = async (optionId: string) => {
    setSubmitting(true);
    try {
      await onRespond([{ requestId: request.requestId, optionId }]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandHelpingIcon className="size-4 text-amber-600" />
            Your turn
          </DialogTitle>
          <DialogDescription className="space-y-2 text-left">
            <span className="text-muted-foreground text-xs">Paused until you answer.</span>
            <span className="block text-foreground text-sm">{displayPrompt}</span>
          </DialogDescription>
        </DialogHeader>

        {fields && fields.length > 0 ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitStructured();
            }}
          >
            {fields.map((field) => (
              <div className="space-y-1.5" key={field.id}>
                <label className="text-sm font-medium" htmlFor={`hitl-${field.id}`}>
                  {field.label}
                </label>
                <Input
                  autoComplete={field.type === "password" ? "current-password" : undefined}
                  disabled={!canRespond || submitting}
                  id={`hitl-${field.id}`}
                  onChange={(event) =>
                    setFieldValues((current) => ({
                      ...current,
                      [field.id]: event.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  type={field.type ?? "text"}
                  value={fieldValues[field.id] ?? ""}
                />
              </div>
            ))}
            <DialogFooter className="pt-2">
              <Button disabled={!canRespond || submitting} type="submit">
                Submit and fill in browser
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {acceptsFreeform && !fields ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitFreeform(freeformText);
            }}
          >
            <Textarea
              aria-label="Your answer"
              disabled={!canRespond || submitting}
              onChange={(event) => setFreeformText(event.target.value)}
              placeholder="OTP, captcha text, or verification code…"
              rows={3}
              value={freeformText}
            />
            <DialogFooter>
              <Button disabled={!canRespond || submitting || freeformText.trim().length === 0} type="submit">
                Send answer
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {hasOptions ? (
          <div className="space-y-2">
            {fields || acceptsFreeform ? (
              <p className="text-muted-foreground text-xs">Or pick an option:</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {request.options?.map((option) => (
                <Button
                  disabled={!canRespond || submitting}
                  key={option.id}
                  onClick={() => void submitOption(option.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {!fields && !acceptsFreeform && !hasOptions ? (
          <p className="text-muted-foreground text-sm">
            Use the live browser panel to complete this step, then pick an option above.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
