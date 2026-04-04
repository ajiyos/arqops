#!/usr/bin/env bash
# Pull images and start the production stack.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

arqops_require_podman
arqops_require_env_file
arqops_require_compose_file

echo "Compose: $ARQOPS_COMPOSE_FILE"
echo "Env:     $ARQOPS_ENV_FILE"
arqops_compose pull
arqops_compose up -d --remove-orphans
echo "Done. Run 06-status.sh and 07-verify-health.sh"
