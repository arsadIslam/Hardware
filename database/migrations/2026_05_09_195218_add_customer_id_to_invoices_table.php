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
        if (! Schema::hasTable('invoices')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('invoices', 'customer_id')) {
                $table->foreignId('customer_id')
                    ->nullable()
                    ->after('id')
                    ->constrained()
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('invoices') || ! Schema::hasColumn('invoices', 'customer_id')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
        });
    }
};
