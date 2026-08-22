import { execSync } from "node:child_process";

const CHROME_CONTAINER =
  process.env.COMPOSITER_CHROME_CONTAINER ?? "compositer-chrome";

let cachedBrowserUrl: { value: string; expiresAt: number } | undefined;

export function getChromeBrowserUrl(): string {
  if (process.env.COMPOSITER_CHROME_CDP_URL) {
    return process.env.COMPOSITER_CHROME_CDP_URL.replace(/\/$/, "");
  }

  const now = Date.now();
  if (cachedBrowserUrl && cachedBrowserUrl.expiresAt > now) {
    return cachedBrowserUrl.value;
  }

  const ip = execSync(
    `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${CHROME_CONTAINER}`,
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();

  if (!ip) {
    throw new Error(`Chrome container "${CHROME_CONTAINER}" is not running.`);
  }

  const value = `http://${ip}:9222`;
  cachedBrowserUrl = { value, expiresAt: now + 30_000 };
  return value;
}

export function clearChromeBrowserUrlCache(): void {
  cachedBrowserUrl = undefined;
}
