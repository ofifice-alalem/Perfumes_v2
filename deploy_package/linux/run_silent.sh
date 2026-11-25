#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
BASE_DIR="$( cd "$DIR/.." >/dev/null 2>&1 && pwd )"
cd "$BASE_DIR"

# 1. تشغيل وسيط وسيرفر الطباعة في الخلفية (صامت)
if [ -f "$BASE_DIR/printer_bridge/server.js" ]; then
    nohup node "$BASE_DIR/printer_bridge/server.js" > /dev/null 2>&1 &
fi

# 2. تشغيل حاويات Docker في الخلفية بصمت
if command -v docker-compose &> /dev/null; then
    docker-compose up -d > /dev/null 2>&1
elif docker compose version &> /dev/null; then
    docker compose up -d > /dev/null 2>&1
fi
