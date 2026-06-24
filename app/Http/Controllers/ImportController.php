<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\ImportLog;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ImportController extends Controller
{
    public function index()
    {
        return Inertia::render('Importar');
    }

    public function history()
    {
        $history = ImportLog::with('user')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($history);
    }

    public function stats()
    {
        $totalAgentes = DB::table('agentes')->count();
        $totalEstablecimientos = DB::table('establecimientos')->count();
        $totalEdificios = DB::table('edificios')->count();
        $totalModalidades = DB::table('modalidades')->count();

        $cargosByYear = DB::table('agente_cargos')
            ->select('anio', DB::raw('count(*) as count'))
            ->groupBy('anio')
            ->orderBy('anio', 'desc')
            ->get();

        $designacionesByYear = DB::table('designaciones')
            ->select('anio', DB::raw('count(*) as count'))
            ->groupBy('anio')
            ->orderBy('anio', 'desc')
            ->get();

        $licenciasByYear = DB::table('licencias')
            ->select('anio', DB::raw('count(*) as count'))
            ->groupBy('anio')
            ->orderBy('anio', 'desc')
            ->get();

        return response()->json([
            'total_agentes' => $totalAgentes,
            'total_establecimientos' => $totalEstablecimientos,
            'total_edificios' => $totalEdificios,
            'total_modalidades' => $totalModalidades,
            'cargos_by_year' => $cargosByYear,
            'designaciones_by_year' => $designacionesByYear,
            'licencias_by_year' => $licenciasByYear,
        ]);
    }

    public function csvStatus()
    {
        $baseDir = base_path('datos_csv');
        $agenteFile = $baseDir . '/agentes.csv';
        $licenciaFile = $baseDir . '/licencias.csv';

        $files = [];

        // Agentes
        $agenteExists = file_exists($agenteFile);
        $files[] = [
            'name' => 'agentes.csv',
            'type' => 'agentes',
            'exists' => $agenteExists,
            'size' => $agenteExists ? round(filesize($agenteFile) / 1024 / 1024, 2) . ' MB' : 'N/A',
            'modified_at' => $agenteExists ? date('Y-m-d H:i:s', filemtime($agenteFile)) : 'N/A',
            'db_records' => $agenteExists ? DB::table('agente_cargos')->count() : 0,
            'description' => 'Padrón unificado de agentes, cargos activos y designaciones (2026)',
        ];

        // Licencias
        $licenciaExists = file_exists($licenciaFile);
        $files[] = [
            'name' => 'licencias.csv',
            'type' => 'licencias',
            'exists' => $licenciaExists,
            'size' => $licenciaExists ? round(filesize($licenciaFile) / 1024 / 1024, 2) . ' MB' : 'N/A',
            'modified_at' => $licenciaExists ? date('Y-m-d H:i:s', filemtime($licenciaFile)) : 'N/A',
            'db_records' => $licenciaExists ? DB::table('licencias')->count() : 0,
            'description' => 'Histórico consolidado de licencias médicas y administrativas (2020-2026)',
        ];

        return response()->json($files);
    }

    public function apiStatus()
    {
        return response()->json([
            [
                'name' => 'SIGE API - Padrón de Agentes',
                'endpoint' => 'https://api.sige.gob.ar/v1/agentes',
                'status' => 'offline',
                'description' => 'Sincronización del personal y legajos del sistema de gestión escolar.',
                'last_check' => now()->toIso8601String(),
                'method' => 'GET',
            ],
            [
                'name' => 'SIGE API - Designaciones y Cargos',
                'endpoint' => 'https://api.sige.gob.ar/v1/designaciones',
                'status' => 'offline',
                'description' => 'Consulta de designaciones activas y horas cátedra de docentes.',
                'last_check' => now()->toIso8601String(),
                'method' => 'GET',
            ],
            [
                'name' => 'SIGE API - Licencias Médicas',
                'endpoint' => 'https://api.sige.gob.ar/v1/licencias',
                'status' => 'offline',
                'description' => 'Servicio de consulta de novedades y licencias del personal.',
                'last_check' => now()->toIso8601String(),
                'method' => 'GET',
            ],
        ]);
    }
}
