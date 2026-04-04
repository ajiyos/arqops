#!/usr/bin/env bash
# Log Podman into DigitalOcean Container Registry.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

arqops_require_podman

REG="$DO_REGISTRY"
if test -z "$REG"; then
  REG="$ARQOPS_REGISTRY"
fi

if test -n "${DO_REGISTRY_TOKEN:-}"; then
  echo "Logging in to $REG (DO_REGISTRY_TOKEN)..."
  echo "$DO_REGISTRY_TOKEN" | podman login "$REG" -u "$DO_REGISTRY_TOKEN" --password-stdin
elif test -n "${DOCR_TOKEN:-}"; then
  echo "Logging in to $REG (DOCR_TOKEN)..."
  echo "$DOCR_TOKEN" | podman login "$REG" -u "$DOCR_TOKEN" --password-stdin
else
  echo "Interactive login to $REG"
  podman login "$REG"
fi

echo "OK: podman login $REG"
