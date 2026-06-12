<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\ImportLog;
use Inertia\Inertia;

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

    public function upload(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:csv,txt|max:51200',
                'type' => 'required|string|in:agentes,designaciones,licencias',
            ]);

            $file = $request->file('file');
            $type = $request->input('type');

            $destNameMap = [
                'agentes' => 'reporte_agentes.csv',
                'designaciones' => 'Designaciones.csv',
                'licencias' => 'Licencia.csv',
            ];

            $destName = $destNameMap[$type];

            // Move file to project root (base_path)
            $file->move(base_path(), $destName);

            // Create log record
            $log = ImportLog::create([
                'filename' => $file->getClientOriginalName(),
                'status' => 'pending',
                'user_id' => Auth::id(),
            ]);

            // Launch command in the background (asynchronous, cross-platform)
            $process = new \Symfony\Component\Process\Process(['php', base_path('artisan'), 'app:run-import', $type, (string)$log->id]);
            $process->disableOutput();
            $process->start();

            return response()->json([
                'success' => true,
                'message' => 'Importación iniciada en segundo plano.',
                'log' => $log
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
