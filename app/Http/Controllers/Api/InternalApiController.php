<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\DataRequest;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InternalApiController extends Controller
{
    /**
     * Fetch all active projects.
     */
    public function getProjects(): JsonResponse
    {
        $projects = Project::orderBy('name')->get(['id', 'name']);
        
        return response()->json([
            'data' => $projects->toArray(),
        ]);
    }

    /**
     * Create onboarding DataRequest.
     */
    public function storeDataRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'worker_id' => 'nullable',
            'project_id' => 'required|exists:projects,id',
            'request_type' => 'required|in:new_data',
            'requested_fields' => 'required|array',
            'requested_data' => 'required|array',
            'notes' => 'nullable|string',
        ]);

        // Resolve requested_by user
        $user = User::where('role', UserRole::SUPER_ADMIN)->first();
        if (!$user) {
            $user = User::first();
        }

        if (!$user) {
            return response()->json([
                'message' => 'No administrative user found to associate with the request.',
            ], 500);
        }

        $dataRequest = DataRequest::create([
            'worker_id' => null,
            'project_id' => $validated['project_id'],
            'requested_by' => $user->id,
            'request_type' => 'new_data',
            'requested_fields' => $validated['requested_fields'],
            'requested_data' => $validated['requested_data'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
            'pic_status' => 'approved',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data request created successfully.',
        ], 201);
    }
}
