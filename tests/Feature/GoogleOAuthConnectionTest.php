<?php

use App\Enums\UserRole;
use App\Models\GoogleOAuthCredential;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'services.google.client_id' => 'test-client.apps.googleusercontent.com',
        'services.google.client_secret' => 'test-client-secret',
        'services.google.redirect_uri' => 'https://hris.example.com/settings/google/callback',
    ]);

    $this->superAdmin = User::factory()->create([
        'role' => UserRole::SUPER_ADMIN,
    ]);
});

test('super admin can start google oauth connection with offline access', function () {
    $response = $this->actingAs($this->superAdmin)
        ->get(route('settings.google.connect'));

    $response->assertRedirect();

    $query = [];
    parse_str((string) parse_url($response->headers->get('Location'), PHP_URL_QUERY), $query);

    expect($query)
        ->toHaveKey('client_id', 'test-client.apps.googleusercontent.com')
        ->toHaveKey('redirect_uri', 'https://hris.example.com/settings/google/callback')
        ->toHaveKey('access_type', 'offline')
        ->toHaveKey('prompt', 'consent')
        ->toHaveKey('state');

    expect(session('google_oauth_state'))->toBe($query['state']);
});

test('non super admin cannot manage google oauth connection', function () {
    $admin = User::factory()->create([
        'role' => UserRole::ADMIN_ARU,
    ]);

    $this->actingAs($admin)
        ->get(route('settings.google.connect'))
        ->assertForbidden();

    $this->actingAs($admin)
        ->post(route('settings.google.disconnect'))
        ->assertForbidden();
});

test('refresh token is encrypted at rest and can be disconnected', function () {
    $credential = GoogleOAuthCredential::create([
        'refresh_token' => '1//plain-refresh-token',
        'connected_at' => now(),
    ]);

    expect(DB::table('google_oauth_credentials')->where('id', $credential->id)->value('refresh_token'))
        ->not->toBe('1//plain-refresh-token');
    expect($credential->fresh()->refresh_token)->toBe('1//plain-refresh-token');

    $this->actingAs($this->superAdmin)
        ->post(route('settings.google.disconnect'))
        ->assertRedirect(route('settings.index'))
        ->assertSessionHas('success');

    expect(GoogleOAuthCredential::count())->toBe(0);
});

test('settings page exposes oauth status without exposing refresh token', function () {
    GoogleOAuthCredential::create([
        'refresh_token' => '1//secret-token',
        'connected_at' => now(),
    ]);

    $this->actingAs($this->superAdmin)
        ->get(route('settings.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Settings/Index')
            ->where('googleOAuth.connected', true)
            ->where('googleOAuth.configured', true)
            ->missing('googleOAuth.refreshToken')
        );
});

test('oauth callback rejects an invalid state before exchanging a token', function () {
    $this->actingAs($this->superAdmin)
        ->withSession(['google_oauth_state' => 'expected-state'])
        ->get(route('settings.google.callback', [
            'state' => 'wrong-state',
            'code' => 'authorization-code',
        ]))
        ->assertRedirect(route('settings.index'))
        ->assertSessionHas('error');

    expect(GoogleOAuthCredential::count())->toBe(0);
});
