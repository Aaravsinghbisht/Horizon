#!/usr/bin/env bash
# Full Compositer reset: stale eve registry, dev server, and Chrome tabs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Stopping Compositer dev server (port 3000)…"
for pid in $(pgrep -f "/home/xastro/Documents/compositer/node_modules/.bin/next dev" 2>/dev/null || true); do
  kill "$pid" 2>/dev/null || true
done
sleep 2

echo "==> Clearing stale eve dev registry…"
rm -f "$ROOT/.eve/next-dev-server.json" "$ROOT/.eve/next-dev-server.lock"

echo "==> Restarting headless Chrome (clears stale tabs)…"
docker compose restart chrome

echo "==> Waiting for Chrome CDP…"
for _ in $(seq 1 25); do
  IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' compositer-chrome 2>/dev/null || true)
  if [[ -n "$IP" ]] && curl -sf "http://${IP}:9222/json/version" >/dev/null 2>&1; then
    echo "Chrome ready at ${IP}:9222"
    break
  fi
  sleep 1
done

echo "==> Loading .env.local (overrides shell API keys)…"
set -a
# shellcheck disable=SC1091
source .env.local
set +a

echo "==> Starting Compositer at http://localhost:3000"
exec npm run dev
