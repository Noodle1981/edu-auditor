<?php

namespace App\Http\Controllers\Admin;

use App\Actions\StoreModalidadAction;
use App\Actions\UpdateModalidadAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreModalidadRequest;
use App\Http\Requests\Admin\UpdateInstrumentosRequest;
use App\Http\Requests\Admin\UpdateModalidadRequest;
use App\Models\Edificio;
use App\Models\Establecimiento;
use App\Models\Modalidad;
use App\Services\ActivityLogService;
use App\Services\ExcelExportService;
use App\Services\ModalidadQueryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ModalidadController extends Controller
{
    protected ModalidadQueryService $queryService;

    protected ExcelExportService $exportService;

    public function __construct(ModalidadQueryService $queryService, ExcelExportService $exportService)
    {
        $this->queryService = $queryService;
        $this->exportService = $exportService;
    }

    /**
     * Display a listing of modalities (Establecimientos in UI).
     */
    public function index(Request $request): Response
    {
        $modalidades = $this->queryService->getFilteredQuery($request)
            ->latest()
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString();

        $options = Cache::remember('modalidades_options_react_v2', 3600, function () {
            return $this->queryService->getFilterOptions();
        });

        return Inertia::render('Admin/Establecimientos/Index', [
            'modalidades' => $modalidades,
            'filters' => $request->all(),
            'options' => $options,
            'nombresEdificios' => $this->queryService->getBuildingNamesMap(),
        ]);
    }

    /**
     * Store a new modality.
     */
    public function store(StoreModalidadRequest $request, StoreModalidadAction $action, ActivityLogService $activityLogger)
    {
        $modalidad = $action->execute($request->validated());

        $activityLogger->logUpdate($modalidad, 'Creación de Establecimiento/Modalidad', ['after' => $request->validated()]);

        return back()->with('success', 'Establecimiento creado correctamente.');
    }

    /**
     * Display a listing of legal instruments.
     */
    public function instrumentosIndex(Request $request): Response
    {
        $modalidades = $this->queryService->getFilteredQuery($request)
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString();

        return Inertia::render('Admin/Instrumentos/Index', [
            'modalidades' => $modalidades,
            'filters' => $request->only(['search', 'missing']),
        ]);
    }

    /**
     * Update legal instruments for a modality.
     */
    public function instrumentosUpdate(UpdateInstrumentosRequest $request, int $id)
    {
        $modalidad = Modalidad::findOrFail($id);
        $modalidad->update($request->validated());

        return back()->with('success', 'Instrumentos legales actualizados.');
    }

    /**
     * Update modality and sync buildings/establishments.
     */
    public function update(UpdateModalidadRequest $request, int $id, UpdateModalidadAction $action)
    {
        $modalidad = Modalidad::with('establecimiento.edificio')->findOrFail($id);

        $action->execute($modalidad, $request->validated());

        return back()->with('success', 'Datos actualizados correctamente.');
    }

    /**
     * Export to Excel.
     */
    public function export(Request $request)
    {
        $data = $this->queryService->getFilteredQuery($request)->get();

        $headers = ['CUE', 'CUI', 'NOMBRE', 'NIVEL', 'AREA', 'ESTADO'];
        [$spreadsheet, $sheet] = $this->exportService->setupSheet('Establecimientos', $headers);

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

        return $this->exportService->download($spreadsheet, 'establecimientos.xlsx');
    }

    /**
     * Remove a modality (soft-delete).
     */
    public function destroy(int $id, ActivityLogService $activityLogger)
    {
        DB::transaction(function () use ($id, $activityLogger) {
            $modalidad = Modalidad::findOrFail($id);
            $establecimiento = $modalidad->establecimiento;

            // 1. Cambiar estado a ELIMINADO para la bitácora
            $modalidad->cambiarEstado('ELIMINADO', 'Baja por administrativo', auth()->id());

            // 2. Soft-delete de la modalidad
            $modalidad->delete();

            // 3. Cascada automática si es la última modalidad activa del establecimiento
            if ($establecimiento && $establecimiento->modalidades()->count() === 0) {
                $establecimiento->delete();
                $activityLogger->logDelete($establecimiento, 'Baja atómica de establecimiento por quedarse sin modalidades: CUE '.$establecimiento->cue);
            } else {
                $activityLogger->logDelete($modalidad, 'Baja de modalidad individual: CUE '.($establecimiento->cue ?? 'S/D'));
            }
        });

        return back()->with('success', 'Establecimiento/Modalidad enviado a la papelera correctamente.');
    }

    /**
     * API for CUI lookup.
     */
    public function lookupEdificio(string $cui)
    {
        $edificio = Edificio::with('cabecera')->where('cui', $cui)->first();
        if (! $edificio) {
            return response()->json(null);
        }

        return response()->json([
            'calle' => $edificio->calle,
            'localidad' => $edificio->localidad,
            'zona_departamento' => $edificio->zona_departamento,
            'numero_puerta' => $edificio->numero_puerta,
            'cabecera_nombre' => $edificio->cabecera?->nombre,
            'cabecera_cue' => $edificio->cabecera?->cue,
        ]);
    }

    /**
     * API for CUE lookup.
     */
    public function lookupCue(string $cue)
    {
        $est = Establecimiento::with('edificio')->where('cue', $cue)->first();
        if (! $est) {
            return response()->json(null);
        }

        return response()->json([
            'nombre' => $est->nombre,
            'edificio_id' => $est->edificio_id,
            'cui' => $est->edificio?->cui,
        ]);
    }
}
