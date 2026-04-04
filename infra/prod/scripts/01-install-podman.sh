#!/usr/bin/env bash
# Install Podman and podman-compose on Ubuntu (DigitalOcean Droplet).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

arqops_require_root

if [[ -f /etc/os-release ]]; then
  # shellcheck source=/dev/null
  source /etc/os-release
  echo "Detected: $ID $VERSION_ID"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl

if command -v add-apt-repository >/dev/null 2>&1; then
  add-apt-repository -y universe 2>/dev/null || true
  apt-get update -y
fi

if apt-cache show podman >/dev/null 2>&1; then
  apt-get install -y podman
else
  echo "Package podman not found in apt. See https://podman.io/docs/installation" >&2
  exit 1
fi

if apt-cache show podman-compose >/dev/null 2>&1; then
  apt-get install -y podman-compose
else
  echo "podman-compose not in apt; installing via pip..."
  apt-get install -y python3-pip || true
  pip3 install --break-system-packages podman-compose 2>/dev/null || pip3 install podman-compose
fi

podman --version
podman-compose --version
echo "Done. Caddy needs 80/443 — run deploy as root or sudo."
