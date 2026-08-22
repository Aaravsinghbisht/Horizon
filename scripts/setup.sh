#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building eve sandbox image (browser-harness included)..."
docker build -t compositer/eve-sandbox:local docker/eve-sandbox

echo "==> Starting headless Chrome (CDP on localhost:9222)..."
docker compose up -d chrome

echo "==> Waiting for Chrome CDP..."
for _ in $(seq 1 30); do
  if curl -sf http://127.0.0.1:9222/json/version >/dev/null 2>&1; then
    echo "Chrome is ready."
    break
  fi
  sleep 1
done

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  echo "Created .env.local — add your AI_GATEWAY_API_KEY before running the agent."
fi

echo ""
echo "Setup complete. Next:"
echo "  1. Edit .env.local and set AI_GATEWAY_API_KEY"
echo "  2. npm run dev"
echo "  3. Open http://localhost:3000"
