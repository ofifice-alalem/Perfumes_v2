<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فاتورة مبيعات حرارية - Xprinter POS 80</title>
    <!-- Tajawal & Courier Prime Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
    <style>
        /* =========================================================
           RESET & GLOBAL STYLES (MONOCHROME B&W HIGH CONTRAST)
           ========================================================= */
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }

        html, body {
            width: 100%;
            background-color: #0f172a;
            color: #000000;
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
           إزاحة 10mm محددة خصيصاً لمنع انقطاع الحواف بطابعات POS 80
        */
        .receipt-paper {
            width: 70mm;
            max-width: 70mm;
            background-color: #ffffff;
            color: #000000;
            margin-left: 10mm !important;
            margin-right: 0 !important;
            padding: 1mm 3mm 1mm 3mm;
            box-sizing: border-box;
            font-size: {{ $settings['receipt_font_size'] ?? '10' }}px;
            line-height: 1.35;
            position: relative;
            border-top: 4px solid #000000;
            font-weight: 700;
            direction: rtl;
            text-align: right;
        }

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
           RECEIPT CONTENT STYLING (PURE MONOCHROME B&W HIGH CONTRAST)
           ========================================================= */

        /* ترويسة المحل واللقب */
        .store-header {
            text-align: center;
            margin-bottom: 5px;
            padding-bottom: 5px;
            border-bottom: 2px solid #000000;
            width: 100%;
        }

        /* رفع الشعار وتقليل المسافة من الأعلى فوق الشعار */
        .store-logo-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: -2px;
            margin-bottom: -4px;
            width: 100%;
        }

        .store-logo-img {
            max-width: 55mm;
            max-height: 25mm;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
            margin: 0 auto;
        }

        .store-name {
            font-size: 1.45em;
            font-weight: 900;
            line-height: 1.15;
            margin-top: -2px;
            margin-bottom: 6px;
            color: #000000;
        }

        .store-subname {
            font-size: 0.85em;
            font-weight: 800;
            color: #000000;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .store-details {
            font-size: 0.82em;
            line-height: 1.35;
            font-weight: 700;
            color: #000000;
            margin-top: 4px;
        }

        /* الوسم يحتوي على رقم الفاتورة */
        .receipt-title-badge {
            display: inline-block;
            background-color: #000000 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 0.9em;
            font-weight: 900;
            padding: 3px 10px;
            border-radius: 4px;
            margin: 6px 0 2px 0;
            border: 1px solid #000000;
            letter-spacing: 0.3px;
        }

        /* الخطوط الفاصلة */
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

        /* شبكة بيانات الفاتورة */
        .meta-box {
            width: 100%;
            margin-bottom: 5px;
            border: 1px solid #000000;
            border-radius: 4px;
            padding: 4px 6px;
            background-color: #ffffff;
        }

        .meta-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9em;
        }

        .meta-table td {
            padding: 2px 0;
            vertical-align: middle;
        }

        .meta-label-cell {
            text-align: right;
            font-weight: 800;
            white-space: nowrap;
            width: 38%;
            color: #000000;
        }

        .meta-value-cell {
            text-align: left;
            font-weight: 900;
            width: 62%;
            padding-left: 2px;
            word-break: break-all;
            color: #000000;
        }

        .ltr-text {
            direction: ltr;
            display: inline-block;
        }

        /* جدول المنتجات الحراري المؤطر بحدود واضحة ومقاسات أعمدة مخصصة */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0;
            font-size: 0.9em;
            table-layout: fixed;
            border: 1px solid #000000;
        }

        .items-table th {
            background-color: #000000 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 4px 2px;
            font-weight: 900;
            font-size: 0.85em;
            border: 1px solid #000000;
        }

        .items-table td {
            padding: 5px 4px;
            vertical-align: middle;
            border: 1px solid #000000;
        }

        /* توسيع عمود المنتج وتصغير عمود الإجمالي لاستيعاب 4 أرقام */
        .col-name {
            width: 58%;
            text-align: right;
        }

        .col-qty {
            width: 25%;
            text-align: center;
        }

        .col-total {
            width: 17%;
            text-align: left;
            white-space: nowrap;
        }

        .item-name {
            font-weight: 900;
            font-size: 0.95em;
            display: block;
            line-height: 1.25;
            word-wrap: break-word;
            color: #000000;
        }

        .qty-price-text {
            font-size: 0.85em;
            color: #000000;
            font-weight: 900;
            white-space: nowrap;
            direction: ltr;
            display: inline-block;
        }

        .line-total-text {
            font-weight: 900;
            font-size: 0.95em;
            text-align: left;
            white-space: nowrap;
            direction: ltr;
            display: inline-block;
            color: #000000;
        }

        /* جدول الإجماليات ووسائل الدفع */
        .totals-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.92em;
            margin-top: 4px;
        }

        .totals-table td {
            padding: 3.5px 0;
            font-weight: 800;
        }

        .payment-row td {
            border-top: 1px dotted #000000;
            padding: 3px 0;
        }

        .totals-label {
            text-align: right;
            width: 58%;
            padding-right: 1px;
            color: #000000;
        }

        .totals-value {
            text-align: left;
            width: 42%;
            font-weight: 900;
            padding-left: 2px;
            direction: rtl;
            color: #000000;
        }

        /* مربع المتبقي والإجمالي النهائي الحاسم */
        .grand-total-box {
            border: 1.5px solid #000000;
            border-radius: 4px;
            padding: 4px 6px;
            margin-top: 4px;
            background-color: #ffffff;
        }

        .grand-total-table {
            width: 100%;
            border-collapse: collapse;
        }

        .grand-total-table td {
            padding: 2px 0;
            font-size: 1.05em;
            font-weight: 900;
            color: #000000;
        }

        /* التذييل والرموز والسياسات */
        .receipt-footer {
            text-align: center;
            margin-top: 4px;
            padding-top: 2px;
            width: 100%;
        }

        .qr-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 4px 0 2px 0;
        }

        .qr-wrapper svg {
            width: 65px;
            height: 65px;
        }

        .thank-you-msg {
            font-size: 0.95em;
            font-weight: 900;
            margin-top: 3px;
            color: #000000;
        }

        .policy-box {
            font-size: 0.78em;
            line-height: 1.35;
            font-weight: 700;
            margin-top: 4px;
            border: 1px dashed #000000;
            border-radius: 4px;
            padding: 4px;
            text-align: center;
            word-break: break-word;
            width: 100%;
            background-color: #ffffff;
            color: #000000;
        }

        /* تقليل المسافة في نهاية الفاتورة لتكون مدمجة للغاية وموفرة للورق */
        .paper-feed-spacer {
            height: 3mm;
            width: 100%;
            clear: both;
            display: block;
        }

        /* =========================================================
           PRINT MEDIA QUERIES FOR XPRINTER POS 80
           ========================================================= */
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }

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

            .receipt-paper {
                width: 70mm !important;
                max-width: 70mm !important;
                margin-left: 10mm !important;
                margin-right: 0 !important;
                padding: 1mm 3mm 0mm 3mm !important;
                border-top: none !important;
                box-shadow: none !important;
                overflow: visible !important;
            }

            .receipt-paper::after {
                display: none !important;
            }

            .receipt-title-badge {
                background-color: #000000 !important;
                color: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .items-table th {
                background-color: #000000 !important;
                color: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .paper-feed-spacer {
                height: 3mm !important;
                display: block !important;
            }
        }
    </style>
</head>
<body>

    <!-- ─── Control Bar for Web Preview & Printer Testing ─── -->
    <div class="controls-bar">
        <div class="controls-title">
            <span>🖨️ معاينة فاتورة مبيعات حرارية - Xprinter POS 80</span>
            <span class="badge-printer">80mm Thermal</span>
        </div>

        <button class="btn" onclick="window.print()">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v6H6z"/></svg>
            طباعة الفاتورة الآن (Print Receipt)
        </button>

        <button class="btn btn-outline" onclick="togglePaperSize()">
            📐 تبديل حجم الورق (<span id="paperWidthLabel">80mm</span>)
        </button>
    </div>

    <!-- ─── Simulated Thermal Paper ─── -->
    <div class="receipt-paper-wrapper">
        <div class="receipt-paper" id="receiptPaper">

            <!-- 1. Store Header & Identity (ديناميكي من الإعدادات) -->
            <div class="store-header">
                @if(!empty($settings['store_logo']))
                    <div class="store-logo-wrapper">
                        <img src="{{ asset($settings['store_logo']) }}" alt="الشعار" class="store-logo-img">
                    </div>
                @endif
                <div class="store-name">{{ $settings['store_name'] ?? 'تاجوري للعطور الفاخرة' }}</div>
                @if(!empty($settings['store_subname']))
                    <div class="store-subname">{{ $settings['store_subname'] }}</div>
                @endif
                <div class="store-details">
                    {!! nl2br(e($settings['store_details'] ?? "طرابلس - شارع الجرابة (مقابل مجمع الذهب)\nهاتف: 091-2345678 / 092-8765432")) !!}
                </div>
                <!-- الوسم الرئيسي يحتوي على رقم الفاتورة -->
                <div class="receipt-title-badge">فاتورة مبيعات #{{ $invoice->id }}</div>
            </div>

            <!-- 2. Invoice Meta Box -->
            @php
                $custName = $invoice->customer->name ?? 'زبون نقدي';
                $isCashCustomer = empty($custName) || $custName === 'زبون نقدي' || mb_strtolower(trim($custName)) === 'زبون نقدي';
            @endphp
            <div class="meta-box">
                <table class="meta-table">
                    <tr>
                        <td class="meta-label-cell">التاريخ والوقت:</td>
                        <td class="meta-value-cell"><span class="ltr-text">{{ $invoice->created_at ? $invoice->created_at->format('Y-m-d | h:i A') : date('Y-m-d | h:i A') }}</span></td>
                    </tr>
                    <tr>
                        <td class="meta-label-cell">الكاشير:</td>
                        <td class="meta-value-cell">{{ $invoice->user->name ?? ($invoice->user->username ?? 'سليم') }}</td>
                    </tr>
                    @if(!$isCashCustomer)
                        <tr>
                            <td class="meta-label-cell">العميل:</td>
                            <td class="meta-value-cell">{{ $custName }}</td>
                        </tr>
                    @endif
                </table>
            </div>

            <!-- 3. Items Table (جدول إلكتروني مؤطر بحدود أسود صلبة) -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="col-name">البيان / المنتج</th>
                        <th class="col-qty">الكمية × السعر</th>
                        <th class="col-total">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($invoice->items as $item)
                        @php
                            $saleType = (string)($item->sale_type ?? '');
                            $sizeLabel = $item->size ? ' (' . $item->size->label . ')' : '';
                            
                            // عند بيع عبوة عطر كاملة يتم إلحاق كلمة (عبوة) بجانب اسم المنتج
                            $bottleSuffix = ($saleType === 'full_bottle') ? ' (عبوة)' : '';
                            
                            $displayName = ($item->product ? $item->product->name : 'منتج') . $sizeLabel . $bottleSuffix;

                            $rawQty = (float)$item->quantity;
                            $uPrice = (float)$item->unit_price;
                            $lTotal = (float)$item->line_total;

                            // حساب عدد العبوات/القطع المباعة
                            if ($saleType === 'full_bottle') {
                                $calcQty = 1;
                            } elseif ($saleType === 'tier_decant' && $item->size && (float)$item->size->value > 0) {
                                $calcQty = $rawQty / (float)$item->size->value;
                            } else {
                                $calcQty = $rawQty;
                            }

                            $displayQty = (floor($calcQty) == $calcQty) ? number_format($calcQty, 0) : number_format($calcQty, 2);
                            $unitPrice = (floor($uPrice) == $uPrice) ? number_format($uPrice, 0) : number_format($uPrice, 2);
                            $lineTotal = (floor($lTotal) == $lTotal) ? number_format($lTotal, 0) : number_format($lineTotal, 2);
                        @endphp
                        <tr>
                            <td class="col-name">
                                <span class="item-name">{{ $displayName }}</span>
                            </td>
                            <td class="col-qty">
                                <span class="qty-price-text">{{ $unitPrice }} × {{ $displayQty }}</span>
                            </td>
                            <td class="col-total">
                                <span class="line-total-text">{{ $lineTotal }}</span>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>

            <div class="double-line"></div>

            <!-- 4. Financial Totals & Payments Summary -->
            <table class="totals-table">
                @php
                    $invTot = (float)$invoice->total;
                    $fmtInvTot = (floor($invTot) == $invTot) ? number_format($invTot, 0) : number_format($invTot, 2);

                    $invDue = (float)$invoice->due_amount;
                    $fmtInvDue = (floor($invDue) == $invDue) ? number_format($invDue, 0) : number_format($invDue, 2);
                @endphp
                <tr>
                    <td class="totals-label">المجموع الإجمالي:</td>
                    <td class="totals-value"><span class="ltr-text">{{ $fmtInvTot }}</span> دينار</td>
                </tr>

                @if($invoice->payments && count($invoice->payments) > 0)
                    @foreach($invoice->payments as $pay)
                        @php
                            $pAmt = (float)$pay->amount;
                            $fmtPAmt = (floor($pAmt) == $pAmt) ? number_format($pAmt, 0) : number_format($pAmt, 2);
                        @endphp
                        <tr class="payment-row">
                            <td class="totals-label">المدفوع ({{ $pay->paymentMethod->name ?? 'دفع' }}):</td>
                            <td class="totals-value"><span class="ltr-text">{{ $fmtPAmt }}</span> دينار</td>
                        </tr>
                    @endforeach
                @else
                    @php
                        $pPaid = (float)$invoice->paid_amount;
                        $fmtPPaid = (floor($pPaid) == $pPaid) ? number_format($pPaid, 0) : number_format($pPaid, 2);
                    @endphp
                    <tr class="payment-row">
                        <td class="totals-label">المبلغ المدفوع:</td>
                        <td class="totals-value"><span class="ltr-text">{{ $fmtPPaid }}</span> دينار</td>
                    </tr>
                @endif
            </table>

            <!-- Grand Total Box -->
            <div class="grand-total-box">
                <table class="grand-total-table">
                    <tr>
                        <td class="totals-label">المتبقي (Due):</td>
                        <td class="totals-value"><span class="ltr-text">{{ $fmtInvDue }}</span> دينار</td>
                    </tr>
                </table>
            </div>

            <div class="dashed-line"></div>

            <!-- 5. Footer, QR Code & Policy Box -->
            <div class="receipt-footer">

                @if(($settings['show_qr_code'] ?? '1') === '1')
                    <!-- Vector QR Code SVG -->
                    <div class="qr-wrapper">
                        <svg viewBox="0 0 100 100" fill="#000000">
                            <path d="M0 0h30v30H0zM5 5v20h20V5zM10 10h10v10H10zM70 0h30v30H70zM75 5v20h20V5zM80 10h10v10H80zM0 70h30v30H0zM5 75v20h20V5zM10 80h10v10H10zM35 5h10v10H35zM50 5h10v5H50zM40 20h20v10H40zM35 35h10v10H35zM55 35h10v10H75zM35 50h10v10H35zM50 50h15v5H50zM80 50h15v10H80zM35 65h10v10H35zM65 65h10v10H65zM35 80h10v20H35zM50 75h10v10H50zM65 85h25v15H65z"/>
                        </svg>
                    </div>
                @endif

                @if(!empty($settings['thank_you_message']))
                    <div class="thank-you-msg">
                        {{ $settings['thank_you_message'] }}
                    </div>
                @endif

                @if(!empty($settings['policy_notes']))
                    <div class="policy-box">
                        {!! nl2br(e($settings['policy_notes'])) !!}
                    </div>
                @endif
            </div>

            <!-- مسافة تلقيم تلقائي مدمجة وموفرة للورق حرارياً -->
            <div class="paper-feed-spacer"></div>

        </div>
    </div>

    <script>
        function togglePaperSize() {
            const paper = document.getElementById('receiptPaper');
            const label = document.getElementById('paperWidthLabel');
            if (paper.style.width === '57mm') {
                paper.style.width = '70mm';
                label.innerText = '80mm Roll (Black & White Thermal)';
            } else {
                paper.style.width = '57mm';
                label.innerText = '57mm (Small POS)';
            }
        }
    </script>
</body>
</html>
