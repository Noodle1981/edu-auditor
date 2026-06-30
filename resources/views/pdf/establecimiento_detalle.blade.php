<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Detalle de Establecimiento - {{ $est->nombre }} - SIAME</title>
    <style>
        @page {
            margin: 1.2cm 1.2cm 1.2cm 1.2cm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 10px;
            color: #333333;
            line-height: 1.4;
        }
        header {
            margin-bottom: 15px;
            border-bottom: 3px solid #FE8204;
            padding-bottom: 8px;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
        }
        .header-table td {
            vertical-align: middle;
            border: none;
        }
        .logo-title {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
            letter-spacing: -0.5px;
        }
        .logo-sub {
            font-size: 10px;
            color: #FE8204;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 2px;
        }
        .report-meta {
            text-align: right;
            font-size: 9px;
            color: #6B7280;
        }
        .section-title {
            font-size: 11px;
            font-weight: bold;
            color: #111827;
            text-transform: uppercase;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 4px;
            margin-top: 15px;
            margin-bottom: 10px;
        }
        /* Grid for details */
        .info-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .info-grid td {
            padding: 6px 8px;
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            font-size: 9px;
        }
        .info-grid .label {
            font-weight: bold;
            color: #6B7280;
            text-transform: uppercase;
            font-size: 8px;
            width: 25%;
        }
        .info-grid .val {
            color: #111827;
            font-weight: bold;
            width: 25%;
        }
        /* Summary KPIs */
        .summary-table {
            width: 100%;
            margin-bottom: 15px;
            border-collapse: collapse;
        }
        .summary-table td {
            width: 25%;
            padding: 0 4px;
        }
        .summary-card {
            background-color: #FAFAFA;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 8px;
            text-align: center;
        }
        .summary-val {
            font-size: 14px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 2px;
        }
        .summary-lbl {
            font-size: 7.5px;
            color: #6B7280;
            text-transform: uppercase;
            font-weight: bold;
        }
        .summary-sub {
            font-size: 8px;
            color: #4B5563;
            margin-top: 2px;
            font-weight: bold;
        }
        /* Modality Table */
        .modality-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .modality-table th {
            background-color: #F3F4F6;
            color: #374151;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 8px;
            padding: 6px 8px;
            border: 1px solid #E5E7EB;
        }
        .modality-table td {
            padding: 6px 8px;
            border: 1px solid #E5E7EB;
            font-size: 9px;
        }
        /* CUPOFs Hierarchy tree style */
        .cupof-block {
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            margin-bottom: 10px;
            background-color: #FFFFFF;
            page-break-inside: avoid;
        }
        .cupof-header {
            background-color: #F9FAFB;
            padding: 8px 10px;
            border-bottom: 1px solid #E5E7EB;
        }
        .cupof-title {
            font-weight: bold;
            color: #111827;
            font-size: 10px;
        }
        .cupof-sub {
            font-size: 8.5px;
            color: #4B5563;
            margin-top: 2px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .cupof-agents {
            padding: 8px 10px;
        }
        .agent-row {
            margin-bottom: 6px;
            padding-bottom: 6px;
            border-bottom: 1px dashed #F3F4F6;
        }
        .agent-row:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        .agent-indent-1 {
            margin-left: 15px;
            padding-left: 10px;
            border-left: 1px dashed #D1D5DB;
        }
        .agent-indent-2 {
            margin-left: 30px;
            padding-left: 10px;
            border-left: 1px dashed #D1D5DB;
        }
        .agent-indent-3 {
            margin-left: 45px;
            padding-left: 10px;
            border-left: 1px dashed #D1D5DB;
        }
        .agent-header {
            font-size: 9px;
        }
        .agent-revista {
            display: inline-block;
            padding: 1px 4px;
            font-size: 7.5px;
            font-weight: bold;
            border-radius: 3px;
            text-transform: uppercase;
            margin-right: 4px;
        }
        .rev-titular { background-color: #F3E8FF; color: #6B21A8; }
        .rev-interino { background-color: #DBEAFE; color: #1E40AF; }
        .rev-suplente { background-color: #FEF3C7; color: #92400E; }
        .rev-reemplazante { background-color: #FFE4E6; color: #9F1239; }
        .rev-otro { background-color: #F3F4F6; color: #374151; }

        .agent-name {
            font-weight: bold;
            color: #111827;
        }
        .agent-meta {
            font-size: 8px;
            color: #6B7280;
            margin-top: 1px;
        }
        .agent-status-badge {
            float: right;
            padding: 2px 5px;
            font-size: 7.5px;
            font-weight: bold;
            border-radius: 10px;
            text-transform: uppercase;
        }
        .status-activo { background-color: #DEF7EC; color: #03543F; }
        .status-licencia { background-color: #FDE8E8; color: #9B1C1C; }
        
        .licencia-detail-box {
            background-color: #FDF2F2;
            border: 1px solid #FDE8E8;
            border-radius: 6px;
            padding: 5px 8px;
            font-size: 8px;
            color: #9B1C1C;
            margin-top: 4px;
            font-weight: bold;
        }
        .replacement-detail-box {
            background-color: #FFF7ED;
            border: 1px solid #FFEDD5;
            border-radius: 6px;
            padding: 5px 8px;
            font-size: 8px;
            color: #C2410C;
            margin-top: 4px;
            font-weight: bold;
        }
        .footer-note {
            text-align: center;
            font-size: 7.5px;
            color: #9CA3AF;
            margin-top: 20px;
            border-top: 1px solid #E5E7EB;
            padding-top: 6px;
        }
    </style>
</head>
<body>

    <header>
        <table class="header-table">
            <tr>
                <td>
                    <div class="logo-title">SIAME AUDITORÍA</div>
                    <div class="logo-sub">Detalle de Establecimiento y Planta Orgánica Funcional</div>
                </td>
                <td class="report-meta">
                    <strong>CUE: {{ $est->cue }}</strong><br>
                    Ciclo Lectivo: {{ $year }}<br>
                    Generado el: {{ $generated_at }}
                </td>
            </tr>
        </table>
    </header>

    <div class="section-title">Información Física e Infraestructura</div>
    <table class="info-grid">
        <tr>
            <td class="label">Establecimiento</td>
            <td class="val" colspan="3">{{ $est->nombre }}</td>
        </tr>
        <tr>
            <td class="label">Domicilio</td>
            <td class="val" colspan="3">{{ $est->calle ?: 'S/D' }} {{ $est->numero_puerta }}</td>
        </tr>
        <tr>
            <td class="label">Localidad</td>
            <td class="val">{{ $est->localidad ?: 'S/D' }}</td>
            <td class="label">Departamento</td>
            <td class="val">{{ $est->zona_departamento ?: 'S/D' }}</td>
        </tr>
        <tr>
            <td class="label">CUI Edificio</td>
            <td class="val">{{ $est->cui ?: 'S/D' }}</td>
            <td class="label">CUE Principal</td>
            <td class="val">{{ $est->cue_edificio_principal ?: 'S/D' }}</td>
        </tr>
        <tr>
            <td class="label">Zona / Letra</td>
            <td class="val">{{ $est->letra_zona ?: 'S/D' }}</td>
            <td class="label">Teléfono VoIP</td>
            <td class="val">{{ $est->te_voip ?: 'S/D' }}</td>
        </tr>
        <tr>
            <td class="label">Dist. Km 0 (Camino)</td>
            <td class="val">
                @if($est->distancia_camino !== null)
                    {{ number_format((float) $est->distancia_camino, 2) }} km
                @else
                    S/D
                @endif
            </td>
            <td class="label">Tiempo Google (Auto)</td>
            <td class="val">
                @if($est->tiempo_google_auto !== null)
                    {{ number_format((float) $est->tiempo_google_auto, 0) }} min
                @else
                    S/D
                @endif
            </td>
        </tr>
    </table>

    <div class="section-title">Modalidades y Creación Legal</div>
    <table class="modality-table">
        <thead>
            <tr>
                <th width="35%">Área / Nivel</th>
                <th width="15%">Radio Teórico</th>
                <th width="15%">Radio SiGE</th>
                <th width="20%">Creación Legal</th>
                <th width="15%">Validación</th>
            </tr>
        </thead>
        <tbody>
            @if(empty($est->modalidades))
                <tr>
                    <td colspan="5" style="text-align: center; color: #9CA3AF;">Sin modalidades registradas.</td>
                </tr>
            @else
                @foreach($est->modalidades as $mod)
                    <tr>
                        <td>
                            <strong>{{ $mod->direccion_area }}</strong><br>
                            <span style="color: #6B7280; font-size: 8px;">{{ $mod->nivel_educativo }}</span>
                        </td>
                        <td style="text-align: center; font-weight: bold;">
                            Radio {{ $mod->radio ? (float)$mod->radio : 'S/D' }}
                        </td>
                        <td style="text-align: center; color: #4B5563;">
                            {{ $mod->radio_sige !== null ? $mod->radio_sige : 'S/D' }}
                        </td>
                        <td style="font-size: 8px; color: #6B7280;">
                            {{ $mod->inst_legal_creacion ?: 'S/D' }}
                        </td>
                        <td style="text-align: center; font-weight: bold; color: {{ $mod->estado_validacion === 'CORRECTO' ? '#03543F' : '#92400E' }};">
                            {{ $mod->estado_validacion ?: 'PENDIENTE' }}
                        </td>
                    </tr>
                @endforeach
            @endif
        </tbody>
    </table>

    <div class="section-title">Resumen de Auditoría de Planta (POF vs PON)</div>
    <table class="summary-table">
        <tr>
            <td>
                <div class="summary-card" style="border-left: 3px solid #3B82F6;">
                    <div class="summary-val">{{ $summary['relacionPlantaPercent'] }}%</div>
                    <div class="summary-lbl">Planta Nominal</div>
                    <div class="summary-sub">{{ $summary['totalAgents'] }} Agentes vs {{ $summary['totalCupofs'] }} Plazas</div>
                </div>
            </td>
            <td>
                <div class="summary-card" style="border-left: 3px solid #10B981;">
                    <div class="summary-val">{{ $summary['covered'] }} / {{ $summary['totalCupofs'] }}</div>
                    <div class="summary-lbl">Plazas Cubiertas</div>
                    <div class="summary-sub">{{ $summary['activeAgents'] }} Activos en Aula</div>
                </div>
            </td>
            <td>
                <div class="summary-card" style="border-left: 3px solid #EF4444;">
                    <div class="summary-val">{{ $summary['uncovered'] }}</div>
                    <div class="summary-lbl">Sin Cobertura</div>
                    <div class="summary-sub">{{ $summary['licensedAgents'] }} de Licencia</div>
                </div>
            </td>
            <td>
                <div class="summary-card" style="border-left: 3px solid #F59E0B;">
                    <div class="summary-val">+{{ $summary['extraAgents'] }}</div>
                    <div class="summary-lbl">Extras (Sobrecarga)</div>
                    <div class="summary-sub">{{ $summary['reforzadosCount'] }} Plazas Reforzadas</div>
                </div>
            </td>
        </tr>
    </table>

    <div class="section-title">Estructura de Cargos y Coberturas (CUPOF)</div>
    @if(empty($cupofs))
        <div style="text-align: center; color: #9CA3AF; padding: 20px; border: 1px dashed #E5E7EB; border-radius: 8px;">
            Plaza sin cargos registrados.
        </div>
    @else
        @foreach($cupofs as $c)
            <div class="cupof-block">
                <div class="cupof-header">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="font-weight: bold; font-size: 10px; color: #111827; border: none; padding: 0;">
                                CUPOF: {{ $c['cupof'] }}
                            </td>
                            <td style="text-align: right; font-size: 9px; color: #4B5563; font-weight: bold; border: none; padding: 0;">
                                {{ $c['turno'] ?: 'TURNO S/D' }} | {{ $c['horas_catedra'] ?? 0 }} HS
                            </td>
                        </tr>
                    </table>
                    <div class="cupof-sub">{{ $c['cargo_horas'] ?: 'Cargo sin denominación' }}</div>
                </div>
                <div class="cupof-agents">
                    @if(empty($c['agents']))
                        <div style="font-style: italic; color: #9CA3AF; font-size: 9px;">CUPOF vacío. Plaza sin cobertura registrada.</div>
                    @else
                        @php
                            // Reconstruct hierarchical sorted list
                            $titularesInterinos = $c['hierarchy']['titulares_interinos'] ?? [];
                            $suplentes = $c['hierarchy']['suplentes'] ?? [];
                            $reemplazantes = $c['hierarchy']['reemplazantes'] ?? [];
                            $otros = $c['hierarchy']['otros'] ?? [];
                            
                            $sortedAgents = [];
                            $currentLevel = 0;
                            foreach ($titularesInterinos as $a) {
                                $a->level = $currentLevel;
                                $sortedAgents[] = $a;
                            }
                            if (!empty($titularesInterinos)) $currentLevel = 1;
                            
                            $currentLevel = max(1, $currentLevel);
                            foreach ($suplentes as $idx => $a) {
                                $a->level = $currentLevel + $idx;
                                $sortedAgents[] = $a;
                            }
                            if (!empty($suplentes)) $currentLevel += count($suplentes);
                            
                            $currentLevel = max(2, $currentLevel);
                            foreach ($reemplazantes as $idx => $a) {
                                $a->level = $currentLevel + $idx;
                                $sortedAgents[] = $a;
                            }
                            if (!empty($reemplazantes)) $currentLevel += count($reemplazantes);
                            
                            $currentLevel = max(3, $currentLevel);
                            foreach ($otros as $idx => $a) {
                                $a->level = $currentLevel + $idx;
                                $sortedAgents[] = $a;
                            }
                            
                            $sortedCount = count($sortedAgents);
                        @endphp
                        
                        @foreach($sortedAgents as $agentIdx => $agent)
                            @php
                                $rev = strtoupper($agent->situacion_revista ?? '');
                                $revClass = 'rev-otro';
                                if ($rev === 'TITULAR') $revClass = 'rev-titular';
                                elseif ($rev === 'INTERINO') $revClass = 'rev-interino';
                                elseif ($rev === 'SUPLENTE') $revClass = 'rev-suplente';
                                elseif ($rev === 'REEMPLAZANTE') $revClass = 'rev-reemplazante';
                                
                                $replacedAgent = $agentIdx > 0 ? $sortedAgents[$agentIdx - 1] : null;
                                $isReplacementLicense = ($rev === 'SUPLENTE' || $rev === 'REEMPLAZANTE') && 
                                                         $agent->tiene_licencia_activa && 
                                                         $replacedAgent && 
                                                         $agentIdx === $sortedCount - 1 &&
                                                         $agent->licencia_activa_detalle &&
                                                         stripos($agent->licencia_activa_detalle->tipo_licencia ?? '', 'MAYOR JERARQUÍA') !== false;

                                $isLicense = $agent->tiene_licencia_activa && !$isReplacementLicense;
                                
                                $indentClass = '';
                                if ($agent->level > 0) {
                                    $indentClass = 'agent-indent-' . min(3, $agent->level);
                                }
                            @endphp
                            
                            <div class="agent-row {{ $indentClass }}">
                                <div class="agent-header">
                                    <span class="agent-revista {{ $revClass }}">{{ $agent->situacion_revista }}</span>
                                    <span class="agent-name">{{ $agent->nombre_agente }}</span>
                                    
                                    @if($isLicense)
                                        <span class="agent-status-badge status-licencia">Licencia Activa</span>
                                    @else
                                        <span class="agent-status-badge status-activo">Activo</span>
                                    @endif
                                </div>
                                <div class="agent-meta">
                                    DNI: {{ $agent->dni }} | Norma Legal: {{ $agent->norma_legal ?: 'Sin Registro' }}
                                </div>
                                
                                @if($isLicense && $agent->licencia_activa_detalle)
                                    <div class="licencia-detail-box">
                                        ⚠ Licencia de {{ $agent->licencia_activa_detalle->dias }} días por: {{ $agent->licencia_activa_detalle->tipo_licencia }}
                                    </div>
                                @endif
                                
                                @if($isReplacementLicense && $agent->licencia_activa_detalle)
                                    <div class="replacement-detail-box">
                                        ℹ TOMO CARGO POR Licencia Activa: Licencia de {{ $agent->licencia_activa_detalle->dias }} días por: {{ $agent->licencia_activa_detalle->tipo_licencia }} de docente {{ $replacedAgent->nombre_agente }}
                                    </div>
                                @endif
                            </div>
                        @endforeach
                    @endif
                </div>
            </div>
        @endforeach
    @endif

    <div class="footer-note">
        SIAME - Sistema de Información de Apoyo a la Movilidad Escolar | Ministerio de Educación de la Provincia
    </div>

</body>
</html>
