#!/bin/bash
# 快查 AI — 一键启动开发环境

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== 快查 AI 开发环境启动 ==="
echo ""

# Find Python >= 3.10
find_python() {
  for cmd in python3.13 python3.12 python3.11 python3.10 python3; do
    if command -v "$cmd" &>/dev/null; then
      local ver
      ver=$("$cmd" -c "import sys; print(sys.version_info.minor)")
      if [ "$ver" -ge 10 ] 2>/dev/null; then
        echo "$cmd"
        return
      fi
    fi
  done
  echo ""
}

PYTHON_CMD=$(find_python)
if [ -z "$PYTHON_CMD" ]; then
  echo "Error: Python >= 3.10 not found. Please install Python 3.10+."
  exit 1
fi
echo "Using Python: $PYTHON_CMD ($($PYTHON_CMD --version))"
echo ""

# Start backend
echo "[1/2] 启动后端 (FastAPI) ..."
cd "$ROOT_DIR/backend"
if [ ! -d "venv" ]; then
  $PYTHON_CMD -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt -q
else
  source venv/bin/activate
fi
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Start frontend
echo "[2/2] 启动前端 (Next.js) ..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "=== 服务已启动 ==="
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo '服务已停止'" EXIT
wait
