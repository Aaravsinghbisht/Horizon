# Contributing to Aegis

Thanks for helping improve the agentic browser! This project is built with
[eve](https://eve.dev) and [browser-harness](https://github.com/browser-use/browser-harness).

## Getting started

1. Fork the repository and clone your fork.
2. `npm install`
3. `npm run browser:up` and `npm run sandbox:build`
4. Copy `.env.example` to `.env.local` and add your `AI_GATEWAY_API_KEY`.
5. `npm run dev` and open http://localhost:3000.

## Development commands

```bash
npm run typecheck       # TypeScript validation (must pass)
npm run test:e2e        # Eve session + HITL smoke test
npm run test:workflow   # Full-workflow integration test
```

Run `npm run typecheck` before submitting a PR.

## How to contribute

- **Bug reports** — open an issue with the exact task, expected vs. actual
  behaviour, and the relevant console/agent logs.
- **Browser automation** — improvements live mostly in `lib/browser-*.ts`, the
  `agent/skills/browser-use/` skill, and `agent/instructions.md`. Prefer the
  accessibility tree over screenshot loops.
- **Safety checks** — each check is its own file under `lib/security/checks/`.
  Keep them local and read-only (CDP + URL heuristics); the scanner must never
  slow down or block the agent unless a risk threshold is hit.
- **HITL UX** — form dialogs and inline options belong in `app/_components/`.
  Keep the invariant: after the first message, the user decides via buttons/dialog,
  not free chat.

## Code style

- TypeScript, strict mode.
- No comments unless they clarify non-obvious logic.
- Keep the agent frame separate from the UI: the Next.js app **drives** the agent,
  it never re-implements browser logic.
- Never commit `.env.local` or real keys — test keys only, and only in local env files.

## Review process

PRs are reviewed for passing CI (`typecheck` + `build`), graceful failure handling,
and accurate documentation. Smaller, focused PRs are merged faster.

## Code of conduct

Be respectful and constructive.