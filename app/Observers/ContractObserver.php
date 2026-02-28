<?php

namespace App\Observers;

use App\Models\Contract;
use Illuminate\Support\Facades\Cache;

class ContractObserver
{
    /**
     * Clear dashboard cache on any model change.
     */
    protected function clearCache(): void
    {
        Cache::forget('dashboard_stats');
    }

    public function created(Contract $contract): void { $this->clearCache(); }
    public function updated(Contract $contract): void { $this->clearCache(); }
    public function deleted(Contract $contract): void { $this->clearCache(); }
    public function restored(Contract $contract): void { $this->clearCache(); }
    public function forceDeleted(Contract $contract): void { $this->clearCache(); }
}
