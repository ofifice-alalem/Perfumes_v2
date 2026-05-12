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
        .summary-value { font-size: 15px; font-weight: bold; color: #0f172a; }

        .customer-header { background: #1565C0; color: #fff; font-weight: bold; font-size: 11px; padding: 7px 10px; margin-top: 10px; }
        .invoice-header  { background: #BBDEFB; font-weight: bold; font-size: 10px; padding: 5px 10px; }

        table.items { width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed; margin-bottom: 2px; }
        table.items th { color: #0f172a; text-align: right; padding: 5px 6px; font-size: 9px; font-weight: bold; border: 1px solid #94a3b8; background: #f5f5f5; direction: rtl; unicode-bidi: bidi-override; }
        table.items td { padding: 4px 6px; font-size: 9px; color: #334155; text-align: right; border: 1px solid #e2e8f0; background: #fff; direction: rtl; unicode-bidi: bidi-override; }
        table.items tr.even td { background: #f8fafc; }
        table.items td.num { font-weight: bold; color: #0f172a; direction: ltr; text-align: right; unicode-bidi: bidi-override; }
        table.items tfoot td { background: #E8EAF6; font-weight: bold; font-size: 10px; padding: 5px 6px; border: 1px solid #94a3b8; border-top: 2px solid #0f172a; direction: rtl; }

        .footer { display: table; width: 100%; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .footer-r { display: table-cell; text-align: right; font-size: 7.5px; color: #94a3b8; }
        .footer-l { display: table-cell; text-align: left;  font-size: 7.5px; color: #94a3b8; }
    </style>
</head>
<body>

<div id="page-header">
    <div class="ph-tbl">
        <div class="ph-l"><img src="{{ public_path('images/logo.jpg') }}" style="max-height: 40px; max-width: 80px;"></div>
        <div class="ph-r">
            <div class="ph-title">{{ $labels['title'] }}</div>
            <div class="ph-sub">{{ $labels['labelFrom'] }} {{ $labels['dateFrom'] }} &mdash; {{ $labels['labelTo'] }} {{ $labels['dateTo'] }}</div>
        </div>
    </div>
</div>

{{-- Summary Cards --}}
<div class="summary-tbl">
    <div class="summary-cell">
        <div class="summary-label">{{ $labels['invoices_label'] }}</div>
        <div class="summary-value">{{ $labels['grandCount'] }}</div>
    </div>
    <div class="summary-cell" style="border-right: none;">
        <div class="summary-label">{{ $labels['total'] }}</div>
        <div class="summary-value">{{ $fmtN($labels['grandAmount']) }}</div>
    </div>
</div>

{{-- Entries --}}
@foreach($entries as $entry)
<div class="customer-header">
    {{ $entry['name'] }} &mdash; {{ $entry['invoice_count'] }} {{ $labels['invoices_label'] }} &mdash; {{ $fmtN($entry['total_amount']) }}
</div>

@foreach($entry['invoices'] as $inv)
<div class="invoice-header">
    INV#{{ $inv['id'] }} &nbsp;&nbsp; {{ $inv['date'] }} &nbsp;&nbsp; {{ $labels['total'] }}: {{ $fmtN($inv['total']) }}
</div>
<table class="items">
    <thead>
        <tr>
            <th style="width:20%">{{ $labels['amount'] }}</th>
            <th style="width:17%">{{ $labels['price'] }}</th>
            <th style="width:15%">{{ $labels['qty'] }}</th>
            <th style="width:38%">{{ $labels['product'] }}</th>
            <th style="width:10%">{{ $labels['count_label'] }}</th>
        </tr>
    </thead>
    <tbody>
        @foreach($inv['items'] as $i => $item)
        <tr class="{{ $i % 2 === 0 ? '' : 'even' }}">
            <td class="num">{{ $fmtN($item['quantity'] * $item['count'] * $item['unit_price']) }}</td>
            <td class="num">{{ $fmtN($item['unit_price']) }}</td>
            <td class="num">{{ $fmtN($item['quantity']) }}</td>
            <td>{{ $item['product_name'] }}</td>
            <td class="num" style="color:{{ $item['count'] > 1 ? '#1565C0' : '#94a3b8' }}; font-weight:{{ $item['count'] > 1 ? 'bold' : 'normal' }};">{{ $item['count'] > 1 ? $item['count'] : '—' }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr>
            <td class="num">{{ $fmtN($inv['total']) }}</td>
            <td colspan="4">{{ $labels['total'] }}</td>
        </tr>
    </tfoot>
</table>
@endforeach

<div style="background:#E8EAF6; padding:5px 10px; font-weight:bold; font-size:10px; margin-bottom:6px; border-top: 2px solid #0f172a;">
    {{ $labels['total'] }}: {{ $fmtN($entry['total_amount']) }}
</div>
@endforeach

<div class="footer">
    <div class="footer-r">{{ $labels['title'] }} &mdash; {{ $labels['labelFrom'] }} {{ $labels['dateFrom'] }} {{ $labels['labelTo'] }} {{ $labels['dateTo'] }}</div>
    <div class="footer-l">{{ now()->format('Y-m-d H:i') }}</div>
</div>

</body>
</html>
