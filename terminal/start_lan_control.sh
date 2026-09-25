#!/bin/bash
set -e
PORT=8001
cd "$(dirname "$0")"
export LAN_PANEL_PIN="${LAN_PANEL_PIN:-1234}"
if ss -ltn 2>/dev/null | grep -q ":${PORT} "; then
  echo "Port ${PORT} is already in use."
  ss -ltnp | grep ":${PORT} " || true
  exit 1
fi
IP=$(hostname -I | awk '{print $1}')
echo
echo "LAN Computer Control"
echo "Open on phone: http://${IP}:${PORT}"
echo "PIN: ${LAN_PANEL_PIN}"
echo "Press Ctrl+C to stop."
echo
exec python3 lan_control_server.py
