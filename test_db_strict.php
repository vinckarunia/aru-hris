<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $demographicsQuery = Illuminate\Support\Facades\DB::table('contracts')
        ->join('assignments', 'contracts.assignment_id', '=', 'assignments.id')
        ->where('assignments.status', 'active');

    $employmentDemographics = $demographicsQuery
        ->select(Illuminate\Support\Facades\DB::raw("COALESCE(NULLIF(contracts.pkwt_type, ''), contracts.contract_type) as status"), Illuminate\Support\Facades\DB::raw('count(contracts.id) as count'))
        ->groupBy('status')
        ->get();
    echo "GroupBy Alias Works\n";
} catch (\Exception $e) {
    echo "Alias Error: " . $e->getMessage() . "\n";
}
