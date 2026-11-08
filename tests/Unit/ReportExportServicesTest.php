<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Repositories\Contracts\ReportRepositoryInterface;
use App\Services\Reports\ReportExcelExportService;
use App\Services\Reports\ReportPdfExportService;

class ReportExportServicesTest extends TestCase
{
    public function test_it_resolves_export_services_from_container(): void
    {
        $excelService = app(ReportExcelExportService::class);
        $pdfService = app(ReportPdfExportService::class);

        $this->assertInstanceOf(ReportExcelExportService::class, $excelService);
        $this->assertInstanceOf(ReportPdfExportService::class, $pdfService);
    }

    public function test_report_repository_has_export_services_initialized(): void
    {
        $repo = app(ReportRepositoryInterface::class);

        $reflection = new \ReflectionClass($repo);
        $excelProp = $reflection->getProperty('excelExporter');
        $pdfProp = $reflection->getProperty('pdfExporter');
        $excelProp->setAccessible(true);
        $pdfProp->setAccessible(true);

        $this->assertInstanceOf(ReportExcelExportService::class, $excelProp->getValue($repo));
        $this->assertInstanceOf(ReportPdfExportService::class, $pdfProp->getValue($repo));
    }
}
