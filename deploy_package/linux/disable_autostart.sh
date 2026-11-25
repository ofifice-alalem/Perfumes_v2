#!/bin/bash
SERVICE_NAME="taqniya-pos"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "===================================================="
echo "  إلغاء التشغيل التلقائي للنظام"
echo "===================================================="
echo ""

if [ "$EUID" -ne 0 ]; then
    sudo bash "$0"
    exit $?
fi

if [ -f "$SERVICE_FILE" ]; then
    systemctl stop "$SERVICE_NAME.service" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME.service" 2>/dev/null || true
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload
    echo "✅ تم إلغاء التشغيل التلقائي بنجاح."
else
    echo "الخدمة غير مفعلة بالفعل."
fi

read -p "اضغط Enter للإغلاق..."
