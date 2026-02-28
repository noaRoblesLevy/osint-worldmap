#!/usr/bin/env bash
# WORLDVIEW - Start Script (Linux/macOS)

set -e

echo ""
echo " ============================================"
echo "  WORLDVIEW - Geospatial Intelligence Platform"
echo " ============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check node
if ! command -v node &>/dev/null; then
    echo "[ERROR] Node.js not found. Please install Node.js first."
    exit 1
fi

# Install deps if needed
if [ ! -d "backend/node_modules" ]; then
    echo "[SETUP] Installing backend dependencies..."
    (cd backend && npm install)
fi
if [ ! -d "frontend/node_modules" ]; then
    echo "[SETUP] Installing frontend dependencies..."
    (cd frontend && npm install)
fi

# Start backend
echo "[1/2] Starting backend server (ports 8080/8081)..."
(cd backend && npx tsx watch server.ts) &
BACKEND_PID=$!

sleep 2

# Start frontend
echo "[2/2] Starting frontend dev server (port 3000)..."
(cd frontend && npx next dev --port 3000) &
FRONTEND_PID=$!

sleep 3

echo ""
echo " ============================================"
echo "  WORLDVIEW is running!"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8080"
echo "  WebSocket: ws://localhost:8081"
echo " ============================================"
echo ""
echo "  Press Ctrl+C to stop all servers..."

# Trap Ctrl+C to clean up
cleanup() {
    echo ""
    echo "[STOP] Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "[DONE] All servers stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait
