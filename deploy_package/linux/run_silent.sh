#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
BASE_DIR="$( cd "$DIR/.." >/dev/null 2>&1 && pwd )"
cd "$BASE_DIR"

# ضمان تعيين سياق الدوكر الصحيح ومسار Node
export DOCKER_HOST="unix:///var/run/docker.sock"
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# 1. تشغيل وسيط وسيرفر الطباعة في الخلفية (صامت) إذا لم يكن يعمل
if ! (echo > /dev/tcp/127.0.0.1/9124) 2>/dev/null; then
    if [ -f "$BASE_DIR/printer_bridge/server.js" ]; then
        nohup node "$BASE_DIR/printer_bridge/server.js" > /dev/null 2>&1 &
    fi
fi

# 2. تشغيل حاويات Docker في الخلفية بصمت
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --remove-orphans > /dev/null 2>&1
elif docker compose version &> /dev/null; then
    docker compose up -d --remove-orphans > /dev/null 2>&1
fi

exit 0
