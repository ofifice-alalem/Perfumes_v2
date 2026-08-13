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
        .summary-cell { display: table-cell; width: 25%; padding: 10px 12px; border: 1px solid #e2e8f0; border-top: 3px solid #0f172a; background: #f8fafc; vertical-align: top; }
        .summary-label { font-size: 8px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
        .summary-value { font-size: 16px; font-weight: bold; color: #0f172a; }

        table.main { width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed; }
        table.main thead tr { background: #dce4ee; }
        table.main th { color: #0f172a; text-align: right; padding: 7px 6px; font-size: 11px; font-weight: bold; border: 1px solid #64748b; }
        table.main td { padding: 6px 6px; font-size: 11px; color: #334155; text-align: right; border: 1px solid #94a3b8; background: #fff; }
        table.main tr.row-even td { background: #f8fafc; }
        table.main td.num  { font-weight: bold; color: #0f172a; }
        table.main td.idx  { color: #64748b; font-size: 11px; text-align: center; }
        table.main tfoot td { background: #f1f5f9; font-weight: bold; font-size: 11px; padding: 7px 6px; border: 1px solid #94a3b8; border-top: 2px solid #0f172a; }

        .status-ok       { font-weight: bold; color: #16a34a; }
        .status-warning  { font-weight: bold; color: #d97706; }
        .status-critical { font-weight: bold; color: #dc2626; }

        .footer { display: table; width: 100%; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8.5px; color: #64748b; text-align: right; }
        .footer-line1 { font-weight: bold; color: #1e293b; margin-bottom: 3px; }
        .footer-line2 { color: #64748b; }
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

    <div style="border-bottom: 3px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; width: 100%;">
        <div style="font-size: 22px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">{{ $labels['title'] }}</div>
    </div>

    <table style="width: 100%; border-collapse: collapse; direction: rtl; margin: 0 auto; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td colspan="2" style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none; letter-spacing: 1px;">&#x2014; {{ $g('معلومات الفلتر') }} &#x2014;</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a; width: 65%;">{{ $labels['date_from_val'] }}</td>
            <td style="padding: 10px 16px; font-size: 11px; color: #64748b; border: none; text-align: left; width: 35%;">{{ $g('من تاريخ') }}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a;">{{ $labels['date_to_val'] }}</td>
            <td style="padding: 10px 16px; font-size: 11px; color: #64748b; border: none; text-align: left; width: 35%;">{{ $g('إلى تاريخ') }}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
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
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a;">{{ $labels['category_val'] }}</td>
            <td style="padding: 10px 16px; font-size: 11px; color: #64748b; border: none; text-align: left;">{{ $g('التصنيف المختار') }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a;">{{ $labels['low_stock_label'] }}</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none; text-align: left;">{{ $g('الحد الأدنى للمخزون') }}</td>
        </tr>
    </table>

    <table style="width: 80%; border-collapse: collapse; direction: rtl; margin: 12px auto 0; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td colspan="{{ $labels['show_purchased'] ? '2' : '4' }}" style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none; letter-spacing: 1px;">&#x2014; {{ $labels['summary_label'] }} &#x2014;</td>
        </tr>
        <tr>
            @if($labels['show_purchased'])
            <td style="padding: 16px 8px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc; width: 50%;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 6px;">{{ $g('إجمالي الربح') }}</div>
                <div style="font-size: 20px; font-weight: bold; color: #16a34a;">{{ $fmtN($labels['total_profit']) }}</div>
            </td>
            @else
            <td style="padding: 16px 8px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 6px;">{{ $g('حرج') }}</div>
                <div style="font-size: 20px; font-weight: bold; color: #dc2626;">{{ $labels['critical_count'] }}</div>
            </td>
            <td style="padding: 16px 8px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 6px;">{{ $g('تحذير') }}</div>
                <div style="font-size: 20px; font-weight: bold; color: #d97706;">{{ $labels['warning_count'] }}</div>
            </td>
            <td style="padding: 16px 8px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 6px;">{{ $g('جيد') }}</div>
                <div style="font-size: 20px; font-weight: bold; color: #16a34a;">{{ $labels['ok_count'] }}</div>
            </td>
            @endif
            <td style="padding: 16px 8px; text-align: center; background: #f8fafc; width: {{ $labels['show_purchased'] ? '50%' : 'auto' }};">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 6px;">{{ $g('إجمالي المنتجات') }}</div>
                <div style="font-size: 20px; font-weight: bold; color: #0f172a;">{{ $labels['total_products'] }}</div>
            </td>
        </tr>
    </table>

    <div style="margin-top: 16px; font-size: 9px; color: #94a3b8;">{{ now()->format('Y-m-d H:i') }}</div>
</div>

{{-- Summary Cards --}}
<div class="summary-tbl">
    @if($labels['show_purchased'])
    <div class="summary-cell" style="width:50%;">
        <div class="summary-label">{{ $g('إجمالي الربح') }}</div>
        <div class="summary-value" style="color: #16a34a;">{{ $fmtN($labels['total_profit']) }}</div>
    </div>
    <div class="summary-cell" style="border-right: none; width:50%;">
        <div class="summary-label">{{ $g('إجمالي المنتجات') }}</div>
        <div class="summary-value">{{ $labels['total_products'] }}</div>
    </div>
    @else
    <div class="summary-cell" style="width:25%;">
        <div class="summary-label">{{ $g('حرج') }}</div>
        <div class="summary-value" style="color: #dc2626;">{{ $labels['critical_count'] }}</div>
    </div>
    <div class="summary-cell" style="border-right: none; width:25%;">
        <div class="summary-label">{{ $g('تحذير') }}</div>
        <div class="summary-value" style="color: #d97706;">{{ $labels['warning_count'] }}</div>
    </div>
    <div class="summary-cell" style="border-right: none; width:25%;">
        <div class="summary-label">{{ $g('جيد') }}</div>
        <div class="summary-value" style="color: #16a34a;">{{ $labels['ok_count'] }}</div>
    </div>
    <div class="summary-cell" style="width:25%;">
        <div class="summary-label">{{ $g('إجمالي المنتجات') }}</div>
        <div class="summary-value">{{ $labels['total_products'] }}</div>
    </div>
    @endif
</div>

{{-- جدول المخزون --}}
<table class="main">
    <thead>
        <tr>
            @if($labels['show_purchased'])
                @if($labels['compact_view'])
                    <th style="width:15%">{{ $labels['col_profit'] }}</th>
                    <th style="width:15%">{{ $labels['col_net_qty'] }}</th>
                    <th style="width:15%">{{ $labels['col_avg_price'] }}</th>
                    <th style="width:15%">{{ $labels['col_avg_cost'] }}</th>
                    <th>{{ $labels['col_name'] }}</th>
                    <th style="width:5%; text-align:center">#</th>
                @else
                    <th style="width:8%">{{ $labels['col_profit'] }}</th>
                    <th style="width:8%">{{ $labels['col_avg_price'] }}</th>
                    <th style="width:8%">{{ $labels['col_avg_cost'] }}</th>
                    <th style="width:9%">{{ $g('م.ارجاع زبون') }}</th>
                    <th style="width:9%">{{ $g('مرتجع زبون') }}</th>
                    <th style="width:9%">{{ $g('م.ارجاع مورد') }}</th>
                    <th style="width:9%">{{ $g('مرتجع مورد') }}</th>
                    <th style="width:6%">{{ $g('التالف') }}</th>
                    <th style="width:8%">{{ $g('المبيعات') }}</th>
                    <th style="width:8%">{{ $labels['col_stock'] }}</th>
                    <th style="width:8%">{{ $g('المشتريات') }}</th>
                    <th>{{ $labels['col_name'] }}</th>
                    <th style="width:4%; text-align:center">#</th>
                @endif
            @else
                <th style="width:9%">{{ $labels['col_status'] }}</th>
                <th style="width:9%">{{ $labels['col_price'] }}</th>
                <th style="width:9%">{{ $labels['col_avg_price'] }}</th>
                <th style="width:9%">{{ $labels['col_cost'] }}</th>
                <th style="width:9%">{{ $labels['col_avg_cost'] }}</th>
                @if($labels['show_sold'])<th style="width:9%">{{ $labels['col_sold'] }}</th>@endif
                @if($labels['show_wasted'])<th style="width:9%">{{ $labels['col_wasted'] }}</th>@endif
                <th style="width:10%">{{ $labels['col_min'] }}</th>
                <th style="width:10%">{{ $labels['col_stock'] }}</th>
                <th style="width:15%">{{ $labels['col_category'] }}</th>
                <th>{{ $labels['col_name'] }}</th>
                <th style="width:5%; text-align:center">#</th>
            @endif
        </tr>
    </thead>
    <tbody>
        @foreach($data as $i => $p)
        @php
            $statusClass = 'status-' . $p['status'];
            $statusLabel = $g($statusLabels[$p['status']]);
        @endphp
        <tr class="{{ $i % 2 !== 0 ? 'row-even' : '' }}">
            @if($labels['show_purchased'])
                @if($labels['compact_view'])
                    <td class="num" style="color: {{ $p['profit'] !== null ? ($p['profit'] >= 0 ? '#16a34a' : '#dc2626') : '#94a3b8' }}">{{ $fmtN($p['profit']) }}</td>
                    <td class="num">{{ $fmtN($p['net_sale_qty']) }}</td>
                    <td class="num">{{ $fmtN($p['avg_sale_price']) }}</td>
                    <td class="num">{{ $fmtN($p['avg_purchase_cost']) }}</td>
                    <td style="font-weight: bold; color: #0f172a;">{{ $g($p['name']) }}</td>
                    <td class="idx">{{ $i + 1 }}</td>
                @else
                    <td class="num" style="color: {{ $p['profit'] !== null ? ($p['profit'] >= 0 ? '#16a34a' : '#dc2626') : '#94a3b8' }}">{{ $fmtN($p['profit']) }}</td>
                    <td class="num">{{ $fmtN($p['avg_sale_price']) }}</td>
                    <td class="num">{{ $fmtN($p['avg_purchase_cost']) }}</td>
                    <td class="num">{{ $fmtN($p['avg_return_in_price']) }}</td>
                    <td class="num">{{ $fmtN($p['total_return_in']) }}</td>
                    <td class="num">{{ $fmtN($p['avg_return_out_price']) }}</td>
                    <td class="num">{{ $fmtN($p['total_return_out']) }}</td>
                    <td class="num" style="color:#dc2626">{{ $fmtN($p['total_wasted']) }}</td>
                    <td class="num">{{ $fmtN($p['total_sold']) }}</td>
                    <td class="num">{{ $fmtN($p['stock']) }}</td>
                    <td class="num">{{ $fmtN($p['total_purchased']) }}</td>
                    <td style="font-weight: bold; color: #0f172a;">{{ $g($p['name']) }}</td>
                    <td class="idx">{{ $i + 1 }}</td>
                @endif
            @else
                <td class="{{ $statusClass }}">{{ $statusLabel }}</td>
                <td class="num">{{ $fmtN($p['last_sale_price']) }}</td>
                <td class="num">{{ $fmtN($p['avg_sale_price']) }}</td>
                <td class="num">{{ $fmtN($p['last_purchase_cost']) }}</td>
                <td class="num">{{ $fmtN($p['avg_purchase_cost']) }}</td>
                @if($labels['show_sold'])<td class="num">{{ $fmtN($p['total_sold']) }}</td>@endif
                @if($labels['show_wasted'])<td class="num" style="color:#dc2626">{{ $fmtN($p['total_wasted']) }}</td>@endif
                <td class="num">{{ $fmtN($p['min_stock']) }}</td>
                <td class="num">{{ $fmtN($p['stock']) }}</td>
                <td>{{ $g($p['category']) }}</td>
                <td style="font-weight: bold; color: #0f172a;">{{ $g($p['name']) }}</td>
                <td class="idx">{{ $i + 1 }}</td>
            @endif
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr>
            @if($labels['show_purchased'])
                @if($labels['compact_view'])
                    <td class="num" style="color: #16a34a;">{{ $fmtN($labels['total_profit']) }}</td>
                    <td colspan="5" style="text-align: right; color: #64748b;">{{ $g('الإجمالي') }}</td>
                @else
                    <td class="num" style="color: #16a34a;">{{ $fmtN($labels['total_profit']) }}</td>
                    <td colspan="12" style="text-align: right; color: #64748b;">{{ $g('الإجمالي') }}</td>
                @endif
            @else
                <td colspan="7" style="text-align: right; color: #64748b;">{{ $g('إجمالي المنتجات') }}: {{ $labels['total_products'] }}</td>
                <td colspan="3"></td>
            @endif
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
