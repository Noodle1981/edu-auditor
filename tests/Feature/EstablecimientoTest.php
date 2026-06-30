<?php

namespace Tests\Feature;

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

        // Seed mock data for establishments
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

        DB::table('agentes')->insert([
            'dni' => '12345678',
            'nombre_agente' => 'PEREZ, JUAN',
        ]);

        DB::table('agente_cargos')->insert([
            'dni' => '12345678',
            'cue' => 700038000,
            'cupof' => '700038000-XYZ-1',
            'situacion_revista' => 'TITULAR',
            'anio' => 2026,
        ]);
    }

    public function test_establecimientos_page_redirects_unauthenticated_users(): void
    {
        $response = $this->get('/establecimientos');
        $response->assertRedirect('/login');
    }

    public function test_establecimientos_page_is_accessible_to_authenticated_users(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/establecimientos');

        $response->assertOk();
    }

    public function test_establecimientos_api_returns_list(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->getJson('/api/establecimientos');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'cue',
                        'nombre',
                        'cupof_count',
                        'agent_count',
                        'active_agents_count',
                        'licensed_agents_count',
                        'relacion_planta_percent',
                        'reforzados_count',
                        'covered_count',
                        'uncovered_count',
                        'extra_agents_count',
                        'coverage_percent',
                    ],
                ],
                'total',
                'page',
                'limit',
                'total_pages',
            ])
            ->assertJsonFragment([
                'cue' => 700038000,
                'nombre' => 'Nocturna Juan E. Seru',
                'active_agents_count' => 1,
                'licensed_agents_count' => 0,
                'relacion_planta_percent' => 100,
                'reforzados_count' => 0,
            ]);
    }

    public function test_establecimientos_filters_api_returns_filters(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->getJson('/api/establecimientos/filters');

        $response->assertOk()
            ->assertJson([
                'direcciones' => ['ADULTOS'],
                'niveles' => ['UEPA'],
                'departamentos' => ['CAPITAL'],
            ]);
    }

    public function test_establecimientos_detail_api_returns_details(): void
    {
        $user = User::factory()->create();

        $est = DB::table('establecimientos')->first();

        $response = $this
            ->actingAs($user)
            ->getJson("/api/establecimientos/{$est->id}");

        $response->assertOk()
            ->assertJsonStructure([
                'establecimiento' => [
                    'id',
                    'cue',
                    'nombre',
                    'punto_partida',
                    'distancia_camino',
                    'radio_camino',
                    'modalidades',
                ],
                'cupofs',
            ])
            ->assertJsonPath('establecimiento.cue', 700038000)
            ->assertJsonPath('establecimiento.punto_partida', 'PLAZA 25 DE MAYO');
    }

    public function test_establecimientos_pdf_export_returns_pdf(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/api/establecimientos/reporte-pdf?search=Nocturna');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_establecimientos_api_filters_empty_schools(): void
    {
        $user = User::factory()->create();

        $secondEdificioId = DB::table('edificios')->insertGetId([
            'cui' => 7000381,
            'calle' => 'Calle Falsa 2',
            'numero_puerta' => '456',
            'codigo_postal' => 5400,
            'localidad' => 'Capital',
            'latitud' => -31.5376,
            'longitud' => -68.5365,
            'zona_departamento' => 'CAPITAL',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $secondEstId = DB::table('establecimientos')->insertGetId([
            'cue' => 700038100,
            'nombre' => 'Escuela Vacia',
            'edificio_id' => $secondEdificioId,
            'cue_edificio_principal' => 700038100,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('modalidades')->insert([
            'establecimiento_id' => $secondEstId,
            'direccion_area' => 'ADULTOS',
            'nivel_educativo' => 'UEPA',
            'sector' => '600',
            'radio' => 3,
            'radio_sige' => 3,
            'ambito' => 'PUBLICO',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // When hide_empty is NOT passed (or false), we should see both schools
        $responseAll = $this
            ->actingAs($user)
            ->getJson('/api/establecimientos');

        $responseAll->assertOk();
        $this->assertCount(2, $responseAll->json('data'));

        // When hide_empty is true, we should only see 1 school (the one with cargos)
        $responseFiltered = $this
            ->actingAs($user)
            ->getJson('/api/establecimientos?hide_empty=1');

        $responseFiltered->assertOk();
        $this->assertCount(1, $responseFiltered->json('data'));
        $responseFiltered->assertJsonFragment([
            'cue' => 700038000,
        ]);
    }

    public function test_admin_can_delete_modalidad(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $modalidad = \App\Models\Modalidad::first();

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
        $modalidad = \App\Models\Modalidad::first();

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
}
