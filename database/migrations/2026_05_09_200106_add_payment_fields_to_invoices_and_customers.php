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
        if (Schema::hasTable('customers')) {
            Schema::table('customers', function (Blueprint $table) {
                if (! Schema::hasColumn('customers', 'outstanding_balance')) {
                    $table->decimal('outstanding_balance', 12, 2)->default(0);
                }
            });
        }

        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                if (! Schema::hasColumn('invoices', 'payment_mode')) {
                    $table->string('payment_mode', 16)->default('cash');
                }
                if (! Schema::hasColumn('invoices', 'amount_paid')) {
                    $table->decimal('amount_paid', 12, 2)->default(0);
                }
                if (! Schema::hasColumn('invoices', 'balance_due')) {
                    $table->decimal('balance_due', 12, 2)->default(0);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('customers') && Schema::hasColumn('customers', 'outstanding_balance')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropColumn('outstanding_balance');
            });
        }

        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                foreach (['balance_due', 'amount_paid', 'payment_mode'] as $col) {
                    if (Schema::hasColumn('invoices', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
