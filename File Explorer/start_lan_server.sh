#!/bin/bash
set -e
PORT="${PORT:-8000}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
HTML_FILE="$SCRIPT_DIR/index.html"

[ -f "$HTML_FILE" ] || { echo "index.html not found next to this script."; exit 1; }

# Refuse to replace an unrelated process already using the port.
if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$PORT" 2>/dev/null | grep -q ":$PORT"; then
  echo "Port $PORT is already in use. Stop the existing server first."
  echo "Run: ss -ltnp | grep :$PORT"
  exit 1
fi

IP="$(hostname -I | awk '{print $1}')"
echo
echo "======================================"
echo "          FILE EXPLORER"
echo "======================================"
echo "Phone URL: http://$IP:$PORT"
echo
echo "Keep this terminal open while sharing."
echo "Press Ctrl+C to stop."
echo "======================================"
echo

exec python3 "$SCRIPT_DIR/lan_server.py" "$HTML_FILE" "$PORT"
