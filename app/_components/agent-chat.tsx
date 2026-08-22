"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, BrainIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBrowserActivity, hasBrowserSessionStarted } from "@/lib/browser-activity";
import {
  formatGatewayErrorMessage,
  formatGatewayRetryMessage,
  gatewayRetryDelayMs,
  isRetryableGatewayError,
  MAX_GATEWAY_RETRIES,
} from "@/lib/gateway-retry";
import {
  countUserMessages,
  deriveJourneyPhase,
  hasPendingInputRequests,
  hasUserMessage,
  isBrowserUserControl,
  isComposerLocked,
  isJourneyComplete,
  isJourneyInProgress,
} from "@/lib/hitl-state";
import { AgentMessage } from "./agent-message";
import { BrowserDrawer } from "./browser-drawer";
import { HumanInputBanner } from "./human-input-banner";

const AGENT_NAME = "compositer";

export function AgentChat() {
  const [cancellationError, setCancellationError] = useState<string>();
  const [browserDrawerOpen, setBrowserDrawerOpen] = useState(true);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [failedTurnMessage, setFailedTurnMessage] = useState<string | null>(null);
  const staleSessionHandledRef = useRef(false);
  const lastSentMessageRef = useRef<string | UserContent | null>(null);
  const retryAttemptRef = useRef(0);
  const handledFailureIdRef = useRef<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [majorPromptGeneration, setMajorPromptGeneration] = useState(0);
  const [completedGeneration, setCompletedGeneration] = useState(0);
  const agent = useEveAgent();
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isEmpty = agent.data.messages.length === 0;
  const lastMessage = agent.data.messages.at(-1);
  const isPendingAssistantShell =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.every((part) => part.type === "step-start");
  const showPendingThinking =
    (isBusy || retryStatus !== null) &&
    (agent.status === "submitted" || lastMessage?.role !== "assistant" || isPendingAssistantShell);
  const browserActivity = useMemo(() => getBrowserActivity(agent.events), [agent.events]);
  const hasBrowserStarted = useMemo(
    () => hasBrowserSessionStarted(agent.events),
    [agent.events],
  );
  const previewEnabled = hasBrowserStarted || browserActivity.isActive;
  const isBrowserLive = previewEnabled && (isBusy || browserActivity.isActive || retryStatus !== null);
  const pendingHitl = hasPendingInputRequests(agent.data.messages);
  const userMessageCount = countUserMessages(agent.data.messages);

  useEffect(() => {
    if (userMessageCount === 0) {
      setMajorPromptGeneration(0);
      setCompletedGeneration(0);
      return;
    }

    setMajorPromptGeneration(userMessageCount);
  }, [userMessageCount]);

  useEffect(() => {
    for (let index = agent.events.length - 1; index >= 0; index -= 1) {
      const event = agent.events[index];

      if (
        event.type === "turn.completed" ||
        event.type === "turn.failed" ||
        event.type === "turn.cancelled"
      ) {
        setCompletedGeneration((current) => Math.max(current, majorPromptGeneration));
        return;
      }

      if (event.type === "turn.started" || event.type === "message.received") {
        return;
      }
    }
  }, [agent.events, majorPromptGeneration]);

  const journeyPhase = deriveJourneyPhase({
    completedGeneration,
    isBusy,
    majorPromptGeneration,
    messageCount: agent.data.messages.length,
    pendingHitl,
  });
  const journeyComplete = isJourneyComplete(journeyPhase);
  const journeyInProgress = isJourneyInProgress(journeyPhase);
  const composerLocked =
    isComposerLocked({ isBusy, journeyPhase, pendingHitl }) || retryStatus !== null;
  const isBrowserInteractive =
    previewEnabled && isBrowserUserControl({ isBusy, journeyPhase, pendingHitl });
  const eveBackendDown =
    agent.error?.message?.includes("ECONNREFUSED") ||
    agent.error?.message?.toLowerCase().includes("internal server error");
  const turnFailure = isBusy || retryStatus ? undefined : getLatestTurnFailure(agent.events);
  const errorMessage =
    cancellationError ??
    (eveBackendDown
      ? "Agent backend is offline. Run: npm run restart"
      : undefined) ??
    agent.error?.message ??
    failedTurnMessage ??
    turnFailure;

  useEffect(() => {
    const message = agent.error?.message ?? "";
    if (
      staleSessionHandledRef.current ||
      !/session.*no longer active|session_not_active/i.test(message)
    ) {
      return;
    }

    staleSessionHandledRef.current = true;
    agent.reset();
  }, [agent, agent.error?.message]);

  useEffect(() => {
    if (agent.data.messages.length > 0) {
      return;
    }

    void fetch("/api/browser/reset", { method: "POST" }).catch(() => undefined);
  }, [agent.data.messages.length]);

  useEffect(() => {
    for (let index = agent.events.length - 1; index >= 0; index -= 1) {
      const event = agent.events[index];

      if (event.type === "turn.completed" || event.type === "turn.cancelled") {
        setCompletedGeneration(majorPromptGeneration);
        retryAttemptRef.current = 0;
        handledFailureIdRef.current = null;
        setRetryStatus(null);
        setFailedTurnMessage(null);
        return;
      }

      if (event.type !== "turn.failed") {
        continue;
      }

      if (isBusy || handledFailureIdRef.current === event.meta.id) {
        return;
      }

      const message = event.data.message ?? "";
      const code = event.data.code;

      if (!isRetryableGatewayError(message, code)) {
        handledFailureIdRef.current = event.meta.id;
        setFailedTurnMessage(formatGatewayErrorMessage(message, code));
        return;
      }

      if (retryAttemptRef.current >= MAX_GATEWAY_RETRIES) {
        handledFailureIdRef.current = event.meta.id;
        setRetryStatus(null);
        setFailedTurnMessage(formatGatewayErrorMessage(message, code));
        return;
      }

      if (!lastSentMessageRef.current) {
        handledFailureIdRef.current = event.meta.id;
        setFailedTurnMessage(formatGatewayErrorMessage(message, code));
        return;
      }

      handledFailureIdRef.current = event.meta.id;
      const attempt = retryAttemptRef.current + 1;
      retryAttemptRef.current = attempt;
      setRetryStatus(formatGatewayRetryMessage(attempt, MAX_GATEWAY_RETRIES));
      setFailedTurnMessage(null);

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }

      const messageToResend = lastSentMessageRef.current;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        void agent.send(messageToResend).catch(() => {
          setRetryStatus(null);
        });
      }, gatewayRetryDelayMs(attempt - 1));

      return;
    }
  }, [agent, agent.events, isBusy]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  const requestCancellation = () => {
    setCancellationError(undefined);
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setRetryStatus(null);
    void agent.cancel().catch((error: unknown) => {
      setCancellationError(toErrorMessage(error));
    });
  };

  const sendMessage = useCallback(
    async (content: string | UserContent) => {
      lastSentMessageRef.current = content;
      retryAttemptRef.current = 0;
      handledFailureIdRef.current = null;
      setRetryStatus(null);
      setFailedTurnMessage(null);
      setCancellationError(undefined);

      try {
        await agent.send(content);
      } catch (error: unknown) {
        setCancellationError(toErrorMessage(error));
        throw error;
      }
    },
    [agent],
  );

  const handleManualRetry = useCallback(() => {
    if (!lastSentMessageRef.current || isBusy) {
      return;
    }

    setCancellationError(undefined);
    setFailedTurnMessage(null);
    retryAttemptRef.current = 0;
    handledFailureIdRef.current = null;
    void sendMessage(lastSentMessageRef.current);
  }, [isBusy, sendMessage]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || composerLocked) return;

    setCancellationError(undefined);
    setBrowserDrawerOpen(true);

    const isFirstMajorPrompt = !hasUserMessage(agent.data.messages);
    if (isFirstMajorPrompt) {
      await fetch("/api/browser/reset", { method: "POST" }).catch(() => undefined);
    }

    if (message.files.length === 0) {
      await sendMessage(text);
      return;
    }

    const parts: UserContent = [];
    if (text.length > 0) {
      parts.push({ text, type: "text" });
    }
    for (const file of message.files) {
      parts.push({
        data: file.url,
        filename: file.filename,
        mediaType: file.mediaType,
        type: "file",
      });
    }

    await sendMessage(parts);
  };

  const composer = (
    <div className="space-y-2">
      {journeyInProgress ? (
        <p className="text-center text-muted-foreground text-xs">
          {pendingHitl
            ? "Pick an option above to continue — chat is paused during this task."
            : "Task in progress — Compositer will present options at each step."}
        </p>
      ) : journeyComplete ? (
        <p className="text-center text-muted-foreground text-xs">
          Task complete — browse freely in the panel or send a new task below.
        </p>
      ) : null}
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          disabled={composerLocked}
          placeholder={
            pendingHitl
              ? "Pick an option above to continue…"
              : journeyComplete
                ? "Send a new task…"
                : journeyInProgress
                  ? "Waiting for Compositer to ask you a question…"
                  : "Describe your task (e.g. buy black shoes on Amazon under ₹5000)…"
          }
        />
        <PromptInputSubmit onStop={requestCancellation} status={agent.status} />
      </PromptInput>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {isEmpty ? null : (
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 pl-4 pr-2">
            <span className="truncate text-muted-foreground text-sm">{AGENT_NAME}</span>
            <Button
              className="md:hidden"
              onClick={() => setBrowserDrawerOpen((v) => !v)}
              size="sm"
              type="button"
              variant="outline"
            >
              {browserDrawerOpen ? "Hide browser" : "Show browser"}
            </Button>
            <span className="hidden truncate text-muted-foreground text-xs md:inline">
              Chat + live browser
            </span>
          </header>
        )}

        <HumanInputBanner
          canRespond={!isBusy}
          messages={agent.data.messages}
          onRespond={(inputResponses) => {
            setCancellationError(undefined);
            return agent.respond(inputResponses);
          }}
        />

        {retryStatus ? (
          <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 sm:px-6">
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm">
              <RefreshCwIcon className="size-4 shrink-0 animate-spin text-amber-600" />
              <p className="text-muted-foreground">{retryStatus}</p>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 sm:px-6">
            <div
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
              role="alert"
            >
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Request failed</p>
                <p className="mt-0.5 text-muted-foreground">{errorMessage}</p>
                {lastSentMessageRef.current ? (
                  <Button
                    className="mt-2"
                    disabled={isBusy}
                    onClick={handleManualRetry}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RefreshCwIcon className="size-3.5" />
                    Retry
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {isEmpty ? null : (
          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 sm:px-6">
              {agent.data.messages.map((message, index) =>
                showPendingThinking &&
                isPendingAssistantShell &&
                message.id === lastMessage.id ? null : (
                  <AgentMessage
                    canRespond={!isBusy}
                    isStreaming={
                      agent.status === "streaming" && index === agent.data.messages.length - 1
                    }
                    key={message.id}
                    message={message}
                    onInputResponses={(inputResponses) => {
                      setCancellationError(undefined);
                      return agent.respond(inputResponses);
                    }}
                  />
                ),
              )}
              {showPendingThinking ? <PendingThinking /> : null}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}

        <div
          className={cn(
            "mx-auto w-full px-4 sm:px-6",
            isEmpty
              ? "flex max-w-xl flex-1 flex-col items-center justify-center gap-8 pb-[10vh]"
              : "max-w-3xl shrink-0 pb-6",
          )}
        >
          {isEmpty ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <h1 className="font-medium text-5xl tracking-tighter">{AGENT_NAME}</h1>
              <p className="max-w-md text-muted-foreground text-sm">
                Chat on the left, live browser on the right. Compositer will ask you for OTPs,
                captchas, and form help instead of getting stuck.
              </p>
            </div>
          ) : null}
          <div className="w-full">{composer}</div>
        </div>
      </main>

      <BrowserDrawer
        activityLabel={browserActivity.label}
        className={cn(!browserDrawerOpen && "md:hidden")}
        focusUrl={browserActivity.focusUrl}
        isInteractive={isBrowserInteractive}
        isLive={isBrowserLive}
        journeyComplete={journeyComplete}
        onOpenChange={setBrowserDrawerOpen}
        open={browserDrawerOpen}
        previewEnabled={previewEnabled}
      />
    </div>
  );
}

function PendingThinking() {
  return (
    <Message aria-live="polite" from="assistant">
      <MessageContent>
        <div className="mb-4 flex w-full items-center gap-2 text-muted-foreground text-sm">
          <BrainIcon className="size-4" />
          <Shimmer duration={1}>Thinking</Shimmer>
        </div>
      </MessageContent>
    </Message>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to cancel the response.";
}

function getLatestTurnFailure(
  events: ReturnType<typeof useEveAgent>["events"],
): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (event.type === "turn.failed") {
      return formatGatewayErrorMessage(event.data.message ?? "", event.data.code);
    }

    if (event.type === "turn.completed" || event.type === "turn.cancelled") {
      return undefined;
    }

    if (event.type === "message.received") {
      return undefined;
    }
  }

  return undefined;
}
