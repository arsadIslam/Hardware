<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        $query = Customer::query()->orderBy('name');

        if ($request->filled('phone')) {
            $phone = Customer::normalizePhone((string) $request->query('phone'));
            if ($phone !== '') {
                $query->where('phone', $phone);
            }
        }

        if ($request->filled('search')) {
            $term = '%'.$request->query('search').'%';
            $query->where(function ($q) use ($term): void {
                $q->where('name', 'like', $term)
                    ->orWhere('phone', 'like', $term)
                    ->orWhere('address', 'like', $term);
            });
        }

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:5000'],
        ]);

        $validated['phone'] = Customer::normalizePhone($validated['phone']);

        if (strlen($validated['phone']) < 10 || strlen($validated['phone']) > 15) {
            throw ValidationException::withMessages([
                'phone' => ['Use 10–15 digits for the phone number.'],
            ]);
        }

        if (Customer::query()->where('phone', $validated['phone'])->exists()) {
            throw ValidationException::withMessages([
                'phone' => ['This phone is already registered.'],
            ]);
        }

        $customer = Customer::create($validated);

        return response()->json($customer, 201);
    }

    public function show(Customer $customer)
    {
        return response()->json($customer->loadCount('invoices'));
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:5000'],
        ]);

        if (array_key_exists('phone', $validated)) {
            $validated['phone'] = Customer::normalizePhone($validated['phone']);

            if (strlen($validated['phone']) < 10 || strlen($validated['phone']) > 15) {
                throw ValidationException::withMessages([
                    'phone' => ['Use 10–15 digits for the phone number.'],
                ]);
            }

            $exists = Customer::query()
                ->where('phone', $validated['phone'])
                ->whereKeyNot($customer->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'phone' => ['This phone is already registered.'],
                ]);
            }
        }

        $customer->update($validated);

        return response()->json($customer->fresh());
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return response()->noContent();
    }

}
