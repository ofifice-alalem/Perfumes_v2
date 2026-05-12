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

        .cover { page-break-after: always; padding: 40px; text-align: center; }
        .cover-logo { margin-bottom: 24px; }
        .cover-title { font-size: 20px; font-weight: bold; color: #0a2540; border-bottom: 3px solid #0a2540; padding-bottom: 10px; margin-bottom: 20px; }
        .cover-table { width: 70%; border-collapse: collapse; direction: rtl; margin: 0 auto 16px; border: 2px solid #0a2540; }
        .cover-table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
        .cover-table td.ct-label { color: #64748b; font-weight: bold; text-align: left; width: 35%; border-right: 2px solid #0a2540; }
        .cover-table td.ct-value { color: #0f172a; font-weight: bold; font-size: 13px; text-align: right; }
        .cover-table tr:last-child td { border-bottom: none; }
        .cover-summary { width: 70%; border-collapse: collapse; direction: rtl; margin: 0 auto; border: 2px solid #0a2540; }
        .cover-summary td { padding: 12px 14px; text-align: center; border-left: 1px solid #e2e8f0; }
        .cover-summary td:last-child { border-left: none; }
        .cover-summary .cs-label { font-size: 8px; font-weight: bold; color: #64748b; display: block; margin-bottom: 4px; }
        .cover-summary .cs-value { font-size: 16px; font-weight: bold; color: #0a2540; display: block; }

        .entity-header { font-weight: bold; font-size: 11px; margin-top: 10px; border-radius: 2px; page-break-before: always; }
        .entity-header table { width: 100%; border-collapse: collapse; direction: ltr; }
        .entity-header td { padding: 5px 8px; font-weight: bold; direction: rtl; unicode-bidi: bidi-override; }
        .entity-header td.ch-amount { text-align: left; font-size: 11px; white-space: nowrap; }
        .entity-header td.ch-count  { text-align: center; font-size: 9px; opacity: 0.85; white-space: nowrap; }
        .entity-header td.ch-name   { text-align: right; font-size: 11px; }
        .entity-customer { background: #DC2626; color: #fff; }
        .entity-customer td { color: #fff; }
        .entity-supplier { background: #D97706; color: #fff; }
        .entity-supplier td { color: #fff; }

        .return-header { font-weight: bold; font-size: 10px; border-bottom: 1px solid #ccc; margin-top: 6px; }
        .return-header table { width: 100%; border-collapse: collapse; direction: ltr; }
        .return-header td { padding: 4px 8px; direction: rtl; unicode-bidi: bidi-override; font-weight: bold; white-space: nowrap; }
        .return-customer .return-header { background: #FEE2E2; }
        .return-customer .return-header td { color: #991B1B; }
        .return-supplier .return-header { background: #FEF3C7; }
        .return-supplier .return-header td { color: #92400E; }

        table.items { width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed; margin-bottom: 8px; }
        table.items th { color: #0f172a; text-align: right; padding: 4px 5px; font-size: 8.5px; font-weight: bold; border: 1px solid #94a3b8; background: #f5f5f5; direction: rtl; unicode-bidi: bidi-override; }
        table.items td { padding: 3px 5px; font-size: 8.5px; color: #334155; text-align: right; border: 1px solid #e2e8f0; background: #fff; direction: rtl; unicode-bidi: bidi-override; }
        table.items tr.even td { background: #f8fafc; }
        table.items td.num { font-weight: bold; color: #0f172a; direction: ltr; text-align: right; unicode-bidi: bidi-override; }

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
            <div class="ph-title">{{ $labels['title'] }} — {{ $labels['type_label'] }}</div>
            <div class="ph-sub">{{ $labels['labelFrom'] }} {{ $labels['dateFrom'] }} &mdash; {{ $labels['labelTo'] }} {{ $labels['dateTo'] }}</div>
        </div>
    </div>
</div>

{{-- Cover Page --}}
<div class="cover">
    <div class="cover-logo">
        <img src="{{ public_path('images/logo.jpg') }}" style="max-height: 120px; max-width: 260px;">
    </div>
    <div class="cover-title">{{ $labels['title'] }}</div>

    <table class="cover-table">
        <tr>
            <td class="ct-label">{{ $labels['labelType'] }}</td>
            <td class="ct-value">{{ $labels['type_label'] }}</td>
        </tr>
        <tr>
            <td class="ct-label">{{ $labels['labelFrom'] }}</td>
            <td class="ct-value">{{ $labels['dateFrom'] }}</td>
        </tr>
        <tr>
            <td class="ct-label">{{ $labels['labelTo'] }}</td>
            <td class="ct-value">{{ $labels['dateTo'] }}</td>
        </tr>
        @if($labels['filterUser'])
        <tr>
            <td class="ct-label">{{ $labels['labelUser'] }}</td>
            <td class="ct-value">{{ $labels['filterUser'] }}</td>
        </tr>
        @endif
        @if($labels['filterCustomer'])
        <tr>
            <td class="ct-label">{{ $labels['labelCustomer'] }}</td>
            <td class="ct-value">{{ $labels['filterCustomer'] }}</td>
        </tr>
        @endif
        @if($labels['filterSupplier'])
        <tr>
            <td class="ct-label">{{ $labels['labelSupplier'] }}</td>
            <td class="ct-value">{{ $labels['filterSupplier'] }}</td>
        </tr>
        @endif
        @if($labels['filterCategory'])
        <tr>
            <td class="ct-label">{{ $labels['labelCategory'] }}</td>
            <td class="ct-value">{{ $labels['filterCategory'] }}</td>
        </tr>
        @endif
        <tr>
            <td class="ct-label">{{ $labels['generatedLabel'] }}</td>
            <td class="ct-value">{{ $labels['generatedAt'] }}</td>
        </tr>
    </table>

    <table class="cover-summary">
        <tr>
            <td>
                <span class="cs-label">{{ $labels['total'] }}</span>
                <span class="cs-value">{{ $fmtN($labels['grandAmount']) }}</span>
            </td>
            <td>
                <span class="cs-label">{{ $labels['returns_label'] }}</span>
                <span class="cs-value">{{ $labels['grandCount'] }}</span>
            </td>
            <td>
                <span class="cs-label">{{ $labels['entities_label'] }}</span>
                <span class="cs-value">{{ count($entries) }}</span>
            </td>
        </tr>
    </table>
</div>

{{-- Entries --}}
@foreach($entries as $entry)
<div class="entity-header entity-{{ $entry['entity_type'] }}" style="{{ $loop->first ? 'page-break-before: avoid;' : '' }}">
    <table>
        <tr>
            <td class="ch-amount">{{ $fmtN($entry['total_amount']) }}</td>
            <td class="ch-count">{{ $entry['return_count'] }} {{ $labels['returns_label'] }}</td>
            <td class="ch-name">{{ $entry['name'] }}</td>
        </tr>
    </table>
</div>

<div class="return-{{ $entry['entity_type'] }}">
@foreach($entry['returns'] as $r)
@php $prefix = $entry['entity_type'] === 'customer' ? 'RET#' : 'PRET#'; @endphp
<div class="return-header">
    <table>
        <tr>
            <td style="text-align:left;">{{ $fmtN($r['total']) }} :{{ $labels['total'] }}</td>
            <td style="text-align:center;">{{ $r['date'] }}</td>
            <td style="text-align:right;">{{ $prefix }}{{ $r['id'] }}</td>
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
        @foreach($r['items'] as $i => $item)
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
</div>
@endforeach

<div class="footer">
    <div class="footer-r">{{ $labels['title'] }} &mdash; {{ $labels['type_label'] }}</div>
    <div class="footer-l">{{ now()->format('Y-m-d H:i') }}</div>
</div>

</body>
</html>
