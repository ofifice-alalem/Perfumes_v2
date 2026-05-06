<?php

namespace App\Repositories\Contracts;

interface PaymentRepositoryInterface
{
    public function paginated(int $perPage = 5);
}
