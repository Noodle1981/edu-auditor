<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DesignacionController extends Controller
{
    public function index()
    {
        return Inertia::render('Designaciones');
    }

    public function search(Request $request)
    {
        try {
            $search = trim($request->input('search', ''));
            $cue = trim($request->input('cue', ''));
            $turno = strtoupper(trim($request->input('turno', '')));
            $revista = strtoupper(trim($request->input('revista', '')));

            $page = (int)$request->input('page', 1);
            $limit = (int)$request->input('limit', 20);

            if ($page < 1) $page = 1;
            if ($limit < 1 || $limit > 100) $limit = 20;
            $offset = ($page - 1) * $limit;

            $year = (int)$request->input('year');
            if (!$year) {
                $latestYearRow = DB::selectOne("SELECT MAX(anio) as max_year FROM designaciones");
                $year = $latestYearRow && $latestYearRow->max_year ? (int)$latestYearRow->max_year : 2026;
            }

            $bindings = [$year];
            $whereClause = "WHERE anio = ?";

            if ($search !== '') {
                $whereClause .= " AND (dni LIKE ? OR nombre_agente LIKE ? OR legajo LIKE ?)";
                $searchLike = "%{$search}%";
                array_push($bindings, $searchLike, $searchLike, $searchLike);
            }

            if ($cue !== '') {
                if (ctype_digit($cue)) {
                    $whereClause .= " AND cue = ?";
                    $bindings[] = (int)$cue;
                }
            }

            if ($turno !== '') {
                $whereClause .= " AND turno = ?";
                $bindings[] = $turno;
            }

            if ($revista !== '') {
                $whereClause .= " AND situacion_revista = ?";
                $bindings[] = $revista;
            }

            // Get total
            $countQuery = "SELECT COUNT(*) as total FROM designaciones {$whereClause}";
            $countResult = DB::selectOne($countQuery, $bindings);
            $total = $countResult ? (int)$countResult->total : 0;

            // Get rows
            $dataQuery = "SELECT * FROM designaciones {$whereClause} ORDER BY nombre_agente ASC LIMIT ? OFFSET ?";
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
