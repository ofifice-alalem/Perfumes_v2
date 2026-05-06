<?php

namespace App\Repositories\Contracts;

interface InvoiceRepositoryInterface
{
    public function paginated(int $perPage = 5);
    public function findWithRelations(int $id);
}
