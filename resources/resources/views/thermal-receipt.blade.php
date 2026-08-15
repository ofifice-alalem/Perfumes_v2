<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فاتورة مبيعات حرارية - Xprinter POS 80</title>
    <!-- Tajawal Font -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
    <style>
        /* =========================================================
           RESET & GLOBAL STYLES
           ========================================================= */
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            width: 100%;
            background-color: #0f172a;
            color: #1e293b;
            font-family: 'Tajawal', sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        body {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 10px;
        }

        /* ─── Control Bar (Screen Only) ───────────────────────── */
        .controls-bar {
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px;
            padding: 14px 20px;
            margin-bottom: 24px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            max-width: 700px;
            width: 100%;
        }

        .controls-title {
            color: #f8fafc;
            font-size: 14px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: #ffffff;
            border: none;
            padding: 9px 18px;
            border-radius: 10px;
            font-family: 'Tajawal', sans-serif;
            font-size: 13.5px;
            font-weight: 800;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.45);
        }

        .btn-outline {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.25);
            color: #f1f5f9;
            box-shadow: none;
        }

        .badge-printer {
            background: #10b981;
            color: #064e3b;
            padding: 3px 9px;
            border-radius: 20px;
            font-size: 11.5px;
            font-weight: 800;
        }

        /* ─── Receipt Paper Simulation ────────────────────────── */
        .receipt-paper-wrapper {
            display: flex;
            justify-content: center;
            width: 80mm;
            max-width: 80mm;
            background: rgba(255,255,255,0.05);
            filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.5));
            box-sizing: border-box;
        }

        /* 
           إزاحة الفاتورة بالكامل إلى اليمين (margin-left: 10mm) لتفادي الانقطاع كلياً
        */
        .receipt-paper {
            width: 70mm;
            max-width: 70mm;
            background-color: #ffffff;
            color: #000000;
            margin-left: 10mm !important; /* إزاحة تامة إلى الجهة الأخرى (اليمين) */
            margin-right: 0 !important;
            padding: 4mm 3mm 10mm 3mm;
            box-sizing: border-box;
            font-size: 10px;
            line-height: 1.35;
            position: relative;
            border-top: 4px solid #1e293b;
            font-weight: 700;
            direction: rtl;
            text-align: right;
        }

        /* Paper Tear Effect at bottom for screen view */
        .receipt-paper::after {
            content: "";
            position: absolute;
            bottom: -8px;
            left: 0;
            right: 0;
            height: 8px;
            background: radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%);
            background-size: 10px 10px;
        }

        /* =========================================================
           MM RULER STYLING (RIGHT SHIFT VERIFICATION)
           ========================================================= */
        .ruler-container {
            width: 100%;
            margin: 0 0 6px 0;
            padding: 0;
            text-align: center;
            direction: ltr;
            background: #000;
        }

        .ruler-title {
            font-size: 8px;
            font-weight: 900;
            padding: 2px 0;
            color: #fff;
            background: #000;
            text-align: center;
            direction: rtl;
        }

        /* =========================================================
           RECEIPT CONTENT STYLING
           ========================================================= */

        /* Store Header */
        .store-header {
            text-align: center;
            margin-bottom: 6px;
            padding-bottom: 5px;
            border-bottom: 2px solid #000;
            width: 100%;
        }

        .store-logo-icon {
            font-size: 20px;
            display: block;
            margin-bottom: 2px;
        }

        .store-name {
            font-size: 16px;
            font-weight: 900;
            line-height: 1.2;
            margin-bottom: 2px;
        }

        .store-subname {
            font-size: 8.5px;
            font-weight: 800;
            color: #111;
            margin-bottom: 3px;
            letter-spacing: 0.2px;
        }

        .store-details {
            font-size: 8.5px;
            line-height: 1.35;
            font-weight: 700;
        }

        .receipt-title-badge {
            display: inline-block;
            background: #000;
            color: #fff;
            font-size: 10px;
            font-weight: 900;
            padding: 2.5px 8px;
            border-radius: 4px;
            margin: 5px 0 3px 0;
        }

        /* Lines */
        .dashed-line {
            border-top: 1px dashed #000000;
            margin: 5px 0;
            width: 100%;
        }

        .double-line {
            border-top: 2px double #000000;
            margin: 5px 0;
            width: 100%;
        }

        /* Invoice Meta Info Grid */
        .meta-grid {
            width: 100%;
            margin-bottom: 4px;
        }

        .meta-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
        }

        .meta-table td {
            padding: 2.5px 0;
            vertical-align: middle;
        }

        .meta-label-cell {
            text-align: right;
            font-weight: 700;
            white-space: nowrap;
            width: 36%;
            padding-right: 1px;
        }

        .meta-value-cell {
            text-align: left;
            font-weight: 900;
            width: 64%;
            padding-left: 2px;
            padding-right: 1px;
            word-break: break-all;
        }

        .ltr-text {
            direction: ltr;
            display: inline-block;
        }

        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
            font-size: 9.5px;
            table-layout: fixed;
        }

        .items-table th {
            border-top: 1.5px solid #000;
            border-bottom: 1.5px solid #000;
            padding: 3.5px 0;
            font-weight: 900;
            font-size: 8.5px;
        }

        .items-table td {
            padding: 4px 0;
            vertical-align: top;
            border-bottom: 1px dashed #cccccc;
        }

        .items-table tr:last-child td {
            border-bottom: none;
        }

        .col-name {
            width: 48%;
            text-align: right;
            padding-right: 1px;
        }

        .col-qty {
            width: 26%;
            text-align: center;
        }

        .col-total {
            width: 26%;
            text-align: left;
            padding-left: 2px;
        }

        .item-name {
            font-weight: 800;
            font-size: 9.5px;
            display: block;
            line-height: 1.25;
            word-wrap: break-word;
        }

        .item-type-tag {
            display: inline-block;
            font-size: 7.5px;
            font-weight: 800;
            padding: 1px 4px;
            border-radius: 3px;
            margin-top: 2px;
            border: 1px solid #000;
            white-space: nowrap;
        }

        /* Category Tags */
        .tag-original { background: #000; color: #fff; }
        .tag-decant   { background: #e2e8f0; color: #000; }
        .tag-oil      { background: #fef08a; color: #000; }
        .tag-product  { background: #ffffff; color: #000; }

        .qty-price-text {
            font-size: 8.5px;
            color: #000;
            font-weight: 800;
            white-space: nowrap;
            direction: ltr;
            display: inline-block;
        }

        .line-total-text {
            font-weight: 900;
            font-size: 9.5px;
            text-align: left;
            white-space: nowrap;
            direction: ltr;
            display: inline-block;
        }

        /* Totals Section Table */
        .totals-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
            margin-top: 4px;
        }

        .totals-table td {
            padding: 2px 0;
            font-weight: 800;
        }

        .totals-label {
            text-align: right;
            width: 58%;
            padding-right: 1px;
        }

        .totals-value {
            text-align: left;
            width: 42%;
            font-weight: 900;
            padding-left: 2px;
            direction: ltr;
        }

        .grand-total-row td {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 5px 0;
            font-size: 11.5px;
            font-weight: 900;
            background: #f8fafc;
        }

        /* Footer & Barcodes */
        .receipt-footer {
            text-align: center;
            margin-top: 8px;
            padding-top: 4px;
            width: 100%;
        }

        .qr-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 6px 0 4px 0;
        }

        .qr-wrapper svg {
            width: 65px;
            height: 65px;
        }

        .barcode-wrapper {
            font-family: 'Courier Prime', monospace;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 2px;
            margin: 3px 0;
        }

        .thank-you-msg {
            font-size: 10px;
            font-weight: 900;
            margin-top: 5px;
        }

        /* الشروط والسياسات */
        .policy-text {
            font-size: 8px;
            line-height: 1.35;
            font-weight: 700;
            margin-top: 6px;
            border-top: 1px dashed #000;
            padding: 6px 2px 0 2px;
            text-align: center;
            word-break: break-word;
            width: 100%;
        }

        .paper-feed-spacer {
            height: 22mm;
            width: 100%;
            clear: both;
            display: block;
        }

        /* =========================================================
           PRINT MEDIA QUERIES FOR XPRINTER POS 80 (RIGHT SHIFT)
           ========================================================= */
        @media print {
            @page {
                size: 80mm auto;
                margin: 0mm !important;
            }

            html, body {
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 80mm !important;
            }

            .controls-bar {
                display: none !important;
            }

            .receipt-paper-wrapper {
                filter: none !important;
                width: 80mm !important;
                margin: 0 !important;
                padding: 0 !important;
                display: block !important;
            }

            /* إزاحة الفاتورة بالكامل إلى جهة اليمين بعرض 70mm ومارجن أيسر 10mm */
            .receipt-paper {
                width: 70mm !important;
                max-width: 70mm !important;
                margin-left: 10mm !important; /* إزاحة كاملة إلى الجهة الأخرى (اليمين) */
                margin-right: 0 !important;
                padding: 3mm 3mm 0mm 3mm !important;
                border-top: none !important;
                box-shadow: none !important;
                overflow: visible !important;
            }

            .receipt-paper::after {
                display: none !important;
            }

            .paper-feed-spacer {
                height: 25mm !important;
                display: block !important;
            }
        }
    </style>
</head>
<body>

    <!-- ─── Control Bar for Web Preview & Printer Testing ─── -->
    <div class="controls-bar">
        <div class="controls-title">
            <span>🖨️ معاينة طابعة الفواتير الحرارية (مُزاحة بالكامل إلى اليمين)</span>
            <span class="badge-printer">Xprinter POS 80</span>
        </div>

        <button class="btn" onclick="window.print()">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v6H6z"/></svg>
            طباعة تجربة الإزاحة لليمين (Print Right Shift)
        </button>

        <button class="btn btn-outline" onclick="togglePaperSize()">
            📐 تبديل حجم الورق (<span id="paperWidthLabel">80mm</span>)
        </button>
    </div>

    <!-- ─── Simulated Thermal Paper ─── -->
    <div class="receipt-paper-wrapper">
        <div class="receipt-paper" id="receiptPaper">

            <!-- Store Header -->
            <div class="store-header">
                <span class="store-logo-icon">👑</span>
                <div class="store-name">تاجوري للعطور الفاخرة</div>
                <div class="store-subname">TAJORI PERFUMES & ESSENCES</div>
                <div class="store-details">
                    طرابلس - شارع الجرابة (مقابل مجمع الذهب)<br>
                    هاتف: 091-2345678 / 092-8765432
                </div>
                <div class="receipt-title-badge">فاتورة مبيعات / CASH RECEIPT</div>
            </div>

            <!-- Meta Information Table -->
            <div class="meta-grid">
                <table class="meta-table">
                    <tr>
                        <td class="meta-label-cell">رقم الفاتورة:</td>
                        <td class="meta-value-cell"><span class="ltr-text">#INV-2026-0892</span></td>
                    </tr>
                    <tr>
                        <td class="meta-label-cell">التاريخ والوقت:</td>
                        <td class="meta-value-cell"><span class="ltr-text"><?php echo date('Y-m-d | h:i A'); ?></span></td>
                    </tr>
                    <tr>
                        <td class="meta-label-cell">الكاشير:</td>
                        <td class="meta-value-cell">أحمد علي</td>
                    </tr>
                    <tr>
                        <td class="meta-label-cell">العميل:</td>
                        <td class="meta-value-cell">محمد الترهوني (نقدي)</td>
                    </tr>
                </table>
            </div>

            <div class="dashed-line"></div>

            <!-- Items Table -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="col-name">البيان / المنتج</th>
                        <th class="col-qty">الكمية × السعر</th>
                        <th class="col-total">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>

                    <!-- 1) عطر أصلي (Original Perfume) -->
                    <tr>
                        <td class="col-name">
                            <span class="item-name">بلو دي شانيل - Parfum 100ml</span>
                            <span class="item-type-tag tag-original">✨ عطر أصلي</span>
                        </td>
                        <td class="col-qty">
                            <span class="qty-price-text">1 × 450.00</span>
                        </td>
                        <td class="col-total">
                            <span class="line-total-text">450.00 د.ل</span>
                        </td>
                    </tr>

                    <!-- 2) عطر تقسيم (Decant / Split) -->
                    <tr>
                        <td class="col-name">
                            <span class="item-name">تقسيم: ديور سيفاج إلِكسير (15ml)</span>
                            <span class="item-type-tag tag-decant">🧪 عطر تقسيم</span>
                        </td>
                        <td class="col-qty">
                            <span class="qty-price-text">2 × 45.00</span>
                        </td>
                        <td class="col-total">
                            <span class="line-total-text">90.00 د.ل</span>
                        </td>
                    </tr>

                    <!-- 3) عطر زيتي (Perfume Oil / Concentrate) -->
                    <tr>
                        <td class="col-name">
                            <span class="item-name">زيت عود ملكي خام (1 تولة / 12g)</span>
                            <span class="item-type-tag tag-oil">💧 عطر زيتي</span>
                        </td>
                        <td class="col-qty">
                            <span class="qty-price-text">1 × 85.00</span>
                        </td>
                        <td class="col-total">
                            <span class="line-total-text">85.00 د.ل</span>
                        </td>
                    </tr>

                    <!-- 4) منتج عادي (Standard Product / Bottle) -->
                    <tr>
                        <td class="col-name">
                            <span class="item-name">زجاجة كريستال مذهبة 50 مل</span>
                            <span class="item-type-tag tag-product">📦 منتج / عبوة</span>
                        </td>
                        <td class="col-qty">
                            <span class="qty-price-text">3 × 10.00</span>
                        </td>
                        <td class="col-total">
                            <span class="line-total-text">30.00 د.ل</span>
                        </td>
                    </tr>

                </tbody>
            </table>

            <div class="double-line"></div>

            <!-- Financial Totals Table -->
            <table class="totals-table">
                <tr>
                    <td class="totals-label">المجموع الفرعي (Subtotal):</td>
                    <td class="totals-value">655.00 د.ل</td>
                </tr>
                <tr>
                    <td class="totals-label">الخصم التجاري (Discount 5%):</td>
                    <td class="totals-value">-32.75 د.ل</td>
                </tr>
                <tr class="grand-total-row">
                    <td class="totals-label">الإجمالي النهائي (TOTAL):</td>
                    <td class="totals-value">622.25 د.ل</td>
                </tr>
                <tr>
                    <td class="totals-label">طريقة الدفع:</td>
                    <td class="totals-value" style="direction: rtl; text-align: left;">نقداً (Cash)</td>
                </tr>
                <tr>
                    <td class="totals-label">المبلغ المدفوع:</td>
                    <td class="totals-value">650.00 د.ل</td>
                </tr>
                <tr>
                    <td class="totals-label">المتبقي للعميل (Change):</td>
                    <td class="totals-value">27.75 د.ل</td>
                </tr>
            </table>

            <div class="dashed-line"></div>

            <!-- Receipt Footer & Verification -->
            <div class="receipt-footer">

                <!-- Vector QR Code SVG -->
                <div class="qr-wrapper">
                    <svg viewBox="0 0 100 100" fill="#000000">
                        <path d="M0 0h30v30H0zM5 5v20h20V5zM10 10h10v10H10zM70 0h30v30H70zM75 5v20h20V5zM80 10h10v10H80zM0 70h30v30H0zM5 75v20h20V75zM10 80h10v10H10zM35 5h10v10H35zM50 5h10v5H50zM40 20h20v10H40zM35 35h10v10H35zM55 35h10v10H55zM75 35h10v10H75zM35 50h10v10H35zM50 50h15v5H50zM80 50h15v10H80zM35 65h10v10H35zM65 65h10v10H65zM35 80h10v20H35zM50 75h10v10H50zM65 85h25v15H65z"/>
                    </svg>
                </div>

                <div class="barcode-wrapper">||| | |||| ||| ||||| |||</div>

                <div class="thank-you-msg">
                    ✨ شكراً لزيارتكم! نتمنى لكم يوماً معطراً ✨
                </div>

                <div class="policy-text">
                    • البضاعة المباعة (العطور الأصلية والعبوات) تستبدل خلال 3 أيام بشرط وجود الفاتورة الأصلية وأن تكون بحالتها الأولى.<br>
                    • ⚠️ العطور التقسيم والزيوت العطرية المعبأة لا ترد ولا تستبدل لدواعي السلامة وصحة العامة.
                </div>
            </div>

            <!-- مسافة تلقيم تلقائي للورقة تمنع قاطع الطابعة من قطع الرمز والسياسات -->
            <div class="paper-feed-spacer"></div>

        </div>
    </div>

    <!-- ─── Interactive JS Scripts ─── -->
    <script>
        function togglePaperSize() {
            const paper = document.getElementById('receiptPaper');
            const label = document.getElementById('paperWidthLabel');
            if (paper.style.width === '57mm') {
                paper.style.width = '70mm';
                label.innerText = '80mm Roll (Right Shifted)';
            } else {
                paper.style.width = '57mm';
                label.innerText = '57mm (Small POS)';
            }
        }
    </script>
</body>
</html>
