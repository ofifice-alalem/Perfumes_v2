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
        .summary-cell { display: table-cell; width: 33%; padding: 10px 12px; border: 1px solid #e2e8f0; border-top: 3px solid #0f172a; background: #f8fafc; vertical-align: top; }
        .summary-label { font-size: 8px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
        .summary-value { font-size: 16px; font-weight: bold; color: #0f172a; }

        table.main { width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed; margin-bottom: 10px; }
        table.main thead tr { background: #dce4ee; }
        table.main th { color: #0f172a; text-align: right; padding: 7px 6px; font-size: 11px; font-weight: bold; border: 1px solid #64748b; direction: rtl; unicode-bidi: bidi-override; }
        table.main td { padding: 6px 6px; font-size: 11px; color: #334155; text-align: right; border: 1px solid #94a3b8; background: #fff; direction: rtl; unicode-bidi: bidi-override; }
        table.main tr.row-even td { background: #f8fafc; }
        table.main td.num  { font-weight: bold; color: #0f172a; direction: ltr; text-align: right; unicode-bidi: bidi-override; }
        table.main td.idx  { color: #64748b; font-size: 10px; text-align: center; direction: ltr; unicode-bidi: bidi-override; }
        table.main tfoot td { background: #f1f5f9; font-weight: bold; font-size: 11px; padding: 7px 6px; border: 1px solid #94a3b8; border-top: 2px solid #0f172a; direction: rtl; unicode-bidi: bidi-override; }

        table.invoices { width: 92%; border-collapse: collapse; direction: ltr; margin: 0 0 8px 0; }
        table.invoices td { padding: 4px 6px; font-size: 9.5px; color: #64748b; border: 1px solid #e2e8f0; background: #f8fafc; text-align: right; direction: rtl; unicode-bidi: bidi-override; }
        table.invoices td.inv-ref { color: #3b82f6; font-weight: bold; direction: ltr; unicode-bidi: bidi-override; }
        table.invoices td.num-cell { direction: ltr; unicode-bidi: bidi-override; font-weight: bold; color: #0f172a; }
        table.invoices td.over90  { color: #dc2626; font-weight: bold; direction: ltr; unicode-bidi: bidi-override; }
        table.invoices td.warn    { color: #d97706; font-weight: bold; direction: ltr; unicode-bidi: bidi-override; }

        .over90-val { color: #dc2626; font-weight: bold; }
        .warn-val   { color: #d97706; font-weight: bold; }

        .footer { display: table; width: 100%; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .footer-r { display: table-cell; text-align: right; font-size: 7.5px; color: #94a3b8; }
        .footer-l { display: table-cell; text-align: left;  font-size: 7.5px; color: #94a3b8; }
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

{{-- Cover Page --}}
<div style="page-break-after: always; padding: 20px 40px; text-align: center;">
    <div style="margin-bottom: 20px;">
        <img src="{{ public_path('images/logo.jpg') }}" style="max-height: 300px; max-width: 550px;">
    </div>
    <div style="border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px;">
        <div style="font-size: 22px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">{{ $labels['title'] }}</div>
    </div>

    <table style="width: 80%; border-collapse: collapse; direction: rtl; margin: 0 auto; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td colspan="2" style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none; letter-spacing: 1px;">&#x2014; {{ $labels['filter_info'] }} &#x2014;</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a; text-align: right;">{{ $labels['supplier_val'] }}</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none; text-align: left; width: 35%;">{{ $labels['label_supplier'] }}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a; text-align: right;">{{ $labels['date_from_val'] }}</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none; text-align: left;">{{ $labels['label_date_from'] }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a; text-align: right;">{{ $labels['date_to_val'] }}</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none; text-align: left;">{{ $labels['date_to_label'] }}</td>
        </tr>
    </table>

    <table style="width: 80%; border-collapse: collapse; direction: rtl; margin: 12px auto 0; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td colspan="3" style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none; letter-spacing: 1px;">&#x2014; {{ $labels['summary_label'] }} &#x2014;</td>
        </tr>
        <tr>
            <td style="padding: 16px 8px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 6px;">{{ $g('إجمالي الديون') }}</div>
                <div style="font-size: 20px; font-weight: bold; color: #0f172a;">{{ $labels['total_debt'] }}</div>
            </td>
            <td style="padding: 16px 8px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 6px;">{{ $g('أكثر من 90 يوم') }}</div>
                <div style="font-size: 20px; font-weight: bold; color: #dc2626;">{{ $labels['total_over90'] }}</div>
            </td>
            <td style="padding: 16px 8px; text-align: center; background: #f8fafc;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 6px;">{{ $g('عدد العملاء') }}</div>
                <div style="font-size: 20px; font-weight: bold; color: #0f172a;">{{ $labels['suppliers_count'] }}</div>
            </td>
        </tr>
    </table>
    <div style="margin-top: 16px; font-size: 9px; color: #94a3b8;">{{ now()->format('Y-m-d H:i') }}</div>
</div>

{{-- Summary Cards --}}
<div class="summary-tbl">
    <div class="summary-cell">
        <div class="summary-label">{{ $g('إجمالي الديون') }}</div>
        <div class="summary-value">{{ $labels['total_debt'] }}</div>
    </div>
    <div class="summary-cell" style="border-right: none; border-left: none;">
        <div class="summary-label">{{ $g('أكثر من 90 يوم') }}</div>
        <div class="summary-value" style="color: #dc2626;">{{ $labels['total_over90'] }}</div>
    </div>
    <div class="summary-cell">
        <div class="summary-label">{{ $g('عدد العملاء') }}</div>
        <div class="summary-value">{{ $labels['suppliers_count'] }}</div>
    </div>
</div>

{{-- جدول العملاء --}}
@php
    $typeLabels = ['invoice' => 'شراء', 'payment' => 'دفعة', 'settlement' => 'تسوية', 'return' => 'مرتجع'];
    $typeColors = ['invoice' => '#334155', 'payment' => '#16a34a', 'settlement' => '#3b82f6', 'return' => '#d97706'];
@endphp

@foreach($data as $i => $c)
<div style="{{ $i > 0 ? 'page-break-before: always;' : '' }}">
<table class="main">
    <thead>
        <tr>
            <th style="width:7%; text-align:center">{{ $labels['col_invoices'] }}</th>
            <th style="width:13%">{{ $labels['col_over90'] }}</th>
            <th style="width:13%">{{ $labels['col_60_90'] }}</th>
            <th style="width:13%">{{ $labels['col_30_60'] }}</th>
            <th style="width:13%">{{ $labels['col_current'] }}</th>
            <th style="width:14%">{{ $labels['col_total'] }}</th>
            <th style="width:22%">{{ $labels['col_supplier'] }}</th>
            <th style="width:5%; text-align:center">#</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="idx">{{ count($c['movements']) }}</td>
            <td class="num {{ $c['over_90'] > 0 ? 'over90-val' : '' }}">{{ $fmtN($c['over_90']) }}</td>
            <td class="num {{ $c['days_60_90'] > 0 ? 'warn-val' : '' }}">{{ $fmtN($c['days_60_90']) }}</td>
            <td class="num {{ $c['days_30_60'] > 0 ? 'warn-val' : '' }}">{{ $fmtN($c['days_30_60']) }}</td>
            <td class="num">{{ $fmtN($c['current']) }}</td>
            <td class="num">{{ $fmtN($c['total_debt']) }}</td>
            <td style="font-weight: bold; color: #0f172a; direction:rtl;">{{ $g($c['supplier_name']) }}</td>
            <td class="idx">{{ $i + 1 }}</td>
        </tr>
        @if(count($c['movements']) > 0)
        <tr>
            <td colspan="8" style="padding: 0; border: none; background: #fff;">
                <table class="invoices">
                    <tr style="background: #eff6ff;">
                        <td style="width:25%; font-weight:bold; color:#1e3a5f; font-size:8px;">{{ $g('الرصيد') }}</td>
                        <td style="width:15%; font-weight:bold; color:#1e3a5f; font-size:8px;">{{ $g('العمر') }}</td>
                        <td style="width:15%; font-weight:bold; color:#1e3a5f; font-size:8px;">{{ $g('المبلغ') }}</td>
                        <td style="width:18%; font-weight:bold; color:#1e3a5f; font-size:8px;">{{ $g('التاريخ') }}</td>
                        <td style="width:12%; font-weight:bold; color:#1e3a5f; font-size:8px;">{{ $g('النوع') }}</td>
                        <td style="width:15%; font-weight:bold; color:#1e3a5f; font-size:8px;">{{ $g('المرجع') }}</td>
                    </tr>
                    @foreach($c['movements'] as $m)
                    <tr>
                        <td class="num-cell">{{ $fmtN($m['balance']) }}</td>
                        <td class="{{ $m['days_old'] !== null && $m['days_old'] >= 90 ? 'over90' : ($m['days_old'] !== null && $m['days_old'] >= 30 ? 'warn' : '') }}" style="direction:ltr;">
                            {{ $m['days_old'] !== null ? $m['days_old'] . ' ' . $g('يوم') : '--' }}
                        </td>
                        <td class="num-cell" style="color: {{ $m['amount'] > 0 ? '#dc2626' : '#16a34a' }};">{{ ($m['amount'] > 0 ? '+' : '') . $fmtN($m['amount']) }}</td>
                        <td>{{ $m['date'] ? \Carbon\Carbon::parse($m['date'])->format('Y-m-d') : '--' }}</td>
                        <td style="color: {{ $typeColors[$m['type']] ?? '#334155' }}; font-weight:bold;">{{ $g($typeLabels[$m['type']] ?? $m['type']) }}</td>
                        <td class="inv-ref">{{ $m['ref'] }}</td>
                    </tr>
                    @endforeach
                </table>
            </td>
        </tr>
        @endif
    </tbody>
</table>
</div>
@endforeach

{{-- الإجمالي الكلي --}}
<table class="main" style="margin-top: 10px;">
    <thead>
        <tr>
            <th style="width:7%; text-align:center">{{ $labels['col_invoices'] }}</th>
            <th style="width:13%">{{ $labels['col_over90'] }}</th>
            <th style="width:13%">{{ $labels['col_60_90'] }}</th>
            <th style="width:13%">{{ $labels['col_30_60'] }}</th>
            <th style="width:13%">{{ $labels['col_current'] }}</th>
            <th style="width:14%">{{ $labels['col_total'] }}</th>
            <th style="width:22%">{{ $labels['col_supplier'] }}</th>
            <th style="width:5%; text-align:center">#</th>
        </tr>
    </thead>
    <tfoot>
        <tr>
            <td class="idx">{{ array_sum(array_map(fn($c) => count($c['movements']), $data)) }}</td>
            <td class="num over90-val">{{ $labels['total_over90'] }}</td>
            <td class="num">{{ number_format(array_sum(array_column($data, 'days_60_90')), 2) }}</td>
            <td class="num">{{ number_format(array_sum(array_column($data, 'days_30_60')), 2) }}</td>
            <td class="num">{{ number_format(array_sum(array_column($data, 'current')), 2) }}</td>
            <td class="num">{{ $labels['total_debt'] }}</td>
            <td style="text-align: right; color: #64748b; font-weight:bold; direction:rtl;">{{ $g('الإجمالي') }}</td>
            <td class="idx"></td>
        </tr>
    </tfoot>
</table>

<div class="footer">
    <div class="footer-r">{{ $labels['title'] }}</div>
    <div class="footer-l">{{ now()->format('Y-m-d  H:i') }}</div>
</div>

</body>
</html>
