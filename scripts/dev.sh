#!/usr/bin/env bash
# Load .env.local over any shell-exported keys, then start Next + eve.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — copy .env.example and set AI_GATEWAY_API_KEY"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

exec next dev
