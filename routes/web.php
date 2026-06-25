<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AgenteController;
use App\Http\Controllers\LicenciaController;
use App\Http\Controllers\DesignacionController;
use App\Http\Controllers\EstablecimientoController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\TrasladosController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\MapaController;

// Renders the welcome page or redirects if logged in
Route::get('/', function () {
    if (Auth::check()) {
        if (Auth::user()->role === 'admin') {
            return redirect()->route('importar');
        }
        return redirect()->route('dashboard');
    }
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Authenticated SIAME routes
Route::middleware(['auth', 'verified'])->group(function () {
    
    // Dashboard / Tablero General
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/api/stats', [DashboardController::class, 'stats']);

    // Redirects for deprecated views (Hub integration)
    Route::get('/agentes', function () {
        return redirect()->route('auditoria', ['tab' => 'agentes']);
    })->name('agentes');

    Route::get('/auditoria-unica', function () {
        return redirect()->route('auditoria', ['tab' => 'auditoria-unica']);
    })->name('auditoria-unica');

    Route::get('/auditoria-automatizada', [AgenteController::class, 'auditoriaAutomatizadaPage'])->name('auditoria-automatizada');
    Route::get('/api/agentes', [AgenteController::class, 'search']);
    Route::get('/api/agentes/{dni}', [AgenteController::class, 'detail']);
    Route::get('/api/agentes/{dni}/analisis-local', [AgenteController::class, 'getLocalAnalysis']);

    // Licencias (Redirect + API)
    Route::get('/licencias', function () {
        return redirect()->route('auditoria', ['tab' => 'licencias']);
    })->name('licencias');
    Route::get('/api/licencias/search', [LicenciaController::class, 'search']);

    // Designaciones (Redirect + API)
    Route::get('/designaciones', function () {
        return redirect()->route('auditoria', ['tab' => 'designaciones']);
    })->name('designaciones');
    Route::get('/api/designaciones/search', [DesignacionController::class, 'search']);

    // Establecimientos
    Route::get('/establecimientos', [EstablecimientoController::class, 'index'])->name('establecimientos');
    Route::get('/api/establecimientos', [EstablecimientoController::class, 'search']);
    Route::get('/api/establecimientos/filters', [EstablecimientoController::class, 'getFilters']);
    Route::get('/api/establecimientos/{id}', [EstablecimientoController::class, 'detail']);

    // Mapa Escolar
    Route::get('/mapa', [MapaController::class, 'index'])->name('mapa');

    // Analytics
    Route::get('/api/analytics/advanced', [AnalyticsController::class, 'advanced']);

    // Traslados y Auditoría (Redirect + API)
    Route::get('/traslados', function () {
        return redirect()->route('auditoria', ['tab' => 'traslados']);
    })->name('traslados');
    Route::get('/api/traslados/audit', [TrasladosController::class, 'audit']);

    // Auditoria view (renders the auditoria component)
    Route::get('/auditoria', function () {
        return Inertia::render('Auditoria');
    })->name('auditoria');
    Route::get('/api/auditorias', [AgenteController::class, 'auditorias']);

    // Profile settings
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Admin-only SIAME routes (Role Middleware)
Route::middleware(['auth', 'verified', 'role:admin'])->group(function () {
    Route::get('/importar', [ImportController::class, 'index'])->name('importar');
    Route::get('/api/imports/history', [ImportController::class, 'history']);
    Route::get('/api/imports/stats', [ImportController::class, 'stats']);
    Route::get('/api/imports/csv-status', [ImportController::class, 'csvStatus']);
    Route::get('/api/imports/api-status', [ImportController::class, 'apiStatus']);
});

require __DIR__.'/auth.php';

