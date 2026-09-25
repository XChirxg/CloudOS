#!/bin/bash
PORT=8001
PIDS=$(ss -ltnp 2>/dev/null | grep ":${PORT} " | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)
if [ -z "$PIDS" ]; then echo "No LAN control server found on port $PORT."; exit 0; fi
echo "Stopping: $PIDS"
kill $PIDS 2>/dev/null || true
