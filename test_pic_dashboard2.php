<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::where('role', 'pic')->first();
$user->pic->projects()->sync([]); // remove all projects

auth()->login($user);

$controller = new \App\Http\Controllers\DashboardController();
try {
    $controller->index();
    echo "Dashboard PIC Success (No Projects)\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n";
}
