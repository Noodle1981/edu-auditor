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
        Schema::create('modalidades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('establecimiento_id')->constrained('establecimientos')->onDelete('cascade');
            $table->string('direccion_area');
            $table->string('nivel_educativo');
            $table->string('sector')->nullable();
            $table->string('categoria')->nullable();
            $table->text('inst_legal_categoria')->nullable();
            $table->decimal('radio', 8, 2)->nullable();
            $table->string('inst_legal_radio')->nullable();
            $table->text('inst_legal_categoria_bis')->nullable();
            $table->text('inst_legal_creacion')->nullable();
            $table->string('ambito')->default('PUBLICO');
            $table->boolean('validado')->default(false);
            $table->string('estado_validacion')->default('PENDIENTE');
            $table->integer('validado_por_user_id')->nullable();
            $table->dateTime('validado_en')->nullable();
            $table->string('zona')->nullable();
            $table->text('observaciones')->nullable();
            $table->text('campos_auditados')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Run python script to seed schools database
        $process = new \Symfony\Component\Process\Process(['python', base_path('crear_base_datos_escuela.py')]);
        $process->run();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('modalidades');
    }
};
