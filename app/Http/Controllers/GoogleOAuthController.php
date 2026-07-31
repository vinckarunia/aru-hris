<?php

namespace App\Http\Controllers;

use App\Models\GoogleOAuthCredential;
use Google\Client;
use Google\Service\Drive;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GoogleOAuthController extends Controller
{
    public function connect(Request $request): RedirectResponse
    {
        if (!$this->hasClientCredentials()) {
            return back()->with(
                'error',
                'GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum dikonfigurasi di server.'
            );
        }

        $state = Str::random(64);
        $request->session()->put('google_oauth_state', $state);

        $client = $this->makeClient();
        $client->setState($state);
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->setIncludeGrantedScopes(true);

        return redirect()->away($client->createAuthUrl());
    }

    public function callback(Request $request): RedirectResponse
    {
        if ($request->filled('error')) {
            Log::warning('Google OAuth consent ditolak.', [
                'error' => $request->string('error')->toString(),
            ]);

            return redirect()->route('settings.index')
                ->with('error', 'Koneksi Google Drive dibatalkan atau ditolak.');
        }

        $expectedState = $request->session()->pull('google_oauth_state');
        $receivedState = $request->string('state')->toString();

        if (!$expectedState || !$receivedState || !hash_equals($expectedState, $receivedState)) {
            return redirect()->route('settings.index')
                ->with('error', 'State OAuth Google tidak valid atau sudah kedaluwarsa. Silakan coba kembali.');
        }

        if (!$request->filled('code')) {
            return redirect()->route('settings.index')
                ->with('error', 'Google tidak mengirim authorization code.');
        }

        try {
            $tokenResponse = $this->makeClient()
                ->fetchAccessTokenWithAuthCode($request->string('code')->toString());
        } catch (\Throwable $exception) {
            Log::error('Google OAuth callback gagal.', [
                'message' => $exception->getMessage(),
            ]);

            return redirect()->route('settings.index')
                ->with('error', 'Gagal menghubungkan Google Drive. Periksa log aplikasi.');
        }

        if (!is_array($tokenResponse) || empty($tokenResponse['refresh_token'])) {
            Log::error('Google OAuth callback tidak menghasilkan refresh token.', [
                'error' => is_array($tokenResponse)
                    ? ($tokenResponse['error'] ?? 'refresh_token_missing')
                    : 'invalid_token_response',
                'description' => is_array($tokenResponse)
                    ? ($tokenResponse['error_description'] ?? null)
                    : null,
                'refresh_token_expires_in' => is_array($tokenResponse)
                    ? ($tokenResponse['refresh_token_expires_in'] ?? null)
                    : null,
            ]);

            return redirect()->route('settings.index')
                ->with('error', 'Google tidak memberikan refresh token. Cabut akses aplikasi di akun Google lalu coba kembali.');
        }

        $expiresIn = isset($tokenResponse['refresh_token_expires_in'])
            ? (int) $tokenResponse['refresh_token_expires_in']
            : null;

        GoogleOAuthCredential::query()->delete();
        GoogleOAuthCredential::create([
            'refresh_token' => $tokenResponse['refresh_token'],
            'connected_at' => now(),
            'refresh_token_expires_at' => $expiresIn ? now()->addSeconds($expiresIn) : null,
        ]);

        \App\Models\AuditLog::log(
            'settings',
            'settings',
            'Menghubungkan Google Drive untuk konversi PDF',
            ['refresh_token_has_expiry' => $expiresIn !== null]
        );

        return redirect()->route('settings.index')
            ->with('success', 'Google Drive berhasil dihubungkan.');
    }

    public function disconnect(): RedirectResponse
    {
        GoogleOAuthCredential::query()->delete();

        \App\Models\AuditLog::log(
            'settings',
            'settings',
            'Memutus koneksi Google Drive untuk konversi PDF'
        );

        return redirect()->route('settings.index')
            ->with('success', 'Koneksi Google Drive berhasil dihapus dari sistem.');
    }

    private function makeClient(): Client
    {
        $client = new Client();
        $client->setClientId((string) config('services.google.client_id'));
        $client->setClientSecret((string) config('services.google.client_secret'));
        $client->setRedirectUri(
            (string) (config('services.google.redirect_uri') ?: route('settings.google.callback'))
        );
        $client->addScope(Drive::DRIVE_FILE);

        return $client;
    }

    private function hasClientCredentials(): bool
    {
        return filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'));
    }
}
