import puppeteer from "puppeteer-core";
import { isDemoBrowserUrl } from "@/lib/browser-activity";
import { getChromeBrowserUrl } from "@/lib/chrome-cdp";

export const HORSE_MARKER = "🐴";
export const DEFAULT_VIEWPORT = { width: 1024, height: 1280 };
const CONNECTION_IDLE_MS = 30_000;
const MIN_VIEWPORT_WIDTH = 320;
const MIN_VIEWPORT_HEIGHT = 400;
const MAX_VIEWPORT_WIDTH = 1280;
const MAX_VIEWPORT_HEIGHT = 1600;

export type ViewportSize = { width: number; height: number };

export type PageCandidate = {
  page: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.connect>>["pages"]>>[number];
  title: string;
  url: string;
};

type PooledConnection = {
  browser: Awaited<ReturnType<typeof puppeteer.connect>>;
  lastUsed: number;
};

let pooled: PooledConnection | undefined;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let cdpLock: Promise<void> = Promise.resolve();
const viewportCache = new WeakMap<object, ViewportSize>();

function isWebPageUrl(url: string): boolean {
  return (
    url !== "about:blank" &&
    !url.startsWith("chrome://") &&
    !url.startsWith("chrome-untrusted://")
  );
}

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function urlsMatch(focusUrl: string, pageUrl: string): boolean {
  if (pageUrl === focusUrl || pageUrl.startsWith(focusUrl) || focusUrl.startsWith(pageUrl)) {
    return true;
  }

  const focusHost = hostnameOf(focusUrl);
  const pageHost = hostnameOf(pageUrl);
  return focusHost !== undefined && focusHost === pageHost;
}

export function resolveViewport(options?: {
  width?: number;
  height?: number;
}): ViewportSize {
  const width = options?.width;
  const height = options?.height;

  if (
    width &&
    height &&
    width >= MIN_VIEWPORT_WIDTH &&
    height >= MIN_VIEWPORT_HEIGHT
  ) {
    return {
      width: Math.min(Math.round(width), MAX_VIEWPORT_WIDTH),
      height: Math.min(Math.round(height), MAX_VIEWPORT_HEIGHT),
    };
  }

  if (width && width >= MIN_VIEWPORT_WIDTH) {
    const w = Math.min(Math.round(width), MAX_VIEWPORT_WIDTH);
    return { width: w, height: Math.min(Math.round(w * 1.35), MAX_VIEWPORT_HEIGHT) };
  }

  if (height && height >= MIN_VIEWPORT_HEIGHT) {
    const h = Math.min(Math.round(height), MAX_VIEWPORT_HEIGHT);
    return { width: Math.min(Math.round(h * 0.75), MAX_VIEWPORT_WIDTH), height: h };
  }

  return DEFAULT_VIEWPORT;
}

function viewportsEqual(a: ViewportSize, b: ViewportSize): boolean {
  return a.width === b.width && a.height === b.height;
}

async function describePagesLight(
  pages: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.connect>>["pages"]>>,
): Promise<PageCandidate[]> {
  return pages.map((page) => ({
    page,
    title: "",
    url: page.url(),
  }));
}

async function enrichCandidate(candidate: PageCandidate): Promise<PageCandidate> {
  return {
    ...candidate,
    title: await candidate.page.title(),
  };
}

export function pickPreviewPage(
  candidates: PageCandidate[],
  focusUrl?: string,
): PageCandidate | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  if (focusUrl) {
    const focused = candidates.find((candidate) => urlsMatch(focusUrl, candidate.url));
    if (focused) {
      return focused;
    }
  }

  const webPages = candidates.filter((candidate) => isWebPageUrl(candidate.url));
  const realPages = webPages.filter((candidate) => !isDemoBrowserUrl(candidate.url));

  const horseReal = realPages.find((candidate) => candidate.title.includes(HORSE_MARKER));
  if (horseReal) {
    return horseReal;
  }

  if (realPages.length > 0) {
    return realPages.at(-1);
  }

  const horseAny = webPages.find((candidate) => candidate.title.includes(HORSE_MARKER));
  if (horseAny) {
    return horseAny;
  }

  return webPages.at(-1) ?? candidates.at(-1);
}

function scheduleDisconnect(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
  }

  idleTimer = setTimeout(() => {
    if (pooled && Date.now() - pooled.lastUsed >= CONNECTION_IDLE_MS) {
      void pooled.browser.disconnect().catch(() => undefined);
      pooled = undefined;
    }
    idleTimer = undefined;
  }, CONNECTION_IDLE_MS);
}

export async function getBrowserConnection(): Promise<
  Awaited<ReturnType<typeof puppeteer.connect>>
> {
  if (pooled) {
    pooled.lastUsed = Date.now();
    scheduleDisconnect();
    return pooled.browser;
  }

  const browser = await puppeteer.connect({
    browserURL: getChromeBrowserUrl(),
    defaultViewport: DEFAULT_VIEWPORT,
  });

  pooled = { browser, lastUsed: Date.now() };
  scheduleDisconnect();
  return browser;
}

async function ensureViewport(
  page: PageCandidate["page"],
  viewport: ViewportSize,
): Promise<void> {
  const cached = viewportCache.get(page);
  if (cached && viewportsEqual(cached, viewport)) {
    return;
  }

  await page.setViewport(viewport);
  viewportCache.set(page, viewport);
}

export async function withCdpLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = cdpLock.then(operation, operation);
  cdpLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function getPreviewPage(options?: {
  focusUrl?: string;
  viewport?: ViewportSize;
}): Promise<{ candidate: PageCandidate; viewport: ViewportSize } | null> {
  return withCdpLock(async () => {
    const browser = await getBrowserConnection();
    const candidates = await describePagesLight(await browser.pages());
    const selected = pickPreviewPage(candidates, options?.focusUrl);

    if (!selected) {
      return null;
    }

    const enriched = await enrichCandidate(selected);
    const viewport = options?.viewport ?? DEFAULT_VIEWPORT;
    await ensureViewport(enriched.page, viewport);
    await enriched.page.bringToFront();

    return { candidate: enriched, viewport };
  });
}

export function cleanTitle(title: string): string {
  return title.replace(HORSE_MARKER, "").trim();
}
