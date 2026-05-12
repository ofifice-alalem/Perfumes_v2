<?php

namespace App\Observers;

use App\Services\RolloverService;

class PeriodObserver
{
    public function __construct(private RolloverService $rollover) {}

    public function creating(object $model): void
    {
        if (! isset($model->period_id) || $model->period_id === null) {
            $model->period_id = $this->rollover->getCurrentPeriodId();
        }
    }
}
