<?php

namespace App\Services;

use Google\Client;
use Google\Service\Drive;
use Illuminate\Support\Facades\Log;
use Exception;

class GooglePdfConverterService
{
    /**
     * Convert a local DOCX file to PDF using Google Drive API.
     *
     * @param string $docxPath Path to the local DOCX file.
     * @param string $pdfOutputPath Path where the converted PDF should be saved.
     * @return bool True if successful, false otherwise.
     */
    public function convertDocxToPdf(string $docxPath, string $pdfOutputPath): bool
    {
        if (!config('services.google.pdf_conversion_enabled')) {
            Log::info('Google Docs PDF Conversion is disabled in settings.');
            return false;
        }

        $clientId = config('services.google.client_id');
        $clientSecret = config('services.google.client_secret');
        $refreshToken = config('services.google.refresh_token');

        $useUserAuth = !empty($clientId) && !empty($clientSecret) && !empty($refreshToken);

        if (!$useUserAuth) {
            $jsonCredentials = config('services.google.service_account_json');
            
            // If not set, check if the standard path environment variable is defined
            if (empty($jsonCredentials)) {
                $jsonCredentials = env('GOOGLE_APPLICATION_CREDENTIALS');
            }

            if (empty($jsonCredentials)) {
                Log::error('Google PDF Converter: Kredensial Google tidak dikonfigurasi (isi GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN atau GOOGLE_SERVICE_ACCOUNT_JSON/GOOGLE_APPLICATION_CREDENTIALS).');
                return false;
            }
        }

        try {
            $client = new Client();
            $client->addScope(Drive::DRIVE_FILE);

            if ($useUserAuth) {
                $client->setClientId($clientId);
                $client->setClientSecret($clientSecret);
                $tokenResponse = $client->fetchAccessTokenWithRefreshToken($refreshToken);

                if (!is_array($tokenResponse) || empty($tokenResponse['access_token'])) {
                    Log::error('Google PDF Converter: gagal memperoleh access token.', [
                        'error' => is_array($tokenResponse)
                            ? ($tokenResponse['error'] ?? 'unknown_error')
                            : 'invalid_token_response',
                        'description' => is_array($tokenResponse)
                            ? ($tokenResponse['error_description'] ?? null)
                            : null,
                    ]);

                    return false;
                }
            } else {
                // Handle credentials either as raw JSON string or file path
                if ($this->isJson($jsonCredentials)) {
                    $client->setAuthConfig(json_decode($jsonCredentials, true));
                } else {
                    $resolvedPath = $jsonCredentials;
                    // If it is a relative path, resolve it using base_path()
                    if (!str_starts_with($resolvedPath, '/') && !preg_match('/^[a-zA-Z]:\\\\/', $resolvedPath)) {
                        $resolvedPath = base_path($resolvedPath);
                    }

                    if (!file_exists($resolvedPath)) {
                        Log::error("Google PDF Converter: Berkas kredensial tidak ditemukan di: {$resolvedPath} (aslinya: {$jsonCredentials})");
                        return false;
                    }
                    $client->setAuthConfig($resolvedPath);
                }
            }

            $driveService = new Drive($client);

            // 1. Upload DOCX and convert it to Google Docs format
            $metaDataProperties = [
                'name' => 'Temp_HRIS_Convert_' . uniqid(),
                'mimeType' => 'application/vnd.google-apps.document',
            ];

            $parentFolderId = config('services.google.drive_parent_folder_id');
            if (!empty($parentFolderId)) {
                $metaDataProperties['parents'] = [$parentFolderId];
            }

            $fileMetadata = new Drive\DriveFile($metaDataProperties);

            $content = file_get_contents($docxPath);
            if ($content === false) {
                Log::error("Google PDF Converter: Gagal membaca berkas DOCX di path: {$docxPath}");
                return false;
            }

            $driveFile = $driveService->files->create($fileMetadata, [
                'data' => $content,
                'mimeType' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'uploadType' => 'multipart',
                'fields' => 'id',
            ]);

            $fileId = $driveFile->id;

            // 2. Export the converted Google Doc as PDF
            $response = $driveService->files->export($fileId, 'application/pdf', ['alt' => 'media']);
            $pdfContent = $response->getBody()->getContents();

            if (empty($pdfContent)) {
                throw new Exception('Konten PDF hasil ekspor kosong.');
            }

            // Save to local path
            if (file_put_contents($pdfOutputPath, $pdfContent) === false) {
                throw new Exception("Gagal menyimpan berkas PDF hasil konversi ke: {$pdfOutputPath}");
            }

            // 3. Cleanup: Delete the temp file from Google Drive
            try {
                $driveService->files->delete($fileId);
            } catch (Exception $deleteEx) {
                Log::warning('Google PDF Converter: Gagal menghapus berkas sementara di Google Drive dengan ID: ' . $fileId . '. Error: ' . $deleteEx->getMessage());
            }

            return true;

        } catch (Exception $e) {
            Log::error('Google PDF Converter Error: ' . $e->getMessage(), [
                'exception' => $e
            ]);
            return false;
        }
    }

    /**
     * Helper to check if a string is valid JSON.
     */
    private function isJson(string $string): bool
    {
        json_decode($string);
        return json_last_error() === JSON_ERROR_NONE;
    }
}
