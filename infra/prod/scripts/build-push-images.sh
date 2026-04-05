#!/usr/bin/env bash
# Build backend + frontend images and push to DOCR (or any registry).
# Run on your laptop or in CI after: docker login registry.digitalocean.com
# Required: DOCKER_REGISTRY, IMAGE_TAG, PUBLIC_API_URL (from env or --env-file).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="${ARQOPS_ENV_FILE:-$REPO_ROOT/.env.prod}"

usage() {
  echo "Build backend + frontend images and push to your container registry."
  echo ""
  echo "Usage: $0 [--env-file PATH]"
  echo ""
  echo "Reads DOCKER_REGISTRY, IMAGE_TAG, PUBLIC_API_URL, optional CONTAINER_ENGINE from the env file"
  echo "(default: .env.prod) or from the environment if already set."
  echo ""
  echo "  CONTAINER_ENGINE=docker|podman   (default: docker; read after env file is sourced)"
  echo "  ALSO_LATEST=1                    also tag and push :latest"
  echo "  ARQOPS_ENV_FILE=path             default: REPO_ROOT/.env.prod"
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help) usage 0 ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    *) echo "Unknown option: $1" >&2; usage 1 ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

# Resolve after sourcing .env.prod so CONTAINER_ENGINE / ALSO_LATEST from the file apply.
ENGINE="${CONTAINER_ENGINE:-docker}"
ALSO_LATEST="${ALSO_LATEST:-0}"

if ! command -v "$ENGINE" >/dev/null 2>&1; then
  echo "Command not found: $ENGINE (install Docker/Podman or set CONTAINER_ENGINE)" >&2
  exit 1
fi

: "${DOCKER_REGISTRY:?Set DOCKER_REGISTRY (e.g. registry.digitalocean.com/your-registry)}"
: "${IMAGE_TAG:?Set IMAGE_TAG (e.g. latest or git SHA)}"
: "${PUBLIC_API_URL:?Set PUBLIC_API_URL (e.g. https://api.example.com — baked into frontend bundle)}"

BACKEND_IMG="$DOCKER_REGISTRY/backend:$IMAGE_TAG"
FRONTEND_IMG="$DOCKER_REGISTRY/frontend:$IMAGE_TAG"

echo "Engine:    $ENGINE"
echo "Registry:  $DOCKER_REGISTRY"
echo "Tag:       $IMAGE_TAG"
echo "API URL:   $PUBLIC_API_URL"
echo "Backend:   $BACKEND_IMG"
echo "Frontend:  $FRONTEND_IMG"
echo ""

echo "==> Build backend"
"$ENGINE" build -t "$BACKEND_IMG" "$REPO_ROOT/backend"

echo "==> Build frontend (NEXT_PUBLIC_API_BASE_URL=$PUBLIC_API_URL)"
"$ENGINE" build -t "$FRONTEND_IMG" \
  --build-arg "NEXT_PUBLIC_API_BASE_URL=$PUBLIC_API_URL" \
  "$REPO_ROOT/frontend"

echo "==> Push backend"
"$ENGINE" push "$BACKEND_IMG"

echo "==> Push frontend"
"$ENGINE" push "$FRONTEND_IMG"

if [[ "$ALSO_LATEST" == "1" || "$ALSO_LATEST" == "true" ]]; then
  LATEST_BACKEND="$DOCKER_REGISTRY/backend:latest"
  LATEST_FRONTEND="$DOCKER_REGISTRY/frontend:latest"
  echo "==> Tag and push :latest"
  "$ENGINE" tag "$BACKEND_IMG" "$LATEST_BACKEND"
  "$ENGINE" tag "$FRONTEND_IMG" "$LATEST_FRONTEND"
  "$ENGINE" push "$LATEST_BACKEND"
  "$ENGINE" push "$LATEST_FRONTEND"
fi

echo ""
echo "Done. On the server, IMAGE_TAG in .env.prod must match ($IMAGE_TAG) before pull/deploy."
