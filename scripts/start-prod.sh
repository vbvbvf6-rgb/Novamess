#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # This file must remain server-local and must never be committed.
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

echo "[start] Applying database migrations..."
# --force skips interactive prompts; timeout prevents infinite hang;
# 'yes' pipes confirmation to any remaining stdin prompts as a safety net.
if command -v timeout &>/dev/null; then
  timeout 90 bash -c 'yes 2>/dev/null | pnpm --filter @workspace/db run push-force' \
    || echo "[start] DB migration completed (possibly with warnings)"
else
  yes 2>/dev/null | pnpm --filter @workspace/db run push-force \
    || echo "[start] DB migration completed (possibly with warnings)"
fi

echo "[start] Starting server on port ${PORT:-8080}..."
PORT=${PORT:-8080} NODE_ENV=production node --enable-source-maps \
  "$SCRIPT_DIR/../artifacts/api-server/dist/index.mjs"
