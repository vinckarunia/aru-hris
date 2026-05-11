<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        \App\Models\Worker::observe(\App\Observers\WorkerObserver::class);
        \App\Models\Assignment::observe(\App\Observers\AssignmentObserver::class);
        \App\Models\Contract::observe(\App\Observers\ContractObserver::class);
        \App\Models\Client::observe(\App\Observers\ClientObserver::class);
        \App\Models\Project::observe(\App\Observers\ProjectObserver::class);

        \Illuminate\Support\Facades\Event::listen(\Illuminate\Auth\Events\Login::class, function ($event) {
            \App\Models\AuditLog::log('login', 'auth', "User {$event->user->name} berhasil login", null, $event->user->id);
        });

        \Illuminate\Support\Facades\Event::listen(\Illuminate\Auth\Events\Logout::class, function ($event) {
            if ($event->user) {
                \App\Models\AuditLog::log('logout', 'auth', "User {$event->user->name} berhasil logout", null, $event->user->id);
            }
        });

        // SMTP Logging — log all outgoing mail events for audit trail
        \Illuminate\Support\Facades\Event::listen(\Illuminate\Mail\Events\MessageSent::class, function ($event) {
            try {
                $message = $event->message;
                $to = array_map(fn($a) => $a->getAddress(), $message->getTo());
                $cc = $message->getCc() ? array_map(fn($a) => $a->getAddress(), $message->getCc()) : [];
                $subject = $message->getSubject();

                \App\Models\AuditLog::log('email', 'settings', "Email berhasil dikirim: \"{$subject}\"", [
                    'to' => $to,
                    'cc' => $cc,
                    'subject' => $subject,
                    'smtp_status' => 'sent',
                    'debug' => $event->data['__laravel_notification'] ?? null,
                ]);
            } catch (\Throwable $e) {
                // Silently ignore logging failures
            }
        });
    }
}
