<?php

namespace App\Http\Controllers;

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

        $latestYearRow = \Illuminate\Support\Facades\DB::selectOne("SELECT MAX(anio) as max_year FROM agente_cargos");
        return $latestYearRow && $latestYearRow->max_year ? (int)$latestYearRow->max_year : 2026;
    }
}
