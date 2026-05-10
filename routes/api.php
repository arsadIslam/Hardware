<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DueController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\SalesReportController;
use App\Http\Controllers\Api\TransactionController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::apiResource('products', ProductController::class);
    Route::apiResource('customers', CustomerController::class);

    Route::get('/sales', [SaleController::class, 'index']);
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales/{invoice}', [SaleController::class, 'show']);

    Route::get('/dues', [DueController::class, 'index']);
    Route::post('/dues/collect', [DueController::class, 'collectPayment']);
    Route::get('/dues/payments', [DueController::class, 'payments']);

    Route::get('/transactions', [TransactionController::class, 'index']);

    Route::get('/reports/sales', [SalesReportController::class, 'index']);
});
