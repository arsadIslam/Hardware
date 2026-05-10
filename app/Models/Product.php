<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'name',
        'selling_price',
        'buying_price',
        'available_quantity',
        'quantity_unit',
        'location',
    ];

    protected function casts(): array
    {
        return [
            'selling_price' => 'decimal:2',
            'buying_price' => 'decimal:2',
            'available_quantity' => 'decimal:3',
        ];
    }
}
