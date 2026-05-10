<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\SaleService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SaleController extends Controller
{
    public function __construct(
        protected SaleService $saleService
    ) {}

    public function index(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        $invoices = Invoice::query()
            ->with(['customer', 'lines.product'])
            ->latest()
            ->paginate($perPage);

        return response()->json($invoices);
    }

    public function show(Invoice $invoice)
    {
        return response()->json($invoice->load(['customer', 'lines.product']));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'customer' => ['nullable', 'array'],
            'customer.name' => ['required_with:customer', 'string', 'max:255'],
            'customer.phone' => ['required_with:customer', 'string', 'max:32'],
            'customer.address' => ['nullable', 'string', 'max:5000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
            'discount_type' => ['nullable', Rule::in(['percent', 'fixed'])],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'payment_mode' => ['required', Rule::in(['cash', 'upi', 'partial', 'due'])],
            'amount_paid' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        if (! empty($validated['customer_id']) && ! empty($validated['customer'])) {
            throw ValidationException::withMessages([
                'customer' => ['Send either customer_id or customer details, not both.'],
            ]);
        }

        if ($request->filled('discount_type') && ! $request->has('discount_value')) {
            throw ValidationException::withMessages([
                'discount_value' => ['Discount value is required when discount type is set.'],
            ]);
        }

        if ($request->has('discount_value') && ! $request->filled('discount_type')) {
            throw ValidationException::withMessages([
                'discount_type' => ['Discount type is required when discount value is sent.'],
            ]);
        }

        if (($validated['discount_type'] ?? null) === 'percent' && isset($validated['discount_value']) && (float) $validated['discount_value'] > 100) {
            throw ValidationException::withMessages([
                'discount_value' => ['Percentage discount cannot exceed 100.'],
            ]);
        }

        $invoice = $this->saleService->createSale($validated);

        return response()->json([
            'message' => 'Sale recorded.',
            'invoice' => $invoice,
        ], 201);
    }
}
