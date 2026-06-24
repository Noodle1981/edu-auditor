<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class LicenciaController extends Controller
{
    public function index()
    {
        return Inertia::render('Licencias');
    }

    public function search(Request $request)
    {
        try {
            $search = trim($request->input('search', ''));
            $tipo = trim($request->input('tipo', ''));
            $diasMin = trim($request->input('dias_min', ''));
            $diasMax = trim($request->input('dias_max', ''));

            $page = (int)$request->input('page', 1);
            $limit = (int)$request->input('limit', 20);

            if ($page < 1) $page = 1;
            if ($limit < 1 || $limit > 100) $limit = 20;
            $offset = ($page - 1) * $limit;

            $year = (int)$request->input('year');
            if (!$year) {
                $latestYearRow = DB::selectOne("SELECT MAX(anio) as max_year FROM licencias");
                $year = $latestYearRow && $latestYearRow->max_year ? (int)$latestYearRow->max_year : 2026;
            }

            $bindings = [$year];
            $whereClause = "WHERE anio = ?";

            if ($search !== '') {
                $whereClause .= " AND (dni LIKE ? OR nombre_agente LIKE ? OR documento_respaldo LIKE ?)";
                $searchLike = "%{$search}%";
                array_push($bindings, $searchLike, $searchLike, $searchLike);
            }

            if ($tipo !== '') {
                $whereClause .= " AND tipo_licencia = ?";
                $bindings[] = $tipo;
            }

            if ($diasMin !== '') {
                if (ctype_digit($diasMin)) {
                    $whereClause .= " AND dias >= ?";
                    $bindings[] = (int)$diasMin;
                }
            }

            if ($diasMax !== '') {
                if (ctype_digit($diasMax)) {
                    $whereClause .= " AND dias <= ?";
                    $bindings[] = (int)$diasMax;
                }
            }

            // Get total
            $countQuery = "SELECT COUNT(*) as total FROM licencias {$whereClause}";
            $countResult = DB::selectOne($countQuery, $bindings);
            $total = $countResult ? (int)$countResult->total : 0;

            // Get rows
            $dataQuery = "SELECT * FROM licencias {$whereClause} ORDER BY id DESC LIMIT ? OFFSET ?";
            $dataBindings = array_merge($bindings, [$limit, $offset]);
            $rows = DB::select($dataQuery, $dataBindings);

            return response()->json([
                'data' => $rows,
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($total / $limit)
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
