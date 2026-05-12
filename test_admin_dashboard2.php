<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::where('role', 'Super Admin')->first();
if (!$user) { echo "No Admin user found\n"; exit; }
echo "Found Admin: " . $user->email . "\n";
auth()->login($user);

$controller = new \App\Http\Controllers\DashboardController();
try {
    $controller->index();
    echo "Dashboard Admin Success\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n";
}
