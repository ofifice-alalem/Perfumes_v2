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

        .diff-pos { color: #10b981; font-weight: bold; direction: ltr; display: inline-block; }
        .diff-neg { color: #ef4444; font-weight: bold; direction: ltr; display: inline-block; }
        .diff-zero { color: #94a3b8; }

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
            <div class="ph-title">{{ $labels['title'] ?? '' }}</div>
            <div class="ph-sub">{{ $g('بواسطة: ' . ($log->user->name ?? 'غير محدد')) }} | {{ $g('تاريخ الجرد: ') }} <span dir="ltr" style="font-family: sans-serif;">{{ $log->created_at->format('Y-m-d H:i') }}</span></div>
        </div>
    </div>
</div>

{{-- Cover Page --}}
<div style="page-break-after: always; padding: 20px 40px; text-align: center;">
    <div style="margin-bottom: 20px;">
        <img src="{{ public_path('images/logo.jpg') }}" style="max-height: 300px; max-width: 550px;">
    </div>

    <div style="border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; width: 100%;">
        <div style="font-size: 22px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">{{ $labels['title'] }}</div>
        <div style="font-size: 13px; color: #64748b;">{{ $g('ملخص ومقارنة المخزون') }}</div>
    </div>

    <table style="width: 80%; border-collapse: collapse; direction: rtl; margin: 0 auto; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td colspan="2" style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none; letter-spacing: 1px;">&#x2014; {{ $g('معلومات التقرير') }} &#x2014;</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a; text-align: right;">{{ $g($log->user->name ?? 'غير محدد') }}</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none; text-align: left; width: 35%;">{{ $g('المسؤول عن الجرد') }}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a; text-align: right;">
                <span dir="ltr" style="font-family: sans-serif;">{{ $log->created_at->format('Y-m-d H:i') }}</span>
            </td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none; text-align: left;">{{ $g('تاريخ الإقفال') }}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-size: 14px; font-weight: bold; color: #0f172a; border: none; border-right: 2px solid #0f172a; text-align: right;">{{ $g($log->notes ?: 'لا توجد ملاحظات') }}</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #64748b; border: none; text-align: left;">{{ $g('ملاحظات الجرد') }}</td>
        </tr>
    </table>

    <table style="width: 80%; border-collapse: collapse; direction: rtl; margin: 12px auto 0; border: 2px solid #0f172a;">
        <tr style="background: #f8fafc; border-bottom: 2px solid #0f172a;">
            <td style="padding: 8px 12px; font-size: 10px; font-weight: bold; color: #64748b; text-align: center; border: none; letter-spacing: 1px;">&#x2014; {{ $g('إجمالي المنتجات المجرودة') }} &#x2014;</td>
        </tr>
        <tr>
            <td style="padding: 16px 8px; text-align: center; background: #f8fafc;">
                <div style="font-size: 20px; font-weight: bold; color: #0f172a;">{{ $labels['total_items'] ?? '0' }}</div>
            </td>
        </tr>
    </table>

    <div style="margin-top: 16px; font-size: 9px; color: #94a3b8;"><span dir="ltr" style="font-family: sans-serif;">{{ $log->created_at->format('Y-m-d H:i') }}</span></div>
</div>

<table class="main">
    <thead>
        <tr>
            <th style="width:30%">{{ $g('السبب') }}</th>
            <th style="width:10%">{{ $g('الفارق') }}</th>
            <th style="width:10%">{{ $g('الفعلي') }}</th>
            <th style="width:10%">{{ $g('النظامي') }}</th>
            <th style="width:13%">{{ $g('التصنيف') }}</th>
            <th>{{ $g('المنتج') }}</th>
            <th style="width:4%; text-align:center">#</th>
        </tr>
    </thead>
    <tbody>
        @foreach($log->items as $i => $item)
        <tr class="{{ $i % 2 !== 0 ? 'row-even' : '' }}">
            <td>
                @if($item->difference < 0)
                    @switch($item->reason)
                        @case('broken') {{ $g('كسر') }} @break
                        @case('spilled') {{ $g('انسكاب') }} @break
                        @case('expired') {{ $g('منتهي الصلاحية') }} @break
                        @case('lost') {{ $g('مفقود') }} @break
                        @case('other') {{ $g('أخرى') }} @break
                        @default {{ $g($item->reason) }}
                    @endswitch
                @endif
            </td>
            <td>
                @if($item->difference > 0)
                    <span class="diff-pos">+{{ $fmtN($item->difference) }}</span>
                @elseif($item->difference < 0)
                    <span class="diff-neg">{{ $fmtN($item->difference) }}</span>
                @else
                    <span class="diff-zero">{{ $g('مطابق') }}</span>
                @endif
            </td>
            <td class="num">{{ $fmtN($item->actual_stock) }}</td>
            <td class="num">{{ $fmtN($item->system_stock) }}</td>
            <td>{{ $g($item->product->category->name ?? 'غير محدد') }}</td>
            <td style="font-weight: bold; color: #0f172a;">{{ $g($item->product->name ?? 'غير محدد') }}</td>
            <td class="idx">{{ $i + 1 }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<div class="footer">
    <div class="footer-r">{{ $g('تقرير الجرد') }}</div>
    <div class="footer-l"><span dir="ltr" style="font-family: sans-serif;">{{ now()->format('Y-m-d H:i') }}</span></div>
</div>

</body>
</html>
