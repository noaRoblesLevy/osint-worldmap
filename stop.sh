#!/usr/bin/env bash
# WORLDVIEW - Stop Script (Linux/macOS)

echo ""
echo " Stopping WORLDVIEW servers..."
echo ""

# Kill by port
for port in 3000 8080 8081; do
    pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo " Killing process on port $port (PID $pid)"
        kill -9 $pid 2>/dev/null
    fi
done

echo ""
echo " All WORLDVIEW servers stopped."
echo ""
