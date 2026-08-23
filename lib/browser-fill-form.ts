import { cleanTitle, getPreviewPage, resolveViewport } from "@/lib/browser-cdp-shared";

export type BrowserFillFormRequest = {
  focusUrl?: string;
  fields: Record<string, string>;
  viewportWidth?: number;
  viewportHeight?: number;
};

export type BrowserFillFormResult = {
  ok: true;
  filled: string[];
  title: string;
  url: string;
};

export async function fillBrowserForm(
  request: BrowserFillFormRequest,
): Promise<BrowserFillFormResult | null> {
  if (Object.keys(request.fields).length === 0) {
    return null;
  }

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

    const filled = await page.evaluate((fields) => {
      const filledIds: string[] = [];

      for (const [fieldId, value] of Object.entries(fields)) {
        const selectors = [
          `#${CSS.escape(fieldId)}`,
          `[name="${fieldId}"]`,
          `input[aria-label="${fieldId}" i]`,
          `input[placeholder="${fieldId}" i]`,
        ];

        let element: Element | null = null;
        for (const selector of selectors) {
          element = document.querySelector(selector);
          if (element) {
            break;
          }
        }

        if (!element) {
          const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
            "input, textarea, select",
          );
          const needle = fieldId.toLowerCase();
          for (const input of inputs) {
            const labelText =
              input.getAttribute("aria-label") ??
              input.getAttribute("placeholder") ??
              input.name ??
              input.id ??
              "";
            if (labelText.toLowerCase().includes(needle)) {
              element = input;
              break;
            }
          }
        }

        if (!element) {
          continue;
        }

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.focus();
          element.value = value;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          filledIds.push(fieldId);
        } else if (element instanceof HTMLSelectElement) {
          element.value = value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          filledIds.push(fieldId);
        }
      }

      return filledIds;
    }, request.fields);

    return {
      ok: true,
      filled,
      title: cleanTitle(await page.title()),
      url: page.url(),
    };
  } catch {
    return null;
  }
}
