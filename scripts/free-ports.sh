#!/usr/bin/env bash
# Free dev ports if a previous npm run dev was killed without stopping mock-server.
set -euo pipefail

PORTS=(4010 5173 5174 5175 5176)

for port in "${PORTS[@]}"; do
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  elif command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -ti ":${port}" 2>/dev/null || true)
    if [ -n "${pid}" ]; then
      kill "${pid}" 2>/dev/null || true
    fi
  fi
done

sleep 0.3
