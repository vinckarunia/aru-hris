<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Client;
use App\Models\Worker;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Call UserSeeder
        $this->call([
            UserSeeder::class,
        ]);

        Client::factory(3)
            ->hasProjects(2, function ($project) {
                return [
                    'name' => 'Project ' . \Illuminate\Support\Str::random(6),
                ];
            })
            ->create();

        Worker::factory(10)
            ->hasAssignments(3)
            ->hasFamilyMembers(2)
            ->hasDocuments(3)
            ->create();

        
    }
}
