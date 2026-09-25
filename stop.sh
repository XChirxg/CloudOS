#!/bin/bash

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-8000}"
PID_FILE="$SCRIPT_DIR/server.pid"
STOPPED=0

echo "Stopping Windows Web OS..."

# 1. Stop by PID file if present
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        echo "Terminating server process $PID..."
        kill "$PID" 2>/dev/null || true
        for i in {1..10}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                break
            fi
            sleep 0.2
        done
        if kill -0 "$PID" 2>/dev/null; then
            kill -9 "$PID" 2>/dev/null || true
        fi
        STOPPED=1
    fi
    rm -f "$PID_FILE"
fi

# 2. Check if any process is still listening on port
PIDS=$(ss -ltnp 2>/dev/null | grep ":${PORT} " | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)
if [ -n "$PIDS" ]; then
    echo "Stopping remaining process(es) on port $PORT: $PIDS"
    kill $PIDS 2>/dev/null || true
    sleep 0.5
    PIDS_STILL=$(ss -ltnp 2>/dev/null | grep ":${PORT} " | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)
    if [ -n "$PIDS_STILL" ]; then
        kill -9 $PIDS_STILL 2>/dev/null || true
    fi
    STOPPED=1
fi

if [ "$STOPPED" -eq 1 ]; then
    echo "Windows Web OS stopped successfully. Port $PORT is now free."
else
    echo "No server was running on port $PORT."
fi
