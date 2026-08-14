<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Repositories\ReportRepository;
use App\Repositories\Contracts\ReportRepositoryInterface;

class ReportRepositoryTest extends TestCase
{
    private ReportRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(ReportRepositoryInterface::class);
    }

    public function test_it_resolves_report_repository_from_container(): void
    {
        $this->assertInstanceOf(ReportRepository::class, $this->repository);
    }

    public function test_customer_aging_returns_array_structure(): void
    {
        $result = $this->repository->customerAging(null, null, null, false, 30);
        $this->assertIsArray($result);
    }

    public function test_supplier_aging_returns_array_structure(): void
    {
        $result = $this->repository->supplierAging(null, null, null, false, 30);
        $this->assertIsArray($result);
    }
}
