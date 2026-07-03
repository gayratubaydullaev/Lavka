#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
VER=go1.22.10.linux-amd64
if [ ! -d "$TOOLS/$VER" ]; then
  mkdir -p "$TOOLS"
  echo "Downloading Go 1.22..."
  wget -q "https://go.dev/dl/${VER}.tar.gz" -O "$TOOLS/go.tar.gz"
  tar -C "$TOOLS" -xzf "$TOOLS/go.tar.gz"
  mv "$TOOLS/go" "$TOOLS/$VER"
  rm "$TOOLS/go.tar.gz"
  ln -sf "$VER" "$TOOLS/go-link"
fi
export PATH="$TOOLS/$VER/bin:$PATH"
go version
echo "Go ready at $TOOLS/$VER"
