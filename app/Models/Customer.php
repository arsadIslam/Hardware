<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'address',
    ];

    protected function casts(): array
    {
        return [
            'outstanding_balance' => 'decimal:2',
        ];
    }

    public static function normalizePhone(string $phone): string
    {
        return preg_replace('/\D/', '', $phone);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function duePayments(): HasMany
    {
        return $this->hasMany(DuePayment::class);
    }
}

