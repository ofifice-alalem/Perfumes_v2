#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "===================================================="
echo "  Taqniya Cloud POS - Local USB Printer Bridge"
echo "===================================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed! Please run ./install_printer_requirements.sh first."
    exit 1
fi

echo "Starting Printer Bridge on port 9124..."
node server.js
