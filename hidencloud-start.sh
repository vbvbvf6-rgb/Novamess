#!/bin/bash
# Nova Messenger — стартовый скрипт для HidenCloud Node.js
set -e

echo "=== Nova Messenger Setup ==="

# Установить pnpm если нет
if ! command -v pnpm &> /dev/null; then
  echo "[1/4] Устанавливаем pnpm..."
  npm install -g pnpm@10
fi

echo "[2/4] Устанавливаем зависимости..."
pnpm install --frozen-lockfile

echo "[3/4] Собираем проект..."
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/pulse run build
pnpm --filter @workspace/api-server run build

echo "[4/4] Запускаем сервер..."
bash scripts/start-prod.sh
