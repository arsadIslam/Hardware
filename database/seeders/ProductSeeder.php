<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['HW-1001', 'UltraTech PPC Cement 50kg Bag',          420.00,  370.00, 120,    'pcs', 'Aisle A1'],
            ['HW-1002', 'TMT Steel Rod 10mm',                       72.00,   62.00, 850.500, 'kg',  'Aisle A2'],
            ['HW-1003', 'TMT Steel Rod 12mm',                       70.00,   60.00, 1240.250,'kg',  'Aisle A2'],
            ['HW-1004', 'M-Sand (per kg)',                           2.50,    1.80, 5200.000,'kg',  'Yard'],
            ['HW-1005', 'Red Bricks',                                9.00,    7.00, 4000,    'pcs', 'Yard'],
            ['HW-1006', 'Asian Paints Apcolite 1L White',          385.00,  320.00, 60,     'ltr', 'Shelf C3'],
            ['HW-1007', 'Asian Paints Apcolite 4L White',         1450.00, 1200.00, 35,     'ltr', 'Shelf C3'],
            ['HW-1008', 'Berger Easy Clean 1L Off-White',          340.00,  285.00, 48,     'ltr', 'Shelf C4'],
            ['HW-1009', 'PVC Pipe 1 inch (per meter)',              48.00,   36.00, 320.000,'mtr', 'Rack D1'],
            ['HW-1010', 'PVC Elbow 1 inch',                         18.00,   12.00, 250,    'pcs', 'Rack D1'],
            ['HW-1011', 'CPVC Pipe 1/2 inch (per meter)',           65.00,   48.00, 410.000,'mtr', 'Rack D1'],
            ['HW-1012', 'Havells 1.5 sqmm Wire (per meter)',        22.00,   16.50, 980.000,'mtr', 'Aisle B1'],
            ['HW-1013', 'Anchor Modular 6A Switch',                 65.00,   42.00, 200,    'pcs', 'Aisle B2'],
            ['HW-1014', 'Anchor 6A 3-Pin Socket',                   95.00,   68.00, 180,    'pcs', 'Aisle B2'],
            ['HW-1015', 'Philips 9W LED Bulb',                     145.00,  105.00, 240,    'pcs', 'Aisle B2'],
            ['HW-1016', 'Steel Nails 2 inch (per kg)',             110.00,   85.00, 32.500, 'kg',  'Shelf C3'],
            ['HW-1017', 'Wood Screws 1.5 inch (box of 100)',       180.00,  130.00, 90,     'box', 'Shelf C4'],
            ['HW-1018', 'Stanley Claw Hammer 16oz',                620.00,  480.00, 22,     'pcs', 'Aisle A1'],
            ['HW-1019', 'Bosch GSB 550 Drill Machine',            3850.00, 3100.00, 8,      'pcs', 'Aisle A1'],
            ['HW-1020', 'Godrej Ultra Padlock 65mm',               520.00,  410.00, 35,     'pcs', 'Aisle A2'],
            ['HW-1021', 'Fevicol SH 500g',                         260.00,  210.00, 70,     'pcs', 'Shelf C4'],
            ['HW-1022', 'Insulation Tape Black (10m)',              22.00,   12.00, 300,    'pcs', 'Aisle B1'],
        ];

        foreach ($items as [$pid, $name, $sell, $buy, $qty, $unit, $loc]) {
            Product::query()->updateOrCreate(
                ['product_id' => $pid],
                [
                    'name' => $name,
                    'selling_price' => $sell,
                    'buying_price' => $buy,
                    'available_quantity' => $qty,
                    'quantity_unit' => $unit,
                    'location' => $loc,
                ],
            );
        }

        Product::factory()->count(8)->create();
    }
}
