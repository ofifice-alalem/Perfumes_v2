#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
BASE_DIR="$( cd "$DIR/.." >/dev/null 2>&1 && pwd )"

echo "============================================================"
echo "    تثبيت شامل وتجهيز نظام لينكس بضغطة واحدة (All-in-One)"
echo "    Linux Full Automated Setup: Docker, CUPS, Node & Bridge"
echo "============================================================"
echo ""

# طلب صلاحية الـ sudo تلقائياً إن لم تكن متوفرة
if [ "$EUID" -ne 0 ]; then
    echo "يرجى إدخال كلمة سر الجهاز لتثبيت الأدوات المطلوبة..."
    sudo bash "$0"
    exit $?
fi

TARGET_USER="${SUDO_USER:-$USER}"

echo "[1/4] منح صلاحيات التنفيذ لجميع ملفات النظام..."
chmod +x "$DIR"/*.sh 2>/dev/null || true
chmod +x "$BASE_DIR"/printer_bridge/*.sh 2>/dev/null || true

echo ""
echo "[2/4] تحديث وتثبيت متطلبات الطباعة والشبكة (CUPS, curl, lsof)..."
if command -v apt-get &> /dev/null; then
    apt-get update -y
    apt-get install -y cups-client curl lsof
fi

echo ""
echo "[3/4] التحقق من Docker و Docker Compose..."
if ! command -v docker &> /dev/null; then
    echo "Docker غير موجود. جاري تثبيت Docker تلقائياً..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi

# إضافة المستخدم لمجموعة دوكر حتى لا يطلب صلاحيات مستقبلاً
if [ -n "$TARGET_USER" ]; then
    usermod -aG docker "$TARGET_USER" 2>/dev/null || true
fi

echo ""
echo "[4/4] تثبيت Node.js وحزم وسيط الطباعة..."
if ! command -v node &> /dev/null; then
    echo "جاري تثبيت Node.js الحديث..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# الانتقال لمجلد وسيط الطباعة وتثبيت الحزم
cd "$BASE_DIR/printer_bridge"
if [ -f "package.json" ]; then
    echo "تثبيت مكتبات الفواتير والباركود العربي..."
    npm install --save \
      "@napi-rs/canvas@^0.1.66" \
      "@fontsource/cairo@^5.3.0" \
      "arabic-persian-reshaper@^1.0.1" \
      "bidi-js@^1.0.3" \
      "qrcode@^1.5.4" \
      "jsbarcode@^3.12.3" >/dev/null 2>&1 || true
fi

echo ""
echo "============================================================"
echo "  🎉 تم تثبيت وتجهيز كل شيء بنجاح وبشكل كامل!"
echo "  يمكنك الآن تشغيل المنظومة مباشرة من مجلد linux عبر:"
echo "  - run_docker.sh (للتشغيل المباشر)"
echo "  - enable_autostart.sh (لتفعيل التشغيل التلقائي مع الجهاز)"
echo "============================================================"
echo ""
read -p "اضغط Enter للإنهاء..."
