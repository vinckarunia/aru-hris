<?php

namespace App\Services;

use PhpOffice\PhpWord\IOFactory;
use App\Models\Contract;
use App\Models\Assignment;
use App\Models\InternalEmployee;

class DocumentParserService
{


    /**
     * Get dummy data array for Preview mode.
     */
    public function getDummyData(): array
    {
        return [
            'nama_karyawan'     => 'MUHAMMAD FACHRUDDIN',
            'ktp'               => '3271234567890001',
            'nik_aru'           => 'ARU-26001',
            'gender'            => 'Laki-laki',
            'tempat_lahir'      => 'Jakarta',
            'tanggal_lahir'     => '17 Agustus 1990',
            'pendidikan'        => 'S1 Teknik Informatika',
            'agama'             => 'Islam',
            'status_pajak'      => 'TK/0',
            'status_pernikahan' => 'Belum Menikah',
            'email'             => 'fachruddin@example.com',
            'phone'             => '081234567890',
            'no_kk'             => '3271234567899999',
            'nama_ibu'          => 'Siti Aminah',
            'npwp'              => '99.999.999.9-999.000',
            'bpjs_kes'          => '0001234567890',
            'bpjs_tk'           => '12345678901',
            'bank'              => 'BCA',
            'no_rekening'       => '1234567890 (a.n Muhammad Fachruddin)',
            'alamat'            => 'Jl. Jenderal Sudirman No. 1, Jakarta',
            'alamat_domisili'   => 'Jl. Jenderal Sudirman No. 1, Jakarta',

            'jabatan'           => 'Software Engineer',
            'client'            => 'PT Teknologi Indonesia',
            'alamat_client'     => 'Jl. Jenderal Sudirman No. 1, Jakarta',
            'cabang'            => 'Cabang Jakarta Pusat',
            'project'           => 'Sistem HRIS',
            'tanggal_hire'      => '01 Januari 2026',
            'tanggal_keluar'    => '-',
            'employee_id'       => 'EMP-2026-001',

            'gaji_pokok'        => 'Rp 10.000.000',
            'tunjangan'         => 'Rp 2.000.000',
            'uang_makan'        => 'Rp 50.000 / Hari',
            'uang_transport'    => 'Rp 50.000 / Hari',
            'uang_kehadiran'    => 'Rp 200.000 / Bulan',
            'insentif_kinerja'  => 'Rp 1.000.000 / Bulan',

            'mulai_kontrak'     => '01 Januari 2026',
            'akhir_kontrak'     => '31 Desember 2026',
            'nomor_surat'       => '001/ARU/PKWT-001/I/2026',
            'no_urut_kontrak'   => '001',
            'pkwt_ke'           => '001',
            'bulan_romawi'      => 'I',
            'tahun_kontrak'     => '2026',
            
            'durasi_kontrak'    => '12 BULAN',
            'pihak_aru_nama'    => 'JUMAGA TUA SINAGA',
            'pihak_aru_jabatan' => 'Head of Operation PT. Alfa Reka Usaha',
            'tanggal_dibuat'    => '01 Januari 2026',
            
            'rincian_kompensasi'=> implode(", ", [
                'Upah Pokok: Rp 10.000.000',
                'Tunjangan Tetap: Rp 2.000.000',
                'Uang Makan: Rp 50.000 / Hari'
            ]),
        ];
    }

