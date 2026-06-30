<?php

use App\Http\Controllers\Admin\EdificioController;
use App\Http\Controllers\Admin\ModalidadController;
use App\Http\Controllers\AgenteController;
use App\Http\Controllers\EstablecimientoController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\MapaController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// Renders the welcome page or redirects if logged in
Route::get('/', function () {
    if (Auth::check()) {
        if (Auth::user()->role === 'admin') {
            return redirect()->route('importar');
        }

        return redirect()->route('mapa');
    }

    return redirect()->route('login');
});

// Authenticated SIAME routes
Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('/auditoria-automatizada', [AgenteController::class, 'auditoriaAutomatizadaPage'])->name('auditoria-automatizada');
    Route::get('/api/agentes', [AgenteController::class, 'search']);
    Route::get('/api/agentes/{dni}', [AgenteController::class, 'detail']);
    Route::get('/api/agentes/{dni}/analisis-local', [AgenteController::class, 'getLocalAnalysis']);

    // Establecimientos
    Route::get('/establecimientos', [EstablecimientoController::class, 'index'])->name('establecimientos');
    Route::get('/api/establecimientos', [EstablecimientoController::class, 'search']);
    Route::get('/api/establecimientos/filters', [EstablecimientoController::class, 'getFilters']);
    Route::get('/api/establecimientos/reporte-pdf', [EstablecimientoController::class, 'exportPdf']);
    Route::get('/api/establecimientos/{id}/reporte-pdf', [EstablecimientoController::class, 'exportSinglePdf']);
    Route::put('/api/establecimientos/{id}/radio', [EstablecimientoController::class, 'updateRadio']);
    Route::get('/api/establecimientos/{id}', [EstablecimientoController::class, 'detail']);

    // Mapa Escolar
    Route::get('/mapa', [MapaController::class, 'index'])->name('mapa');

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

    // Gestión de Establecimientos (Modalidades - Admin)
    Route::get('/admin/establecimientos', [ModalidadController::class, 'index'])->name('admin.establecimientos.index');
    Route::post('/admin/establecimientos', [ModalidadController::class, 'store'])->name('admin.establecimientos.store');
    Route::patch('/admin/establecimientos/{id}', [ModalidadController::class, 'update'])->name('admin.establecimientos.update');
    Route::delete('/admin/establecimientos/{id}', [ModalidadController::class, 'destroy'])->name('admin.establecimientos.destroy');
    Route::get('/admin/establecimientos/export', [ModalidadController::class, 'export'])->name('admin.establecimientos.export');

    // API Lookups
    Route::get('/api/lookup-edificio/{cui}', [ModalidadController::class, 'lookupEdificio'])->name('api.lookup-edificio');
    Route::get('/api/lookup-cue/{cue}', [ModalidadController::class, 'lookupCue'])->name('api.lookup-cue');
    Route::patch('/api/modalidades/{id}/radio', [ModalidadController::class, 'updateRadioVal'])->name('api.modalidades.update-radio');
});

require __DIR__.'/auth.php';
