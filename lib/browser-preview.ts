import {
  cleanTitle,
  getPreviewPage,
  resolveViewport,
  type ViewportSize,
} from "@/lib/browser-cdp-shared";

export type BrowserPreview = {
  image: string;
  title: string;
  url: string;
  updatedAt: string;
  viewport: ViewportSize;
};

export async function captureBrowserPreview(options?: {
  focusUrl?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  quality?: number;
}): Promise<BrowserPreview | null> {
  try {
    const viewport = resolveViewport({
      width: options?.viewportWidth,
      height: options?.viewportHeight,
    });
    const result = await getPreviewPage({ focusUrl: options?.focusUrl, viewport });

    if (!result) {
      return null;
    }

    const { candidate } = result;
    const image = await candidate.page.screenshot({
      captureBeyondViewport: false,
      encoding: "base64",
      fullPage: false,
      optimizeForSpeed: true,
      quality: options?.quality ?? 50,
      type: "jpeg",
    });

    return {
      image: image as string,
      title: cleanTitle(candidate.title),
      url: candidate.url,
      updatedAt: new Date().toISOString(),
      viewport,
    };
  } catch {
    return null;
  }
}
