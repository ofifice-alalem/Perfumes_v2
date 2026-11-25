#!/bin/bash
SERVICE_NAME="taqniya-pos"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
PRINTER_SERVICE_NAME="taqniya-printer"
PRINTER_SERVICE_FILE="/etc/systemd/system/${PRINTER_SERVICE_NAME}.service"

echo "===================================================="
echo "  إلغاء التشغيل التلقائي للنظام وسيرفر الطباعة"
echo "===================================================="
echo ""

if [ "$EUID" -ne 0 ]; then
    sudo bash "$0"
    exit $?
fi

# إيقاف وإلغاء خدمة الطباعة
if [ -f "$PRINTER_SERVICE_FILE" ]; then
    systemctl stop "$PRINTER_SERVICE_NAME.service" 2>/dev/null || true
    systemctl disable "$PRINTER_SERVICE_NAME.service" 2>/dev/null || true
    rm -f "$PRINTER_SERVICE_FILE"
fi

if [ -f "$SERVICE_FILE" ]; then
    systemctl stop "$SERVICE_NAME.service" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME.service" 2>/dev/null || true
    rm -f "$SERVICE_FILE"
fi

systemctl daemon-reload
echo "✅ تم إلغاء التشغيل التلقائي بنجاح."

read -p "اضغط Enter للإغلاق..."
