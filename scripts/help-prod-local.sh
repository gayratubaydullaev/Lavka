#!/usr/bin/env bash
# Prerequisites check + prod-local setup guide
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

ok() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }

echo "=== Jomboy prod-local setup check ==="
echo ""

HAS_DOCKER=false
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  ok "Docker running"
  HAS_DOCKER=true
else
  fail "Docker not installed or not running"
  echo "  Install (pick one):"
  echo "    sudo snap install docker"
  echo "    sudo apt install docker.io && sudo usermod -aG docker \$USER"
  echo "  Then log out/in and run: npm run prod-local:up"
fi

if [ -x "$ROOT/.tools/go1.22.10.linux-amd64/bin/go" ] || command -v go >/dev/null 2>&1; then
  ok "Go available (local or system)"
else
  warn "Go not found — run: bash scripts/install-go-local.sh"
fi

if node -e "fetch('http://localhost:4010/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
  ok "Mock API on :4010 (E2E mock ready)"
else
  warn "Mock not running — start: npm run mock:dev"
fi

if node -e "fetch('http://localhost:8000/api/v1/loyalty/wallet').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
  ok "Go gateway on :8000"
else
  warn "Go stack not on :8000"
  if $HAS_DOCKER; then
    echo "  Run: npm run prod-local:up && npm run prod-local:bootstrap"
  else
    echo "  Without Docker: bash scripts/run-go-stack-local.sh"
    echo "  (admin-bff needs Postgres — use Docker for full HQ/WMS tests)"
  fi
fi

echo ""
echo "=== Quick commands ==="
echo "  Mock E2E:     npm run e2e -- --grep 'TZ'"
echo "  Go E2E:       API_BASE_URL=http://localhost:8000/api/v1 npm run e2e -- --grep 'Go TZ'"
echo ""
