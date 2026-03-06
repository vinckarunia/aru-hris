<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!$request->user()) {
            return redirect('login');
        }

        // Jika tidak ada role yang spesifik diminta, lanjut (tapi ini idealnya di-catch kalau salah penggunaan)
        if (empty($roles)) {
            return $next($request);
        }

        $userRole = $request->user()->role->value;
        
        if (in_array($userRole, $roles)) {
            return $next($request);
        }

        abort(403, 'Akses Ditolak: Role Anda tidak memiliki izin untuk halaman ini.');
    }
}
