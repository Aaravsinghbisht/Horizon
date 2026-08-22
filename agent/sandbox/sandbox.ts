import { defineSandbox } from "eve/sandbox";
import { docker } from "eve/sandbox/docker";
import { getChromeBrowserUrl } from "../../lib/chrome-cdp";

const CHROME_CONTAINER =
  process.env.COMPOSITER_CHROME_CONTAINER ?? "compositer-chrome";
const SANDBOX_IMAGE =
  process.env.COMPOSITER_SANDBOX_IMAGE ?? "compositer/eve-sandbox:local";
const SANDBOX_PATH = "/home/vercel-sandbox/.local/bin";

function resolveChromeCdpUrl(): string {
  try {
    return getChromeBrowserUrl();
  } catch {
    throw new Error(
      `Chrome browser container "${CHROME_CONTAINER}" is not running. Start it with: docker compose up -d chrome`,
    );
  }
}

export default defineSandbox({
  backend: () =>
    docker({
      image: SANDBOX_IMAGE,
      pullPolicy: "never",
      networkPolicy: "allow-all",
      env: {
        BU_CDP_URL: resolveChromeCdpUrl(),
        PATH: `${SANDBOX_PATH}:${process.env.PATH ?? ""}`,
      },
    }),
  revalidationKey: () => `compositer-browser-harness-v2-${CHROME_CONTAINER}`,
  async bootstrap({ use }) {
    const sandbox = await use();

    const check = await sandbox.run({
      command: "command -v browser-harness >/dev/null 2>&1 || echo missing",
    });

    if (check.stdout.trim() === "missing") {
      await sandbox.run({
        command:
          "curl -LsSf https://astral.sh/uv/install.sh | sh && uv tool install --python 3.12 browser-harness && ln -sf \"$(command -v browser-harness)\" \"$HOME/.local/bin/browser-use\"",
      });
    } else {
      await sandbox.run({
        command:
          "ln -sf \"$(command -v browser-harness)\" \"$HOME/.local/bin/browser-use\" 2>/dev/null || true",
      });
    }
  },
});
