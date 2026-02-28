<?php

namespace App\Observers;

use App\Models\Worker;
use Illuminate\Support\Facades\Cache;

class WorkerObserver
{
    /**
     * Clear dashboard cache on any model change.
     */
    protected function clearCache(): void
    {
        Cache::forget('dashboard_stats');
    }

    public function created(Worker $worker): void { $this->clearCache(); }
    public function updated(Worker $worker): void { $this->clearCache(); }
    public function deleted(Worker $worker): void { $this->clearCache(); }
    public function restored(Worker $worker): void { $this->clearCache(); }
    public function forceDeleted(Worker $worker): void { $this->clearCache(); }
}
