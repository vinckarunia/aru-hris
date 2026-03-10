<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Traits\HasHashid;
use Symfony\Component\HttpFoundation\Response;

class DecodeHashids
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('POST') || $request->isMethod('PUT') || $request->isMethod('PATCH') || $request->isMethod('DELETE') || $request->isMethod('GET')) {
            $input = $request->all();
            
            if (!empty($input)) {
                $decodedInput = $this->decodeArray($input);
                $request->replace($decodedInput);
            }
        }

        return $next($request);
    }

    /**
     * Recursively decode HashIDs in the request array.
     */
    protected function decodeArray(array $array): array
    {
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                $array[$key] = $this->decodeArray($value);
            } elseif (is_string($value) && (str_ends_with((string)$key, '_id') || $key === 'id')) {
                $decoded = HasHashid::decodeHashid($value);
                if ($decoded !== null) {
                    $array[$key] = $decoded;
                }
            }
        }
        return $array;
    }
}
