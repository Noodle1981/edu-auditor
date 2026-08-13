<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Http\Request;
use App\Http\Controllers\Admin\AuditoriaSueldosController;

$controller = new AuditoriaSueldosController();
$req = Request::create('/api/auditoria-sueldos/potenciales-jubilaciones', 'GET', [
    'search' => '27057458106'
]);

$response = $controller->getPotencialesJubilaciones($req);
$data = json_decode($response->getContent(), true);

echo "=== VERIFICACIÓN API PARA CUIL 27057458106 ===" . PHP_EOL;
print_r($data['data']);
echo "KPIs:" . PHP_EOL;
print_r($data['kpis']);
echo "==================================================" . PHP_EOL;
