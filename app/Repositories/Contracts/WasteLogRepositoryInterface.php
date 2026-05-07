<?php

namespace App\Repositories\Contracts;

use Prettus\Repository\Contracts\Repository;

interface WasteLogRepositoryInterface extends Repository
{
    public function paginated(int $perPage = 20);
    public function findWithRelations(int $id);
}
