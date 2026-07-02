#!/usr/bin/env bash
# Starts the ./site Vite dev server and makes sure it's actually terminated
# (not left running as an orphan) whenever this script exits — whether via
# Ctrl+C, `kill`, or a normal error.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIR="$(cd "$SCRIPT_DIR/../site" && pwd)"
PORT="${PORT:-5173}"

cd "$SITE_DIR"

if [ ! -d node_modules ]; then
  echo "site/node_modules missing — running npm install first..."
  npm install
fi

VITE_BIN="$SITE_DIR/node_modules/.bin/vite"
if [ ! -x "$VITE_BIN" ]; then
  echo "error: $VITE_BIN not found (npm install did not complete successfully?)" >&2
  exit 1
fi

VITE_PID=""
CLEANED_UP=0

# Guarded so it's safe to run exactly once no matter which of EXIT/INT/TERM
# actually triggers it first — without the guard, an INT/TERM handler that
# calls `exit` also re-fires the EXIT trap, which would try to kill an
# already-dead process (harmless, but noisy and worth avoiding cleanly).
cleanup() {
  local status=$?
  [ "$CLEANED_UP" = "1" ] && exit "$status"
  CLEANED_UP=1

  if [ -n "$VITE_PID" ] && kill -0 "$VITE_PID" 2>/dev/null; then
    echo ""
    echo "Stopping site dev server (pid $VITE_PID)..."
    kill -TERM "$VITE_PID" 2>/dev/null || true
    # Give it a moment to shut down cleanly before giving up on it.
    for _ in $(seq 1 50); do
      kill -0 "$VITE_PID" 2>/dev/null || break
      sleep 0.1
    done
    if kill -0 "$VITE_PID" 2>/dev/null; then
      echo "Dev server didn't exit in time — sending SIGKILL."
      kill -KILL "$VITE_PID" 2>/dev/null || true
    fi
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

echo "Starting site dev server on port $PORT (Ctrl+C to stop)..."
"$VITE_BIN" --port "$PORT" &
VITE_PID=$!

wait "$VITE_PID"
