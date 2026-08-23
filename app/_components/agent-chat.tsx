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
  collectPendingInputRequests,
  deriveJourneyPhase,
  hasPendingInputRequests,
  hasUserMessage,
  isBrowserInteractive,
  isComposerLocked,
  isJourneyComplete,
  isJourneyInProgress,
} from "@/lib/hitl-state";
import type { RiskTier, SecurityCheckResult } from "@/lib/security/types";
import { useSecurityMonitor } from "@/lib/security/use-security-monitor";
import { findCheckoutPaymentRequest } from "@/lib/payment/checkout-hitl";
import { AgentMessage } from "./agent-message";
import { BrowserDrawer } from "./browser-drawer";
import { HitlFormDialog } from "./hitl-form-dialog";
import { HumanInputBanner } from "./human-input-banner";
import { SecurityBlockModal } from "./security-block-modal";
import { SecurityPanel } from "./security-panel";
import { SecurityReviewDialog } from "./security-review-dialog";
import { RazorpayCheckout } from "./razorpay-checkout";

const AGENT_NAME = "compositer";

export function AgentChat() {
  const [cancellationError, setCancellationError] = useState<string>();
  const [browserDrawerOpen, setBrowserDrawerOpen] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [failedTurnMessage, setFailedTurnMessage] = useState<string | null>(null);
  const staleSessionHandledRef = useRef(false);
  const lastSentMessageRef = useRef<string | UserContent | null>(null);
  const retryAttemptRef = useRef(0);
  const handledFailureIdRef = useRef<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [majorPromptGeneration, setMajorPromptGeneration] = useState(0);
  const [completedGeneration, setCompletedGeneration] = useState(0);
  const [userTakeover, setUserTakeover] = useState(false);
  const [securitySessionBlocked, setSecuritySessionBlocked] = useState(false);
  const handledSecurityKeyRef = useRef<string | null>(null);
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
  const showBrowserPanel =
    previewEnabled ||
    (hasUserMessage(agent.data.messages) && (isBusy || retryStatus !== null));
  const isBrowserLive = previewEnabled && (isBusy || browserActivity.isActive || retryStatus !== null);
  const pendingHitl = hasPendingInputRequests(agent.data.messages);
  const pendingInputRequests = collectPendingInputRequests(agent.data.messages);
  const userMessageCount = countUserMessages(agent.data.messages);
  const handleSecurityBlockRef = useRef<() => Promise<void>>(async () => {});

  const onSecurityComplete = useCallback(
    (tier: RiskTier, score: number) => {
      const url = browserActivity.focusUrl ?? "";
      const key = `${url}:${tier}:${score}`;
      if (!url || handledSecurityKeyRef.current === key) {
        return;
      }
      handledSecurityKeyRef.current = key;

      if (tier === "danger") {
        void handleSecurityBlockRef.current();
      } else if (tier === "review") {
        if (agent.status === "submitted" || agent.status === "streaming") {
          void agent.cancel().catch(() => undefined);
        }
      }
    },
    [agent, browserActivity.focusUrl],
  );

  const {
    security,
    resetSecurity,
    acknowledgeReview,
    setBlocked,
    stopScan: stopSecurityScan,
  } = useSecurityMonitor({
    enabled: previewEnabled && !securitySessionBlocked,
    focusUrl: browserActivity.focusUrl,
    onComplete: onSecurityComplete,
  });

  const handleSecurityBlock = useCallback(async () => {
    stopSecurityScan();
    if (agent.status === "submitted" || agent.status === "streaming") {
      try {
        await agent.cancel();
      } catch (error: unknown) {
        setCancellationError(toErrorMessage(error));
      }
    }
    await fetch("/api/browser/reset", { method: "POST" }).catch(() => undefined);
    setUserTakeover(false);
    setSecuritySessionBlocked(true);
    setBlocked();
  }, [agent, setBlocked, stopSecurityScan]);

  useEffect(() => {
    handleSecurityBlockRef.current = handleSecurityBlock;
  }, [handleSecurityBlock]);

  const failedSecurityChecks = useMemo((): SecurityCheckResult[] => {
    const results: SecurityCheckResult[] = [];
    for (const entry of security.checks.values()) {
      if (entry !== "running" && entry.status === "fail") {
        results.push(entry);
      }
    }
    return results;
  }, [security.checks]);

  const warnSecurityChecks = useMemo((): SecurityCheckResult[] => {
    const results: SecurityCheckResult[] = [];
    for (const entry of security.checks.values()) {
      if (entry !== "running" && (entry.status === "fail" || entry.status === "warn")) {
        results.push(entry);
      }
    }
    return results;
  }, [security.checks]);

  const checkoutPaymentRequest = useMemo(
    () => findCheckoutPaymentRequest(pendingInputRequests),
    [pendingInputRequests],
  );

  const showRazorpayCheckout =
    !securitySessionBlocked &&
    security.tier === "safe" &&
    security.phase === "safe" &&
    checkoutPaymentRequest !== undefined;

  useEffect(() => {
    if (showBrowserPanel) {
      setBrowserDrawerOpen(true);
    } else {
      setBrowserDrawerOpen(false);
    }
  }, [showBrowserPanel]);

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
    isComposerLocked({ isBusy, journeyPhase, pendingHitl }) ||
    retryStatus !== null ||
    securitySessionBlocked ||
    security.phase === "review";
  const isBrowserInteractiveMode =
    previewEnabled &&
    isBrowserInteractive({
      isBusy,
      journeyPhase,
      pendingHitl,
      userTakeover,
    });

  const handleTakeControl = useCallback(async () => {
    if (isBusy) {
      try {
        await agent.cancel();
      } catch (error: unknown) {
        setCancellationError(toErrorMessage(error));
      }
    }
    setUserTakeover(true);
  }, [agent, isBusy]);

  const handleReleaseControl = useCallback(() => {
    setUserTakeover(false);
  }, []);
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

    handledSecurityKeyRef.current = null;
    setSecuritySessionBlocked(false);
    resetSecurity();
    void fetch("/api/browser/reset", { method: "POST" }).catch(() => undefined);
  }, [agent.data.messages.length, resetSecurity]);

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
    setUserTakeover(false);
    handledSecurityKeyRef.current = null;
    setSecuritySessionBlocked(false);
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
                  : "Start securely — we scan every site before you pay…"
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
              disabled={!showBrowserPanel}
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

        <SecurityPanel security={security} />

        {showRazorpayCheckout && checkoutPaymentRequest ? (
          <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 sm:px-6">
            <RazorpayCheckout
              checkoutRequest={checkoutPaymentRequest}
              disabled={isBusy}
              onPaymentSuccess={async (paymentId) => {
                setCancellationError(undefined);
                const payOption =
                  checkoutPaymentRequest.options?.find(
                    (option) =>
                      option.id === "pay" || /razorpay|compositer/i.test(option.label),
                  ) ?? checkoutPaymentRequest.options?.[0];

                if (payOption) {
                  await agent.respond([
                    {
                      requestId: checkoutPaymentRequest.requestId,
                      optionId: payOption.id,
                    },
                  ]);
                  return;
                }

                await agent.respond([
                  {
                    requestId: checkoutPaymentRequest.requestId,
                    text: `Payment successful via Compositer Razorpay (ref: ${paymentId})`,
                  },
                ]);
              }}
            />
          </div>
        ) : null}

        <SecurityReviewDialog
          onContinue={() => acknowledgeReview()}
          onStop={() => void handleSecurityBlock()}
          open={security.phase === "review" && !securitySessionBlocked}
          score={security.score}
          url={security.url}
          warnChecks={warnSecurityChecks}
        />

        <SecurityBlockModal
          failedChecks={failedSecurityChecks}
          onClose={() => {
            agent.reset();
            handledSecurityKeyRef.current = null;
            setSecuritySessionBlocked(false);
            resetSecurity();
          }}
          open={securitySessionBlocked}
          score={security.score}
          url={security.url}
        />

        <HumanInputBanner
          canRespond={!isBusy}
          messages={agent.data.messages}
          onRespond={(inputResponses) => {
            setCancellationError(undefined);
            return agent.respond(inputResponses);
          }}
        />

        <HitlFormDialog
          canRespond={!isBusy}
          focusUrl={browserActivity.focusUrl}
          onRespond={(inputResponses) => {
            setCancellationError(undefined);
            return agent.respond(inputResponses);
          }}
          pendingRequests={pendingInputRequests}
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
              <h1 className="font-medium text-5xl tracking-tighter">Compositer</h1>
              <p className="max-w-md text-muted-foreground text-sm text-pretty">
                Local Docker sandbox · headless Chrome · 10-point site scanner on every navigation.
              </p>
            </div>
          ) : null}
          <div className="w-full">{composer}</div>
        </div>
      </main>

      {showBrowserPanel ? (
        <BrowserDrawer
          activityLabel={browserActivity.label}
          canTakeControl={previewEnabled && !userTakeover && (isBusy || journeyInProgress)}
          className={cn(!browserDrawerOpen && "md:hidden")}
          focusUrl={browserActivity.focusUrl}
          isInteractive={isBrowserInteractiveMode}
          isLive={isBrowserLive}
          journeyComplete={journeyComplete}
          onOpenChange={setBrowserDrawerOpen}
          onReleaseControl={handleReleaseControl}
          onTakeControl={() => void handleTakeControl()}
          open={browserDrawerOpen}
          previewEnabled={previewEnabled}
          userTakeover={userTakeover}
        />
      ) : null}
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
