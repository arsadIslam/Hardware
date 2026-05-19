<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'name',
        'image_path',
        'selling_price',
        'buying_price',
        'available_quantity',
        'quantity_unit',
        'location',
    ];

    protected $appends = [
        'image_url',
    ];

    protected function casts(): array
    {
        return [
            'selling_price' => 'decimal:2',
            'buying_price' => 'decimal:2',
            'available_quantity' => 'decimal:3',
        ];
    }

    protected function imageUrl(): Attribute
    {
        return Attribute::get(function (): ?string {
            if ($this->image_path === null || $this->image_path === '') {
                return null;
            }

            return Storage::disk('public')->url($this->image_path);
        });
    }
}
