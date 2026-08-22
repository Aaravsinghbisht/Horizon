import type { EveMessage } from "eve/react";
import type { EveMessageInputRequest } from "eve/react";

export type JourneyPhase = "idle" | "running" | "done";

export function collectPendingInputRequests(
  messages: readonly EveMessage[],
): EveMessageInputRequest[] {
  const pending: EveMessageInputRequest[] = [];

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "dynamic-tool") {
        continue;
      }

      const request = part.toolMetadata?.eve?.inputRequest;
      const response = part.toolMetadata?.eve?.inputResponse;

      if (request && response === undefined) {
        pending.push(request);
      }
    }
  }

  return pending;
}

export function hasPendingInputRequests(messages: readonly EveMessage[]): boolean {
  return collectPendingInputRequests(messages).length > 0;
}

export function hasUserMessage(messages: readonly EveMessage[]): boolean {
  return messages.some((message) => message.role === "user");
}

export function countUserMessages(messages: readonly EveMessage[]): number {
  return messages.filter((message) => message.role === "user").length;
}

export function deriveJourneyPhase(options: {
  isBusy: boolean;
  majorPromptGeneration: number;
  completedGeneration: number;
  messageCount: number;
  pendingHitl: boolean;
}): JourneyPhase {
  if (options.messageCount === 0) {
    return "idle";
  }

  if (options.isBusy || options.pendingHitl) {
    return "running";
  }

  if (
    options.majorPromptGeneration > 0 &&
    options.completedGeneration >= options.majorPromptGeneration
  ) {
    return "done";
  }

  return "running";
}

export function isJourneyComplete(phase: JourneyPhase): boolean {
  return phase === "done";
}

export function isJourneyInProgress(phase: JourneyPhase): boolean {
  return phase === "running";
}

export function isComposerLocked(options: {
  isBusy: boolean;
  journeyPhase: JourneyPhase;
  pendingHitl: boolean;
}): boolean {
  if (options.isBusy || options.pendingHitl) {
    return true;
  }
  return options.journeyPhase === "running";
}

/** Free browsing after a task ends; interactive only during HITL while a task runs. */
export function isBrowserUserControl(options: {
  journeyPhase: JourneyPhase;
  pendingHitl: boolean;
  isBusy: boolean;
}): boolean {
  if (options.journeyPhase === "done") {
    return true;
  }
  return options.journeyPhase === "running" && !options.isBusy && options.pendingHitl;
}
