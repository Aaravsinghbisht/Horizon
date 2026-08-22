# Compositer

Local AI browser agent built with [Vercel eve](https://eve.dev) and [Browser Use browser-harness](https://github.com/browser-use/browser-harness). Runs entirely on your machine — no MCP, no cloud browser required.

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Next.js + eve (host)                                   │
│  Web chat UI ──► eve agent ──► Docker sandbox           │
│                              (compositer/eve-sandbox)    │
│                              browser-harness / bash     │
└──────────────────────────────┬──────────────────────────┘
                               │ BU_CDP_URL (Docker bridge)
                               ▼
┌─────────────────────────────────────────────────────────┐
│  compositer-chrome (Docker)                              │
│  Headless Chromium, CDP port 9222                       │
└─────────────────────────────────────────────────────────┘
```

- **eve** — durable agent framework, Web Chat UI, Docker sandbox backend
- **browser-harness** — open-source CDP harness from Browser Use (via `browser-use` skill)
Headless Chrome joins the default Docker `bridge` network so eve sandbox containers can reach CDP by container IP (`network_mode: bridge`).

## Prerequisites

- Node.js 24+ and npm
- Docker (daemon running)
- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) API key (or configure another provider in `agent/agent.ts`)

## Quick start

```bash
cd compositer
chmod +x scripts/setup.sh
./scripts/setup.sh

# Add your key to .env.local
# AI_GATEWAY_API_KEY=...

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and ask Compositer to browse a site.

The Web Chat shows **chat on the left** and a **live browser drawer on the right** (JPEG snapshots from headless Chrome). Compositer uses eve's `ask_question` tool for OTPs, captchas, and form help — answer in the amber banner or inline prompts.

## Manual setup

```bash
# 1. Sandbox image (eve base + browser-harness)
docker build -t compositer/eve-sandbox:local docker/eve-sandbox

# 2. Headless Chrome
docker compose up -d chrome

# 3. Environment
cp .env.example .env.local
# edit AI_GATEWAY_API_KEY

# 4. Run
npm run dev
```

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Next.js app + eve agent (Web Chat) |
| `npm run dev:eve` | eve dev server only (terminal REPL) |
| `npm run browser:up` | Start Chrome container |
| `npm run browser:down` | Stop Chrome container |
| `npm run sandbox:build` | Rebuild local eve sandbox image |
| `npm run typecheck` | TypeScript check |

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `AI_GATEWAY_API_KEY` | — | Model access via Vercel AI Gateway |
| `COMPOSITER_CHROME_CONTAINER` | `compositer-chrome` | Docker container name for Chrome |
| `COMPOSITER_CHROME_CDP_URL` | auto | Override CDP URL (skip docker inspect) |
| `COMPOSITER_SANDBOX_IMAGE` | `compositer/eve-sandbox:local` | eve sandbox Docker image |

## Troubleshooting

**Browser connection fails**

```bash
docker compose ps
curl http://127.0.0.1:9222/json/version
docker compose up -d chrome
```

**Sandbox image missing**

```bash
npm run sandbox:build
```

**Verify harness inside sandbox** (after eve creates a session)

The agent runs `browser-use` / `browser-harness` from the sandbox; `page_info()` should return URL and viewport info.

## Project layout

```text
agent/
  agent.ts              # Model config
  instructions.md       # Agent identity
  sandbox/sandbox.ts    # Docker backend + browser CDP wiring
  skills/browser-use/   # browser-harness skill
docker/
  eve-sandbox/          # Local sandbox image Dockerfile
docker-compose.yml      # Chrome service
```

## Links

- [eve documentation](https://eve.dev/docs)
- [browser-harness](https://github.com/browser-use/browser-harness)
- [eve sandbox backends](https://eve.dev/docs/sandbox)
