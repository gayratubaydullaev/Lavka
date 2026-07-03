#!/usr/bin/env bash
# Start Postgres + Go API (Phase 5). Requires Docker.
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose up -d postgres api
echo "Go API: http://localhost:4020/api/v1/health"
echo "Postgres: localhost:5432 (jomboy/jomboy)"
