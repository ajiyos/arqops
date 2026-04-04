#!/usr/bin/env bash
# Stop stack: podman-compose down (extra args forwarded).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

arqops_require_env_file
arqops_require_compose_file
arqops_compose down "$@"
