#!/usr/bin/env bash
# Create MinIO bucket jomboy for delivery photos (prod-local)
set -euo pipefail
ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
USER="${MINIO_ROOT_USER:-jomboy}"
PASS="${MINIO_ROOT_PASSWORD:-jomboysecret}"

echo "Waiting for MinIO at $ENDPOINT..."
for i in $(seq 1 30); do
  if curl -sf "$ENDPOINT/minio/health/live" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

docker run --rm --network host minio/mc:latest sh -c "
  mc alias set local $ENDPOINT $USER $PASS
  mc mb --ignore-existing local/jomboy
  mc anonymous set download local/jomboy/delivery
  echo 'Bucket jomboy ready'
" 2>/dev/null || {
  echo "mc unavailable — bucket jomboy should exist via manual MinIO console"
}
