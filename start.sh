#!/bin/bash
set -e

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-8000}"
PID_FILE="$SCRIPT_DIR/server.pid"
LOG_FILE="$SCRIPT_DIR/server.log"

# Check if server is already running via PID file
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Windows Web OS is already running (PID $OLD_PID)."
        IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
        TS_IP="$(tailscale ip -4 2>/dev/null || true)"
        echo "  -> Home Wi-Fi URL     : http://${IP:-localhost}:$PORT"
        if [ -n "$TS_IP" ]; then
            echo "  -> Remote / Tailscale : http://$TS_IP:$PORT"
        fi
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

# Check if port is already occupied
OCCUPIED=$(ss -ltnp 2>/dev/null | grep ":${PORT} " || true)
if [ -n "$OCCUPIED" ]; then
    echo "Notice: Port $PORT is occupied. Freeing port $PORT..."
    ./stop.sh || true
    sleep 1
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [ -z "$IP" ]; then
    IP="127.0.0.1"
fi

echo "================================================================="
echo "                   WINDOWS WEB OS (REMOTE DESKTOP)               "
echo "================================================================="
echo " Starting Windows Web OS on port $PORT..."

# Start unbuffered python in independent session detached from subshell
export PORT="$PORT"
nohup setsid python3 -u server.py >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!
disown "$SERVER_PID" 2>/dev/null || true
echo "$SERVER_PID" > "$PID_FILE"

# Wait up to 3 seconds for server to bind port
STARTED=0
for i in {1..15}; do
    if ss -ltn 2>/dev/null | grep -q ":${PORT} "; then
        STARTED=1
        break
    fi
    sleep 0.2
done

if [ "$STARTED" -eq 1 ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo " Server started successfully! (PID $SERVER_PID)"
    echo
    TS_IP="$(tailscale ip -4 2>/dev/null || true)"
    echo " Access from your Tablet, Phone, or Computer:"
    echo " ---------------------------------------------------------------"
    echo "  -> Home Wi-Fi URL     : http://$IP:$PORT"
    if [ -n "$TS_IP" ]; then
        echo "  -> Remote / Tailscale : http://$TS_IP:$PORT"
    fi
    echo "  -> Local Machine      : http://localhost:$PORT"
    echo " ---------------------------------------------------------------"
    echo " Features:"
    echo "  - Full Windows 11 Desktop UI with Window Manager"
    echo "  - Interactive Terminal with Antigravity (agy) & Touch Toolbar"
    echo "  - File Explorer with Upload, Download, Search, Thumbnails"
    echo "  - Notepad Code Editor with direct file saving"
    echo "  - Task Manager with real-time CPU, RAM, Disk & Battery monitor"
    echo "  - Custom Desktop Wallpapers & Mobile/Tablet Optimization"
    echo
    echo " Log file : $LOG_FILE"
    echo " To stop  : ./stop.sh"
    echo "================================================================="
else
    echo "Failed to start server. Check logs in $LOG_FILE:"
    cat "$LOG_FILE" 2>/dev/null || true
    exit 1
fi
