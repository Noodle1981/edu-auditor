<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$cue = '700079900';
echo "=== COLUMNAS DE 'establecimientos' ===" . PHP_EOL;
$cols = Schema::getColumnListing('establecimientos');
print_r($cols);

$est = DB::table('establecimientos')->where('cue', $cue)->first();
print_r($est);

echo PHP_EOL . "=== BUSCANDO EN TODAS LAS TABLAS QUE TENGAN CUE = {$cue} ===" . PHP_EOL;
$tables = DB::select("SELECT name FROM sqlite_master WHERE type='table'");
foreach ($tables as $t) {
    $tName = $t->name;
    if (Schema::hasColumn($tName, 'cue')) {
        $count = DB::table($tName)->where('cue', $cue)->count();
        if ($count > 0) {
            echo "Tabla '{$tName}': {$count} registros con CUE {$cue}." . PHP_EOL;
            $row = DB::table($tName)->where('cue', $cue)->first();
            print_r($row);
        }
    }
}
