<?php

use App\Http\Controllers\EstablecimientoController;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$request = Request::create('/api/establecimientos', 'GET', ['page' => 1, 'limit' => 15, 'year' => 2026]);
$controller = $app->make(EstablecimientoController::class);

DB::enableQueryLog();
$start = microtime(true);
$response = $controller->search($request);
$end = microtime(true);

$log = DB::getQueryLog();
echo 'Execution time (just search): '.($end - $start)." seconds\n";
echo 'Total Queries: '.count($log)."\n";
