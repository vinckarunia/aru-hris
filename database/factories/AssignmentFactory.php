<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Assignment;
use App\Models\Worker;
use App\Models\Project;
use App\Models\Branch;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Assignment>
 */
class AssignmentFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Assignment::class;
    
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $hireDate = $this->faker->dateTimeBetween('-5 years', 'now');
        $terminationDate = $this->faker->dateTimeBetween($hireDate, 'now');

        return [
            'worker_id' => Worker::factory(),
            'project_id' => Project::inRandomOrder()->first()->id ?? Project::factory(),
            'employee_id' => $this->faker->unique()->numerify('ARU-####'),
            'branch_id' => Branch::inRandomOrder()->first()->id ?? Branch::factory(),
            'hire_date' => $hireDate,
            'termination_date' => $terminationDate,
            'position' => $this->faker->jobTitle(),
        ];
    }

    public function configure()
    {
        return $this->afterCreating(function ($assignment) {
            \App\Models\Contract::factory(2)
                ->for($assignment)
                ->hasCompensation(1)
                ->create();
        });
    }
}
