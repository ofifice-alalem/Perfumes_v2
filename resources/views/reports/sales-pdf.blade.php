<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>{{ $labels['title'] }}</title>
    <style>
        @font-face { font-family: 'Cairo'; src: url('{{ public_path("fonts/Cairo-Regular.ttf") }}') format('truetype'); font-weight: normal; }
        @font-face { font-family: 'Cairo'; src: url('{{ public_path("fonts/Cairo-Bold.ttf") }}') format('truetype'); font-weight: bold; }
        @page { size: A4; margin: 20px 28px; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Cairo', 'DejaVu Sans', sans-serif; }
        body { font-size: 10px; color: #1e293b; direction: rtl; background: #fff; margin-top: 75px; }

        #page-header { position: fixed; top: -20px; left: 0; right: 0; background: #fff; border-bottom: 2px solid #0f172a; padding: 8px 28px; }
        #page-header .ph-tbl  { display: table; width: 100%; }
        #page-header .ph-r    { display: table-cell; vertical-align: middle; text-align: right; }
        #page-header .ph-l    { display: table-cell; vertical-align: middle; text-align: left; width: 90px; }
        #page-header .ph-title { font-size: 13px; font-weight: bold; color: #0f172a; }
        #page-header .ph-sub   { font-size: 8.5px; color: #64748b; margin-top: 2px; }

        .summary-tbl  { display: table; width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .summary-cell { display: table-cell; width: 20%; padding: 10px 12px; border: 1px solid #e2e8f0; border-top: 3px solid #0f172a; background: #f8fafc; vertical-align: top; }
        .summary-label { font-size: 8px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
        .summary-value { font-size: 15px; font-weight: bold; color: #0f172a; }

        table.main { width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed; }
        table.main thead tr { background: #dce4ee; }
        table.main th { color: #0f172a; text-align: right; padding: 7px 6px; font-size: 11px; font-weight: bold; border: 1px solid #64748b; direction: rtl; unicode-bidi: bidi-override; }
        table.main td { padding: 6px 6px; font-size: 11px; color: #334155; text-align: right; border: 1px solid #94a3b8; background: #fff; direction: rtl; unicode-bidi: bidi-override; }
        table.main tr.row-even td { background: #f8fafc; }
        table.main td.num  { font-weight: bold; color: #0f172a; direction: ltr; text-align: right; unicode-bidi: bidi-override; }
        table.main tfoot td { background: #f1f5f9; font-weight: bold; font-size: 11px; padding: 7px 6px; border: 1px solid #94a3b8; border-top: 2px solid #0f172a; direction: rtl; }

        .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8.5px; color: #64748b; text-align: right; }
        .footer-line1 { font-weight: bold; color: #1e293b; margin-bottom: 3px; }
        .footer-line2 { color: #64748b; }
    </style>
</head>
<body>

<div id="page-header">
    <div class="ph-tbl">
        <div class="ph-l"><img src="{{ public_path('images/logo.jpg') }}" style="max-height: 40px; max-width: 80px;"></div>
        <div class="ph-r">
            <div class="ph-title">{{ $labels['title'] }}</div>
            <div class="ph-sub">
                <span>{{ $g('تاريخ الإنشاء:') }}</span>
                <span dir="ltr" style="font-family: sans-serif; font-weight: bold; margin-left: 2px;">{{ now()->format('Y-m-d') }}</span>
                <span style="margin: 0 4px; color: #cbd5e1;">|</span>
                <span>{{ $g('الساعة:') }}</span>
                <span dir="ltr" style="font-family: sans-serif; font-weight: bold; margin-left: 2px;">{{ now()->format('H:i') }}</span>
            </div>
        </div>
    </div>
</div>

{{-- Cover Page --}}
<div style="page-break-after: always; padding: 8px 20px; text-align: center;">
    <div style="margin-bottom: 10px;">
        <img src="{{ public_path('images/logo.jpg') }}" style="max-height: 220px; max-width: 420px;">
    </div>
    <div style="border-bottom: 3px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
        <div style="font-size: 22px; font-weight: bold; color: #0f172a;">{{ $labels['title'] }}</div>
    </div>

    <table style="width: 100%; border-collapse: collapse; direction: rtl; margin: 0 auto; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td colspan="2" style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none;">&#x2014; {{ $labels['filter_info'] }} &#x2014;</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a; width: 65%;">{{ $labels['date_from_val'] }}</td>
            <td style="padding: 10px 16px; font-size: 11px; color: #64748b; border: none; text-align: left; width: 35%;">{{ $labels['label_date_from'] }}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a;">{{ $labels['date_to_val'] }}</td>
            <td style="padding: 10px 16px; font-size: 11px; color: #64748b; border: none; text-align: left;">{{ $labels['date_to_label'] }}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; font-size: 13px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a; line-height: 1.5;">
                @if(!empty($labels['products_val']) && is_array($labels['products_val']))
                    @foreach($labels['products_val'] as $pName)
                        <span style="display:inline-block; background:#e2e8f0; color:#334155; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:4px; margin-bottom:4px;">{{ $pName }}</span>
                    @endforeach
                @else
                    {{ $g('الكل') }}
                @endif
            </td>
            <td style="padding: 10px 16px; font-size: 11px; color: #64748b; border: none; text-align: left;">{{ $g('المنتجات المشمولة في الحساب') }}</td>
        </tr>
    </table>

    <table style="width: 80%; border-collapse: collapse; direction: rtl; margin: 12px auto 0; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td colspan="5" style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none;">&#x2014; {{ $labels['summary_label'] }} &#x2014;</td>
        </tr>
        <tr>
            <td style="padding: 14px 6px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc;">
                <div style="font-size: 8px; color: #64748b; font-weight: bold; margin-bottom: 4px;">{{ $labels['lbl_due'] }}</div>
                <div style="font-size: 18px; font-weight: bold; color: #dc2626;">{{ $labels['total_due'] }}</div>
            </td>
            <td style="padding: 14px 6px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc;">
                <div style="font-size: 8px; color: #64748b; font-weight: bold; margin-bottom: 4px;">{{ $labels['lbl_paid'] }}</div>
                <div style="font-size: 18px; font-weight: bold; color: #16a34a;">{{ $labels['total_paid'] }}</div>
            </td>
            <td style="padding: 14px 6px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc;">
                <div style="font-size: 8px; color: #64748b; font-weight: bold; margin-bottom: 4px;">{{ $labels['lbl_avg'] }}</div>
                <div style="font-size: 18px; font-weight: bold; color: #0f172a;">{{ $labels['avg_invoice'] }}</div>
            </td>
            <td style="padding: 14px 6px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc;">
                <div style="font-size: 8px; color: #64748b; font-weight: bold; margin-bottom: 4px;">{{ $labels['lbl_count'] }}</div>
                <div style="font-size: 18px; font-weight: bold; color: #0f172a;">{{ $labels['invoices_count'] }}</div>
            </td>
            <td style="padding: 14px 6px; text-align: center; background: #f8fafc;">
                <div style="font-size: 8px; color: #64748b; font-weight: bold; margin-bottom: 4px;">{{ $labels['lbl_total'] }}</div>
                <div style="font-size: 18px; font-weight: bold; color: #0f172a;">{{ $labels['total_sales'] }}</div>
            </td>
        </tr>
    </table>
    <div style="margin-top: 16px; font-size: 9px; color: #94a3b8;">{{ now()->format('Y-m-d H:i') }}</div>
</div>

{{-- Summary Cards --}}
<div class="summary-tbl">
    <div class="summary-cell">
        <div class="summary-label">{{ $labels['lbl_due'] }}</div>
        <div class="summary-value" style="color:#dc2626;">{{ $labels['total_due'] }}</div>
    </div>
    <div class="summary-cell" style="border-right: none;">
        <div class="summary-label">{{ $labels['lbl_paid'] }}</div>
        <div class="summary-value" style="color:#16a34a;">{{ $labels['total_paid'] }}</div>
    </div>
    <div class="summary-cell" style="border-right: none;">
        <div class="summary-label">{{ $labels['lbl_avg'] }}</div>
        <div class="summary-value">{{ $labels['avg_invoice'] }}</div>
    </div>
    <div class="summary-cell" style="border-right: none;">
        <div class="summary-label">{{ $labels['lbl_count'] }}</div>
        <div class="summary-value">{{ $labels['invoices_count'] }}</div>
    </div>
    <div class="summary-cell" style="border-right: none;">
        <div class="summary-label">{{ $labels['lbl_total'] }}</div>
        <div class="summary-value">{{ $labels['total_sales'] }}</div>
    </div>
</div>

{{-- جدول التفصيل الشهري --}}
<table class="main">
    <thead>
        <tr>
            <th style="width:30%">{{ $labels['col_total'] }}</th>
            <th style="width:30%">{{ $labels['col_count'] }}</th>
            <th style="width:40%">{{ $labels['col_month'] }}</th>
        </tr>
    </thead>
    <tbody>
        @foreach($data['monthly'] as $i => $m)
        <tr style="background: {{ $i % 2 === 0 ? '#dce4ee' : '#eff6ff' }};">
            <td class="num" style="font-weight:bold; color:#0f172a;">{{ $fmtN($m['total']) }}</td>
            <td class="num" style="font-weight:bold; color:#0f172a;">{{ $m['count'] }}</td>
            <td style="font-weight:bold; color:#0f172a;">{{ $m['month'] }}</td>
        </tr>
        @foreach($m['days'] as $d)
        <tr>
            <td class="num" style="font-size:9px; color:#64748b;">{{ $fmtN($d['total']) }}</td>
            <td class="num" style="font-size:9px; color:#64748b;">{{ $d['count'] }}</td>
            <td style="font-size:9px; color:#64748b; padding-right:16px;">{{ $d['date'] }}</td>
        </tr>
        @endforeach
        @endforeach
    </tbody>
    <tfoot>
        <tr>
            <td class="num">{{ $labels['total_sales'] }}</td>
            <td class="num">{{ $labels['invoices_count'] }}</td>
            <td style="color:#64748b;">{{ $g('الإجمالي') }}</td>
        </tr>
    </tfoot>
</table>

<div class="footer">
    <div class="footer-line1">
        <span style="font-weight: bold; color: #0f172a;">{{ $labels['title'] }}</span>
    </div>
    <div class="footer-line2">
        <span dir="ltr" style="font-family: sans-serif; font-weight: bold; margin-left: 2px;">{{ now()->format('H:i') }}</span>
        <span style="margin-left: 4px;">{{ $g('الساعة:') }}</span>
        <span style="margin: 0 8px; color: #cbd5e1;">|</span>
        <span dir="ltr" style="font-family: sans-serif; font-weight: bold; margin-left: 2px;">{{ now()->format('Y-m-d') }}</span>
        <span style="margin-left: 4px;">{{ $g('تاريخ الإنشاء:') }}</span>
    </div>
</div>

</body>
</html>
