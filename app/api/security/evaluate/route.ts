import {
  abortEvaluation,
  formatStreamLine,
  registerEvaluationAbort,
  runSecurityEvaluation,
} from "@/lib/security/evaluate";
import type { SecurityStreamEvent } from "@/lib/security/types";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

type EvaluateBody = {
  url?: string;
  focusUrl?: string;
  evalId?: string;
};

export async function POST(request: Request) {
  let body: EvaluateBody;

  try {
    body = (await request.json()) as EvaluateBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = body.url?.trim();
  if (!url) {
    return new Response(JSON.stringify({ error: "url is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const evalId = body.evalId?.trim() || nanoid();
  const controller = new AbortController();
  registerEvaluationAbort(evalId, controller);

  const stream = new ReadableStream({
    async start(streamController) {
      const enqueue = (event: SecurityStreamEvent) => {
        streamController.enqueue(new TextEncoder().encode(formatStreamLine(event)));
      };

      try {
        await runSecurityEvaluation({
          url,
          focusUrl: body.focusUrl?.trim() || undefined,
          evalId,
          signal: controller.signal,
          onEvent: enqueue,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          enqueue({ type: "error", message: "Evaluation aborted" });
        } else {
          enqueue({
            type: "error",
            message: error instanceof Error ? error.message : "Evaluation failed",
          });
        }
      } finally {
        streamController.close();
      }
    },
    cancel() {
      abortEvaluation(evalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/x-ndjson",
      "X-Security-Eval-Id": evalId,
    },
  });
}
