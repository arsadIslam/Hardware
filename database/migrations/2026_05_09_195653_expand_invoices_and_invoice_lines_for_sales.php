<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                if (! Schema::hasColumn('invoices', 'invoice_number')) {
                    $table->string('invoice_number')->nullable()->unique();
                }
                if (! Schema::hasColumn('invoices', 'subtotal')) {
                    $table->decimal('subtotal', 12, 2)->default(0);
                }
                if (! Schema::hasColumn('invoices', 'discount_type')) {
                    $table->string('discount_type', 16)->nullable();
                }
                if (! Schema::hasColumn('invoices', 'discount_value')) {
                    $table->decimal('discount_value', 12, 2)->nullable();
                }
                if (! Schema::hasColumn('invoices', 'discount_amount')) {
                    $table->decimal('discount_amount', 12, 2)->default(0);
                }
                if (! Schema::hasColumn('invoices', 'total')) {
                    $table->decimal('total', 12, 2)->default(0);
                }
                if (! Schema::hasColumn('invoices', 'notes')) {
                    $table->text('notes')->nullable();
                }
            });
        }

        if (Schema::hasTable('invoice_lines')) {
            Schema::table('invoice_lines', function (Blueprint $table) {
                if (! Schema::hasColumn('invoice_lines', 'invoice_id')) {
                    $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
                }
                if (! Schema::hasColumn('invoice_lines', 'product_id')) {
                    $table->foreignId('product_id')->constrained()->restrictOnDelete();
                }
                if (! Schema::hasColumn('invoice_lines', 'quantity')) {
                    $table->decimal('quantity', 12, 3);
                }
                if (! Schema::hasColumn('invoice_lines', 'unit_price')) {
                    $table->decimal('unit_price', 12, 2);
                }
                if (! Schema::hasColumn('invoice_lines', 'line_total')) {
                    $table->decimal('line_total', 12, 2);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('invoice_lines')) {
            Schema::table('invoice_lines', function (Blueprint $table) {
                if (Schema::hasColumn('invoice_lines', 'product_id')) {
                    $table->dropForeign(['product_id']);
                }
                if (Schema::hasColumn('invoice_lines', 'invoice_id')) {
                    $table->dropForeign(['invoice_id']);
                }
                $cols = ['line_total', 'unit_price', 'quantity', 'product_id', 'invoice_id'];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('invoice_lines', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                foreach (['notes', 'total', 'discount_amount', 'discount_value', 'discount_type', 'subtotal', 'invoice_number'] as $col) {
                    if (Schema::hasColumn('invoices', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
