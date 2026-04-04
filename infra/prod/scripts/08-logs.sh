#!/usr/bin/env bash
# logs -f (default: reverse-proxy backend). Pass service names as args.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

arqops_require_env_file
arqops_require_compose_file

if [[ $# -eq 0 ]]; then
  set -- reverse-proxy backend
fi

arqops_compose logs -f "$@"
