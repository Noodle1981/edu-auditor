<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$cue = '700079900';
$affected = DB::table('modalidades as m')
    ->join('establecimientos as e', 'e.id', '=', 'm.establecimiento_id')
    ->where('e.cue', $cue)
    ->update(['m.radio_sige' => 6]);

echo "Se actualizaron {$affected} modalidades para CUE {$cue} asignando radio_sige = 6." . PHP_EOL;
