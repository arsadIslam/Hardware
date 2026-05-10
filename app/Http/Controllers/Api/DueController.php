<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\DuePayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DueController extends Controller
{
    /**
     * Customers who owe money (outstanding_balance > 0), with portfolio summary.
     */
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        $owing = Customer::query()->where('outstanding_balance', '>', 0);

        $summary = [
            'total_outstanding' => round((float) (clone $owing)->sum('outstanding_balance'), 2),
            'customers_with_due' => (clone $owing)->count(),
        ];

        $customers = Customer::query()
            ->where('outstanding_balance', '>', 0)
            ->orderByDesc('outstanding_balance')
            ->paginate($perPage);

        return response()->json([
            'summary' => $summary,
            'customers' => $customers,
        ]);
    }

    /**
     * Record cash/UPI applied against a customer's due balance.
     */
    public function collectPayment(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_mode' => ['required', Rule::in(['cash', 'upi'])],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $amount = round((float) $validated['amount'], 2);

        $record = DB::transaction(function () use ($validated, $amount) {
            $customer = Customer::query()
                ->whereKey($validated['customer_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $outstanding = round((float) $customer->outstanding_balance, 2);

            if ($outstanding <= 0) {
                throw ValidationException::withMessages([
                    'customer_id' => ['This customer has no outstanding balance.'],
                ]);
            }

            if ($amount > $outstanding) {
                throw ValidationException::withMessages([
                    'amount' => ["Amount cannot exceed outstanding balance ({$outstanding})."],
                ]);
            }

            $customer->decrement('outstanding_balance', $amount);

            return DuePayment::create([
                'customer_id' => $customer->id,
                'amount' => $amount,
                'payment_mode' => $validated['payment_mode'],
                'notes' => $validated['notes'] ?? null,
            ]);
        });

        return response()->json([
            'message' => 'Payment recorded.',
            'due_payment' => $record->load('customer'),
            'customer' => Customer::query()->findOrFail($validated['customer_id']),
        ], 201);
    }

    /**
     * History of due collections (newest first).
     */
    public function payments(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        $query = DuePayment::query()->with('customer')->latest();

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->integer('customer_id'));
        }

        return response()->json($query->paginate($perPage));
    }
}