    /**
     * Map real Contract and Assignment data into placeholder array.
     */
    public function getRealData(?Contract $contract, ?Assignment $assignment, ?InternalEmployee $pihakAru, string $nomorSurat): array
    {
        $worker = $assignment ? $assignment->worker : null;
        $comp = $contract ? $contract->compensation : null;
        $project = $assignment ? $assignment->project : null;
        $client = $project ? $project->client : null;

        $startDateObj = $contract?->start_date ? \Carbon\Carbon::parse($contract->start_date) : null;
        $endDateObj = $contract?->end_date ? \Carbon\Carbon::parse($contract->end_date) : null;
        
        $durationMonths = $contract?->duration_months;
        if (!$durationMonths && $startDateObj && $endDateObj) {
            $durationMonths = (int) $startDateObj->diffInMonths($endDateObj->copy()->addDay());
        }

        // Fragments for numbering
        $pkwtMonthlySeq = 1; // Default
        if ($contract) {
            $contractMonth = $contract->start_date ? \Carbon\Carbon::parse($contract->start_date) : now();
            $pkwtMonthlySeq = \App\Models\Contract::whereYear('start_date', $contractMonth->year)
                ->whereMonth('start_date', $contractMonth->month)
                ->where('id', '<=', $contract->id)
                ->count();
        } else if ($assignment) {
            $pkwtMonthlySeq = $assignment->id;
        }

        $seqFormatted     = str_pad($pkwtMonthlySeq, 3, '0', STR_PAD_LEFT);
        $pkwtNumFormatted = str_pad($contract?->pkwt_number ?? 1, 3, '0', STR_PAD_LEFT);
        $romanMonths  = [1=>'I',2=>'II',3=>'III',4=>'IV',5=>'V',6=>'VI',7=>'VII',8=>'VIII',9=>'IX',10=>'X',11=>'XI',12=>'XII'];
        $issueDate    = $startDateObj ?? now();
        $romanMonth   = $romanMonths[$issueDate->month] ?? 'I';
        $year         = $issueDate->year;

        // Build Dynamic Compensation HTML/Text List
        $compHtml = '';
        $hasComp = false;
        
        $upahPokok = $comp?->base_salary ?? 0;
        $tunjangan = $comp?->allowance ?? 0;
        $uangMakan = $comp?->meal_allowance ?? 0;
        $uangTransport = $comp?->transport_allowance ?? 0;
        $uangKehadiran = $comp?->attendance_allowance ?? 0;
        $insentif = $comp?->performance_bonus ?? 0;
        $lemburWeekday = $comp?->overtime_weekday_rate ?? 0;
        $lemburWeekend = $comp?->overtime_holiday_rate ?? 0;
        
        $translateRate = function($rate) {
            $rates = ['yearly' => 'Tahun', 'monthly' => 'Bulan', 'daily' => 'Hari', 'hourly' => 'Jam'];
            return $rates[$rate] ?? $rate;
        };
        $overtimeUnit = $translateRate($comp?->overtime_rate ?? 'hourly');

        $comps = [];
        if ($upahPokok > 0) { $comps[] = 'Upah Pokok: Rp ' . number_format($upahPokok, 0, ',', '.'); $hasComp = true; }
        if ($tunjangan > 0) { $comps[] = 'Tunjangan Allowance: Rp ' . number_format($tunjangan, 0, ',', '.'); $hasComp = true; }
        if ($uangMakan > 0) { $comps[] = 'Uang Makan: Rp ' . number_format($uangMakan, 0, ',', '.'); $hasComp = true; }
        if ($uangTransport > 0) { $comps[] = 'Uang Transport: Rp ' . number_format($uangTransport, 0, ',', '.'); $hasComp = true; }
        if ($uangKehadiran > 0) { $comps[] = 'Uang Kehadiran: Rp ' . number_format($uangKehadiran, 0, ',', '.'); $hasComp = true; }
        if ($insentif > 0) { $comps[] = 'Insentif Kinerja: Rp ' . number_format($insentif, 0, ',', '.'); $hasComp = true; }
        if ($lemburWeekday > 0) { $comps[] = 'Lembur Weekday: Rp ' . number_format($lemburWeekday, 0, ',', '.') . ' / ' . $overtimeUnit; $hasComp = true; }
        if ($lemburWeekend > 0) { $comps[] = 'Lembur Weekend/Libur: Rp ' . number_format($lemburWeekend, 0, ',', '.') . ' / ' . $overtimeUnit; $hasComp = true; }
        
        $compText = '';
        if ($hasComp) {
            $alphabet = range('a', 'z');
            $lines = [];
            foreach ($comps as $index => $c) {
                $letter = $alphabet[$index] ?? '-';
                $lines[] = $letter . '. ' . $c;
            }
            $compText = implode("\n", $lines);
        } else {
            $compText = '-';
        }

        $taxStatus = strtoupper($worker?->tax_status ?? '-');
        $maritalStatus = '-';
        if ($taxStatus !== '-') {
            if (strpos($taxStatus, 'TK') === 0) {
                $maritalStatus = 'Belum Menikah';
            } elseif (strpos($taxStatus, 'K') === 0) {
                $maritalStatus = 'Menikah';
            } else {
                $maritalStatus = $taxStatus;
            }
        }

        return [
            'nama_karyawan'     => strtoupper($worker?->name ?? '-'),
            'ktp'               => $worker?->ktp_number ?? '-',
            'nik_aru'           => $worker?->nik_aru ?? '-',
            'gender'            => $worker?->gender === 'male' ? 'Laki-laki' : ($worker?->gender === 'female' ? 'Perempuan' : '-'),
            'tempat_lahir'      => $worker?->birth_place ?? '-',
            'tanggal_lahir'     => $worker?->birth_date ? \Carbon\Carbon::parse($worker->birth_date)->translatedFormat('d F Y') : '-',
            'pendidikan'        => $worker?->education ?? '-',
            'agama'             => $worker?->religion ?? '-',
            'status_pajak'      => $taxStatus,
            'status_pernikahan' => $maritalStatus,
            'email'             => $worker?->email ?? '-',
            'phone'             => $worker?->phone ?? '-',
            'no_kk'             => $worker?->kk_number ?? '-',
            'nama_ibu'          => $worker?->mother_name ?? '-',
            'npwp'              => $worker?->npwp ?? '-',
            'bpjs_kes'          => $worker?->bpjs_kesehatan ?? '-',
            'bpjs_tk'           => $worker?->bpjs_ketenagakerjaan ?? '-',
            'bank'              => strtoupper($worker?->bank_name ?? '-'),
            'no_rekening'       => $worker?->bank_account_number ?? '-',
            'alamat'            => strtoupper($worker?->address_ktp ?? '-'),
            'alamat_domisili'   => strtoupper($worker?->address_domicile ?? $worker?->address_ktp ?? '-'),

            'jabatan'           => strtoupper($assignment?->position ?? '-'),
            'client'            => strtoupper($client?->full_name ?? '-'),
            'alamat_client'     => strtoupper($client?->address ?? '-'),
            'cabang'            => strtoupper($assignment?->branches->pluck('name')->implode(', ') ?: '-'),
            'project'           => strtoupper($project?->name ?? '-'),
            'tanggal_hire'      => $assignment?->hire_date ? \Carbon\Carbon::parse($assignment->hire_date)->translatedFormat('d F Y') : '-',
            'tanggal_keluar'    => $assignment?->termination_date ? \Carbon\Carbon::parse($assignment->termination_date)->translatedFormat('d F Y') : '-',
            'employee_id'       => $assignment?->employee_id ?? '-',

            'gaji_pokok'        => 'Rp ' . number_format($upahPokok, 0, ',', '.'),
            'tunjangan'         => 'Rp ' . number_format($tunjangan, 0, ',', '.'),
            'uang_makan'        => 'Rp ' . number_format($uangMakan, 0, ',', '.'),
            'uang_transport'    => 'Rp ' . number_format($uangTransport, 0, ',', '.'),
            'uang_kehadiran'    => 'Rp ' . number_format($uangKehadiran, 0, ',', '.'),
            'insentif_kinerja'  => 'Rp ' . number_format($insentif, 0, ',', '.'),
            'lembur_weekday'    => 'Rp ' . number_format($lemburWeekday, 0, ',', '.') . ' / ' . $overtimeUnit,
            'lembur_weekend'    => 'Rp ' . number_format($lemburWeekend, 0, ',', '.') . ' / ' . $overtimeUnit,

            'mulai_kontrak'     => $startDateObj ? $startDateObj->translatedFormat('d F Y') : '-',
            'akhir_kontrak'     => $endDateObj ? $endDateObj->translatedFormat('d F Y') : '-',
            'nomor_surat'       => $nomorSurat,
            'no_urut_kontrak'   => $seqFormatted,
            'pkwt_ke'           => $pkwtNumFormatted,
            'bulan_romawi'      => $romanMonth,
            'tahun_kontrak'     => $year,
            
            'durasi_kontrak'    => $durationMonths !== null ? $durationMonths . ' BULAN' : '-',
            'pihak_aru_nama'    => strtoupper($pihakAru?->name ?? 'JUMAGA TUA SINAGA'),
            'pihak_aru_jabatan' => $pihakAru?->position ?? 'Head of Operation PT. Alfa Reka Usaha',
            'tanggal_dibuat'    => $startDateObj ? $startDateObj->translatedFormat('d F Y') : now()->translatedFormat('d F Y'),
            
            'rincian_kompensasi'=> $compText,
        ];
    }

