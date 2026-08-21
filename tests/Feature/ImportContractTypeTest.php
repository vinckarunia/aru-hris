<?php

use App\Services\ImportService;
use App\Services\ImportDataCleaner;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('it auto defaults contract pkwt_type to PKWT unless explicitly stated as PKWTT', function () {
    $importService = new ImportService();

    // Mapping of columns in CSV
    $mapping = [
        'raw_contract_type' => 0,
        'contract_start' => 1,
        'contract_end' => 2,
        'hire_date' => 3,
        'evaluation_notes' => 4,
    ];

    $globalSettings = [];

    // Case 1: Empty raw_contract_type, no contract_end
    $row1 = [
        '',           // raw_contract_type
        '2026-06-12', // contract_start
        '',           // contract_end
        '2026-06-12', // hire_date
        'Notes 1'     // evaluation_notes
    ];

    $contracts1 = $importService->buildContractsData($row1, $mapping, $globalSettings);
    expect($contracts1)->toHaveCount(1);
    expect($contracts1[0]['contract_type'])->toBe('Kontrak');
    expect($contracts1[0]['pkwt_type'])->toBe('PKWT');

    // Case 2: explicitly stated as PKWTT
    $row2 = [
        'PKWTT',      // raw_contract_type
        '2026-06-12', // contract_start
        '',           // contract_end
        '2026-06-12', // hire_date
        'Notes 2'     // evaluation_notes
    ];

    $contracts2 = $importService->buildContractsData($row2, $mapping, $globalSettings);
    expect($contracts2)->toHaveCount(1);
    expect($contracts2[0]['contract_type'])->toBe('Kontrak');
    expect($contracts2[0]['pkwt_type'])->toBe('PKWTT');

    // Case 3: explicitly stated as Kontrak PKWTT
    $row3 = [
        'Kontrak PKWTT', // raw_contract_type
        '2026-06-12',    // contract_start
        '',              // contract_end
        '2026-06-12',    // hire_date
        'Notes 3'        // evaluation_notes
    ];

    $contracts3 = $importService->buildContractsData($row3, $mapping, $globalSettings);
    expect($contracts3)->toHaveCount(1);
    expect($contracts3[0]['contract_type'])->toBe('Kontrak');
    expect($contracts3[0]['pkwt_type'])->toBe('PKWTT');

    // Case 4: explicit other values like "Kontrak" with no end date
    $row4 = [
        'Kontrak',    // raw_contract_type
        '2026-06-12', // contract_start
        '',           // contract_end
        '2026-06-12', // hire_date
        'Notes 4'     // evaluation_notes
    ];

    $contracts4 = $importService->buildContractsData($row4, $mapping, $globalSettings);
    expect($contracts4)->toHaveCount(1);
    expect($contracts4[0]['contract_type'])->toBe('Kontrak');
    expect($contracts4[0]['pkwt_type'])->toBe('PKWT');

    // Case 5: Harian
    $row5 = [
        'Harian',     // raw_contract_type
        '2026-06-12', // contract_start
        '',           // contract_end
        '2026-06-12', // hire_date
        'Notes 5'     // evaluation_notes
    ];

    $contracts5 = $importService->buildContractsData($row5, $mapping, $globalSettings);
    expect($contracts5)->toHaveCount(1);
    expect($contracts5[0]['contract_type'])->toBe('Harian');
    expect($contracts5[0]['pkwt_type'])->toBeNull();

    // Case 6: Mitra from the mapped file column
    $row6 = [
        'Mitra',
        '2026-06-12',
        '2026-12-11',
        '2026-06-12',
        'Notes 6',
    ];

    $contracts6 = $importService->buildContractsData($row6, $mapping, $globalSettings);
    expect($contracts6)->toHaveCount(1);
    expect($contracts6[0]['contract_type'])->toBe('Mitra');
    expect($contracts6[0]['pkwt_type'])->toBeNull();

    // Case 7: Mitra supplied as the global import override
    $contracts7 = $importService->buildContractsData($row4, $mapping, ['contract_type' => 'Mitra']);
    expect($contracts7)->toHaveCount(1);
    expect($contracts7[0]['contract_type'])->toBe('Mitra');
    expect($contracts7[0]['pkwt_type'])->toBeNull();
});

test('it auto maps the contract type column used by bulk import', function () {
    $mapping = (new ImportService())->autoMapHeaders(['Nama Lengkap', 'Jenis Kontrak']);

    expect($mapping)->toHaveKey('raw_contract_type', 1)
        ->not->toHaveKey('contract_type');
});
