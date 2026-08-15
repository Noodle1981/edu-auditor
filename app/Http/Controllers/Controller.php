<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

abstract class Controller
{
    /**
     * Resolves the active year for queries, falling back to the latest available year in DB.
     */
    protected function getDefaultYear(?int $requestedYear = null): int
    {
        if ($requestedYear) {
            return $requestedYear;
        }

        $latestPeriod = DB::table('nominas_sueldos')->orderBy('periodo', 'desc')->value('periodo');
        if ($latestPeriod) {
            return (int) substr($latestPeriod, 0, 4);
        }

        return (int) date('Y');
    }
}
