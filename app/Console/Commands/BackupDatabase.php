<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Carbon\Carbon;

class BackupDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:backup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backup the database to the storage directory';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filename = 'backup_' . Carbon::now()->format('Y-m-d_H-i-s') . '.sql';
        $path = storage_path('app/backups/');

        // Create the backups directory if it doesn't exist
        if (!is_dir($path)) {
            mkdir($path, 0755, true);
        }

        $command = sprintf(
            'mysqldump --user="%s" --password="%s" --host="%s" "%s" > "%s"',
            env('DB_USERNAME'),
            env('DB_PASSWORD'),
            env('DB_HOST', '127.0.0.1'),
            env('DB_DATABASE'),
            $path . $filename
        );

        $returnVar = NULL;
        $output = NULL;
        exec($command, $output, $returnVar);

        if ($returnVar === 0) {
            $this->info("Database backup created successfully: {$filename}");
        } else {
            $this->error("Database backup failed.");
        }
    }
}
