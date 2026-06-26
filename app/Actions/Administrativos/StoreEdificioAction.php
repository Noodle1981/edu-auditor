<?php

namespace App\Actions;

use App\Models\Edificio;
use App\Services\ActivityLogService;

class StoreEdificioAction
{
    protected $activityLogger;

    public function __construct(ActivityLogService $activityLogger)
    {
        $this->activityLogger = $activityLogger;
    }

    public function execute(array $data): Edificio
    {
        $edificio = Edificio::create($data);

        $this->activityLogger->logUpdate($edificio, "Creación de Edificio", [
            'after' => $data,
        ]);

        return $edificio;
    }
}
