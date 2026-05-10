<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\Product;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleService
{
    public function createSale(array $validated): Invoice
    {
        return DB::transaction(function () use ($validated) {
            $customer = $this->resolveCustomer($validated);

            $lines = $validated['lines'];

            $this->assertStockAvailable($lines);

            $subtotal = $this->computeSubtotal($lines);

            [$discountType, $discountValueStored, $discountAmount] = $this->resolveDiscount(
                $validated,
                $subtotal
            );

            $total = round(max($subtotal - $discountAmount, 0), 2);

            [$amountPaid, $balanceDue, $paymentMode] = $this->resolvePayment($validated, $total, $customer);

            $invoice = Invoice::create([
                'customer_id' => $customer?->id,
                'invoice_number' => null,
                'subtotal' => $subtotal,
                'discount_type' => $discountType,
                'discount_value' => $discountValueStored,
                'discount_amount' => $discountAmount,
                'total' => $total,
                'payment_mode' => $paymentMode,
                'amount_paid' => $amountPaid,
                'balance_due' => $balanceDue,
                'notes' => $validated['notes'] ?? null,
            ]);

            $invoice->update([
                'invoice_number' => sprintf('INV-%08d', $invoice->id),
            ]);

            foreach ($lines as $line) {
                $product = Product::whereKey($line['product_id'])->lockForUpdate()->firstOrFail();
                $qty = (float) $line['quantity'];
                $product->decrement('available_quantity', $qty);

                InvoiceLine::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $product->id,
                    'quantity' => $qty,
                    'unit_price' => $line['unit_price'],
                    'line_total' => $this->lineTotal($qty, $line['unit_price']),
                ]);
            }

            if ($customer !== null && $balanceDue > 0) {
                Customer::query()->whereKey($customer->id)->lockForUpdate()->increment('outstanding_balance', $balanceDue);
            }

            return $invoice->fresh()->load(['customer', 'lines.product']);
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: float, 1: float, 2: string}
     */
    private function resolvePayment(array $validated, float $total, ?Customer $customer): array
    {
        $mode = $validated['payment_mode'] ?? null;

        if ($mode === null || ! in_array($mode, ['cash', 'upi', 'partial', 'due'], true)) {
            throw ValidationException::withMessages([
                'payment_mode' => ['A valid payment_mode is required: cash, upi, partial, or due.'],
            ]);
        }

        if (in_array($mode, ['partial', 'due'], true) && $customer === null) {
            throw ValidationException::withMessages([
                'customer' => ['Customer is required for partial payment or due (credit) sales.'],
            ]);
        }

        if ($mode === 'partial' && $total <= 0) {
            throw ValidationException::withMessages([
                'payment_mode' => ['Partial payment is not valid when the invoice total is zero.'],
            ]);
        }

        $totalRounded = round($total, 2);

        return match ($mode) {
            'cash', 'upi' => $this->resolveFullPayment($validated, $totalRounded, $mode),
            'due' => [0.0, $totalRounded, 'due'],
            'partial' => $this->resolvePartialPayment($validated, $totalRounded),
            default => throw ValidationException::withMessages([
                'payment_mode' => ['Invalid payment mode.'],
            ]),
        };
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: float, 1: float, 2: string}
     */
    private function resolveFullPayment(array $validated, float $total, string $mode): array
    {
        if (array_key_exists('amount_paid', $validated) && $validated['amount_paid'] !== null) {
            $paid = round((float) $validated['amount_paid'], 2);
            if ($paid !== $total) {
                throw ValidationException::withMessages([
                    'amount_paid' => ["For {$mode} payment, amount paid must equal the invoice total ({$total})."],
                ]);
            }
        }

        return [$total, 0.0, $mode];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{0: float, 1: float, 2: string}
     */
    private function resolvePartialPayment(array $validated, float $total): array
    {
        if (! array_key_exists('amount_paid', $validated)) {
            throw ValidationException::withMessages([
                'amount_paid' => ['Amount paid is required for partial payment.'],
            ]);
        }

        $paid = round((float) $validated['amount_paid'], 2);

        if ($paid <= 0 || $paid >= $total) {
            throw ValidationException::withMessages([
                'amount_paid' => ['Partial payment must be greater than zero and less than the invoice total.'],
            ]);
        }

        $due = round($total - $paid, 2);

        return [$paid, $due, 'partial'];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolveCustomer(array $validated): ?Customer
    {
        if (! empty($validated['customer_id'])) {
            return Customer::query()->findOrFail($validated['customer_id']);
        }

        if (! empty($validated['customer'])) {
            $payload = $validated['customer'];
            $phone = Customer::normalizePhone($payload['phone']);

            if (strlen($phone) < 10 || strlen($phone) > 15) {
                throw ValidationException::withMessages([
                    'customer.phone' => ['Use 10–15 digits for the phone number.'],
                ]);
            }

            return Customer::query()->updateOrCreate(
                ['phone' => $phone],
                [
                    'name' => $payload['name'],
                    'address' => $payload['address'] ?? null,
                ]
            );
        }

        return null;
    }

    /**
     * @param  array<int, array{product_id: int, quantity: float|int|string, unit_price: float|int|string}>  $lines
     * @return array{0: ?string, 1: ?float, 2: float}
     */
    private function resolveDiscount(array $validated, float $subtotal): array
    {
        $type = $validated['discount_type'] ?? null;
        $raw = $validated['discount_value'] ?? null;

        if ($type === null || $raw === null) {
            return [null, null, 0.0];
        }

        $raw = (float) $raw;

        if ($type === 'percent') {
            $pct = min(max($raw, 0), 100);
            $amount = round($subtotal * ($pct / 100), 2);

            return ['percent', $pct, $amount];
        }

        if ($type === 'fixed') {
            $requested = max($raw, 0);
            $amount = round(min($requested, $subtotal), 2);

            return ['fixed', $requested, $amount];
        }

        return [null, null, 0.0];
    }

    /**
     * @param  array<int, array{product_id: int, quantity: float|int|string, unit_price: float|int|string}>  $lines
     */
    private function computeSubtotal(array $lines): float
    {
        $sum = 0.0;

        foreach ($lines as $line) {
            $sum += $this->lineTotal((float) $line['quantity'], $line['unit_price']);
        }

        return round($sum, 2);
    }

    private function lineTotal(float $quantity, mixed $unitPrice): float
    {
        return round($quantity * (float) $unitPrice, 2);
    }

    /**
     * @param  array<int, array{product_id: int, quantity: float|int|string}>  $lines
     */
    private function assertStockAvailable(array $lines): void
    {
        $needed = $this->aggregateQuantities($lines);
        $availability = [];

        foreach ($needed as $productId => $qty) {
            $product = Product::query()->whereKey($productId)->lockForUpdate()->firstOrFail();
            $have = round((float) $product->available_quantity, 3);
            $need = round((float) $qty, 3);

            if ($have < $need) {
                $availability[] = [
                    'product_id' => $product->id,
                    'product_code' => $product->product_id,
                    'name' => $product->name,
                    'requested' => $need,
                    'available' => $have,
                    'available_display' => $product->quantity_unit
                        ? "{$have} {$product->quantity_unit}"
                        : (string) $have,
                ];
            }
        }

        if ($availability !== []) {
            throw new HttpResponseException(response()->json([
                'message' => 'Insufficient stock for one or more products.',
                'availability' => $availability,
            ], 422));
        }
    }

    /**
     * @param  array<int, array{product_id: int, quantity: float|int|string}>  $lines
     * @return array<int, float>
     */
    private function aggregateQuantities(array $lines): array
    {
        $sums = [];

        foreach ($lines as $line) {
            $pid = (int) $line['product_id'];
            $q = (float) $line['quantity'];
            $sums[$pid] = ($sums[$pid] ?? 0) + $q;
        }

        return $sums;
    }
}
