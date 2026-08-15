<?php

use App\Http\Controllers\Admin\AdministrativoController;
use App\Http\Controllers\Admin\AuditoriaSueldosController;
use App\Http\Controllers\Admin\EdificioController;
use App\Http\Controllers\Admin\ModalidadController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\MapaController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// Renders the welcome page or redirects if logged in
Route::get('/', function () {
    if (Auth::check()) {
        if (Auth::user()->role === 'admin') {
            return redirect()->route('auditoria-sueldos');
        }

        return redirect()->route('auditoria-sueldos');
    }

    return redirect()->route('login');
});

// Authenticated SIAME routes
Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('/auditoria-sueldos', [AuditoriaSueldosController::class, 'index'])->name('auditoria-sueldos');
    Route::get('/api/auditoria-sueldos/exportar-excel', [AuditoriaSueldosController::class, 'exportExcel'])->name('auditoria-sueldos.export-excel');
    Route::get('/api/auditoria-sueldos/exportar-depuracion-excel', [AuditoriaSueldosController::class, 'exportDepuracionExcel'])->name('auditoria-sueldos.export-depuracion-excel');
    Route::patch('/api/auditoria-sueldos/{id}/estado', [AuditoriaSueldosController::class, 'updateEstadoGestion']);
    Route::patch('/api/auditoria-sueldos/viejo/{id}', [AuditoriaSueldosController::class, 'updateClasificacionViejo']);
    Route::post('/api/auditoria-sueldos/sanear-sector', [AuditoriaSueldosController::class, 'sanearSector']);
    Route::post('/api/auditoria-sueldos/sanear-depuracion', [AuditoriaSueldosController::class, 'sanearDepuracion']);
    Route::get('/api/auditoria-sueldos/modalidades-por-establecimiento/{establecimientoId}', [AuditoriaSueldosController::class, 'getModalidadesPorEstablecimiento']);
    Route::get('/api/auditoria-sueldos/sector-docentes', [AuditoriaSueldosController::class, 'obtenerDocentesSector'])->name('auditoria-sueldos.sector-docentes');
    Route::get('/api/auditoria-sueldos/potenciales-jubilaciones', [AuditoriaSueldosController::class, 'getPotencialesJubilaciones'])->name('auditoria-sueldos.potenciales-jubilaciones');
    Route::get('/api/auditoria-sueldos/detalle-cargos-persona', [AuditoriaSueldosController::class, 'getDetalleCargosPersona'])->name('auditoria-sueldos.detalle-cargos-persona');
    Route::post('/api/auditoria-sueldos/actualizar-jubilacion', [AuditoriaSueldosController::class, 'updateEstadoJubilacion'])->name('auditoria-sueldos.actualizar-jubilacion');

    // Mapa Escolar y Mapa de Sueldos
    Route::get('/mapa', [MapaController::class, 'index'])->name('mapa');
    Route::get('/mapa-sueldos', [MapaController::class, 'indexSueldos'])->name('mapa-sueldos');
    Route::get('/api/mapa/reporte-excel', [MapaController::class, 'exportExcel'])->name('mapa.export-excel');

    // Profile settings
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Admin-only SIAME routes (Role Middleware)
Route::middleware(['auth', 'verified', 'role:admin'])->group(function () {
    Route::get('/admin/importar', [ImportController::class, 'index'])->name('importar');
    Route::get('/api/imports/history', [ImportController::class, 'history']);
    Route::get('/api/imports/stats', [ImportController::class, 'stats']);
    Route::get('/api/imports/csv-status', [ImportController::class, 'csvStatus']);
    Route::get('/api/imports/api-status', [ImportController::class, 'apiStatus']);
    Route::post('/api/imports/trigger', [ImportController::class, 'trigger']);

    // Gestión de Edificios (Admin)
    Route::get('/admin/edificios', [EdificioController::class, 'index'])->name('admin.edificios.index');
    Route::post('/admin/edificios', [EdificioController::class, 'store'])->name('admin.edificios.store');
    Route::patch('/admin/edificios/{id}', [EdificioController::class, 'update'])->name('admin.edificios.update');
    Route::delete('/admin/edificios/{id}', [EdificioController::class, 'destroy'])->name('admin.edificios.destroy');
    Route::get('/admin/edificios/export', [EdificioController::class, 'export'])->name('admin.edificios.export');

    Route::get('/admin/establecimientos', [ModalidadController::class, 'index'])->name('admin.establecimientos.index');
    Route::post('/admin/establecimientos', [ModalidadController::class, 'store'])->name('admin.establecimientos.store');
    Route::patch('/admin/establecimientos/{id}', [ModalidadController::class, 'update'])->name('admin.establecimientos.update');
    Route::delete('/admin/establecimientos/{id}', [ModalidadController::class, 'destroy'])->name('admin.establecimientos.destroy');
    Route::get('/admin/establecimientos/export', [ModalidadController::class, 'export'])->name('admin.establecimientos.export');

    // Gestión de Oficinas Centrales / Reparticiones (Admin)
    Route::get('/admin/oficinas-centrales', [AdministrativoController::class, 'index'])->name('admin.oficinas.index');
    Route::post('/admin/oficinas-centrales', [AdministrativoController::class, 'store'])->name('admin.oficinas.store');
    Route::patch('/admin/oficinas-centrales/{id}', [AdministrativoController::class, 'update'])->name('admin.oficinas.update');
    Route::delete('/admin/oficinas-centrales/{id}', [AdministrativoController::class, 'destroy'])->name('admin.oficinas.destroy');
    Route::get('/admin/oficinas-centrales/export', [AdministrativoController::class, 'export'])->name('admin.oficinas.export');

    // API Lookups
    Route::get('/api/lookup-edificio/{cui}', [ModalidadController::class, 'lookupEdificio'])->name('api.lookup-edificio');
    Route::get('/api/lookup-cue/{cue}', [ModalidadController::class, 'lookupCue'])->name('api.lookup-cue');
    Route::patch('/api/modalidades/{id}/radio', [ModalidadController::class, 'updateRadioVal'])->name('api.modalidades.update-radio');
    Route::patch('/api/modalidades/{id}/observaciones', [ModalidadController::class, 'updateObservacionesVal'])->name('api.modalidades.update-observaciones');
    Route::patch('/api/modalidades/{id}/observado', [ModalidadController::class, 'updateObservadoVal'])->name('api.modalidades.update-observado');
});

require __DIR__.'/auth.php';
