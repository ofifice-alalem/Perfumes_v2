<?php

namespace App\Http\Controllers;

use App\Models\InventoryLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use PDF;

class InventoryLogController extends Controller
{
    public function index(): Response
    {
        $logs = InventoryLog::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('InventoryLogs/Index', [
            'logs' => $logs,
        ]);
    }

    public function show(int $id): Response
    {
        $log = InventoryLog::with(['user', 'items.product.category'])->findOrFail($id);

        return Inertia::render('InventoryLogs/Show', [
            'log' => $log,
        ]);
    }

    public function pdf(int $id)
    {
        $log = InventoryLog::with(['user', 'items.product.category'])->findOrFail($id);

        $arabic = new \ArPHP\I18N\Arabic();
        $g = fn(?string $text) => $text ? $arabic->utf8Glyphs($text) : '';

        $labels = [
            'title' => $g('تقرير إقفال الجرد #' . $log->id),
            'generated_at' => '<span dir="ltr">' . $log->created_at->format('Y-m-d H:i') . '</span>',
            'date_raw' => $log->created_at->format('Y-m-d H:i'),
            'total_items' => $log->items->count(),
            'filter_info' => $g('معلومات التقرير'),
            'label_user'  => $g('المسؤول عن الجرد'),
            'label_date'  => $g('تاريخ الإقفال'),
            'label_notes' => $g('ملاحظات الجرد'),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.inventory-log-pdf', [
            'log'    => $log,
            'labels' => $labels,
            'g'      => $g,
            'fmtN'   => fn($n) => $n % 1 == 0 ? number_format($n, 0) : number_format($n, 2),
        ])
        ->setPaper('A4')
        ->setOption('isHtml5ParserEnabled', true)
        ->setOption('isFontSubsettingEnabled', true);

        return $pdf->stream('inventory_log_' . $log->id . '.pdf');
    }
}
