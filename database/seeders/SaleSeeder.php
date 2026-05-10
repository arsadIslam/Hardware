<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\DuePayment;
use App\Models\Product;
use App\Services\SaleService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SaleSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(SaleService::class);

        $rajesh = Customer::query()->where('phone', '9876543210')->first();
        $priya = Customer::query()->where('phone', '9123456780')->first();
        $ashfaq = Customer::query()->where('phone', '9988776655')->first();
        $sunita = Customer::query()->where('phone', '9012345678')->first();
        $vikram = Customer::query()->where('phone', '9871122334')->first();

        $cement = Product::query()->where('product_id', 'HW-1001')->first();
        $rod10 = Product::query()->where('product_id', 'HW-1002')->first();
        $rod12 = Product::query()->where('product_id', 'HW-1003')->first();
        $bricks = Product::query()->where('product_id', 'HW-1005')->first();
        $paint1l = Product::query()->where('product_id', 'HW-1006')->first();
        $paint4l = Product::query()->where('product_id', 'HW-1007')->first();
        $pvc1 = Product::query()->where('product_id', 'HW-1009')->first();
        $elbow = Product::query()->where('product_id', 'HW-1010')->first();
        $wire = Product::query()->where('product_id', 'HW-1012')->first();
        $bulb = Product::query()->where('product_id', 'HW-1015')->first();
        $hammer = Product::query()->where('product_id', 'HW-1018')->first();
        $drill = Product::query()->where('product_id', 'HW-1019')->first();
        $padlock = Product::query()->where('product_id', 'HW-1020')->first();
        $tape = Product::query()->where('product_id', 'HW-1022')->first();

        $service->createSale([
            'customer_id' => $rajesh->id,
            'lines' => [
                ['product_id' => $cement->id, 'quantity' => 10, 'unit_price' => $cement->selling_price],
                ['product_id' => $bricks->id, 'quantity' => 200, 'unit_price' => $bricks->selling_price],
            ],
            'payment_mode' => 'cash',
            'notes' => 'Bulk purchase for site work.',
        ]);

        $service->createSale([
            'lines' => [
                ['product_id' => $bulb->id, 'quantity' => 4, 'unit_price' => $bulb->selling_price],
                ['product_id' => $tape->id, 'quantity' => 2, 'unit_price' => $tape->selling_price],
            ],
            'payment_mode' => 'upi',
            'notes' => 'Walk-in customer.',
        ]);

        $service->createSale([
            'customer_id' => $priya->id,
            'lines' => [
                ['product_id' => $paint4l->id, 'quantity' => 2, 'unit_price' => $paint4l->selling_price],
                ['product_id' => $paint1l->id, 'quantity' => 1, 'unit_price' => $paint1l->selling_price],
            ],
            'discount_type' => 'percent',
            'discount_value' => 5,
            'payment_mode' => 'upi',
        ]);

        $service->createSale([
            'customer' => [
                'name' => 'Karthik Reddy',
                'phone' => '9550012345',
                'address' => 'Banjara Hills, Hyderabad',
            ],
            'lines' => [
                ['product_id' => $hammer->id, 'quantity' => 1, 'unit_price' => $hammer->selling_price],
                ['product_id' => $drill->id, 'quantity' => 1, 'unit_price' => $drill->selling_price],
                ['product_id' => $padlock->id, 'quantity' => 2, 'unit_price' => $padlock->selling_price],
            ],
            'discount_type' => 'fixed',
            'discount_value' => 200,
            'payment_mode' => 'cash',
        ]);

        $service->createSale([
            'customer_id' => $ashfaq->id,
            'lines' => [
                ['product_id' => $rod10->id, 'quantity' => 50, 'unit_price' => $rod10->selling_price],
                ['product_id' => $rod12->id, 'quantity' => 75, 'unit_price' => $rod12->selling_price],
                ['product_id' => $cement->id, 'quantity' => 8, 'unit_price' => $cement->selling_price],
            ],
            'payment_mode' => 'partial',
            'amount_paid' => 5000,
            'notes' => 'Will clear balance next week.',
        ]);

        $service->createSale([
            'customer_id' => $sunita->id,
            'lines' => [
                ['product_id' => $pvc1->id, 'quantity' => 30, 'unit_price' => $pvc1->selling_price],
                ['product_id' => $elbow->id, 'quantity' => 12, 'unit_price' => $elbow->selling_price],
                ['product_id' => $wire->id, 'quantity' => 25, 'unit_price' => $wire->selling_price],
            ],
            'payment_mode' => 'due',
            'notes' => 'Credit sale, regular customer.',
        ]);

        $service->createSale([
            'customer_id' => $vikram->id,
            'lines' => [
                ['product_id' => $paint1l->id, 'quantity' => 3, 'unit_price' => $paint1l->selling_price],
                ['product_id' => $tape->id, 'quantity' => 5, 'unit_price' => $tape->selling_price],
            ],
            'payment_mode' => 'cash',
        ]);

        $this->collectFromCustomer($ashfaq->fresh(), 1500.00, 'cash', 'Part repayment.');
        $this->collectFromCustomer($sunita->fresh(), 800.00, 'upi', 'UPI on phonepe.');
    }

    private function collectFromCustomer(Customer $customer, float $amount, string $mode, ?string $notes = null): void
    {
        $outstanding = round((float) $customer->outstanding_balance, 2);

        if ($outstanding <= 0) {
            return;
        }

        $amount = min($amount, $outstanding);

        DB::transaction(function () use ($customer, $amount, $mode, $notes): void {
            Customer::query()->whereKey($customer->id)->lockForUpdate()->decrement('outstanding_balance', $amount);

            DuePayment::create([
                'customer_id' => $customer->id,
                'amount' => $amount,
                'payment_mode' => $mode,
                'notes' => $notes,
            ]);
        });
    }
}
