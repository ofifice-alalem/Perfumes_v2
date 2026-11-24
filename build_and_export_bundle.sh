#!/bin/bash
set -e

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

echo "[1/3] التأكد من صورة MySQL 8.0..."
docker pull mysql:8.0

echo ""
echo "[2/3] بناء صورة المشروع الحالي (perfumes_v2_app:latest)..."
docker build -f deploy_package/Dockerfile -t perfumes_v2_app:latest .

echo ""
echo "[3/3] تصدير الصور إلى deploy_package/perfumes_bundle_offline.tar..."
docker save -o deploy_package/perfumes_bundle_offline.tar perfumes_v2_app:latest mysql:8.0

echo ""
echo "============================================================"
echo "  🎉 تم بنجاح بناء وتصدير حزمة الأوفلاين!"
echo "  المسار: deploy_package/perfumes_bundle_offline.tar"
echo "============================================================"
