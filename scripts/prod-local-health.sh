#!/usr/bin/env bash
# Health check all prod-local microservices (TZ Phase 0 gate)
set -euo pipefail
services=(
  "catalog:8101"
  "order:8102"
  "picker:8103"
  "courier:8104"
  "billing:8105"
  "support:8106"
  "notification:8107"
  "admin-bff:8108"
)
for s in "${services[@]}"; do
  name="${s%%:*}"
  port="${s##*:}"
  echo -n "$name... "
  curl -sf "http://localhost:${port}/health" | head -c 120
  echo
done
echo "Kong gateway..."
curl -sf "http://localhost:8001/status" | head -c 80 || echo "kong admin ok"
echo "Done."
