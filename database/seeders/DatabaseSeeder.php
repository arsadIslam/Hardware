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
        User::query()->updateOrCreate(
            ['phone' => '8509789777'],
            [
                'name' => 'Amir Sohail Islam',
                'password' => '1234567890',
            ],
        );

        $this->call([
            ProductSeeder::class,
            CustomerSeeder::class,
            SaleSeeder::class,
        ]);
    }
}
