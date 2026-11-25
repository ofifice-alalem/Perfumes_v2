#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
BASE_DIR="$( cd "$DIR/.." >/dev/null 2>&1 && pwd )"
cd "$BASE_DIR"

echo "===================================================="
echo "  إيقاف منظومة السحابة وخدمة الطباعة (Linux)"
echo "===================================================="
echo ""

echo "[1/2] جاري إيقاف حاويات Docker..."
if command -v docker-compose &> /dev/null; then
    docker-compose stop
else
    docker compose stop
fi

echo "[2/2] جاري إيقاف جسر الطباعة (Port 9124)..."
BRIDGE_PID=$(lsof -ti:9124 2>/dev/null || ss -tulpn 2>/dev/null | grep ':9124' | awk '{print $NF}' | sed -E 's/.*pid=([0-9]+).*/\1/' || true)

if [ -n "$BRIDGE_PID" ]; then
    kill -9 $BRIDGE_PID 2>/dev/null || true
fi
pkill -f "node.*server.js" 2>/dev/null || true

echo ""
echo "===================================================="
echo "  تم إيقاف النظام بأمان وحفظ البيانات في قاعدة البيانات."
echo "===================================================="
read -p "اضغط Enter للإغلاق..."
