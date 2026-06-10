<?php

use App\Models\User;
use App\Models\Worker;
use App\Models\Assignment;
use App\Models\Contract;
use App\Models\Project;
use App\Models\DocumentTemplate;
use App\Services\GooglePdfConverterService;
use App\Services\DocumentParserService;
use Illuminate\Support\Facades\Storage;
use Mockery\MockInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Setup database
    $this->user = User::factory()->create([
        'role' => \App\Enums\UserRole::SUPER_ADMIN,
    ]);

    $this->worker = Worker::create([
        'name' => 'John Doe',
        'nik_aru' => 'ARU-12345',
        'ktp_number' => '1234567890123456',
        'gender' => 'male',
    ]);

    $client = \App\Models\Client::factory()->create();

    $this->project = Project::create([
        'name' => 'Project Alpha',
        'client_id' => $client->id,
    ]);

    $branch = \App\Models\Branch::create([
        'client_id' => $client->id,
        'name' => 'Branch Jakarta',
    ]);

    $this->assignment = new Assignment([
        'worker_id' => $this->worker->id,
        'project_id' => $this->project->id,
        'hire_date' => now(),
        'position' => 'Staff',
    ]);
    $this->assignment->branch_id = $branch->id;
    $this->assignment->save();

    $this->contract = Contract::create([
        'assignment_id' => $this->assignment->id,
        'start_date' => now(),
        'end_date' => now()->addYear(),
        'contract_type' => 'pkwt',
    ]);

    // Create a fake template file in storage
    Storage::fake('local');
    $this->templatePath = 'documents/templates/test_pkwt.docx';
    Storage::disk('local')->put($this->templatePath, 'fake-docx-content');

    // Make sure we stub/mock path() so storage_path can find it
    Storage::disk('local')->buildTemporaryUrlsUsing(function ($path, $expiration, $options) {
        return $path;
    });

    $this->template = DocumentTemplate::create([
        'name' => 'Template PKWT',
        'type' => 'kontrak_pkwt',
        'file_path' => $this->templatePath,
        'is_default' => true,
    ]);

    // Mock DocumentParserService to prevent ZIP opening failures
    $this->mock(DocumentParserService::class, function (MockInterface $mock) {
        $mock->shouldReceive('getRealData')
            ->andReturn([]);
        $mock->shouldReceive('generateDocx')
            ->andReturnUsing(function ($templatePath, $data, $outputPath) {
                file_put_contents($outputPath, 'fake-docx-output');
                return true;
            });
    });
});
test('it downloads docx file when pdf conversion is disabled', function () {
    config(['services.google.pdf_conversion_enabled' => false]);

    $response = $this->actingAs($this->user)
        ->get(route('contracts.download-pkwt', $this->contract));

    $response->assertStatus(200);
    $this->assertTrue(str_contains($response->headers->get('content-disposition'), 'PKWT - John Doe.docx'));
});

test('it falls back to docx when pdf conversion fails', function () {
    config(['services.google.pdf_conversion_enabled' => true]);

    $this->mock(GooglePdfConverterService::class, function (MockInterface $mock) {
        $mock->shouldReceive('convertDocxToPdf')
            ->once()
            ->andReturn(false);
    });

    $response = $this->actingAs($this->user)
        ->get(route('contracts.download-pkwt', $this->contract));

    $response->assertStatus(200);
    $this->assertTrue(str_contains($response->headers->get('content-disposition'), 'PKWT - John Doe.docx'));
});

test('it downloads pdf file when conversion is enabled and succeeds', function () {
    config(['services.google.pdf_conversion_enabled' => true]);

    $this->mock(GooglePdfConverterService::class, function (MockInterface $mock) {
        $mock->shouldReceive('convertDocxToPdf')
            ->once()
            ->andReturnUsing(function ($docxPath, $pdfOutputPath) {
                // Mock the PDF creation
                file_put_contents($pdfOutputPath, 'fake-pdf-content');
                return true;
            });
    });

    $response = $this->actingAs($this->user)
        ->get(route('contracts.download-pkwt', $this->contract));

    $response->assertStatus(200);
    $this->assertTrue(str_contains($response->headers->get('content-disposition'), 'PKWT - John Doe.pdf'));
});
