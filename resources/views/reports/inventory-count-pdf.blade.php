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
        body { font-size: 11px; color: #1e293b; direction: rtl; background: #fff; margin-top: 75px; }

        #page-header { position: fixed; top: -20px; left: 0; right: 0; background: #fff; border-bottom: 2px solid #0f172a; padding: 8px 28px; }
        #page-header .ph-tbl  { display: table; width: 100%; }
        #page-header .ph-r    { display: table-cell; vertical-align: middle; text-align: right; }
        #page-header .ph-l    { display: table-cell; vertical-align: middle; text-align: left; width: 90px; }
        #page-header .ph-title { font-size: 13px; font-weight: bold; color: #0f172a; }
        #page-header .ph-sub   { font-size: 8.5px; color: #64748b; margin-top: 2px; }

        table.main { width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed; margin-top: 15px; }
        table.main thead tr { background: #dce4ee; }
        table.main th { color: #0f172a; text-align: right; padding: 10px 8px; font-size: 12px; font-weight: bold; border: 1px solid #64748b; }
        table.main td { padding: 12px 8px; font-size: 12px; color: #334155; text-align: right; border: 1px solid #94a3b8; background: #fff; }
        table.main tr.row-even td { background: #f8fafc; }
        table.main td.num  { font-weight: bold; color: #0f172a; }
        table.main td.idx  { color: #64748b; font-size: 11px; text-align: center; }

        .footer { display: table; width: 100%; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .footer-r { display: table-cell; text-align: right; font-size: 8px; color: #94a3b8; }
        .footer-l { display: table-cell; text-align: left;  font-size: 8px; color: #94a3b8; }
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

<div style="margin-bottom: 20px; text-align: center;">
    <div style="font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 5px;">{{ $labels['title'] }}</div>
    <div style="font-size: 12px; color: #64748b;">{{ $labels['filter_info'] }} ({{ $labels['low_stock_label'] }})</div>
</div>

{{-- جدول الجرد --}}
<table class="main">
    <thead>
        <tr>
            <th style="width:35%">{{ $labels['col_notes'] }}</th>
            <th style="width:12%">{{ $labels['col_actual'] }}</th>
            <th style="width:10%">{{ $labels['col_stock'] }}</th>
            <th style="width:13%">{{ $labels['col_category'] }}</th>
            <th>{{ $labels['col_name'] }}</th>
            <th style="width:5%; text-align:center">#</th>
        </tr>
    </thead>
    <tbody>
        @foreach($data as $i => $p)
        <tr class="{{ $i % 2 !== 0 ? 'row-even' : '' }}">
            <td></td>
            <td></td>
            <td class="num">{{ $fmtN($p['stock']) }}</td>
            <td>{{ $g($p['category']) }}</td>
            <td style="font-weight: bold; color: #0f172a;">{{ $g($p['name']) }}</td>
            <td class="idx">{{ $i + 1 }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div class="footer">
    <div class="footer-r">{{ $labels['title'] }} | {{ $g('إجمالي المنتجات') }}: {{ $labels['total_products'] }}</div>
    <div class="footer-l">{{ now()->format('Y-m-d  H:i') }}</div>
</div>

</body>
</html>
