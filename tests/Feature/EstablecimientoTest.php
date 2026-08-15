<?php

namespace Tests\Feature;

use App\Models\Modalidad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EstablecimientoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed mock data for establishments and modalities
        $edificioId = DB::table('edificios')->insertGetId([
            'cui' => 7000380,
            'calle' => 'Calle Falsa',
            'numero_puerta' => '123',
            'codigo_postal' => 5400,
            'localidad' => 'Capital',
            'latitud' => -31.5375,
            'longitud' => -68.5364,
            'zona_departamento' => 'CAPITAL',
            'punto_partida' => 'PLAZA 25 DE MAYO',
            'dist_circunf' => 13.0,
            'radio_circ' => 3,
            'distancia_camino' => 16.0,
            'radio_camino' => 3,
            'tiempo_google_auto' => '20 min',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $estId = DB::table('establecimientos')->insertGetId([
            'cue' => '700038000',
            'nombre' => 'Nocturna Juan E. Seru',
            'edificio_id' => $edificioId,
            'cue_edificio_principal' => '700038000',
            'establecimiento_cabecera' => '700038000',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('modalidades')->insert([
            'establecimiento_id' => $estId,
            'direccion_area' => 'ADULTOS',
            'nivel_educativo' => 'UEPA',
            'sector' => '600',
            'radio' => 3,
            'radio_sige' => 3,
            'ambito' => 'PUBLICO',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_admin_can_delete_modalidad(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $modalidad = Modalidad::first();

        $response = $this
            ->actingAs($user)
            ->delete("/admin/establecimientos/{$modalidad->id}");

        $response->assertRedirect();

        // Assert that the validation state was updated to ELIMINADO
        $modalidad->refresh();
        $this->assertEquals('ELIMINADO', $modalidad->estado_validacion);
        $this->assertNotNull($modalidad->deleted_at);
    }

    public function test_admin_can_update_modality_radio_value(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $modalidad = Modalidad::first();

        $response = $this
            ->actingAs($user)
            ->patchJson("/api/modalidades/{$modalidad->id}/radio", [
                'radio' => 2,
            ]);

        $response->assertOk()
            ->assertJson([
                'message' => 'Radio actualizado correctamente',
                'radio' => 2,
            ]);

        $modalidad->refresh();
        $this->assertEquals(2, $modalidad->radio);
    }

    public function test_admin_can_update_modality_observaciones_value(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $modalidad = Modalidad::first();

        $response = $this
            ->actingAs($user)
            ->patchJson("/api/modalidades/{$modalidad->id}/observaciones", [
                'observaciones' => 'Ubicado en otro edificio',
            ]);

        $response->assertOk()
            ->assertJson([
                'message' => 'Observaciones actualizadas correctamente',
                'observaciones' => 'Ubicado en otro edificio',
            ]);

        $modalidad->refresh();
        $this->assertEquals('Ubicado en otro edificio', $modalidad->observaciones);
    }
}
