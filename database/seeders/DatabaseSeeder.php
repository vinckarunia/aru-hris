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
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        Client::factory(3)
            ->hasProjects(2, function ($project) {
                return [
                    'name' => fake()->city,
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
