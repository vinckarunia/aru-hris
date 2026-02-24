<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Contract;
use App\Models\Assignment;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Contract>
 */
class ContractFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Contract::class;
    
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = $this->faker->dateTimeBetween('-5 years', 'now');
        $endDate = $this->faker->dateTimeBetween($startDate, 'now');

        return [
            'assignment_id' => Assignment::factory(),
            'contract_type' => 'PKWT',
            'contract_number' => $this->faker->unique()->numberBetween(1, 100),
            'start_date' => $startDate,
            'end_date' => $endDate,
        ];
    }
}
