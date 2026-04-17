<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = \App\Models\User::where('role', 'PIC')->first();
$row = ['John Doe', '1234567890123456', 'Project A', 'Branch B'];
$mapping = ['name' => 0, 'ktp_number' => 1, 'project_name' => 2, 'branch_name' => 3];
$globalSettings = ['client_id' => 1, 'project_id' => 1];

try {
    $workerData = ['name' => 'John', 'ktp_number' => '1234'];
    $assignmentData = ['project_id' => 1];
    $payload = array_merge($workerData, $assignmentData);
    
    $req = \App\Models\DataRequest::create([
        'worker_id' => null,
        'project_id' => 1,
        'requested_by' => $user->id,
        'request_type' => 'new_data',
        'requested_fields' => array_keys($payload),
        'requested_data' => $payload,
        'notes' => 'Import Karyawan via Bulk Upload',
        'status' => 'pending',
        'pic_status' => 'approved',
        'pic_reviewed_by' => $user->id,
        'pic_reviewed_at' => now(),
    ]);
    echo "Success: " . $req->id . "\n";
} catch (\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n" . $e->getTraceAsString();
}
