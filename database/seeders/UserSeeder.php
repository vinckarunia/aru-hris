<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Enums\UserRole;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Pastikan hanya ada satu SUPER_ADMIN
        $superAdmin = User::firstOrCreate(
            ['email' => 'admin@admin.com'], // Ganti dengan email admin yang diinginkan
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'), // Ganti dengan password yang kuat di production
                'role' => UserRole::SUPER_ADMIN,
            ]
        );

        // Opsional: Buat beberapa user dummy untuk testing jika environment local
        if (app()->environment('local')) {
            User::firstOrCreate(
                ['email' => 'staffaru@admin.com'],
                [
                    'name' => 'ARU',
                    'password' => Hash::make('password'),
                    'role' => UserRole::ADMIN_ARU,
                ]
            );

            $picUser = User::firstOrCreate(
                ['email' => 'pic1@admin.com'],
                [
                    'name' => 'Ahmad PIC',
                    'password' => Hash::make('password'),
                    'role' => UserRole::PIC,
                ]
            );
            
            // Buat profil PIC untuk picUser
            $picUser->pic()->firstOrCreate(
                ['user_id' => $picUser->id],
                [
                    'name' => 'Ahmad PIC',
                    'phone' => '08123456789',
                ]
            );
        }
    }
}
