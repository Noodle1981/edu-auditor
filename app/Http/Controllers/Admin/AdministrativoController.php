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

        $adminNivelesMap = Modalidad::where('direccion_area', 'ADMINISTRACIÓN')
            ->whereNotNull('nivel_educativo')
            ->where('nivel_educativo', '<>', '')
            ->select('nivel_educativo', DB::raw('COUNT(*) as total'))
            ->groupBy('nivel_educativo')
            ->pluck('total', 'nivel_educativo')
            ->toArray();

        $defaultNiveles = ['ADMINISTRATIVO', 'JUNTA DE CLASIFICACIÓN', 'SUPERVISIÓN', 'BIBLIOTECA DEL MAGISTERIO', 'MINISTERIO'];
        $allNiveles = array_values(array_unique(array_merge($defaultNiveles, array_keys($adminNivelesMap))));
        sort($allNiveles);

        $categoriasDetalle = [];
        foreach ($allNiveles as $cat) {
            $categoriasDetalle[] = [
                'nombre' => $cat,
                'total' => (int) ($adminNivelesMap[$cat] ?? 0),
            ];
        }

        $options['niveles'] = $allNiveles;
        $options['categorias_detalle'] = $categoriasDetalle;
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

    /**
     * Rename an administrative category across all administrative offices.
     */
    public function renameCategoria(Request $request, ActivityLogService $activityLogger)
    {
        $validated = $request->validate([
            'nombre_actual' => 'required|string|max:150',
            'nuevo_nombre' => 'required|string|max:150',
        ]);

        $nombreActual = trim($validated['nombre_actual']);
        $nuevoNombre = mb_strtoupper(trim($validated['nuevo_nombre']), 'UTF-8');

        if ($nombreActual === $nuevoNombre) {
            return back()->with('info', 'El nuevo nombre es idéntico al actual.');
        }

        $count = DB::transaction(function () use ($nombreActual, $nuevoNombre) {
            $modalidades = Modalidad::where('direccion_area', 'ADMINISTRACIÓN')
                ->where('nivel_educativo', $nombreActual)
                ->get();

            $updatedCount = 0;
            foreach ($modalidades as $mod) {
                $mod->nivel_educativo = $nuevoNombre;
                $mod->save();
                $updatedCount++;
            }

            return $updatedCount;
        });

        return back()->with('success', "Categoría '{$nombreActual}' renombrada a '{$nuevoNombre}' exitosamente ({$count} reparticiones actualizadas).");
    }

    /**
     * Delete or reassign an administrative category.
     */
    public function deleteCategoria(Request $request, ActivityLogService $activityLogger)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:150',
            'reasignar_a' => 'nullable|string|max:150',
        ]);

        $nombre = trim($validated['nombre']);
        $reasignarA = !empty($validated['reasignar_a']) ? mb_strtoupper(trim($validated['reasignar_a']), 'UTF-8') : 'ADMINISTRATIVO';

        $count = DB::transaction(function () use ($nombre, $reasignarA) {
            return Modalidad::where('direccion_area', 'ADMINISTRACIÓN')
                ->where('nivel_educativo', $nombre)
                ->update(['nivel_educativo' => $reasignarA]);
        });

        return back()->with('success', "Categoría '{$nombre}' eliminada. {$count} reparticiones fueron reasignadas a '{$reasignarA}'.");
    }
}
