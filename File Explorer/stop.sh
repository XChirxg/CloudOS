#!/bin/bash

PORT=8000

PIDS=$(lsof -ti TCP:$PORT -sTCP:LISTEN 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "No server is running on port $PORT."
    exit 0
fi

echo "Stopping server(s) on port $PORT..."
kill $PIDS

sleep 1

# If it didn't stop, force it
PIDS=$(lsof -ti TCP:$PORT -sTCP:LISTEN 2>/dev/null)

if [ -n "$PIDS" ]; then
    echo "Server did not stop normally. Force stopping..."
    kill -9 $PIDS
fi

echo "Port $PORT is now free."