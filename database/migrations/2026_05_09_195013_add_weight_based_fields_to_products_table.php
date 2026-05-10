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
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('available_quantity', 12, 3)->default(0)->change();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->string('quantity_unit', 16)->nullable()->after('available_quantity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('quantity_unit');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('available_quantity')->default(0)->change();
        });
    }
};
