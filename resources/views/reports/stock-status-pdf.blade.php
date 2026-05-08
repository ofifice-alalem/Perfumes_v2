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

        #page-header { position: fixed; top: -20px; left: 0; right: 0; background: #fff; border-bottom: 2px solid #000; padding: 8px 28px; }
        #page-header .ph-tbl  { display: table; width: 100%; }
        #page-header .ph-r    { display: table-cell; vertical-align: middle; text-align: right; }
        #page-header .ph-l    { display: table-cell; vertical-align: middle; text-align: left; width: 90px; }
        #page-header .ph-title { font-size: 13px; font-weight: bold; color: #000; }
        #page-header .ph-sub   { font-size: 8.5px; color: #666; margin-top: 2px; }

        table.main { width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed; }
        table.main thead tr { background: #e2e8f0; }
        table.main th { color: #000; text-align: right; padding: 7px 6px; font-size: 11px; font-weight: bold; border: 1px solid #64748b; }
        table.main td { padding: 6px 6px; font-size: 11px; color: #334155; text-align: right; border: 1px solid #94a3b8; background: #fff; }
        table.main tr.row-even td { background: #f8fafc; }
        table.main td.num  { font-weight: bold; color: #000; }
        table.main td.idx  { color: #666; font-size: 10px; text-align: center; }
        table.main tfoot td { background: #f1f5f9; font-weight: bold; font-size: 11px; padding: 7px 6px; border: 1px solid #94a3b8; border-top: 2px solid #000; }

        .status-ok       { font-weight: bold; color: #16a34a; }
        .status-warning  { font-weight: bold; color: #d97706; }
        .status-critical { font-weight: bold; color: #dc2626; }

        .footer { display: table; width: 100%; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .footer-r { display: table-cell; text-align: right; font-size: 7.5px; color: #999; }
        .footer-l { display: table-cell; text-align: left;  font-size: 7.5px; color: #999; }
    </style>
</head>
<body>

<div id="page-header">
    <div class="ph-tbl">
        <div class="ph-l">
            <img src="{{ public_path('images/logo.jpg') }}" style="max-height: 40px; max-width: 80px;">
        </div>
        <div class="ph-r">
            <div class="ph-title">{{ $labels['title'] }}</div>
            <div class="ph-sub">{{ $labels['generated_at'] }}</div>
        </div>
    </div>
</div>

{{-- Cover --}}
<div style="page-break-after: always; padding: 40px 50px; direction: rtl;">
    <div style="text-align: center; margin-bottom: 24px;">
        <img src="{{ public_path('images/logo.jpg') }}" style="max-height: 160px; max-width: 400px;">
    </div>
    <div style="border-top: 3px solid #000; border-bottom: 3px solid #000; padding: 14px 0; margin-bottom: 28px; text-align: center;">
        <div style="font-size: 20px; font-weight: bold; color: #000;">{{ $labels['title'] }}</div>
    </div>
    <div style="margin-bottom: 24px;">
        <div style="font-size: 9px; font-weight: bold; color: #666; letter-spacing: 2px; margin-bottom: 10px; text-align: center;">&#x2014; {{ $labels['filter_info'] }} &#x2014;</div>
        <table style="width: 100%; border-collapse: collapse; direction: rtl;">
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px 14px; font-size: 10px; color: #666; width: 30%;">{{ $labels['label_filter'] }}</td>
                <td style="padding: 10px 14px; font-size: 14px; font-weight: bold; color: #000;">{{ $labels['low_stock_label'] }}</td>
            </tr>
        </table>
    </div>
    <div style="border-top: 1px solid #ddd; padding-top: 20px;">
        <div style="font-size: 9px; font-weight: bold; color: #666; letter-spacing: 2px; margin-bottom: 12px; text-align: center;">&#x2014; {{ $labels['summary_label'] }} &#x2014;</div>
        <table style="width: 100%; border-collapse: collapse; direction: rtl;">
            <tr>
                <td style="width: 25%; padding: 16px 10px; text-align: center; border-left: 1px solid #ddd;">
                    <div style="font-size: 9px; color: #666; margin-bottom: 6px;">{{ $g('حرج') }}</div>
                    <div style="font-size: 22px; font-weight: bold; color: #dc2626;">{{ $labels['critical_count'] }}</div>
                </td>
                <td style="width: 25%; padding: 16px 10px; text-align: center; border-left: 1px solid #ddd;">
                    <div style="font-size: 9px; color: #666; margin-bottom: 6px;">{{ $g('تحذير') }}</div>
                    <div style="font-size: 22px; font-weight: bold; color: #d97706;">{{ $labels['warning_count'] }}</div>
                </td>
                <td style="width: 25%; padding: 16px 10px; text-align: center; border-left: 1px solid #ddd;">
                    <div style="font-size: 9px; color: #666; margin-bottom: 6px;">{{ $g('جيد') }}</div>
                    <div style="font-size: 22px; font-weight: bold; color: #16a34a;">{{ $labels['ok_count'] }}</div>
                </td>
                <td style="width: 25%; padding: 16px 10px; text-align: center;">
                    <div style="font-size: 9px; color: #666; margin-bottom: 6px;">{{ $g('إجمالي المنتجات') }}</div>
                    <div style="font-size: 22px; font-weight: bold; color: #000;">{{ $labels['total_products'] }}</div>
                </td>
            </tr>
        </table>
    </div>
    <div style="margin-top: 20px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 10px;">
        {{ $labels['generated_at'] }}
    </div>
</div>

{{-- جدول المخزون --}}
<table class="main">
    <thead>
        <tr>
            <th style="width:9%">{{ $labels['col_status'] }}</th>
            <th style="width:9%">{{ $labels['col_price'] }}</th>
            <th style="width:9%">{{ $labels['col_avg_price'] }}</th>
            <th style="width:9%">{{ $labels['col_cost'] }}</th>
            <th style="width:9%">{{ $labels['col_avg_cost'] }}</th>
            <th style="width:10%">{{ $labels['col_min'] }}</th>
            <th style="width:10%">{{ $labels['col_stock'] }}</th>
            <th style="width:15%">{{ $labels['col_category'] }}</th>
            <th style="width:27%">{{ $labels['col_name'] }}</th>
            <th style="width:5%; text-align:center">#</th>
        </tr>
    </thead>
    <tbody>
        @foreach($data as $i => $p)
        @php
            $statusClass = 'status-' . $p['status'];
            $statusLabel = $g($statusLabels[$p['status']]);
        @endphp
        <tr class="{{ $i % 2 !== 0 ? 'row-even' : '' }}">
            <td class="{{ $statusClass }}">{{ $statusLabel }}</td>
            <td class="num">{{ $fmtN($p['last_sale_price']) }}</td>
            <td class="num">{{ $fmtN($p['avg_sale_price']) }}</td>
            <td class="num">{{ $fmtN($p['last_purchase_cost']) }}</td>
            <td class="num">{{ $fmtN($p['avg_purchase_cost']) }}</td>
            <td class="num">{{ $fmtN($p['min_stock']) }}</td>
            <td class="num">{{ $fmtN($p['stock']) }}</td>
            <td>{{ $g($p['category']) }}</td>
            <td style="font-weight: bold; color: #000;">{{ $g($p['name']) }}</td>
            <td class="idx">{{ $i + 1 }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr>
            <td colspan="7" style="text-align: right; color: #666;">{{ $g('إجمالي المنتجات') }}: {{ $labels['total_products'] }}</td>
            <td></td>
        </tr>
    </tfoot>
</table>

<div class="footer">
    <div class="footer-r">{{ $labels['title'] }}</div>
    <div class="footer-l">{{ $labels['generated_at'] }}</div>
</div>

</body>
</html>
