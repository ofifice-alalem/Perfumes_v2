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

echo "إنشاء خدمة الإقلاع التلقائي..."

cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Taqniya Cloud POS and Printer Bridge
After=network.target docker.service
Wants=docker.service

[Service]
Type=forking
User=$CURRENT_USER
WorkingDirectory=$BASE_DIR
ExecStart=/bin/bash $DIR/run_silent.sh
ExecStop=/bin/bash $DIR/stop_docker.sh
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

chmod 644 "$SERVICE_FILE"
chmod +x "$DIR/run_silent.sh"
chmod +x "$DIR/run_docker.sh"
chmod +x "$DIR/stop_docker.sh"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME.service"

echo ""
echo "===================================================="
echo "  ✅ تم تفعيل التشغيل التلقائي بنجاح!"
echo "  سيعمل النظام وسيرفر الطباعة في الخلفية عند كل تشغيل."
echo "===================================================="
read -p "اضغط Enter للإغلاق..."
