<?php

namespace Tests\Feature;

use App\Models\Edificio;
use App\Models\Establecimiento;
use App\Models\Modalidad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdministrativoTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Edificio $edificio;
    protected Establecimiento $schoolEstablecimiento;
    protected Modalidad $schoolModalidad;
    protected Establecimiento $adminEstablecimiento;
    protected Modalidad $adminModalidad;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
        ]);

        $this->edificio = Edificio::create([
            'cui' => 1234567,
            'calle' => 'Calle Falsa 123',
            'localidad' => 'Capital',
            'zona_departamento' => 'CAPITAL',
            'latitud' => -31.5375,
            'longitud' => -68.5364,
        ]);

        // 1. Create a regular school modality
        $this->schoolEstablecimiento = Establecimiento::create([
            'cue' => '123456789',
            'nombre' => 'Escuela Primaria de Prueba',
            'edificio_id' => $this->edificio->id,
            'cue_edificio_principal' => '123456789',
            'establecimiento_cabecera' => '123456789',
        ]);

        $this->schoolModalidad = Modalidad::create([
            'establecimiento_id' => $this->schoolEstablecimiento->id,
            'direccion_area' => 'PRIMARIO',
            'nivel_educativo' => 'PRIMARIO',
            'sector' => '100',
            'radio' => 1,
            'ambito' => 'PUBLICO',
        ]);

        // 2. Create an administrative office modality
        $this->adminEstablecimiento = Establecimiento::create([
            'cue' => '700000000',
            'nombre' => 'Administración Central - Centro Cívico',
            'edificio_id' => $this->edificio->id,
            'cue_edificio_principal' => '700000000',
            'establecimiento_cabecera' => '700000000',
        ]);

        $this->adminModalidad = Modalidad::create([
            'establecimiento_id' => $this->adminEstablecimiento->id,
            'direccion_area' => 'ADMINISTRACIÓN',
            'nivel_educativo' => 'ADMINISTRATIVO',
            'sector' => '900',
            'radio' => 1,
            'ambito' => 'PUBLICO',
        ]);
    }

    public function test_unauthenticated_users_are_redirected(): void
    {
        $this->get('/admin/oficinas-centrales')->assertRedirect('/login');
    }

    public function test_regular_users_cannot_access_administrative_panel(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $this->actingAs($user)
            ->get('/admin/oficinas-centrales')
            ->assertForbidden(); // Role middleware aborts with 403
    }

    public function test_admin_can_access_administrative_panel(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->get('/admin/oficinas-centrales');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Oficinas/Index')
            ->has('modalidades')
            ->has('options')
        );
    }

    public function test_index_filters_only_administrative_modalities(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->get('/admin/oficinas-centrales');

        $response->assertOk();
        $data = $response->viewData('page')['props']['modalidades']['data'];
        
        $cues = collect($data)->pluck('establecimiento.cue')->toArray();
        
        // CUE for administration should be present (as integer or string)
        $this->assertContains(700000000, $cues);
        // CUE for school should NOT be present
        $this->assertNotContains(123456789, $cues);
    }

    public function test_school_index_excludes_administrative_modalities(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->get('/admin/establecimientos');

        $response->assertOk();
        $data = $response->viewData('page')['props']['modalidades']['data'];

        $cues = collect($data)->pluck('establecimiento.cue')->toArray();

        // CUE for school should be present
        $this->assertContains(123456789, $cues);
        // CUE for administration should NOT be present
        $this->assertNotContains(700000000, $cues);
    }

    public function test_can_create_administrative_office(): void
    {
        $payload = [
            'nombre_establecimiento' => 'Junta de Clasificación Primaria',
            'cue' => '700000001',
            'cui' => '1234567',
            'establecimiento_cabecera' => '700000001',
            'nivel_educativo' => 'JUNTA DE CLASIFICACIÓN',
            'direccion_area' => 'ADMINISTRACIÓN',
            'ambito' => 'PUBLICO',
            'sector' => '901',
            'radio' => 1,
            'calle' => 'Av. Libertador 750',
            'localidad' => 'Capital',
            'zona_departamento' => 'CAPITAL',
        ];

        $response = $this->actingAs($this->adminUser)
            ->post('/admin/oficinas-centrales', $payload);

        $response->assertRedirect();
        
        $this->assertDatabaseHas('establecimientos', [
            'cue' => '700000001',
            'nombre' => 'Junta de Clasificación Primaria',
        ]);
        
        $this->assertDatabaseHas('modalidades', [
            'direccion_area' => 'ADMINISTRACIÓN',
            'nivel_educativo' => 'JUNTA DE CLASIFICACIÓN',
            'sector' => '901',
        ]);
    }

    public function test_building_cabecera_and_cache_invalidation(): void
    {
        $edificioNuevo = Edificio::create([
            'cui' => 7000000,
            'calle' => 'Av. España',
            'localidad' => 'Capital',
            'zona_departamento' => 'CAPITAL',
            'latitud' => -31.5,
            'longitud' => -68.5,
        ]);

        // Cache initial names map
        Edificio::getNamesMap();

        // Store administrative modality for this new CUI
        $this->actingAs($this->adminUser)->post('/admin/oficinas-centrales', [
            'nombre_establecimiento' => 'Administración Central',
            'cue' => '700000000',
            'cui' => '7000000',
            'establecimiento_cabecera' => '700000000',
            'nivel_educativo' => 'ADMINISTRATIVO',
            'direccion_area' => 'ADMINISTRACIÓN',
            'ambito' => 'PUBLICO',
            'sector' => '900',
            'radio' => 1,
            'calle' => 'Av. España',
            'localidad' => 'Capital',
            'zona_departamento' => 'CAPITAL',
        ]);

        // After creation, cache must be invalidated and return "Administración Central"
        $this->assertEquals('Administración Central', Edificio::getNamesMap()[$edificioNuevo->id]);
    }
}
