<?php

namespace App\Observers;

use App\Models\Assignment;
use Illuminate\Support\Facades\Cache;

class AssignmentObserver
{
    /**
     * Clear dashboard cache on any model change.
     */
    protected function clearCache(): void
    {
        Cache::forget('dashboard_stats');
    }

    public function created(Assignment $assignment): void { $this->clearCache(); }
    public function updated(Assignment $assignment): void { $this->clearCache(); }
    public function deleted(Assignment $assignment): void { $this->clearCache(); }
    public function restored(Assignment $assignment): void { $this->clearCache(); }
    public function forceDeleted(Assignment $assignment): void { $this->clearCache(); }
}
