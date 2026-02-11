#!/usr/bin/env bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/.." && pwd)"

# ---------- PostgreSQL (Docker) ----------
echo "Starting PostgreSQL..."
docker compose -f "$APP_DIR/docker-compose.yml" up -d db

# Wait for healthy
echo -n "Waiting for DB"
until docker compose -f "$APP_DIR/docker-compose.yml" exec -T db pg_isready -U postgres -q 2>/dev/null; do
    echo -n "."
    sleep 1
done
echo " ready"

# ---------- Migrations ----------
echo "Running migrations..."
cd "$ROOT_DIR"
uv run python3 -m alembic upgrade head

# ---------- Seed (if empty) ----------
# Uncomment to auto-seed on first run:
# uv run python3 -m benchmark_app.seed

# ---------- Next.js Frontend ----------
echo "Starting frontend at http://localhost:3000"
cd "$APP_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
cd "$ROOT_DIR"

# Cleanup on exit — kill frontend when script is stopped
cleanup() {
    echo ""
    echo "Stopping frontend (PID $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
}
trap cleanup EXIT INT TERM

# ---------- FastAPI ----------
echo "Starting backend at http://localhost:8000"
uv run uvicorn benchmark_app.main:app --reload --host 0.0.0.0 --port 8000
