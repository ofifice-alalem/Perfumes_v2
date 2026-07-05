<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>{{ $labels['title'] }}</title>
    <style>
        @font-face { font-family: 'Cairo'; src: url('{{ public_path("fonts/Cairo-Regular.ttf") }}') format('truetype'); font-weight: normal; }
        @font-face { font-family: 'Cairo'; src: url('{{ public_path("fonts/Cairo-Bold.ttf") }}') format('truetype'); font-weight: bold; }
        @page { size: A4 portrait; margin: 20px 28px; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Cairo', 'DejaVu Sans', sans-serif; }
        body { font-size: 10px; color: #1e293b; direction: rtl; background: #fff; margin-top: 75px; }

        #page-header { position: fixed; top: -20px; left: 0; right: 0; background: #fff; border-bottom: 2px solid #0f172a; padding: 8px 28px; }
        #page-header .ph-tbl  { display: table; width: 100%; }
        #page-header .ph-r    { display: table-cell; vertical-align: middle; text-align: right; }
        #page-header .ph-l    { display: table-cell; vertical-align: middle; text-align: left; width: 90px; }
        #page-header .ph-title { font-size: 13px; font-weight: bold; color: #0f172a; }
        #page-header .ph-sub   { font-size: 8.5px; color: #64748b; margin-top: 2px; }

        .summary-tbl  { display: table; width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .summary-cell { display: table-cell; width: 50%; padding: 10px 12px; border: 1px solid #e2e8f0; border-top: 3px solid #0f172a; background: #f8fafc; vertical-align: top; text-align: center; }
        .summary-label { font-size: 10px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
        .summary-value { font-size: 20px; font-weight: bold; color: #0f172a; }

        table.main { width: 100%; border-collapse: collapse; direction: ltr; table-layout: fixed; }
        table.main thead tr { background: #dce4ee; }
        table.main th { color: #0f172a; text-align: right; padding: 7px 6px; font-size: 11px; font-weight: bold; border: 1px solid #64748b; }
        table.main td { padding: 6px 6px; font-size: 11px; color: #334155; text-align: right; border: 1px solid #94a3b8; background: #fff; }
        table.main tr.row-even td { background: #f8fafc; }
        table.main td.num  { font-weight: bold; color: #0f172a; }
        table.main td.idx  { color: #64748b; font-size: 11px; text-align: center; }
        table.main tfoot td { background: #f1f5f9; font-weight: bold; font-size: 11px; padding: 7px 6px; border: 1px solid #94a3b8; border-top: 2px solid #0f172a; }
        
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
        <div style="font-size: 22px; font-weight: bold; color: #0f172a;">{{ $labels['title'] }}</div>
    </div>

    <table style="width: 80%; border-collapse: collapse; direction: rtl; margin: 0 auto; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td colspan="2" style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none;">&#x2014; {{ $g('معلومات الفلتر') }} &#x2014;</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a;">{{ $dateFrom ?: $g('بداية الشهر') }}</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none; text-align: left; width: 35%;">{{ $g('من تاريخ') }}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a;">{{ $dateTo ?: $g('نهاية الشهر') }}</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none; text-align: left; width: 35%;">{{ $g('إلى تاريخ') }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a; line-height: 1.5;">{{ !empty($productNames) ? $g(implode('، ', $productNames)) : $g('الكل') }}</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none; text-align: left;">{{ $g('المنتجات المشمولة في الحساب') }}</td>
        </tr>
    </table>

    <table style="width: 80%; border-collapse: collapse; direction: rtl; margin: 12px auto 0; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td colspan="2" style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none;">&#x2014; {{ $g('ملخص الأرباح') }} &#x2014;</td>
        </tr>
        <tr>
            <td style="padding: 14px 6px; text-align: center; border-left: 2px solid #0f172a; background: #f8fafc; width: 50%;">
                <div style="font-size: 8px; color: #64748b; font-weight: bold; margin-bottom: 4px;">{{ $g('إجمالي الربح') }}</div>
                <div style="font-size: 18px; font-weight: bold; color: #16a34a;">{{ $fmtN($data['total_profit']) }}</div>
            </td>
            <td style="padding: 14px 6px; text-align: center; background: #f8fafc; width: 50%;">
                <div style="font-size: 8px; color: #64748b; font-weight: bold; margin-bottom: 4px;">{{ $g('إجمالي صافي المبيعات') }}</div>
                <div style="font-size: 18px; font-weight: bold; color: #0f172a;">{{ $fmtN(array_sum(array_column($data['monthly'], 'net_sales'))) }}</div>
            </td>
        </tr>
    </table>
    <div style="margin-top: 16px; font-size: 9px; color: #94a3b8;">{{ $labels['generated_at'] }}</div>
</div>

<div class="summary-tbl">
    <div class="summary-cell" style="border-left: none;">
        <div class="summary-label">{{ $g('إجمالي صافي المبيعات') }}</div>
        <div class="summary-value" style="color: #0f172a;">{{ $fmtN(array_sum(array_column($data['monthly'], 'net_sales'))) }}</div>
    </div>
    <div class="summary-cell">
        <div class="summary-label">{{ $g('إجمالي الربح') }}</div>
        <div class="summary-value" style="color: #16a34a;">{{ $fmtN($data['total_profit']) }}</div>
    </div>
</div>

<table class="main">
    <thead>
        <tr>
            <th style="width:20%">{{ $g('الربح') }}</th>
            <th style="width:20%">{{ $g('صافي البيع') }}</th>
            <th style="width:15%">{{ $g('المرتجعات') }}</th>
            <th style="width:15%">{{ $g('المبيعات') }}</th>
            <th style="width:15%">{{ $g('الشهر') }}</th>
            <th style="width:10%">{{ $g('التاريخ') }}</th>
            <th style="width:5%; text-align:center">#</th>
        </tr>
    </thead>
    <tbody>
        @php
            $i = 0;
        @endphp
        @foreach($data['monthly'] as $m)
            @foreach($m['days'] as $d)
            <tr class="{{ $i % 2 !== 0 ? 'row-even' : '' }}">
                <td class="num" style="color: {{ $d['profit'] >= 0 ? '#16a34a' : '#dc2626' }}">{{ $fmtN($d['profit']) }}</td>
                <td class="num">{{ $fmtN($d['net_sales']) }}</td>
                <td class="num">{{ $fmtN($d['returns']) }}</td>
                <td class="num">{{ $fmtN($d['sales']) }}</td>
                <td style="font-weight: bold; color: #0f172a;">{{ $m['month'] }}</td>
                <td style="font-weight: bold; color: #0f172a;">{{ $d['date'] }}</td>
                <td class="idx">{{ $i + 1 }}</td>
            </tr>
            @php $i++; @endphp
            @endforeach
        @endforeach
    </tbody>
    <tfoot>
        <tr>
            <td style="color: #16a34a;">{{ $fmtN($data['total_profit']) }}</td>
            <td>{{ $fmtN(array_sum(array_column($data['monthly'], 'net_sales'))) }}</td>
            <td></td>
            <td></td>
            <td></td>
            <td style="text-align: right">{{ $g('الإجمالي') }}</td>
            <td></td>
        </tr>
    </tfoot>
</table>

<div class="footer">
    <div class="footer-r">{{ $g('تم إنشاء هذا التقرير آلياً من النظام') }}</div>
    <div class="footer-l">Page 1 of 1</div>
</div>

</body>
</html>
