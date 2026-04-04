#!/usr/bin/env bash
# Shared paths and helpers for production setup scripts.
# shellcheck disable=SC2034

_ARQOPS_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# lib/ -> scripts/ -> prod/ -> infra/ -> repo root
export ARQOPS_REPO_ROOT="$(cd "$_ARQOPS_LIB_DIR/../../../.." && pwd)"
export ARQOPS_COMPOSE_FILE="${ARQOPS_COMPOSE_FILE:-$ARQOPS_REPO_ROOT/docker-compose.prod.yml}"
export ARQOPS_ENV_FILE="${ARQOPS_ENV_FILE:-$ARQOPS_REPO_ROOT/.env.prod}"
export ARQOPS_ENV_EXAMPLE="$ARQOPS_REPO_ROOT/.env.prod.example"
export ARQOPS_REGISTRY="${ARQOPS_REGISTRY:-registry.digitalocean.com}"

arqops_require_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "This step must run as root (use sudo)." >&2
    exit 1
  fi
}

arqops_require_compose_file() {
  if [[ ! -f "$ARQOPS_COMPOSE_FILE" ]]; then
    echo "Missing compose file: $ARQOPS_COMPOSE_FILE" >&2
    exit 1
  fi
}

arqops_require_env_file() {
  if [[ ! -f "$ARQOPS_ENV_FILE" ]]; then
    echo "Missing env file: $ARQOPS_ENV_FILE" >&2
    echo "Run 03-init-env.sh or copy .env.prod.example to .env.prod" >&2
    exit 1
  fi
}

arqops_require_podman() {
  command -v podman >/dev/null 2>&1 || {
    echo "podman not found. Run 01-install-podman.sh" >&2
    exit 1
  }
}

arqops_require_podman_compose() {
  command -v podman-compose >/dev/null 2>&1 || {
    echo "podman-compose not found. Run 01-install-podman.sh" >&2
    exit 1
  }
}

# Run podman-compose with repo compose file and .env.prod for interpolation.
arqops_compose() {
  arqops_require_compose_file
  arqops_require_env_file
  arqops_require_podman_compose
  (cd "$ARQOPS_REPO_ROOT" && podman-compose --env-file "$ARQOPS_ENV_FILE" -f "$ARQOPS_COMPOSE_FILE" "$@")
}
