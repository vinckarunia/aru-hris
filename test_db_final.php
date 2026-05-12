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
        ->select(
            'contracts.pkwt_type',
            'contracts.contract_type',
            Illuminate\Support\Facades\DB::raw('count(contracts.id) as count')
        )
        ->groupBy('contracts.pkwt_type', 'contracts.contract_type')
        ->get()
        ->map(function ($row) {
            $status = !empty($row->pkwt_type) ? $row->pkwt_type : $row->contract_type;
            return ['status' => $status, 'count' => $row->count];
        })
        ->groupBy('status')
        ->map(function ($group, $status) {
            return ['status' => $status, 'count' => $group->sum('count')];
        })
        ->values();
    
    echo "PHP Aggregation Works! Count: " . count($employmentDemographics) . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
