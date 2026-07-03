#!/usr/bin/env bash
# Run Go microservices locally without Docker (dev helper)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
export PATH="$TOOLS/go/bin:$PATH"

if ! command -v go >/dev/null 2>&1; then
  if [ -x "$TOOLS/go1.22.10.linux-amd64/bin/go" ]; then
    export PATH="$TOOLS/go1.22.10.linux-amd64/bin:$PATH"
  else
    echo "Go not found. Run: bash scripts/install-go-local.sh"
    exit 1
  fi
fi

PIDS=()
cleanup() {
  for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM

start_svc() {
  local name=$1 port=$2
  local dir="$ROOT/services/$name"
  [ "$name" = "admin-bff" ] && dir="$ROOT/services/admin-bff"
  echo "Starting $name on :$port..."
  (cd "$dir" && go mod tidy >/dev/null 2>&1; DEV_NO_DB=$DEV_NO_DB PORT=$port go run ./cmd/server) &
  PIDS+=($!)
  sleep 1
}

export DEV_NO_DB="${DEV_NO_DB:-true}"
export DATABASE_URL="${DATABASE_URL:-}"
export NATS_URL="${NATS_URL:-}"
export MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
export MINIO_PUBLIC_URL="${MINIO_PUBLIC_URL:-http://localhost:9000}"
export MINIO_ROOT_USER="${MINIO_ROOT_USER:-jomboy}"
export MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-jomboysecret}"

start_svc catalog 8101
start_svc order 8102
start_svc picker 8103
start_svc courier 8104
start_svc billing 8105
start_svc support 8106
start_svc notification 8107
start_svc admin-bff 8108

echo "Starting local gateway :8000..."
node "$ROOT/scripts/local-kong.mjs" &
PIDS+=($!)

echo ""
echo "Stack running (Ctrl+C to stop):"
echo "  Gateway  http://localhost:8000/api/v1"
echo "  Health   http://localhost:8102/health"
echo ""
echo "Run E2E:"
echo "  API_BASE_URL=http://localhost:8000/api/v1 npm run e2e -- --grep 'Go TZ'"
echo ""

wait