    /**
     * Generate a physical DOCX file by replacing placeholders natively.
     *
     * @param string $templatePath Path to the original DOCX template.
     * @param array $data Associative array of replacement data from getRealData.
     * @param string $outputPath Path to save the generated DOCX.
     * @return void
     */
    public function generateDocx(string $templatePath, array $data, string $outputPath): void
    {
        // Enable escaping to avoid XML corruption from user input
        \PhpOffice\PhpWord\Settings::setOutputEscapingEnabled(true);

        $tp = new \App\Services\CustomTemplateProcessor($templatePath);
        
        // Fix fragmented macros that might be split by XML tags due to Word formatting
        $tp->fixBrokenMacrosForKeys(array_map('strtoupper', array_keys($data)));

        // Handle multi-line strings by cloning the paragraph containing the placeholder
        $xml = $tp->getMainPartXml();
        foreach ($data as $key => $value) {
            $placeholder = strtoupper($key);
            if (is_string($value) && str_contains($value, "\n")) {
                $searchStr = '[' . $placeholder . ']';
                $pos = strpos($xml, $searchStr);
                if ($pos !== false) {
                    // Boundary-safe backward search for the opening <w:p tag
                    $pStartPos = false;
                    $offset = $pos;
                    while ($offset > 0) {
                        $foundPos = strrpos(substr($xml, 0, $offset), '<w:p');
                        if ($foundPos === false) {
                            break;
                        }
                        $nextChar = substr($xml, $foundPos + 4, 1);
                        if ($nextChar === ' ' || $nextChar === '>') {
                            $pStartPos = $foundPos;
                            break;
                        }
                        $offset = $foundPos;
                    }
                    
                    $pEndPos = strpos($xml, '</w:p>', $pos);
                    
                    if ($pStartPos !== false && $pEndPos !== false) {
                        $pEndPos += 6; // Include </w:p>
                        $fullParagraphXml = substr($xml, $pStartPos, $pEndPos - $pStartPos);
                        
                        // Extract paragraph style/properties
                        $pPr = '';
                        if (preg_match('/<w:pPr>.*?<\/w:pPr>/s', $fullParagraphXml, $pPrMatch)) {
                            $pPr = $pPrMatch[0];
                        }
                        
                        // Extract open tag
                        $pOpen = '';
                        if (preg_match('/^<w:p\b[^>]*>/s', $fullParagraphXml, $pOpenMatch)) {
                            $pOpen = $pOpenMatch[0];
                        }
                        
                        $lines = explode("\n", $value);
                        $replacementXml = '';
                        foreach ($lines as $line) {
                            $escapedLine = htmlspecialchars($line, ENT_XML1, 'UTF-8');
                            $replacementXml .= $pOpen . $pPr . '<w:r><w:t>' . $escapedLine . '</w:t></w:r></w:p>';
                        }
                        
                        $xml = substr_replace($xml, $replacementXml, $pStartPos, $pEndPos - $pStartPos);
                        unset($data[$key]); // Handled, remove from array
                    }
                }
            }
        }
        $tp->setMainPartXml($xml);

        foreach ($data as $key => $value) {
            // Keys from getRealData are like 'nama_karyawan'. We UPPERCASE them.
            $placeholder = strtoupper($key);
            
            if ($value instanceof \PhpOffice\PhpWord\Element\AbstractElement) {
                // For complex elements like TextRun (used for multi-line compensation)
                try {
                    $tp->setComplexValue($placeholder, $value);
                } catch (\Exception $e) {
                    // Fallback if the placeholder doesn't exist or is invalid for complex value
                }
            } else {
                // String replacement
                // Replace tabs and weird spaces just in case
                $value = str_replace(["\t"], [' '], (string) $value);
                $tp->setValue($placeholder, $value);
            }
        }

        $tp->saveAs($outputPath);
    }
}
