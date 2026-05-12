<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::where('role', 'pic')->first();
// Give this PIC a project
$pic = $user->pic;
if (!$pic) {
    $pic = \App\Models\Pic::create(['user_id' => $user->id, 'name' => 'Test PIC']);
}
$project = \App\Models\Project::first();
if ($project) {
    $pic->projects()->syncWithoutDetaching([$project->id]);
}

auth()->login($user);

$controller = new \App\Http\Controllers\DashboardController();
try {
    $controller->index();
    echo "Dashboard PIC Success\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine() . "\n";
}
