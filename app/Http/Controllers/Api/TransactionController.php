<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    /**
     * Latest payment activity: due collections + money received on sales (cash / UPI / partial at counter).
     */
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        $duePayments = DB::table('due_payments')
            ->select([
                DB::raw("'due_collection' as transaction_type"),
                'id as reference_id',
                'amount',
                'payment_mode',
                'customer_id',
                'created_at',
                DB::raw('null as invoice_number'),
                'notes',
            ]);

        $salePayments = DB::table('invoices')
            ->select([
                DB::raw("'sale_payment' as transaction_type"),
                'id as reference_id',
                DB::raw('amount_paid as amount'),
                'payment_mode',
                'customer_id',
                'created_at',
                'invoice_number',
                DB::raw('null as notes'),
            ])
            ->where('amount_paid', '>', 0);

        $union = $duePayments->unionAll($salePayments);

        $paginator = DB::query()
            ->fromSub($union, 'transactions')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $customerIds = collect($paginator->items())
            ->pluck('customer_id')
            ->filter()
            ->unique()
            ->values();

        $customers = Customer::query()
            ->whereIn('id', $customerIds)
            ->get(['id', 'name', 'phone'])
            ->keyBy('id');

        return $paginator->through(function (object $row) use ($customers): array {
            return [
                'type' => $row->transaction_type,
                'reference_id' => (int) $row->reference_id,
                'amount' => number_format((float) $row->amount, 2, '.', ''),
                'payment_mode' => $row->payment_mode,
                'paid_at' => $row->created_at,
                'customer' => $row->customer_id
                    ? $customers->get((int) $row->customer_id)?->only(['id', 'name', 'phone'])
                    : null,
                'invoice_number' => $row->invoice_number,
                'notes' => $row->notes,
            ];
        });
    }
}
