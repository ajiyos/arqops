#!/usr/bin/env bash
# Run FunctionalVerificationTest (Testcontainers PostgreSQL + full Spring Boot context).
# Requires: Docker, JDK 21, network for first-time image pulls.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  echo "Run backend functional verification tests (FunctionalVerificationTest: smoke + tenant isolation security)."
  echo ""
  echo "Usage: $0 [--clean] [maven-args...]"
  echo ""
  echo "  --clean     Run \`mvn clean test\` (use after switching JDK or if you see class file version errors)."
  echo ""
  echo "Examples:"
  echo "  $0"
  echo "  $0 --clean"
  echo "  $0 -q"
  echo "  $0 -Dtest=FunctionalVerificationTest#tenantLogin_withSeedUser_returnsAccessToken"
  echo ""
  echo "Environment:"
  echo "  JAVA_HOME   If set and points to JDK 21, it is used. Otherwise the script tries to find JDK 21."
  echo "              Note: ./mvnw on macOS defaults JAVA_HOME to your primary JVM when unset — often JDK 17 —"
  echo "              which cannot run bytecode compiled for Java 21. Prefer this script or export JAVA_HOME to JDK 21."
  exit "${1:-0}"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage 0
fi

DO_CLEAN=0
if [[ "${1:-}" == "--clean" ]]; then
  DO_CLEAN=1
  shift
fi

java_is_21() {
  local home="$1"
  [[ -x "$home/bin/java" ]] && "$home/bin/java" -version 2>&1 | grep -q ' version "21'
}

resolve_java_home() {
  if [[ -n "${JAVA_HOME:-}" ]] && java_is_21 "$JAVA_HOME"; then
    echo "$JAVA_HOME"
    return 0
  fi

  if [[ -x /usr/libexec/java_home ]]; then
    local mac_home
    if mac_home=$(/usr/libexec/java_home -v 21 2>/dev/null); then
      echo "$mac_home"
      return 0
    fi
  fi

  local cellar_glob
  for cellar_glob in \
    /opt/homebrew/Cellar/openjdk@21/*/libexec/openjdk.jdk/Contents/Home \
    /usr/local/Cellar/openjdk@21/*/libexec/openjdk.jdk/Contents/Home; do
    for home in $cellar_glob; do
      if [[ -d "$home" ]] && java_is_21 "$home"; then
        echo "$home"
        return 0
      fi
    done
  done

  for home in \
    /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home; do
    if [[ -d "$home" ]] && java_is_21 "$home"; then
      echo "$home"
      return 0
    fi
  done

  return 1
}

JAVA_HOME_RESOLVED="$(resolve_java_home)" || {
  echo "error: JDK 21 not found. Install it (e.g. brew install openjdk@21) or set JAVA_HOME to a JDK 21 install." >&2
  exit 1
}

export JAVA_HOME="$JAVA_HOME_RESOLVED"
export PATH="$JAVA_HOME/bin:$PATH"
cd "$BACKEND_ROOT"
if [[ "$DO_CLEAN" -eq 1 ]]; then
  exec ./mvnw clean test -Dtest=FunctionalVerificationTest "$@"
else
  exec ./mvnw test -Dtest=FunctionalVerificationTest "$@"
fi
