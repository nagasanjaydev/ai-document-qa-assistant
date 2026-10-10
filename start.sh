#!/bin/bash
# AI Document QA Assistant - Unified Startup Script

echo "=========================================================="
echo " Starting AI Document QA Assistant (FastAPI + React)     "
echo "=========================================================="

# Check Python virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment (.venv)..."
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
fi

# Ensure uploads and data directories exist
mkdir -p backend/uploads backend/data_storage

# Function to clean up background processes on CTRL+C
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting FastAPI backend on http://127.0.0.1:8000..."
.venv/bin/python backend/run.py &
BACKEND_PID=$!

echo "Starting React Vite frontend on http://127.0.0.1:5173..."
npm --prefix frontend run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================================="
echo "  Backend API:  http://127.0.0.1:8000 (Docs: /docs)       "
echo "  Frontend App: http://127.0.0.1:5173                     "
echo "=========================================================="
echo "Press Ctrl+C to terminate both servers."

wait $BACKEND_PID $FRONTEND_PID
