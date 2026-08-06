<?php

namespace App\Http\Controllers\Admin;

use App\Actions\StoreModalidadAction;
use App\Actions\UpdateModalidadAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreModalidadRequest;
use App\Http\Requests\Admin\UpdateModalidadRequest;
use App\Models\Modalidad;
use App\Services\ActivityLogService;
use App\Services\ExcelExportService;
use App\Services\ModalidadQueryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdministrativoController extends Controller
{
    protected ModalidadQueryService $queryService;
    protected ExcelExportService $exportService;

    public function __construct(ModalidadQueryService $queryService, ExcelExportService $exportService)
    {
        $this->queryService = $queryService;
        $this->exportService = $exportService;
    }

    /**
     * Display a listing of administrative offices.
     */
    public function index(Request $request): Response
    {
        $modalidades = $this->queryService->getFilteredQuery($request)
            ->where('direccion_area', 'ADMINISTRACIÓN')
            ->latest()
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString();

        $options = $this->queryService->getFilterOptions();
        $options['areas'] = ['ADMINISTRACIÓN'];
        $options['niveles'] = ['JUNTA DE CLASIFICACIÓN', 'SUPERVISIÓN', 'ADMINISTRATIVO'];
        $options['ambitos'] = ['PUBLICO', 'PRIVADO'];

        return Inertia::render('Admin/Oficinas/Index', [
            'modalidades' => $modalidades,
            'filters' => $request->all(),
            'options' => $options,
            'nombresEdificios' => $this->queryService->getBuildingNamesMap(),
        ]);
    }

    /**
     * Store a new administrative office.
     */
    public function store(StoreModalidadRequest $request, StoreModalidadAction $action, ActivityLogService $activityLogger)
    {
        $modalidad = $action->execute($request->validated());

        $activityLogger->logUpdate($modalidad, 'Creación de Repartición Administrativa', ['after' => $request->validated()]);

        return back()->with('success', 'Repartición administrativa creada correctamente.');
    }

    /**
     * Update an administrative office.
     */
    public function update(UpdateModalidadRequest $request, int $id, UpdateModalidadAction $action)
    {
        $modalidad = Modalidad::with('establecimiento.edificio')->findOrFail($id);

        $action->execute($modalidad, $request->validated());

        return back()->with('success', 'Datos actualizados correctamente.');
    }

    /**
     * Remove an administrative office.
     */
    public function destroy(int $id, ActivityLogService $activityLogger)
    {
        DB::transaction(function () use ($id, $activityLogger) {
            $modalidad = Modalidad::findOrFail($id);
            $establecimiento = $modalidad->establecimiento;

            // 1. Cambiar estado para bitácora
            $modalidad->cambiarEstado('ELIMINADO', 'Baja por administrativo', auth()->id());

            // 2. Soft-delete
            $modalidad->delete();

            // 3. Baja de establecimiento si no quedan modalidades
            if ($establecimiento && $establecimiento->modalidades()->count() === 0) {
                $establecimiento->delete();
                $activityLogger->logDelete($establecimiento, 'Baja atómica de repartición por quedarse sin modalidades: CUE '.$establecimiento->cue);
            } else {
                $activityLogger->logDelete($modalidad, 'Baja de modalidad administrativa individual: CUE '.($establecimiento->cue ?? 'S/D'));
            }
        });

        return back()->with('success', 'Repartición administrativa enviada a la papelera correctamente.');
    }

    /**
     * Export to Excel.
     */
    public function export(Request $request)
    {
        $data = $this->queryService->getFilteredQuery($request)
            ->where('direccion_area', 'ADMINISTRACIÓN')
            ->get();

        $headers = ['CUE', 'CUI', 'NOMBRE', 'CATEGORÍA', 'ÁREA', 'ESTADO'];
        [$spreadsheet, $sheet] = $this->exportService->setupSheet('Oficinas Centrales', $headers);

        $row = 2;
        foreach ($data as $item) {
            $sheet->setCellValue('A'.$row, $item->establecimiento->cue);
            $sheet->setCellValue('B'.$row, $item->establecimiento->edificio->cui);
            $sheet->setCellValue('C'.$row, $item->establecimiento->nombre);
            $sheet->setCellValue('D'.$row, $item->nivel_educativo);
            $sheet->setCellValue('E'.$row, $item->direccion_area);
            $sheet->setCellValue('F'.$row, $item->validado ? 'VALIDADO' : 'PENDIENTE');
            $row++;
        }

        $this->exportService->autoSizeColumns($sheet, count($headers));

        return $this->exportService->download($spreadsheet, 'oficinas_centrales.xlsx');
    }
}
