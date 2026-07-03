#!/usr/bin/env bash
# Post-up bootstrap for prod-local stack (TZ §8)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Health checks =="
bash scripts/prod-local-health.sh

echo "== MinIO bucket =="
bash scripts/minio-init.sh || true

echo "== Elasticsearch index =="
bash scripts/catalog/es-index.sh

echo "== ES bulk from PG (if psql available) =="
if command -v psql >/dev/null 2>&1; then
  PGURL="${DATABASE_URL:-postgres://jomboy:jomboy@localhost:5432/jomboy?sslmode=disable}"
  psql "$PGURL" -t -A -c "SELECT id, name->>'ru', name->>'uz', barcode, price FROM products WHERE active LIMIT 100" 2>/dev/null | while IFS='|' read -r id ru uz bc price; do
    [ -z "$id" ] && continue
    curl -sf -X POST "${ELASTICSEARCH_URL:-http://localhost:9200}/catalog/_doc/$id" \
      -H 'Content-Type: application/json' \
      -d "{\"name_ru\":\"$ru\",\"name_uz\":\"$uz\",\"barcode\":\"$bc\",\"price\":$price}" >/dev/null || true
  done
  echo "Indexed products into ES"
else
  echo "psql not found — skip ES bulk"
fi

echo "== Done. Run Go E2E: =="
echo "API_BASE_URL=http://localhost:8000/api/v1 npm run e2e -- --grep 'Go TZ'"
