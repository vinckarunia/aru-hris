<?php

namespace App\Console\Commands;

use App\Models\Worker;
use Illuminate\Console\Command;

/**
 * One-time command to normalize all existing worker names in the database
 * to Title Case using Worker::normalizeName().
 */
class NormalizeWorkerNames extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'workers:normalize-names';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Normalize all existing worker names to Title Case';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $total = Worker::count();
        $updated = 0;

        $this->info("Normalizing {$total} worker names...");

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        Worker::query()->chunk(100, function ($workers) use (&$updated, $bar) {
            foreach ($workers as $worker) {
                $normalized = Worker::normalizeName($worker->name);

                if ($normalized !== $worker->name) {
                    // Use query builder to skip model events (avoid triggering emails etc.)
                    Worker::where('id', $worker->id)->update(['name' => $normalized]);
                    $updated++;
                }

                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
        $this->info("Done! {$updated} of {$total} names were updated.");

        return Command::SUCCESS;
    }
}
