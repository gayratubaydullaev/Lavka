#!/usr/bin/env bash
# Index catalog products into Elasticsearch (prod-local)
set -euo pipefail
ES="${ELASTICSEARCH_URL:-http://localhost:9200}"
DS="${DARKSTORE_ID:-a1b2c3d4-e5f6-7890-abcd-ef1234567890}"

curl -sf -X PUT "$ES/catalog" -H 'Content-Type: application/json' -d '{
  "mappings": {
    "properties": {
      "name_ru": { "type": "text" },
      "name_uz": { "type": "text" },
      "barcode": { "type": "keyword" },
      "price": { "type": "integer" }
    }
  }
}' || true

echo "Catalog index ready at $ES/catalog"
echo "Darkstore: $DS — bulk index from admin-bff seed or mock export"
