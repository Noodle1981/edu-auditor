<?php

namespace App\Http\Controllers\Admin;

use App\Actions\StoreEdificioAction;
use App\Actions\UpdateEdificioAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreEdificioRequest;
use App\Http\Requests\Admin\UpdateEdificioRequest;
use App\Models\Edificio;
use App\Services\ActivityLogService;
use App\Services\EdificioQueryService;
use App\Services\ExcelExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class EdificioController extends Controller
{
    protected EdificioQueryService $queryService;

    protected ExcelExportService $exportService;

    public function __construct(EdificioQueryService $queryService, ExcelExportService $exportService)
    {
        $this->queryService = $queryService;
        $this->exportService = $exportService;
    }

    /**
     * Display a listing of buildings.
     */
    public function index(Request $request): Response
    {
        $edificios = $this->queryService->getFilteredQuery($request)
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString();

        $options = Cache::remember('edificios_options_react', 3600, function () {
            return $this->queryService->getFilterOptions();
        });

        return Inertia::render('Admin/Edificios/Index', [
            'edificios' => $edificios,
            'filters' => $request->only(['search', 'search_cui', 'zona_departamento', 'localidad', 'ambito']),
            'options' => $options,
        ]);
    }

    /**
     * Store a newly created building in storage.
     */
    public function store(StoreEdificioRequest $request, StoreEdificioAction $action)
    {
        $action->execute($request->validated());

        return back()->with('success', 'Edificio creado correctamente.');
    }

    /**
     * Update the specified building in storage.
     */
    public function update(UpdateEdificioRequest $request, int $id, UpdateEdificioAction $action)
    {
        $edificio = Edificio::findOrFail($id);

        $action->execute($edificio, $request->validated());

        return back()->with('success', 'Edificio actualizado correctamente.');
    }

    /**
     * Remove the specified building from storage (soft delete).
     */
    public function destroy(int $id, ActivityLogService $activityLogger)
    {
        $edificio = Edificio::findOrFail($id);

        // Impedir el borrado si tiene escuelas activas asociadas
        if ($edificio->establecimientos()->count() > 0) {
            return back()->withErrors(['error' => 'No se puede eliminar un edificio que alberga establecimientos activos. Relocalice o elimine las escuelas primero.']);
        }

        $edificio->delete();

        $activityLogger->logDelete($edificio, 'Baja del edificio/inmueble CUI: '.$edificio->cui);

        return back()->with('success', 'Edificio enviado a la papelera correctamente.');
    }

    /**
     * Export buildings to Excel.
     */
    public function export(Request $request)
    {
        $edificios = $this->queryService->getFilteredQuery($request)->get();

        $headers = ['CUI', 'CALLE', 'N° PUERTA', 'LOCALIDAD', 'ZONA/DEPARTAMENTO', 'AMBITO'];
        [$spreadsheet, $sheet] = $this->exportService->setupSheet('Edificios', $headers);

        $row = 2;
        foreach ($edificios as $edificio) {
            $ambito = $edificio->establecimientos->flatMap->modalidades->first()?->ambito ?? 'S/D';

            $sheet->setCellValue('A'.$row, $edificio->cui);
            $sheet->setCellValue('B'.$row, $edificio->calle);
            $sheet->setCellValue('C'.$row, $edificio->numero_puerta);
            $sheet->setCellValue('D'.$row, $edificio->localidad);
            $sheet->setCellValue('E'.$row, $edificio->zona_departamento);
            $sheet->setCellValue('F'.$row, $ambito);
            $row++;
        }

        $this->exportService->autoSizeColumns($sheet, count($headers));

        return $this->exportService->download($spreadsheet, 'edificios_'.date('Y-m-d').'.xlsx');
    }
}
