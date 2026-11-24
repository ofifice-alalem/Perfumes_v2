#!/bin/bash

# دالة تُنفّذ عند انتهاء السكربت أو حدوث أي خطأ لضمان بقاء النافذة مفتوحة
trap 'echo ""; echo "============================================================"; read -p "اضغط على Enter لإغلاق هذه النافذة..." dummy' EXIT

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "============================================================"
echo "  توليد وتحديث صورة دوكر للمشروع وحفظها في deploy_package (Linux)"
echo "  Build & Export Perfumes Docker Image (Offline Bundle)"
echo "============================================================"
echo ""

if ! command -v docker &> /dev/null; then
    echo "[خطأ] Docker غير مثبت على هذا الجهاز!"
    exit 1
fi

# فحص الاتصال مع Docker daemon وتنبيه المستخدم بصلاحيات sudo إن لزم
DOCKER_CMD="docker"
if ! docker info &> /dev/null; then
    if sudo docker info &> /dev/null; then
        echo "[ملاحظة] تشغيل أوامر Docker عبر صلاحيات sudo..."
        DOCKER_CMD="sudo docker"
    else
        echo "[خطأ] خدمة Docker daemon غير مشغلة! يرجى تشغيلها أولاً."
        exit 1
    fi
fi

if [ ! -d "deploy_package" ]; then
    echo "[خطأ] مجلد deploy_package غير موجود في المسار الحالي!"
    exit 1
fi

echo "[0/3] مزامنة أحدث إعدادات ومحرك الطباعة إلى deploy_package/printer_bridge..."
if [ -d "thermal-printer-engine" ] && [ -d "deploy_package/printer_bridge" ]; then
    rsync -av --exclude="node_modules" --exclude="node.exe" --exclude="start_*.bat" --exclude="start_*.vbs" --exclude="start_*.sh" thermal-printer-engine/ deploy_package/printer_bridge/ > /dev/null 2>&1 || true
fi

echo "[1/3] التأكد من صورة MySQL 8.0..."
$DOCKER_CMD pull mysql:8.0

echo ""
echo "[2/3] بناء صورة المشروع الحالي (perfumes_v2_app:latest)..."
$DOCKER_CMD build -f deploy_package/Dockerfile -t perfumes_v2_app:latest .

echo ""
echo "[3/3] تصدير الصور إلى deploy_package/perfumes_bundle_offline.tar..."
$DOCKER_CMD save -o deploy_package/perfumes_bundle_offline.tar perfumes_v2_app:latest mysql:8.0

echo ""
echo "============================================================"
echo "  🎉 تم بنجاح بناء وتصدير حزمة الأوفلاين!"
echo "  المسار: deploy_package/perfumes_bundle_offline.tar"
echo "============================================================"
