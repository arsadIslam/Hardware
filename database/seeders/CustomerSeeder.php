<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            ['Rajesh Kumar',     '9876543210', 'Plot 42, Sector 18, Noida, UP'],
            ['Priya Sharma',     '9123456780', 'Flat 3B, Lake View Apartments, Indiranagar, Bengaluru'],
            ['Mohammed Ashfaq',  '9988776655', 'Hno 12-3-456, Tolichowki, Hyderabad'],
            ['Sunita Verma',     '9012345678', '24 MG Road, Pune, MH'],
            ['Anil Patel',       '9765432109', 'Nr Swaminarayan Temple, Maninagar, Ahmedabad'],
            ['Ritika Banerjee',  '9433221100', '78/2 Park Street, Kolkata'],
            ['Vikram Singh',     '9871122334', 'House 5, Civil Lines, Jaipur'],
        ];

        foreach ($customers as [$name, $phone, $address]) {
            Customer::query()->updateOrCreate(
                ['phone' => Customer::normalizePhone($phone)],
                [
                    'name' => $name,
                    'address' => $address,
                ],
            );
        }

        Customer::factory()->count(5)->create();
    }
}
