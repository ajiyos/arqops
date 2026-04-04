#!/usr/bin/env bash
# Create .env.prod from .env.prod.example if missing.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

if [[ -f "$ARQOPS_ENV_FILE" ]]; then
  echo "Already exists: $ARQOPS_ENV_FILE"
  read -r -p "Overwrite from .env.prod.example? [y/N] " ans
  if [[ ! "${ans:-}" =~ ^[yY]$ ]]; then
    echo "Leaving file unchanged."
    exit 0
  fi
fi

if [[ ! -f "$ARQOPS_ENV_EXAMPLE" ]]; then
  echo "Missing: $ARQOPS_ENV_EXAMPLE" >&2
  exit 1
fi

cp "$ARQOPS_ENV_EXAMPLE" "$ARQOPS_ENV_FILE"
chmod 600 "$ARQOPS_ENV_FILE"
echo "Created $ARQOPS_ENV_FILE (mode 600). Edit secrets before deploy."
