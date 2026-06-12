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
        Schema::create('edificios', function (Blueprint $table) {
            $table->id();
            $table->integer('cui');
            $table->string('calle');
            $table->string('numero_puerta')->nullable();
            $table->string('orientacion')->nullable();
            $table->integer('codigo_postal')->nullable();
            $table->string('localidad');
            $table->decimal('latitud', 10, 8);
            $table->decimal('longitud', 11, 8);
            $table->string('letra_zona')->nullable();
            $table->string('zona_departamento');
            $table->string('te_voip')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('edificios');
    }
};
