import { cleanTitle, getPreviewPage, resolveViewport } from "@/lib/browser-cdp-shared";

export type BrowserInteractAction = "click" | "type" | "scroll" | "keypress";

export type BrowserInteractRequest = {
  action: BrowserInteractAction;
  focusUrl?: string;
  x?: number;
  y?: number;
  text?: string;
  key?: string;
  deltaY?: number;
  viewportWidth?: number;
  viewportHeight?: number;
};

export type BrowserInteractResult = {
  ok: true;
  title: string;
  url: string;
};

export async function performBrowserInteract(
  request: BrowserInteractRequest,
): Promise<BrowserInteractResult | null> {
  try {
    const viewport = resolveViewport({
      width: request.viewportWidth,
      height: request.viewportHeight,
    });
    const result = await getPreviewPage({ focusUrl: request.focusUrl, viewport });

    if (!result) {
      return null;
    }

    const { candidate } = result;
    const page = candidate.page;

    switch (request.action) {
      case "click": {
        if (request.x === undefined || request.y === undefined) {
          throw new Error("click requires x and y");
        }
        await page.mouse.click(request.x, request.y);
        break;
      }
      case "type": {
        if (!request.text) {
          throw new Error("type requires text");
        }
        if (request.text === "\n") {
          await page.keyboard.press("Enter");
        } else if (request.text === "\u0008") {
          await page.keyboard.press("Backspace");
        } else if (request.text.length === 1) {
          await page.keyboard.type(request.text);
        } else {
          await page.keyboard.type(request.text, { delay: 10 });
        }
        break;
      }
      case "scroll": {
        if (request.x !== undefined && request.y !== undefined) {
          await page.mouse.move(request.x, request.y);
        }
        await page.mouse.wheel({ deltaY: request.deltaY ?? 120 });
        break;
      }
      case "keypress": {
        if (!request.key) {
          throw new Error("keypress requires key");
        }
        await page.keyboard.press(
          request.key as Parameters<typeof page.keyboard.press>[0],
        );
        break;
      }
      default:
        throw new Error(`Unknown action: ${request.action as string}`);
    }

    return {
      ok: true,
      title: cleanTitle(await page.title()),
      url: page.url(),
    };
  } catch {
    return null;
  }
}
