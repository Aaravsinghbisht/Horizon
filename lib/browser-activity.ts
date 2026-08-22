type EveEvent = {
  type: string;
  data?: Record<string, unknown>;
};

const BROWSER_COMMAND_RE =
  /browser-use|browser-harness|new_tab|goto_url|switch_tab|activate_tab|click_at|type_text|page_info/i;
const DEMO_URL_RE = /example\.(com|org|net)|iana\.org/i;

function commandFromBashInput(input: unknown): string | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const command = (input as { command?: unknown }).command;
  return typeof command === "string" ? command : undefined;
}

function urlFromText(text: string): string | undefined {
  const jsonUrl = text.match(/['"]url['"]\s*:\s*['"](https?:[^'"]+)['"]/i);
  if (jsonUrl?.[1]) {
    return jsonUrl[1];
  }

  const direct = text.match(/https?:\/\/[^\s'"]+/);
  return direct?.[0];
}

function urlFromBashOutput(output: unknown): string | undefined {
  if (!output || typeof output !== "object") {
    return undefined;
  }

  const stdout = (output as { stdout?: unknown }).stdout;
  return typeof stdout === "string" ? urlFromText(stdout) : undefined;
}

function urlFromCommand(command: string): string | undefined {
  return urlFromText(command);
}

export function getBrowserActivity(events: readonly EveEvent[]): {
  focusUrl?: string;
  isActive: boolean;
  label: string;
} {
  let focusUrl: string | undefined;
  let isActive = false;
  let label = "";
  let turnEnded = false;

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (
      event.type === "turn.completed" ||
      event.type === "turn.cancelled" ||
      event.type === "turn.failed"
    ) {
      turnEnded = true;
    }

    if (event.type === "action.result") {
      const result = event.data?.result as
        | { kind?: string; toolName?: string; output?: unknown }
        | undefined;

      if (result?.kind === "tool-result" && result.toolName === "bash") {
        const url = urlFromBashOutput(result.output);
        if (url) {
          focusUrl ??= url;
        }
      }
    }

    if (turnEnded || event.type !== "actions.requested") {
      continue;
    }

    const actions = event.data?.actions as
      | Array<{ kind?: string; toolName?: string; input?: unknown }>
      | undefined;

    if (!actions) {
      continue;
    }

    for (const action of actions) {
      if (action.kind !== "tool-call" || action.toolName !== "bash") {
        continue;
      }

      const command = commandFromBashInput(action.input);
      if (!command || !BROWSER_COMMAND_RE.test(command)) {
        continue;
      }

      const commandUrl = urlFromCommand(command);
      if (commandUrl) {
        focusUrl = commandUrl;
      }

      isActive = true;
      label = describeBrowserCommand(command, focusUrl);
      break;
    }
  }

  return { focusUrl, isActive, label };
}

function describeBrowserCommand(command: string, focusUrl?: string): string {
  if (focusUrl) {
    return `Working in browser · ${focusUrl}`;
  }

  const urlMatch = command.match(/https?:\/\/[^\s'"]+/);
  if (urlMatch) {
    return `Working in browser · ${urlMatch[0]}`;
  }

  if (/new_tab|goto_url/i.test(command)) {
    return "Opening a page in the browser…";
  }

  if (/click_at|type_text/i.test(command)) {
    return "Clicking or typing in the browser…";
  }

  if (/page_info/i.test(command)) {
    return "Reading the current page…";
  }

  return "Running browser automation…";
}

function isBrowserBashCommand(command: string): boolean {
  return BROWSER_COMMAND_RE.test(command);
}

/** True once the agent has issued any browser-harness command in this session. */
export function hasBrowserSessionStarted(events: readonly EveEvent[]): boolean {
  for (const event of events) {
    if (event.type === "actions.requested") {
      const actions = event.data?.actions as
        | Array<{ kind?: string; toolName?: string; input?: unknown }>
        | undefined;

      for (const action of actions ?? []) {
        if (action.kind !== "tool-call" || action.toolName !== "bash") {
          continue;
        }
        const command = commandFromBashInput(action.input);
        if (command && isBrowserBashCommand(command)) {
          return true;
        }
      }
    }

    if (event.type === "action.result") {
      const result = event.data?.result as
        | { kind?: string; toolName?: string; output?: unknown }
        | undefined;

      if (result?.kind === "tool-result" && result.toolName === "bash") {
        const url = urlFromBashOutput(result.output);
        if (url) {
          return true;
        }
      }
    }
  }

  return false;
}

export function isDemoBrowserUrl(url: string): boolean {
  return DEMO_URL_RE.test(url);
}
