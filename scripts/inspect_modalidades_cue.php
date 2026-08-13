<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$cue = '700079900';
echo "=== MODALIDADES VINCULADAS AL CUE {$cue} ===" . PHP_EOL;

$est = DB::table('establecimientos')->where('cue', $cue)->first();
if ($est) {
    echo "Establecimiento ID: {$est->id}" . PHP_EOL;
    if (Schema::hasTable('modalidades')) {
        $mods = DB::table('modalidades')->where('establecimiento_id', $est->id)->get();
        echo "Modalidades en 'modalidades': " . count($mods) . PHP_EOL;
        print_r($mods);
    }
    if (Schema::hasTable('establecimiento_modalidades')) {
        $emods = DB::table('establecimiento_modalidades')->where('establecimiento_id', $est->id)->get();
        echo "Modalidades en 'establecimiento_modalidades': " . count($emods) . PHP_EOL;
        print_r($emods);
    }
}

echo PHP_EOL . "=== COLUMNAS DE 'modalidades' ===" . PHP_EOL;
if (Schema::hasTable('modalidades')) {
    print_r(Schema::getColumnListing('modalidades'));
}

echo "==========================================" . PHP_EOL;
