#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Chrome browser"
docker compose up -d chrome

echo "==> Waiting for Chrome CDP..."
for _ in $(seq 1 20); do
  if curl -sf http://127.0.0.1:9222/json/version >/dev/null 2>&1; then
    echo "Chrome ready."
    break
  fi
  sleep 1
done

if ! docker image inspect compositer/eve-sandbox:local >/dev/null 2>&1; then
  echo "==> Building sandbox image..."
  docker build -t compositer/eve-sandbox:local docker/eve-sandbox
fi

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — copy .env.example and set AI_GATEWAY_API_KEY"
  exit 1
fi

echo "==> Loading .env.local (overrides shell API keys)…"
set -a
# shellcheck disable=SC1091
source .env.local
set +a

echo "==> Starting Compositer (http://localhost:3000)"
npm run dev
