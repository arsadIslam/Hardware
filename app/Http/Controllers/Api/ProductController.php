<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        $query = Product::query()->orderBy('name');

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $like = '%'.$search.'%';
                $q->where('name', 'like', $like)
                    ->orWhere('product_id', 'like', $like)
                    ->orWhere('location', 'like', $like);
            });
        }

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['nullable', 'string', 'max:255', Rule::unique('products', 'product_id')],
            'name' => ['required', 'string', 'max:255'],
            'image' => ['nullable', 'image', 'max:5120'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'buying_price' => ['nullable', 'numeric', 'min:0'],
            'available_quantity' => ['required', 'numeric', 'min:0'],
            'quantity_unit' => ['nullable', 'string', 'max:16'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);

        $sku = isset($validated['product_id']) ? trim((string) $validated['product_id']) : '';
        if ($sku === '') {
            $validated['product_id'] = $this->generateUniqueProductId();
        } else {
            $validated['product_id'] = $sku;
        }

        if ($request->hasFile('image')) {
            $validated['image_path'] = $this->storeUploadedImage($request->file('image'));
        }
        unset($validated['image']);

        $product = Product::create($validated);

        return response()->json($product, 201);
    }

    /**
     * Next sequential SKU: HW-000001, HW-000002, … Uses row lock so concurrent creates stay unique.
     */
    private function generateUniqueProductId(): string
    {
        return DB::transaction(function (): string {
            $last = Product::query()->orderByDesc('id')->lockForUpdate()->first();
            $nextId = ($last?->id ?? 0) + 1;
            $candidate = $this->formatProductSku($nextId);
            $guard = 0;
            while (
                Product::query()->where('product_id', $candidate)->exists()
                && $guard < 10_000
            ) {
                $nextId++;
                $candidate = $this->formatProductSku($nextId);
                $guard++;
            }

            return $candidate;
        });
    }

    private function formatProductSku(int $n): string
    {
        return 'HW-'.str_pad((string) $n, 6, '0', STR_PAD_LEFT);
    }

    public function show(Product $product)
    {
        return response()->json($product);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'product_id' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('products', 'product_id')->ignore($product->id),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'image' => ['nullable', 'image', 'max:5120'],
            'selling_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'buying_price' => ['nullable', 'numeric', 'min:0'],
            'available_quantity' => ['sometimes', 'required', 'numeric', 'min:0'],
            'quantity_unit' => ['nullable', 'string', 'max:16'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);

        if ($request->hasFile('image')) {
            $this->deleteStoredImage($product->image_path);
            $validated['image_path'] = $this->storeUploadedImage($request->file('image'));
        }

        unset($validated['image']);

        $product->update($validated);

        return response()->json($product->fresh());
    }

    public function destroy(Product $product)
    {
        $this->deleteStoredImage($product->image_path);
        $product->delete();

        return response()->noContent();
    }

    private function storeUploadedImage(UploadedFile $file): string
    {
        return $file->store('products', 'public');
    }

    private function deleteStoredImage(?string $path): void
    {
        if ($path === null || $path === '') {
            return;
        }

        Storage::disk('public')->delete($path);
    }
}
