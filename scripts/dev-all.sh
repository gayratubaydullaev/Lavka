#!/usr/bin/env bash
# Запуск mock API + всех веб-админок одной командой.
# Мобильные приложения (Flutter/Kotlin) — отдельно, нужен эмулятор/устройство.
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v pnpm >/dev/null 2>&1; then
  pnpm install
  exec pnpm dev
fi

if command -v npm >/dev/null 2>&1; then
  npm install
  exec npm run dev
fi
exit 1
