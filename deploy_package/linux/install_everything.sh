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

# 0. إصلاح مصادر الـ APT وتعطيل مصادر cdrom المعطوبة في وضع التجريب (Live USB)
if [ -f "/etc/apt/sources.list" ]; then
    sed -i '/cdrom:/s/^/#/' /etc/apt/sources.list 2>/dev/null || true
fi
if [ -d "/etc/apt/sources.list.d" ]; then
    sed -i '/cdrom:/s/^/#/' /etc/apt/sources.list.d/*.list 2>/dev/null || true
fi

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
    echo "Docker غير موجود. جاري تثبيت Docker CE ومستودعاته الرسمية..."
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg
    
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # تحديد اسم إصدار أوبونتو الأساسي (متوافق مع Ubuntu و Linux Mint ومشتقاتها)
    . /etc/os-release
    DISTRO_CODENAME="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
    if [ -z "$DISTRO_CODENAME" ] || [ "$ID" = "linuxmint" ]; then
        # إذا كان لينكس مينت ولم يحدد UBUNTU_CODENAME، نستخرجه من upstream أو الافتراضي noble/jammy
        DISTRO_CODENAME="${UBUNTU_CODENAME:-noble}"
    fi

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $DISTRO_CODENAME stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
fi

# إضافة المستخدم لمجموعة دوكر حتى لا يطلب صلاحيات مستقبلاً
if [ -n "$TARGET_USER" ]; then
    usermod -aG docker "$TARGET_USER" 2>/dev/null || true
fi

echo ""
echo "[4/4] تثبيت Node.js وحزم وسيط الطباعة..."
if ! command -v node &> /dev/null; then
    echo "جاري تثبيت Node.js الحديث (v20.x LTS) عبر مستودع NodeSource الرسمي..."
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg
    
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
    chmod a+r /etc/apt/keyrings/nodesource.gpg

    NODE_MAJOR=20
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | \
      tee /etc/apt/sources.list.d/nodesource.list > /dev/null

    apt-get update -y
    apt-get install -y nodejs
fi

# الانتقال لمجلد وسيط الطباعة وتثبيت الحزم
cd "$BASE_DIR/printer_bridge"
if [ -f "package.json" ]; then
    echo "تثبيت مكتبات وسيط الطباعة والفواتير والباركود (jsbarcode, canvas, qrcode...)..."
    npm install --omit=dev
    
    # التأكد من صلاحيات المجلد للمستخدم الحالي بعد تثبيت npm كـ root
    if [ -n "$TARGET_USER" ]; then
        chown -R "$TARGET_USER:$TARGET_USER" "$BASE_DIR/printer_bridge/node_modules" 2>/dev/null || true
    fi
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
