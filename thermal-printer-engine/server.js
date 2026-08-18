const http = require('http');
const fs = require('fs');
const path = require('path');
const { sampleInvoice, sampleMultiItemInvoice } = require('./src/invoice/invoice-data');
const { renderInvoiceCanvas } = require('./src/invoice/invoice-renderer');
const { encodePngToEscPosRaster } = require('./src/printer/escpos-encoder');
const { printRawBuffer } = require('./src/printer/printer-service');

const PORT = 9123;
const HOST = '127.0.0.1';

// Pre-load fonts and initial config on server boot
let config = {};
function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {
        console.error("Server config load error:", e.message);
    }
}
loadConfig();

const server = http.createServer(async (req, res) => {
    // CORS headers for local app
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${HOST}:${PORT}`);

    if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
        return;
    }

    if (url.pathname === '/print' && req.method === 'POST') {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', async () => {
            const startTime = Date.now();
            try {
                loadConfig();
                let payload = {};
                if (bodyStr.trim()) {
                    try { payload = JSON.parse(bodyStr); } catch (e) {}
                }

                const printerName = payload.printerName || config.printer?.name || 'XP-80';
                const useMulti = payload.multi !== false;
                const invoiceData = payload.invoice || (useMulti ? sampleMultiItemInvoice : sampleInvoice);

                // 1. Fast Canvas Render
                const canvas = await renderInvoiceCanvas(invoiceData, config);

                // 2. Fast ESC/POS Encoding
                const escposBuffer = await encodePngToEscPosRaster(canvas, {
                    cutPaper: config.printer?.cutPaper !== false,
                    feedLinesAfterPrint: config.printer?.feedLinesAfterPrint || 4
                });

                // 3. Ultra-fast Native Win32 Spooling
                const result = await printRawBuffer(printerName, escposBuffer);

                const durationMs = Date.now() - startTime;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: result.message,
                    printerUsed: result.printerUsed,
                    durationMs
                }));
            } catch (err) {
                const durationMs = Date.now() - startTime;
                console.error("Print Error:", err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: err.message,
                    durationMs
                }));
            }
        });
        return;
    }

    if (url.pathname === '/preview' && (req.method === 'GET' || req.method === 'POST')) {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', async () => {
            try {
                loadConfig();
                let payload = {};
                if (bodyStr.trim()) {
                    try { payload = JSON.parse(bodyStr); } catch (e) {}
                }

                const useMulti = payload.multi !== false;
                const invoiceData = payload.invoice || (useMulti ? sampleMultiItemInvoice : sampleInvoice);

                const canvas = await renderInvoiceCanvas(invoiceData, config);
                const pngBuffer = canvas.toBuffer ? canvas.toBuffer('image/png') : canvas;

                const base64Src = 'data:image/png;base64,' + pngBuffer.toString('base64');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    preview_src: base64Src
                }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: err.message
                }));
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, HOST, () => {
    console.log(`⚡ Thermal Printer Persistent Speed Service running on http://${HOST}:${PORT}`);
});
