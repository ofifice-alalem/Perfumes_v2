#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
BASE_DIR="$( cd "$DIR/.." >/dev/null 2>&1 && pwd )"
cd "$BASE_DIR"

echo "===================================================="
echo "  منظومة السحابة - تشغيل (Linux)"
echo "===================================================="

# 1. التحقق من Docker وتعيين السياق والتأكد من تشغيل الخدمة
if ! command -v docker &> /dev/null; then
    echo "[خطأ فادح] Docker غير مثبت! يرجى تشغيل install_everything.sh أولاً."
    read -p "اضغط Enter للإغلاق..."
    exit 1
fi

# التبديل إلى سياق النظام الأساسي (تجاوز Docker Desktop إن وجد)
docker context use default >/dev/null 2>&1 || true

# فحص ما إذا كان المستخدم بحاجة لـ sudo لتنفيذ أوامر دوكر
DOCKER_CMD="docker"
COMPOSE_CMD="docker compose"

if ! docker info &> /dev/null; then
    if sudo docker info &> /dev/null; then
        DOCKER_CMD="sudo docker"
        COMPOSE_CMD="sudo docker compose"
        if ! sudo docker compose version &> /dev/null && command -v docker-compose &> /dev/null; then
            COMPOSE_CMD="sudo docker-compose"
        fi
    else
        echo "خدمة Docker غير مشغلة. جاري تشغيل Docker Engine..."
        sudo systemctl start docker 2>/dev/null || systemctl start docker 2>/dev/null
        sleep 2
        if docker info &> /dev/null; then
            DOCKER_CMD="docker"
            COMPOSE_CMD="docker compose"
        elif sudo docker info &> /dev/null; then
            DOCKER_CMD="sudo docker"
            COMPOSE_CMD="sudo docker compose"
        else
            echo "[خطأ] تعذر الاتصال بـ Docker daemon! يرجى التأكد من تشغيلها يدوياً (sudo systemctl start docker)."
            read -p "اضغط Enter للإغلاق..."
            exit 1
        fi
    fi
fi

# 2. تشغيل وسيط الطباعة
echo "[1/3] فحص جسر الطباعة..."
if ! (echo > /dev/tcp/127.0.0.1/9124) 2>/dev/null; then
    echo "جاري تشغيل وسيط الطباعة في الخلفية..."
    if [ -f "$BASE_DIR/printer_bridge/server.js" ]; then
        cd "$BASE_DIR/printer_bridge"
        nohup node server.js >/dev/null 2>&1 &
        cd "$BASE_DIR"
    fi
else
    echo "وسيط الطباعة يعمل بالفعل."
fi

# 3. تحميل الصور أوفلاين إذا وجدت
if [ -f "$BASE_DIR/perfumes_bundle_offline.tar" ]; then
    echo "[2/3] جاري تحميل صور Docker أوفلاين..."
    $DOCKER_CMD load -i "$BASE_DIR/perfumes_bundle_offline.tar"
fi

# 4. تشغيل الحاويات
echo "[3/3] تشغيل حاويات النظام..."
$COMPOSE_CMD up -d --remove-orphans

echo ""
echo "===================================================="
echo "  ✅ النظام يعمل الآن!"
echo "  الرابط: http://localhost:8000"
echo "===================================================="
read -p "اضغط Enter للإغلاق..."
