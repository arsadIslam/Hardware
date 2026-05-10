<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SalesReportController extends Controller
{
    /**
     * Total sales report: month, full year (month-by-month), custom date range, or current month by default.
     */
    public function index(Request $request)
    {
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        if (($request->filled('from') || $request->filled('to')) && ($request->filled('year') || $request->filled('month'))) {
            throw ValidationException::withMessages([
                'period' => ['Use either from/to or year/month, not both.'],
            ]);
        }

        if ($request->filled('month') && ! $request->filled('year')) {
            throw ValidationException::withMessages([
                'year' => ['year is required when month is set.'],
            ]);
        }

        if ($request->filled('from') xor $request->filled('to')) {
            throw ValidationException::withMessages([
                'from' => ['Both from and to are required for a custom date range.'],
            ]);
        }

        $tz = config('app.timezone');

        $period = $this->resolvePeriod($request, $tz);

        $summary = $this->buildSummary($period['start'], $period['end']);

        $breakdown = match ($period['mode']) {
            'year' => $this->monthlyBreakdown((int) $period['year'], $tz),
            default => $this->dailyBreakdown($period['start'], $period['end']),
        };

        return response()->json([
            'period' => $this->periodPayload($period),
            'summary' => $summary,
            'breakdown' => $breakdown,
        ]);
    }

    /**
     * @return array{mode: string, start: Carbon, end: Carbon, year?: int, month?: int}
     */
    private function resolvePeriod(Request $request, string $tz): array
    {
        if ($request->filled('from') && $request->filled('to')) {
            $start = Carbon::parse($request->query('from'), $tz)->startOfDay();
            $end = Carbon::parse($request->query('to'), $tz)->endOfDay();
            if ($start->greaterThan($end)) {
                throw ValidationException::withMessages([
                    'to' => ['The end date must be on or after the start date.'],
                ]);
            }

            return ['mode' => 'range', 'start' => $start, 'end' => $end];
        }

        if ($request->filled('year')) {
            $year = (int) $request->query('year');

            if ($request->filled('month')) {
                $month = (int) $request->query('month');
                $start = Carbon::create($year, $month, 1, 0, 0, 0, $tz)->startOfMonth();
                $end = (clone $start)->endOfMonth();

                return [
                    'mode' => 'month',
                    'start' => $start,
                    'end' => $end,
                    'year' => $year,
                    'month' => $month,
                ];
            }

            $start = Carbon::create($year, 1, 1, 0, 0, 0, $tz)->startOfYear();
            $end = Carbon::create($year, 12, 31, 23, 59, 59, $tz)->endOfYear();

            return ['mode' => 'year', 'start' => $start, 'end' => $end, 'year' => $year];
        }

        $start = Carbon::now($tz)->startOfMonth();
        $end = Carbon::now($tz)->endOfMonth();

        return [
            'mode' => 'month',
            'start' => $start,
            'end' => $end,
            'year' => (int) $start->format('Y'),
            'month' => (int) $start->format('n'),
        ];
    }

    /**
     * @param  array{mode: string, start: Carbon, end: Carbon, year?: int, month?: int}  $period
     */
    private function periodPayload(array $period): array
    {
        $base = [
            'mode' => $period['mode'],
            'starts_at' => $period['start']->toIso8601String(),
            'ends_at' => $period['end']->toIso8601String(),
        ];

        if (isset($period['year'])) {
            $base['year'] = $period['year'];
        }

        if (isset($period['month'])) {
            $base['month'] = $period['month'];
        }

        return $base;
    }

    private function buildSummary(Carbon $start, Carbon $end): array
    {
        $agg = Invoice::query()
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('COUNT(*) as invoice_count')
            ->selectRaw('COALESCE(SUM(subtotal), 0) as gross_sales')
            ->selectRaw('COALESCE(SUM(discount_amount), 0) as total_discount')
            ->selectRaw('COALESCE(SUM(total), 0) as net_sales')
            ->first();

        return [
            'invoice_count' => (int) ($agg->invoice_count ?? 0),
            'gross_sales' => round((float) ($agg->gross_sales ?? 0), 2),
            'total_discount' => round((float) ($agg->total_discount ?? 0), 2),
            'net_sales' => round((float) ($agg->net_sales ?? 0), 2),
        ];
    }

    /**
     * @return list<array{date: string, invoice_count: int, gross_sales: float, total_discount: float, net_sales: float}>
     */
    private function dailyBreakdown(Carbon $start, Carbon $end): array
    {
        $driver = Invoice::query()->getConnection()->getDriverName();

        $dateExpr = match ($driver) {
            'sqlite' => "strftime('%Y-%m-%d', created_at)",
            default => 'DATE(created_at)',
        };

        $rows = Invoice::query()
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw("{$dateExpr} as bucket")
            ->selectRaw('COUNT(*) as invoice_count')
            ->selectRaw('COALESCE(SUM(subtotal), 0) as gross_sales')
            ->selectRaw('COALESCE(SUM(discount_amount), 0) as total_discount')
            ->selectRaw('COALESCE(SUM(total), 0) as net_sales')
            ->groupByRaw($dateExpr)
            ->orderBy('bucket')
            ->get();

        return $rows->map(function ($row): array {
            return [
                'date' => (string) $row->bucket,
                'invoice_count' => (int) $row->invoice_count,
                'gross_sales' => round((float) $row->gross_sales, 2),
                'total_discount' => round((float) $row->total_discount, 2),
                'net_sales' => round((float) $row->net_sales, 2),
            ];
        })->values()->all();
    }

    /**
     * @return list<array{month: int, month_name: string, invoice_count: int, gross_sales: float, total_discount: float, net_sales: float}>
     */
    private function monthlyBreakdown(int $year, string $tz): array
    {
        $driver = Invoice::query()->getConnection()->getDriverName();

        $monthExpr = match ($driver) {
            'sqlite' => "cast(strftime('%m', created_at) as integer)",
            default => 'MONTH(created_at)',
        };

        $start = Carbon::create($year, 1, 1, 0, 0, 0, $tz)->startOfYear();
        $end = Carbon::create($year, 12, 31, 23, 59, 59, $tz)->endOfYear();

        $byMonth = Invoice::query()
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw("{$monthExpr} as month_num")
            ->selectRaw('COUNT(*) as invoice_count')
            ->selectRaw('COALESCE(SUM(subtotal), 0) as gross_sales')
            ->selectRaw('COALESCE(SUM(discount_amount), 0) as total_discount')
            ->selectRaw('COALESCE(SUM(total), 0) as net_sales')
            ->groupByRaw($monthExpr)
            ->orderBy('month_num')
            ->get()
            ->keyBy(fn ($row) => (int) $row->month_num);

        $out = [];

        for ($m = 1; $m <= 12; $m++) {
            $row = $byMonth->get($m);
            $startMonth = Carbon::create($year, $m, 1, 0, 0, 0, $tz);

            $out[] = [
                'month' => $m,
                'month_name' => $startMonth->translatedFormat('F'),
                'invoice_count' => $row ? (int) $row->invoice_count : 0,
                'gross_sales' => $row ? round((float) $row->gross_sales, 2) : 0.0,
                'total_discount' => $row ? round((float) $row->total_discount, 2) : 0.0,
                'net_sales' => $row ? round((float) $row->net_sales, 2) : 0.0,
            ];
        }

        return $out;
    }
}
