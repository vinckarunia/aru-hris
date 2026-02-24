<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Worker;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Model>
 */
class WorkerFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Worker::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nik_aru' => $this->faker->unique()->numerify('ARU######'),
            'name' => $this->faker->name,
            'ktp_number' => $this->faker->unique()->numerify('###########'),
            'kk_number' => $this->faker->numerify('###########'),
            'birth_place' => $this->faker->city,
            'birth_date' => $this->faker->date(),
            'gender' => $this->faker->randomElement(['male', 'female']),
            'phone' => $this->faker->phoneNumber,
            'education' => $this->faker->word,
            'religion' => $this->faker->word,
            'tax_status' => $this->faker->word,
            'address_ktp' => $this->faker->address,
            'address_domicile' => $this->faker->address,
            'mother_name' => $this->faker->name('female'),
            'npwp' => $this->faker->numerify('##.###.###.#-###.###'),
            'bpjs_kesehatan' => $this->faker->numerify('###########'),
            'bpjs_ketenagakerjaan' => $this->faker->numerify('###########'),
            'bank_name' => $this->faker->randomElement(['BCA', 'Mandiri', 'BNI', 'BRI']),
            'bank_account_number' => $this->faker->numerify('###########'),
            'created_at' => now(),
        ];
    }
}
