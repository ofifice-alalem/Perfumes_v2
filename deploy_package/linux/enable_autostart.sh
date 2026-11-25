#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
BASE_DIR="$( cd "$DIR/.." >/dev/null 2>&1 && pwd )"
SERVICE_NAME="taqniya-pos"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "===================================================="
echo "  تفعيل التشغيل التلقائي مع إقلاع لينكس"
echo "===================================================="
echo ""

# التأكد من تشغيله بصلاحية root
if [ "$EUID" -ne 0 ]; then
    echo "يرجى تشغيل الملف بصلاحية مدير النظام (Root / Sudo):"
    sudo bash "$0"
    exit $?
fi

CURRENT_USER="${SUDO_USER:-$USER}"

# التأكد من تمكين وتشغيل خدمة Docker Engine تلقائياً مع النظام
echo "التحقق من تفعيل وتشغيل خدمة Docker..."
systemctl enable --now docker 2>/dev/null || true

# التبديل إلى سياق النظام الأساسي لدوكر
if command -v docker &> /dev/null; then
    docker context use default >/dev/null 2>&1 || true
fi

PRINTER_SERVICE_NAME="taqniya-printer"
PRINTER_SERVICE_FILE="/etc/systemd/system/${PRINTER_SERVICE_NAME}.service"

echo "إنشاء وتفعيل خدمة سيرفر الطباعة فائق السرعة..."

cat <<EOF > "$PRINTER_SERVICE_FILE"
[Unit]
Description=Taqniya Instant Thermal Printer Bridge
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$BASE_DIR/printer_bridge
ExecStart=/usr/bin/node $BASE_DIR/printer_bridge/server.js
Restart=always
RestartSec=2s
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

chmod 644 "$PRINTER_SERVICE_FILE"

echo "تفعيل التشغيل التلقائي لحاويات Docker..."
cd "$BASE_DIR"
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --remove-orphans
else
    docker compose up -d --remove-orphans
fi

# إزالة خدمة taqniya-pos القديمة إن وجدت لتفادي إيقاف الحاويات بالخطأ
if [ -f "$SERVICE_FILE" ]; then
    systemctl stop "$SERVICE_NAME.service" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME.service" 2>/dev/null || true
    rm -f "$SERVICE_FILE"
fi

systemctl daemon-reload
systemctl enable --now "$PRINTER_SERVICE_NAME.service"

echo ""
echo "===================================================="
echo "  ✅ تم تفعيل التشغيل التلقائي بنجاح!"
echo "  سيعمل النظام وسيرفر الطباعة في الخلفية عند كل تشغيل."
echo "===================================================="
read -p "اضغط Enter للإغلاق..."
