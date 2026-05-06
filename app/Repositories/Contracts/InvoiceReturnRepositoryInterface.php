<?php

namespace App\Repositories\Contracts;

interface InvoiceReturnRepositoryInterface
{
    public function paginated(int $perPage = 5);
    public function findWithRelations(int $id);
}
