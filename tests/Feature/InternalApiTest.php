<?php

use App\Models\Project;
use App\Models\Client;
use App\Models\User;
use App\Models\DataRequest;
use App\Enums\UserRole;

beforeEach(function () {
    // Set API Key config
    config(['services.hris.key' => 'test-secret-key']);

    // Create a Super Admin for requested_by mapping
    $this->admin = User::factory()->create([
        'role' => UserRole::SUPER_ADMIN,
    ]);

    // Create some dummy clients and projects
    $this->client = Client::factory()->create([
        'full_name' => 'Test Client',
    ]);

    $this->project1 = Project::create([
        'client_id' => $this->client->id,
        'name' => 'Project Alpha',
        'prefix' => 'PA',
    ]);

    $this->project2 = Project::create([
        'client_id' => $this->client->id,
        'name' => 'Project Beta',
        'prefix' => 'PB',
    ]);
});

it('denies access when X-API-Key is invalid or missing', function () {
    // Missing key
    $response = $this->getJson('/api/internal/projects');
    $response->assertStatus(401);

    // Incorrect key
    $response = $this->withHeaders(['X-API-Key' => 'wrong-key'])
        ->getJson('/api/internal/projects');
    $response->assertStatus(401);
});

it('returns active projects with hashed IDs', function () {
    $response = $this->withHeaders(['X-API-Key' => 'test-secret-key'])
        ->getJson('/api/internal/projects');

    $response->assertStatus(200);

    $data = $response->json('data');
    expect($data)->toHaveCount(2);

    // Verify IDs are hashed strings (length should be at least 10 as per HasHashid trait)
    expect($data[0]['id'])->toBeString()->toHaveLength(10);
    expect($data[0]['name'])->toBe('Project Alpha');
});

it('creates onboarding DataRequest successfully', function () {
    $payload = [
        'worker_id' => null,
        'project_id' => $this->project1->getRouteKey(), // Sending the Hashid
        'request_type' => 'new_data',
        'requested_fields' => ['name', 'ktp_number'],
        'requested_data' => [
            'name' => 'Candidate Budi',
            'ktp_number' => '3171012345670001',
        ],
        'notes' => 'Onboarding candidate via API',
    ];

    $response = $this->withHeaders(['X-API-Key' => 'test-secret-key'])
        ->postJson('/api/internal/data-requests', $payload);

    $response->assertStatus(201);
    $response->assertJson([
        'success' => true,
        'message' => 'Data request created successfully.',
    ]);

    // Verify record exists in DB
    $request = DataRequest::latest()->first();
    expect($request)->not->toBeNull();
    expect($request->project_id)->toBe($this->project1->id); // Decoded successfully
    expect($request->requested_by)->toBe($this->admin->id); // Resolved successfully
    expect($request->status)->toBe('pending');
    expect($request->pic_status)->toBe('approved');
});

it('returns validation errors for invalid payload', function () {
    $payload = [
        'worker_id' => null,
        'project_id' => 'invalid-project-id', // Invalid Hashid/project
        'request_type' => 'new_data',
        'requested_fields' => ['name'],
        'requested_data' => [
            'name' => 'Budi',
        ],
    ];

    $response = $this->withHeaders(['X-API-Key' => 'test-secret-key'])
        ->postJson('/api/internal/data-requests', $payload);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['project_id']);
});

it('creates documents when new_data onboarding request is approved', function () {
    // Create a pending onboarding DataRequest with documents
    $dataRequest = DataRequest::create([
        'worker_id' => null,
        'project_id' => $this->project1->id,
        'requested_by' => $this->admin->id,
        'request_type' => 'new_data',
        'requested_fields' => ['name', 'ktp_number', 'documents'],
        'requested_data' => [
            'name' => 'Candidate Budi With Docs',
            'ktp_number' => '3171012345679999',
            'gender' => 'male',
            'documents' => [
                [
                    'type' => 'KTP',
                    'file_path' => 'uploads/budi/ktp.pdf',
                ],
                [
                    'type' => 'KK',
                    'file_path' => 'uploads/budi/kk.pdf',
                ]
            ],
        ],
        'status' => 'pending',
        'pic_status' => 'approved',
    ]);

    // Approve the request
    $response = $this->actingAs($this->admin)
        ->put(route('data-requests.review', $dataRequest), [
            'status' => 'approved',
            'review_notes' => 'Onboarding approved',
        ]);

    $response->assertStatus(302); // Redirect back

    // Verify Worker was created
    $worker = \App\Models\Worker::where('ktp_number', '3171012345679999')->first();
    expect($worker)->not->toBeNull();
    expect($worker->name)->toBe('Candidate Budi With Docs');

    // Verify Documents were created and linked to the worker
    $documents = \App\Models\Document::where('worker_id', $worker->id)->get();
    expect($documents)->toHaveCount(2);

    $ktp = $documents->where('type', 'KTP')->first();
    expect($ktp)->not->toBeNull();
    expect($ktp->file_path)->toBe('uploads/budi/ktp.pdf');
    expect($ktp->verified_at)->not->toBeNull();

    $kk = $documents->where('type', 'KK')->first();
    expect($kk)->not->toBeNull();
    expect($kk->file_path)->toBe('uploads/budi/kk.pdf');
    expect($kk->verified_at)->not->toBeNull();
});

