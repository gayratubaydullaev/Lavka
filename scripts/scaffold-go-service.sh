#!/bin/bash
# Scaffold identical Go microservice boilerplate
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)/services"
NAME="$1"
PORT="$2"
mkdir -p "$ROOT/$NAME/cmd/server"
cat > "$ROOT/$NAME/go.mod" <<EOF
module github.com/jomboy-lavka/$NAME

go 1.22

require (
	github.com/go-chi/chi/v5 v5.1.0
	github.com/jomboy-lavka/pkg v0.0.0
)

replace github.com/jomboy-lavka/pkg => ../pkg
EOF

cat > "$ROOT/$NAME/Dockerfile" <<'DOCKER'
FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY pkg /src/pkg
COPY SERVICE_NAME /src/SERVICE_NAME
WORKDIR /src/SERVICE_NAME
RUN go mod download && CGO_ENABLED=0 GOOS=linux go build -o /app ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app /app/service
EXPOSE PORT_NUM
ENV PORT=PORT_NUM
CMD ["/app/service"]
DOCKER
sed -i "s/SERVICE_NAME/$NAME/g; s/PORT_NUM/$PORT/g" "$ROOT/$NAME/Dockerfile"

cat > "$ROOT/$NAME/cmd/server/main.go" <<EOF
package main

import (
	"github.com/go-chi/chi/v5"
	"github.com/jomboy-lavka/pkg/server"
)

func main() {
	server.Run(server.Options{
		ServiceName: "$NAME",
		DefaultPort: "$PORT",
		Phase:       5,
		Extra:       map[string]any{"tz": "v1.0"},
		Register: func(r chi.Router) {
			r.Get("/api/v1/$NAME/health", func(w http.ResponseWriter, r *http.Request) {
				// routed alias
			})
		},
	})
}
EOF
echo "scaffolded $NAME"
