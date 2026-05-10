<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $unit = fake()->randomElement(['pcs', 'kg', 'mtr', 'box', 'ltr']);
        $buying = fake()->randomFloat(2, 25, 1500);
        $marginPct = fake()->numberBetween(15, 45);
        $selling = round($buying * (1 + $marginPct / 100), 2);

        return [
            'product_id' => 'P-'.fake()->unique()->numerify('######'),
            'name' => fake()->randomElement([
                'Steel Nails', 'Wood Screws', 'Wall Plug', 'Hex Bolt',
                'Door Hinge', 'Cabinet Handle', 'Padlock', 'Insulation Tape',
                'Copper Wire', 'PVC Conduit', 'Switch Plate', 'LED Bulb',
            ]).' '.fake()->randomElement(['Small', 'Medium', 'Large', '6mm', '12mm', '25mm', '40W', '60W']),
            'selling_price' => $selling,
            'buying_price' => $buying,
            'available_quantity' => $unit === 'pcs' || $unit === 'box'
                ? fake()->numberBetween(10, 500)
                : fake()->randomFloat(3, 5, 200),
            'quantity_unit' => $unit,
            'location' => fake()->randomElement(['Aisle A1', 'Aisle A2', 'Aisle B1', 'Aisle B2', 'Shelf C3', 'Shelf C4', 'Rack D1']),
        ];
    }
}
