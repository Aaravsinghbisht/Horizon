"use client";

import type { EveMessageInputRequest } from "eve/react";
import { HandHelpingIcon } from "lucide-react";
import type { EveMessage } from "eve/react";
import { collectPendingInputRequests } from "@/lib/hitl-state";
import { getInlinePendingRequests } from "@/lib/hitl-ui";

export function HumanInputBanner({
  canRespond,
  messages,
  onRespond,
}: {
  readonly canRespond: boolean;
  readonly messages: readonly EveMessage[];
  readonly onRespond: (responses: {
    optionId?: string;
    requestId: string;
    text?: string;
  }[]) => void | Promise<void>;
}) {
  const pending = getInlinePendingRequests(collectPendingInputRequests(messages));

  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 sm:px-6">
      <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-3 text-sm shadow-sm">
        <div className="flex items-start gap-3">
          <HandHelpingIcon className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-medium text-amber-950 dark:text-amber-100">
              Compositer needs your input to continue
            </p>
            {pending.map((request) => (
              <PendingInputCard
                canRespond={canRespond}
                key={request.requestId}
                onRespond={onRespond}
                request={request}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingInputCard({
  canRespond,
  onRespond,
  request,
}: {
  readonly canRespond: boolean;
  readonly onRespond: (responses: {
    optionId?: string;
    requestId: string;
    text?: string;
  }[]) => void | Promise<void>;
  readonly request: EveMessageInputRequest;
}) {
  const hasOptions = (request.options?.length ?? 0) > 0;
  const acceptsFreeform = request.allowFreeform === true || !hasOptions;

  return (
    <div className="space-y-2 rounded-md border border-amber-500/25 bg-background/80 p-3">
      <p className="text-foreground">{request.prompt}</p>
      {hasOptions ? (
        <div className="flex flex-wrap gap-2">
          {request.options?.map((option) => (
            <button
              className="rounded-md border bg-background px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
              disabled={!canRespond}
              key={option.id}
              onClick={() =>
                void onRespond([
                  { requestId: request.requestId, optionId: option.id },
                ])
              }
              type="button"
            >
              <span className="font-medium">{option.label}</span>
              {option.description ? (
                <span className="mt-0.5 block text-muted-foreground text-xs">
                  {option.description}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
      {acceptsFreeform ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const text = String(form.get("answer") ?? "").trim();
            if (text.length === 0) {
              return;
            }
            void onRespond([{ requestId: request.requestId, text }]);
            event.currentTarget.reset();
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            disabled={!canRespond}
            name="answer"
            placeholder="Type OTP, captcha text, form value…"
          />
          <button
            className="rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground text-sm disabled:opacity-50"
            disabled={!canRespond}
            type="submit"
          >
            Send
          </button>
        </form>
      ) : null}
    </div>
  );
}
