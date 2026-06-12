<?php

namespace Database\Seeders;

use App\Models\User;
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
        // Create Admin User
        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Administrador SIAME',
                'password' => bcrypt('password'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]
        );

        // Create Administrativo User
        User::updateOrCreate(
            ['email' => 'administrativo@example.com'],
            [
                'name' => 'Administrativo SIAME',
                'password' => bcrypt('password'),
                'role' => 'administrativos',
                'email_verified_at' => now(),
            ]
        );
    }
}
