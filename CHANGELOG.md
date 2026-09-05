# Changelog

All notable changes to **Horizon** are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Project renamed **Aegis → Horizon**. Horizon is the **agentic browser** with
  layered security; **Compositer** remains the agent that travels through it.
- README reframed around the agentic-browser identity (original structure kept):
  browser-use/browser-harness VM, Docker sandbox, and live-browser autonomy are
  the headline; site-safety scoring is presented as built-in security layers.

### Added
- `docs/architecture.md` — detailed system flow & design (moved from `README2.md`).
- MIT `LICENSE`, `CONTRIBUTING.md`, `CHANGELOG.md`.
- GitHub Actions CI (typecheck + build on push/PR).
- `.env.example` documenting all configuration variables.
- `GET /api/health` readiness endpoint.

## [0.1.0] — 2026-08

### Added
- Local-first secure web-agent ecosystem powered by [eve](https://eve.dev) and
  [browser-harness](https://github.com/browser-use/browser-harness).
- **Compositer** — agentic browser agent driving headless Chrome in Docker via CDP.
- Live browser panel with JPEG previews, multi-tab activation, and **Take Control**.
- Human-in-the-loop: chat lock after the first message, inline option buttons,
  form dialog for login/OTP/captcha, and guided shopping checkpoints.
- On-device site-safety scanner with 10 local checks and `SAFE` / `REVIEW` /
  `DANGER` tiers.
- Razorpay checkout for `SAFE` sites (simulated demo mode without keys).
- Auth pages (login / signup).
- Demo recordings of the agent across three runs.