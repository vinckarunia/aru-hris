<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessBulkImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

/**
 * Class BulkImportController
 *
 * Handles the uploading, previewing, and dispatching of worker data imports.
 */
class BulkImportController extends Controller
{
    /**
     * Upload the CSV file temporarily and return headers and sample data for mapping.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function preview(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'], // Max 10MB
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        // Store file temporarily
        $path = $file->storeAs('temp_imports', 'import_' . time() . '.csv', 'local');
        $fullPath = Storage::disk('local')->path($path);

        // Read headers and first 5 rows for frontend preview
        $fileHandle = fopen($fullPath, 'r');
        $headers = fgetcsv($fileHandle);
        $previewData = [];
        
        $limit = 5;
        $count = 0;
        while (($row = fgetcsv($fileHandle)) !== false && $count < $limit) {
            $previewData[] = $row;
            $count++;
        }
        fclose($fileHandle);

        return response()->json([
            'message' => 'File uploaded successfully ready for mapping.',
            'file_path' => $path,
            'headers' => $headers,
            'preview_data' => $previewData,
        ]);
    }

    /**
     * Dispatch the background job to process the mapped data.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function process(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file_path' => ['required', 'string'],
            'mapping'   => ['required', 'array'], // e.g., ['name' => 3, 'ktp_number' => 47] (index of CSV)
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $filePath = $request->input('file_path');
        $mapping = $request->input('mapping');

        if (!Storage::disk('local')->exists($filePath)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        // Dispatch job to queue (Redis)
        ProcessBulkImport::dispatch($filePath, $mapping, auth()->id());

        return response()->json([
            'message' => 'Import process has been added to the queue.',
        ]);
    }
}