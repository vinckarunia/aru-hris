<?php

namespace App\Observers;

use App\Models\Client;
use Illuminate\Support\Facades\Cache;

class ClientObserver
{
    /**
     * Clear dashboard cache on any model change.
     */
    protected function clearCache(): void
    {
        Cache::forget('dashboard_stats');
    }

    public function created(Client $client): void { $this->clearCache(); }
    public function updated(Client $client): void { $this->clearCache(); }
    public function deleted(Client $client): void { $this->clearCache(); }
    public function restored(Client $client): void { $this->clearCache(); }
    public function forceDeleted(Client $client): void { $this->clearCache(); }
}
