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
        #page-header .ph-tbl { display: table; width: 100%; }
        #page-header .ph-r   { display: table-cell; vertical-align: middle; text-align: right; }
        #page-header .ph-l   { display: table-cell; vertical-align: middle; text-align: left; width: 90px; }
        #page-header .ph-title { font-size: 13px; font-weight: bold; color: #0f172a; }
        #page-header .ph-sub   { font-size: 8.5px; color: #64748b; margin-top: 2px; }
        #page-header .ph-sub span { color: #0f172a; font-weight: bold; }

        .summary-tbl { display: table; width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .summary-cell { display: table-cell; width: 33%; padding: 10px 12px; border: 1px solid #e2e8f0; border-top: 3px solid #0f172a; background: #f8fafc; vertical-align: top; }
        .summary-label { font-size: 8px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
        .summary-value { font-size: 16px; font-weight: bold; color: #0f172a; }
        .summary-unit  { font-size: 9px; color: #94a3b8; margin-right: 3px; }

        table.main { width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed; }
        table.main thead tr { background: #dce4ee; }
        table.main th { color: #0f172a; text-align: right; padding: 7px 6px; font-size: 12px; font-weight: bold; border: 1px solid #64748b; }
        table.main td { padding: 6px 6px; font-size: 12px; color: #334155; text-align: right; border: 1px solid #94a3b8; background: #fff; }
        table.main tr.row-even td { background: #f8fafc; }
        table.main td.num  { font-weight: bold; color: #0f172a; }
        table.main td.idx  { color: #64748b; font-size: 11px; text-align: center; }
        table.main tfoot td { background: #f1f5f9; font-weight: bold; font-size: 12px; padding: 7px 6px; border: 1px solid #94a3b8; border-top: 2px solid #0f172a; }

        .in  { color: #16a34a; font-weight: bold; }
        .out { color: #dc2626; font-weight: bold; }

        .footer { display: table; width: 100%; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .footer-r { display: table-cell; text-align: right; font-size: 7.5px; color: #94a3b8; }
        .footer-l { display: table-cell; text-align: left;  font-size: 7.5px; color: #94a3b8; }
    </style>
</head>
<body>

<div id="page-header">
    <div class="ph-tbl">
        <div class="ph-l">
            <div style="font-size:11px; font-weight:bold; color:#0f172a;">P<span style="color:#94a3b8;">+</span></div>
        </div>
        <div class="ph-r">
            <div class="ph-title">{{ $labels['title'] }}</div>
            <div class="ph-sub">
                {{ $labels['product_name'] }}
                &nbsp;|&nbsp;
                @if($labels['date_from'])
                    <span>{{ $labels['date_from'] }}</span> &rarr; <span>{{ $labels['date_to'] }}</span>
                @else
                    <span>{{ $labels['all_dates'] }}</span>
                @endif
            </div>
        </div>
    </div>
</div>

{{-- Cover Page --}}
<div style="page-break-after: always; min-height: 700px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 40px; text-align: center;">

    <div style="font-size: 48px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">P<span style="color:#94a3b8;">+</span></div>
    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 40px; letter-spacing: 2px;">نظام العطور</div>

    <div style="border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 32px; width: 100%;">
        <div style="font-size: 22px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">{{ $labels['title'] }}</div>
        <div style="font-size: 13px; color: #64748b;">{{ $labels['product_name'] }}</div>
    </div>

    <table style="width: 80%; border-collapse: collapse; direction: rtl; margin: 0 auto; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td colspan="2" style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none; letter-spacing: 1px;">&#x2014; {{ $labels['filter_info'] }} &#x2014;</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-left: 2px solid #0f172a;">{{ $labels['product_name'] }}</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none;">{{ $labels['label_product'] }}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-left: 2px solid #0f172a;">
                @if($labels['date_from'])
                    {{ $labels['date_from'] }} &rarr; {{ $labels['date_to'] }}
                @else
                    {{ $labels['all_dates'] }}
                @endif
            </td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none;">{{ $labels['label_period'] }}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-left: 2px solid #0f172a;">{{ $labels['movement_type_label'] }}</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none;">{{ $labels['label_type'] }}</td>
        </tr>
    </table>

    <table style="width: 80%; border-collapse: collapse; direction: rtl; margin: 24px auto 0; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td colspan="3" style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none; letter-spacing: 1px;">&#x2014; {{ $labels['summary_label'] }} &#x2014;</td>
        </tr>
        <tr>
            <td style="padding: 16px 8px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 6px;">{{ $labels['closing_stock'] }}</div>
                <div style="font-size: 20px; font-weight: bold; color: #0f172a;">{{ $labels['closing_val'] }} <span style="font-size:11px; color:#94a3b8;">{{ $labels['unit'] }}</span></div>
            </td>
            <td style="padding: 16px 8px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 6px;">{{ $labels['movements_count'] }}</div>
                <div style="font-size: 20px; font-weight: bold; color: #0f172a;">{{ $labels['movements_val'] }}</div>
            </td>
            <td style="padding: 16px 8px; text-align: center; background: #f8fafc;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 6px;">{{ $labels['opening_stock'] }}</div>
                <div style="font-size: 20px; font-weight: bold; color: #0f172a;">{{ $labels['opening_val'] }} <span style="font-size:11px; color:#94a3b8;">{{ $labels['unit'] }}</span></div>
            </td>
        </tr>
    </table>

    <div style="margin-top: 40px; font-size: 9px; color: #94a3b8;">{{ now()->format('Y-m-d H:i') }}</div>
</div>

{{-- ملخص --}}
<div class="summary-tbl">
    <div class="summary-cell">
        <div class="summary-label">{{ $labels['closing_stock'] }}</div>
        <div class="summary-value">{{ $labels['closing_val'] }}<span class="summary-unit">{{ $labels['unit'] }}</span></div>
    </div>
    <div class="summary-cell" style="border-right: none; border-left: none;">
        <div class="summary-label">{{ $labels['movements_count'] }}</div>
        <div class="summary-value">{{ $labels['movements_val'] }}</div>
    </div>
    <div class="summary-cell">
        <div class="summary-label">{{ $labels['opening_stock'] }}</div>
        <div class="summary-value">{{ $labels['opening_val'] }}<span class="summary-unit">{{ $labels['unit'] }}</span></div>
    </div>
</div>

{{-- جدول الحركات --}}
<table class="main">
    <thead>
        <tr>
            <th style="width:13%">{{ $labels['col_balance'] }}</th>
            <th style="width:15%">{{ $labels['col_ref'] }}</th>
            <th style="width:13%">{{ $labels['col_price'] }}</th>
            <th style="width:13%">{{ $labels['col_qty'] }}</th>
            <th style="width:13%">{{ $labels['col_type'] }}</th>
            <th style="width:13%">{{ $labels['col_date'] }}</th>
            <th style="width:5%; text-align:center">#</th>
        </tr>
    </thead>
    <tbody>
        @foreach($movements as $i => $m)
        @php
            $isIn  = $m['quantity'] > 0;
            $qty   = abs($m['quantity']);
            $isWhole = fn($n) => $n == floor($n);
            $fmtN  = fn($n) => $isWhole($n) ? number_format($n, 0) : number_format($n, 2);
        @endphp
        <tr class="{{ $i % 2 !== 0 ? 'row-even' : '' }}">
            <td class="num">{{ $fmtN($m['balance']) }}</td>
            <td style="color:#3b82f6; font-weight:bold;">{{ $m['reference'] }}</td>
            <td class="num">{{ $m['unit_price'] !== null ? $fmtN($m['unit_price']) : '—' }}</td>
            <td class="num {{ $isIn ? 'in' : 'out' }}">{{ ($isIn ? '+' : '-') . $fmtN($qty) }}</td>
            <td class="{{ $isIn ? 'in' : 'out' }}">{{ $g($typeLabels[$m['type']] ?? $m['type']) }}</td>
            <td>{{ \Carbon\Carbon::parse($m['date'])->format('Y-m-d') }}</td>
            <td class="idx">{{ $i + 1 }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr>
            <td colspan="4" class="num">{{ $labels['closing_val'] }} {{ $labels['unit'] }}</td>
            <td colspan="3" style="text-align:right; color:#64748b;">{{ $labels['closing_stock'] }}</td>
        </tr>
    </tfoot>
</table>

<div class="footer">
    <div class="footer-r">{{ $labels['title'] }}</div>
    <div class="footer-l">{{ now()->format('Y-m-d  H:i') }}</div>
</div>

</body>
</html>
