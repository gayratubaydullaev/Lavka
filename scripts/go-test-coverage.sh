#!/usr/bin/env bash
# Run Go unit tests with coverage inside Docker (no local Go required)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
docker run --rm -v "$ROOT/services:/src" -w /src golang:1.22-alpine sh -c '
  apk add --no-cache git >/dev/null
  for svc in pkg order admin-bff billing catalog; do
    if [ -d "$svc" ]; then
      echo "=== testing $svc ==="
      cd "/src/$svc"
      go mod tidy 2>/dev/null || true
      go test ./... -count=1 -coverprofile=/tmp/cov.out 2>&1 || true
    fi
  done
  echo "=== pkg coverage ==="
  cd /src/pkg && go test ./... -cover
'
