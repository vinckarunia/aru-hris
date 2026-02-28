<?php

namespace App\Observers;

use App\Models\Project;
use Illuminate\Support\Facades\Cache;

class ProjectObserver
{
    /**
     * Clear dashboard cache on any model change.
     */
    protected function clearCache(): void
    {
        Cache::forget('dashboard_stats');
    }

    public function created(Project $project): void { $this->clearCache(); }
    public function updated(Project $project): void { $this->clearCache(); }
    public function deleted(Project $project): void { $this->clearCache(); }
    public function restored(Project $project): void { $this->clearCache(); }
    public function forceDeleted(Project $project): void { $this->clearCache(); }
}
