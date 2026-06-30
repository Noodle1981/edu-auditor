<?php

use Illuminate\Contracts\Console\Kernel;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$tables = ['agente_cargos', 'licencias', 'modalidades', 'establecimientos', 'edificios'];
foreach ($tables as $t) {
    echo "--- Indexes for $t ---\n";
    $indexes = DB::select("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='$t'");
    print_r($indexes);
}
