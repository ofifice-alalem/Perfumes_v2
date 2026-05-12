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

        .summary-tbl  { display: table; width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .summary-cell { display: table-cell; padding: 10px 12px; border: 1px solid #e2e8f0; border-top: 3px solid #0f172a; background: #f8fafc; vertical-align: top; }
        .summary-label { font-size: 8px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
        .summary-value { font-size: 15px; font-weight: bold; color: #0f172a; }

        .section-header { font-weight: bold; font-size: 11px; padding: 6px 10px; margin-top: 14px; margin-bottom: 2px; }
        .section-cr { background: #DC2626; color: #fff; }
        .section-pr { background: #D97706; color: #fff; }

        table.main { width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed; margin-bottom: 4px; }
        table.main thead tr { background: #f5f5f5; }
        table.main th { color: #0f172a; text-align: right; padding: 4px 6px; font-size: 9px; font-weight: bold; border: 1px solid #94a3b8; direction: rtl; unicode-bidi: bidi-override; }
        table.main td { padding: 3px 6px; font-size: 9px; color: #334155; text-align: right; border: 1px solid #e2e8f0; background: #fff; direction: rtl; unicode-bidi: bidi-override; }
        table.main tr.even td { background: #f8fafc; }
        table.main td.num { font-weight: bold; color: #0f172a; }
        table.main td.sub { font-size: 8px; color: #64748b; padding-right: 14px; }
        table.main tfoot td { background: #f1f5f9; font-weight: bold; font-size: 9px; padding: 4px 6px; border: 1px solid #94a3b8; border-top: 2px solid #0f172a; direction: rtl; }

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
            <div class="ph-sub">{{ $labels['label_date_from'] }} {{ $labels['date_from_val'] }} &mdash; {{ $labels['date_to_label'] }} {{ $labels['date_to_val'] }} &mdash; {{ $labels['generated_at'] }}</div>
        </div>
    </div>
</div>

{{-- Summary --}}
<div class="summary-tbl">
    <div class="summary-cell" style="border-top-color:#DC2626;">
        <div class="summary-label">{{ $labels['lbl_cr'] }}</div>
        <div class="summary-value" style="color:#DC2626;">{{ $labels['cr_total'] }}</div>
        <div style="font-size:8px; color:#64748b; margin-top:3px;">{{ $labels['cr_count'] }} {{ $g('مرتجع') }}</div>
    </div>
    <div class="summary-cell" style="border-right:none; border-top-color:#D97706;">
        <div class="summary-label">{{ $labels['lbl_pr'] }}</div>
        <div class="summary-value" style="color:#D97706;">{{ $labels['pr_total'] }}</div>
        <div style="font-size:8px; color:#64748b; margin-top:3px;">{{ $labels['pr_count'] }} {{ $g('مرتجع') }}</div>
    </div>
    <div class="summary-cell" style="border-right:none;">
        <div class="summary-label">{{ $labels['lbl_sales'] }}</div>
        <div class="summary-value">{{ $labels['sales_total'] }}</div>
    </div>
    <div class="summary-cell" style="border-right:none;">
        <div class="summary-label">{{ $labels['lbl_rate'] }}</div>
        <div class="summary-value" style="color:{{ $data['returnRate'] !== null && $data['returnRate'] > 10 ? '#DC2626' : ($data['returnRate'] !== null && $data['returnRate'] > 5 ? '#D97706' : '#16a34a') }};">
            {{ $labels['return_rate'] }}
        </div>
    </div>
</div>

{{-- مرتجعات العملاء --}}
<div class="section-header section-cr">{{ $labels['lbl_cr'] }}</div>
@if(count($data['customerMonthly']) === 0)
    <div style="padding:8px 10px; font-size:9px; color:#94a3b8; border:1px solid #e2e8f0;">{{ $g('لا توجد بيانات') }}</div>
@else
<table class="main">
    <thead><tr>
        <th style="width:40%">{{ $labels['col_month'] }}</th>
        <th style="width:20%">{{ $labels['col_count'] }}</th>
        <th style="width:40%">{{ $labels['col_total'] }}</th>
    </tr></thead>
    <tbody>
        @foreach($data['customerMonthly'] as $i => $m)
        <tr class="{{ $i % 2 === 0 ? '' : 'even' }}" style="background:{{ $i % 2 === 0 ? '#fff5f5' : '#fff' }};">
            <td style="font-weight:bold;">{{ $m['month'] }}</td>
            <td class="num">{{ $m['count'] }}</td>
            <td class="num" style="color:#DC2626;">{{ $fmtN($m['total']) }}</td>
        </tr>
        @foreach($m['days'] as $d)
        <tr>
            <td class="sub">{{ $d['date'] }}</td>
            <td class="num sub">{{ $d['count'] }}</td>
            <td class="num sub">{{ $fmtN($d['total']) }}</td>
        </tr>
        @endforeach
        @endforeach
    </tbody>
    <tfoot><tr>
        <td>{{ $g('الإجمالي') }}</td>
        <td class="num">{{ $data['customerReturnsCount'] }}</td>
        <td class="num" style="color:#DC2626;">{{ $labels['cr_total'] }}</td>
    </tr></tfoot>
</table>
@endif

{{-- مرتجعات الموردين --}}
<div class="section-header section-pr">{{ $labels['lbl_pr'] }}</div>
@if(count($data['supplierMonthly']) === 0)
    <div style="padding:8px 10px; font-size:9px; color:#94a3b8; border:1px solid #e2e8f0;">{{ $g('لا توجد بيانات') }}</div>
@else
<table class="main">
    <thead><tr>
        <th style="width:40%">{{ $labels['col_month'] }}</th>
        <th style="width:20%">{{ $labels['col_count'] }}</th>
        <th style="width:40%">{{ $labels['col_total'] }}</th>
    </tr></thead>
    <tbody>
        @foreach($data['supplierMonthly'] as $i => $m)
        <tr class="{{ $i % 2 === 0 ? '' : 'even' }}" style="background:{{ $i % 2 === 0 ? '#fffbeb' : '#fff' }};">
            <td style="font-weight:bold;">{{ $m['month'] }}</td>
            <td class="num">{{ $m['count'] }}</td>
            <td class="num" style="color:#D97706;">{{ $fmtN($m['total']) }}</td>
        </tr>
        @foreach($m['days'] as $d)
        <tr>
            <td class="sub">{{ $d['date'] }}</td>
            <td class="num sub">{{ $d['count'] }}</td>
            <td class="num sub">{{ $fmtN($d['total']) }}</td>
        </tr>
        @endforeach
        @endforeach
    </tbody>
    <tfoot><tr>
        <td>{{ $g('الإجمالي') }}</td>
        <td class="num">{{ $data['supplierReturnsCount'] }}</td>
        <td class="num" style="color:#D97706;">{{ $labels['pr_total'] }}</td>
    </tr></tfoot>
</table>
@endif

<div class="footer">
    <div class="footer-r">{{ $labels['title'] }}</div>
    <div class="footer-l">{{ now()->format('Y-m-d H:i') }}</div>
</div>

</body>
</html>
