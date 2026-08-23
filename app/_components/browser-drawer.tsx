"use client";

import {
  ChevronRightIcon,
  GlobeIcon,
  HandIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  SparklesIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { looksLikeCaptchaOrChallenge } from "@/lib/browser-challenge";
import { cn } from "@/lib/utils";

type ViewportSize = { width: number; height: number };

type PreviewPayload = {
  image: string;
  title: string;
  url: string;
  updatedAt: string;
  viewport: ViewportSize;
};

const LIVE_INTERVAL_MS = 500;
const INTERACTIVE_INTERVAL_MS = 600;
const IDLE_INTERVAL_MS = 15000;
const INTERACT_REFRESH_MS = 200;
const TYPE_BATCH_MS = 40;
const RESIZE_DEBOUNCE_MS = 150;

const KEYPRESS_MAP: Record<string, string> = {
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUp: "ArrowUp",
  Escape: "Escape",
  Tab: "Tab",
};

function viewportCoordsFromEvent(
  event: { clientX: number; clientY: number },
  rect: DOMRect,
  viewport: ViewportSize,
): { x: number; y: number } {
  const relX = (event.clientX - rect.left) / rect.width;
  const relY = (event.clientY - rect.top) / rect.height;
  return {
    x: Math.round(Math.max(0, Math.min(1, relX)) * viewport.width),
    y: Math.round(Math.max(0, Math.min(1, relY)) * viewport.height),
  };
}

export function BrowserDrawer({
  activityLabel,
  canTakeControl,
  className,
  focusUrl,
  isInteractive,
  isLive,
  journeyComplete,
  onOpenChange,
  onReleaseControl,
  onTakeControl,
  open,
  previewEnabled,
  userTakeover,
}: {
  readonly activityLabel?: string;
  readonly canTakeControl?: boolean;
  readonly className?: string;
  readonly focusUrl?: string;
  readonly isInteractive: boolean;
  readonly isLive: boolean;
  readonly journeyComplete: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onReleaseControl?: () => void;
  readonly onTakeControl?: () => void;
  readonly open: boolean;
  readonly previewEnabled: boolean;
  readonly userTakeover?: boolean;
}) {
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | undefined>();
  const [imageA, setImageA] = useState<string | null>(null);
  const [imageB, setImageB] = useState<string | null>(null);
  const [activeBuffer, setActiveBuffer] = useState<0 | 1>(0);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const interactRef = useRef<HTMLDivElement | null>(null);
  const interactRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeBatchRef = useRef("");
  const typeBatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollPendingRef = useRef(false);
  const lastImageRef = useRef<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const wasInteractiveRef = useRef(false);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeBufferRef = useRef<0 | 1>(0);

  const challengeDetected = useMemo(
    () =>
      preview
        ? looksLikeCaptchaOrChallenge(preview.title, preview.url)
        : false,
    [preview],
  );

  const fullyInteractive = isInteractive || challengeDetected;

  useEffect(() => {
    const node = previewAreaRef.current;
    if (!node || !open) {
      return;
    }

    const applySize = (width: number, height: number) => {
      if (width > 0 && height > 0) {
        setContainerSize({
          width: Math.round(width),
          height: Math.round(height),
        });
      }
    };

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) {
        return;
      }

      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }

      resizeTimerRef.current = setTimeout(() => {
        resizeTimerRef.current = null;
        applySize(rect.width, rect.height);
      }, RESIZE_DEBOUNCE_MS);
    });

    observer.observe(node);
    applySize(node.clientWidth, node.clientHeight);

    return () => {
      observer.disconnect();
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
    };
  }, [open]);

  const applyPreviewImage = useCallback((image: string) => {
    if (image === lastImageRef.current) {
      return;
    }

    lastImageRef.current = image;
    if (activeBufferRef.current === 0) {
      setImageB(image);
      activeBufferRef.current = 1;
      setActiveBuffer(1);
    } else {
      setImageA(image);
      activeBufferRef.current = 0;
      setActiveBuffer(0);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    inFlightRef.current = true;

    if (!hasLoadedOnceRef.current) {
      setInitialLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (focusUrl) {
        params.set("focusUrl", focusUrl);
      }
      if (containerSize?.width) {
        params.set("viewportWidth", String(containerSize.width));
      }
      if (containerSize?.height) {
        params.set("viewportHeight", String(containerSize.height));
      }
      params.set("quality", fullyInteractive ? "65" : "50");

      const query = params.size > 0 ? `?${params.toString()}` : "";
      const response = await fetch(`/api/browser/preview${query}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const body = (await response.json()) as {
        ok: boolean;
        preview?: PreviewPayload;
        error?: string;
      };

      if (!response.ok || !body.ok || !body.preview) {
        setError(body.error ?? "Browser preview unavailable");
        setPreview(null);
        return;
      }

      setError(null);
      hasLoadedOnceRef.current = true;
      applyPreviewImage(body.preview.image);
      setPreview((current) => {
        if (
          current &&
          current.image === body.preview!.image &&
          current.url === body.preview!.url &&
          current.title === body.preview!.title
        ) {
          return current;
        }
        return body.preview!;
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return;
      }
      setError("Could not reach the browser preview API.");
      setPreview(null);
    } finally {
      inFlightRef.current = false;
      if (abortRef.current === controller) {
        abortRef.current = null;
        setInitialLoading(false);
      }
    }
  }, [
    applyPreviewImage,
    containerSize?.height,
    containerSize?.width,
    focusUrl,
    fullyInteractive,
  ]);

  const scheduleInteractRefresh = useCallback(() => {
    if (interactRefreshTimerRef.current) {
      clearTimeout(interactRefreshTimerRef.current);
    }
    interactRefreshTimerRef.current = setTimeout(() => {
      interactRefreshTimerRef.current = null;
      void refresh();
    }, INTERACT_REFRESH_MS);
  }, [refresh]);

  const flushTypeBatch = useCallback(async () => {
    const text = typeBatchRef.current;
    typeBatchRef.current = "";
    if (text.length === 0) {
      return;
    }

    const response = await fetch("/api/browser/interact", {
      body: JSON.stringify({
        action: "type",
        focusUrl,
        text,
        viewportWidth: containerSize?.width,
        viewportHeight: containerSize?.height,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (response.ok) {
      scheduleInteractRefresh();
    }
  }, [containerSize?.height, containerSize?.width, focusUrl, scheduleInteractRefresh]);

  const sendInteract = useCallback(
    async (payload: {
      action: "click" | "type" | "scroll" | "keypress";
      x?: number;
      y?: number;
      text?: string;
      key?: string;
      deltaY?: number;
    }) => {
      const response = await fetch("/api/browser/interact", {
        body: JSON.stringify({
          ...payload,
          focusUrl,
          viewportWidth: containerSize?.width,
          viewportHeight: containerSize?.height,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (response.ok) {
        scheduleInteractRefresh();
      }
    },
    [containerSize?.height, containerSize?.width, focusUrl, scheduleInteractRefresh],
  );

  const queueType = useCallback(
    (text: string) => {
      if (text === "\n" || text === "\u0008") {
        void flushTypeBatch();
        void sendInteract({ action: "type", text });
        return;
      }

      typeBatchRef.current += text;
      if (typeBatchTimerRef.current) {
        clearTimeout(typeBatchTimerRef.current);
      }
      typeBatchTimerRef.current = setTimeout(() => {
        typeBatchTimerRef.current = null;
        void flushTypeBatch();
      }, TYPE_BATCH_MS);
    },
    [flushTypeBatch, sendInteract],
  );

  const handlePreviewClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!fullyInteractive || !preview?.viewport || !interactRef.current) {
        return;
      }

      const rect = interactRef.current.getBoundingClientRect();
      const { x, y } = viewportCoordsFromEvent(event, rect, preview.viewport);
      void sendInteract({ action: "click", x, y });
    },
    [fullyInteractive, preview?.viewport, sendInteract],
  );

  const handlePreviewWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!fullyInteractive || !preview?.viewport || scrollPendingRef.current) {
        return;
      }

      event.preventDefault();
      scrollPendingRef.current = true;

      const rect = interactRef.current?.getBoundingClientRect();
      const coords = rect
        ? viewportCoordsFromEvent(event, rect, preview.viewport)
        : { x: preview.viewport.width / 2, y: preview.viewport.height / 2 };

      void sendInteract({
        action: "scroll",
        deltaY: event.deltaY,
        x: coords.x,
        y: coords.y,
      }).finally(() => {
        scrollPendingRef.current = false;
      });
    },
    [fullyInteractive, preview?.viewport, sendInteract],
  );

  const handlePreviewKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!fullyInteractive) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        event.preventDefault();
        void flushTypeBatch();
        void navigator.clipboard.readText().then((text) => {
          if (text.length > 0) {
            queueType(text);
          }
        });
        return;
      }

      const keypress = KEYPRESS_MAP[event.key];
      if (keypress) {
        event.preventDefault();
        void flushTypeBatch();
        void sendInteract({ action: "keypress", key: keypress });
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        queueType("\u0008");
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        queueType("\n");
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        queueType(event.key);
      }
    },
    [fullyInteractive, flushTypeBatch, queueType, sendInteract],
  );

  useEffect(() => {
    if (!previewEnabled) {
      setPreview(null);
      setError(null);
      setImageA(null);
      setImageB(null);
      lastImageRef.current = null;
      hasLoadedOnceRef.current = false;
    }
  }, [previewEnabled]);

  useEffect(() => {
    if (!open || !previewEnabled) {
      return;
    }

    let cancelled = false;
    const tick = () => {
      if (!cancelled) {
        void refresh();
      }
    };

    tick();
    const intervalMs = fullyInteractive
      ? INTERACTIVE_INTERVAL_MS
      : isLive
        ? LIVE_INTERVAL_MS
        : IDLE_INTERVAL_MS;
    const timer = window.setInterval(tick, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      inFlightRef.current = false;
      if (interactRefreshTimerRef.current) {
        clearTimeout(interactRefreshTimerRef.current);
      }
      if (typeBatchTimerRef.current) {
        clearTimeout(typeBatchTimerRef.current);
      }
    };
  }, [fullyInteractive, isLive, open, previewEnabled, refresh]);

  useEffect(() => {
    if (fullyInteractive && !wasInteractiveRef.current && interactRef.current) {
      interactRef.current.focus();
    }
    wasInteractiveRef.current = fullyInteractive;
  }, [fullyInteractive]);

  const frontImageSrc = useMemo(() => {
    const image = activeBuffer === 0 ? imageA : imageB;
    return image ? `data:image/jpeg;base64,${image}` : undefined;
  }, [activeBuffer, imageA, imageB]);

  const backImageSrc = useMemo(() => {
    const image = activeBuffer === 0 ? imageB : imageA;
    return image ? `data:image/jpeg;base64,${image}` : undefined;
  }, [activeBuffer, imageA, imageB]);

  if (!open) {
    return (
      <div className={cn("hidden shrink-0 items-start border-l bg-muted/30 p-2 md:flex", className)}>
        <Button
          aria-label="Open browser preview"
          onClick={() => onOpenChange(true)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <PanelRightOpenIcon className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-30 flex min-w-0 w-[min(96vw,520px)] shrink-0 flex-col border-l bg-muted/20 shadow-xl md:relative md:z-auto md:w-[min(52vw,780px)] md:shadow-none",
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <GlobeIcon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">Live browser</p>
          <p className="truncate text-muted-foreground text-xs">
            {preview?.url && preview.url !== "about:blank"
              ? preview.url
              : focusUrl ?? "Waiting for navigation…"}
          </p>
        </div>
        {userTakeover ? (
          <Button onClick={onReleaseControl} size="sm" type="button" variant="secondary">
            <SparklesIcon className="size-3.5" />
            Return to agent
          </Button>
        ) : canTakeControl ? (
          <Button onClick={onTakeControl} size="sm" type="button" variant="outline">
            <HandIcon className="size-3.5" />
            Take control
          </Button>
        ) : null}
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            userTakeover || fullyInteractive
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : isLive
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-muted text-muted-foreground",
          )}
        >
          {userTakeover ? "You control" : fullyInteractive ? "Your turn" : isLive ? "Live" : "Idle"}
        </span>
        <Button
          aria-label="Close browser preview"
          onClick={() => onOpenChange(false)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <PanelRightCloseIcon className="size-4" />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0a0a0a]" ref={previewAreaRef}>
        {previewEnabled && preview && frontImageSrc ? (
          <div
            aria-label="Interactive browser preview"
            className={cn(
              "relative flex size-full items-center justify-center outline-none",
              fullyInteractive && "cursor-crosshair",
            )}
            onClick={handlePreviewClick}
            onKeyDown={handlePreviewKeyDown}
            onWheel={handlePreviewWheel}
            ref={interactRef}
            role={fullyInteractive ? "button" : undefined}
            tabIndex={fullyInteractive ? 0 : -1}
          >
            {backImageSrc ? (
              <img
                alt=""
                className="absolute max-h-full max-w-full object-contain opacity-0"
                decoding="async"
                draggable={false}
                src={backImageSrc}
              />
            ) : null}
            <img
              alt={preview.title || "Browser preview"}
              className="relative max-h-full max-w-full object-contain"
              decoding="async"
              draggable={false}
              src={frontImageSrc}
            />
            {fullyInteractive ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 border-b border-amber-400/40 bg-amber-500/90 px-3 py-1.5 text-amber-950 text-xs font-medium">
                {userTakeover
                  ? "You have control — click, type, scroll freely. Return to agent when done."
                  : challengeDetected
                    ? "Security challenge detected — complete it in the browser or dialog"
                    : journeyComplete
                      ? "Browse freely — click and type in the browser, or send a new task in chat"
                      : "Your turn — click and type in the browser, then answer in chat or the dialog"}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground text-sm">
            <GlobeIcon className="size-8 opacity-40" />
            <p>
              {previewEnabled
                ? error ?? (initialLoading ? "Connecting to Chrome…" : "Waiting for the agent to open a page…")
                : "Browser will appear when Compositer starts navigating"}
            </p>
            {previewEnabled ? (
              <Button
                disabled={initialLoading}
                onClick={() => void refresh()}
                size="sm"
                type="button"
                variant="secondary"
              >
                Retry
              </Button>
            ) : null}
          </div>
        )}
        {isLive && activityLabel && !fullyInteractive ? (
          <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/75 px-3 py-2 text-white text-xs">
            <p className="truncate font-medium">{activityLabel}</p>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t px-3 py-2 text-muted-foreground text-xs">
        <p className="truncate font-medium text-foreground">{preview?.title || "No page title"}</p>
        <p className="mt-0.5 flex items-center gap-1">
          <ChevronRightIcon className="size-3 shrink-0" />
          <span>
            {userTakeover
              ? "Full control — agent paused until you return"
              : fullyInteractive
                ? journeyComplete
                  ? "Free browsing — click, type, and scroll anytime"
                  : "Click fields to focus, type with keyboard, scroll with wheel, paste with Ctrl+V"
                : activityLabel && isLive
                  ? activityLabel
                  : "Headless Chrome · updates while the agent runs"}
          </span>
        </p>
      </div>
    </aside>
  );
}
