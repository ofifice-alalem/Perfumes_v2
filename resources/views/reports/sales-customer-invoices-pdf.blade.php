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

        .customer-header { background: #0a2540; color: #fff; font-weight: bold; font-size: 11px; margin-top: 10px; border-radius: 2px; page-break-before: always; }
        .customer-header table { width: 100%; border-collapse: collapse; direction: ltr; }
        .customer-header td { padding: 5px 8px; color: #fff; font-weight: bold; direction: rtl; unicode-bidi: bidi-override; }
        .customer-header td.ch-amount { text-align: left; font-size: 11px; white-space: nowrap; }
        .customer-header td.ch-count  { text-align: center; font-size: 9px; opacity: 0.80; white-space: nowrap; }
        .customer-header td.ch-name   { text-align: right; font-size: 11px; }

        .invoice-header { background: #BBDEFB; font-weight: bold; font-size: 10px; border-bottom: 1px solid #90CAF9; margin-top: 6px; }
        .invoice-header table { width: 100%; border-collapse: collapse; direction: ltr; }
        .invoice-header td { padding: 4px 8px; direction: rtl; unicode-bidi: bidi-override; color: #0f172a; font-weight: bold; white-space: nowrap; }
        .invoice-header td.ih-total { text-align: left; color: #1565C0; }
        .invoice-header td.ih-date  { text-align: center; color: #475569; }
        .invoice-header td.ih-num   { text-align: right; color: #1565C0; }

        table.items { width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed; margin-bottom: 8px; }
        table.items th { color: #0f172a; text-align: right; padding: 4px 5px; font-size: 8.5px; font-weight: bold; border: 1px solid #94a3b8; background: #f5f5f5; direction: rtl; unicode-bidi: bidi-override; }
        table.items td { padding: 3px 5px; font-size: 8.5px; color: #334155; text-align: right; border: 1px solid #e2e8f0; background: #fff; direction: rtl; unicode-bidi: bidi-override; }
        table.items tr.even td { background: #f8fafc; }
        table.items td.num { font-weight: bold; color: #0f172a; direction: ltr; text-align: right; unicode-bidi: bidi-override; }
        table.items tfoot td { background: #E8EAF6; font-weight: bold; font-size: 9px; padding: 3px 5px; border: 1px solid #94a3b8; border-top: 2px solid #0f172a; direction: rtl; }

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
<div class="customer-header" style="{{ $loop->first ? 'page-break-before: avoid;' : '' }}">
    <table>
        <tr>
            <td class="ch-amount">{{ $fmtN($entry['total_amount']) }}</td>
            <td class="ch-count">{{ $entry['invoice_count'] }} {{ $labels['invoices_label'] }}</td>
            <td class="ch-name">{{ $entry['name'] }}</td>
        </tr>
    </table>
</div>

@foreach($entry['invoices'] as $inv)
<div class="invoice-header">
    <table>
        <tr>
            <td class="ih-total">{{ $fmtN($inv['total']) }} :{{ $labels['total'] }}</td>
            <td class="ih-date">{{ $inv['date'] }}</td>
            <td class="ih-num">INV#{{ $inv['id'] }}</td>
        </tr>
    </table>
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
