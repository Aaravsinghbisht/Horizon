import { getBrowserConnection, withCdpLock } from "@/lib/browser-cdp-shared";

export async function resetBrowserTabs(): Promise<void> {
  await withCdpLock(async () => {
    const browser = await getBrowserConnection();
    const pages = await browser.pages();

    for (let index = 1; index < pages.length; index += 1) {
      await pages[index]?.close().catch(() => undefined);
    }

    const remaining = (await browser.pages())[0];
    if (remaining) {
      await remaining.goto("about:blank").catch(() => undefined);
      return;
    }

    const page = await browser.newPage();
    await page.goto("about:blank").catch(() => undefined);
  });
}
