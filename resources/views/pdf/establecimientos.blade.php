<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Establecimientos - SIAME</title>
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
            margin-bottom: 20px;
            border-bottom: 3px solid #FE8204;
            padding-bottom: 10px;
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
            font-size: 20px;
            font-weight: bold;
            color: #111827;
            letter-spacing: -0.5px;
        }
        .logo-sub {
            font-size: 11px;
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
        .filters-box {
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 20px;
        }
        .filters-title {
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            color: #374151;
            margin-bottom: 6px;
        }
        .filters-grid {
            width: 100%;
        }
        .filters-grid td {
            font-size: 9px;
            color: #4B5563;
            padding: 2px 0;
            border: none;
        }
        .summary-box {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
        }
        .summary-card {
            background-color: #F3F4F6;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
        }
        .summary-val {
            font-size: 16px;
            font-weight: bold;
            color: #111827;
        }
        .summary-lbl {
            font-size: 8px;
            color: #6B7280;
            text-transform: uppercase;
            font-weight: bold;
            margin-top: 2px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .data-table th {
            background-color: #F9FAFB;
            color: #374151;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 8px;
            letter-spacing: 0.5px;
            padding: 8px 10px;
            border-bottom: 2px solid #E5E7EB;
            text-align: left;
        }
        .data-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #F3F4F6;
            vertical-align: middle;
        }
        .data-table tr:nth-child(even) td {
            background-color: #FAFAFA;
        }
        .school-name {
            font-weight: bold;
            color: #111827;
            font-size: 10px;
        }
        .school-cue {
            font-size: 8.5px;
            color: #9CA3AF;
            margin-top: 2px;
            font-family: monospace;
        }
        .badge {
            display: inline-block;
            padding: 3px 6px;
            font-size: 8px;
            font-weight: bold;
            border-radius: 4px;
            text-align: center;
        }
        .badge-green {
            background-color: #DEF7EC;
            color: #03543F;
        }
        .badge-amber {
            background-color: #FDF6B2;
            color: #723B11;
        }
        .badge-red {
            background-color: #FDE8E8;
            color: #9B1C1C;
        }
        .badge-blue {
            background-color: #E1EFFE;
            color: #1E429F;
        }
        .badge-gray {
            background-color: #F3F4F6;
            color: #4B5563;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        footer {
            position: fixed;
            bottom: -30px;
            left: 0;
            right: 0;
            height: 30px;
            text-align: center;
            font-size: 8px;
            color: #9CA3AF;
            border-top: 1px solid #E5E7EB;
            padding-top: 5px;
        }
        .page-number:before {
            content: "Página " counter(page);
        }
    </style>
</head>
<body>

    <header>
        <table class="header-table">
            <tr>
                <td>
                    <div class="logo-title">SIAME</div>
                    <div class="logo-sub">Auditoría y Control de Planta</div>
                </td>
                <td class="report-meta">
                    <strong>REPORTE DE ESTABLECIMIENTOS</strong><br>
                    Ciclo Lectivo: {{ $filters['year'] }}<br>
                    Generado el: {{ $generated_at }}
                </td>
            </tr>
        </table>
    </header>

    <div class="filters-box">
        <div class="filters-title">Filtros Aplicados</div>
        <table class="filters-grid">
            <tr>
                <td width="25%"><strong>Búsqueda:</strong> {{ $filters['search'] ?: 'Ninguno' }}</td>
                <td width="25%"><strong>Dirección de Área:</strong> {{ $filters['direccion_area'] ?: 'TODAS' }}</td>
                <td width="25%"><strong>Nivel Educativo:</strong> {{ $filters['nivel_educativo'] ?: 'TODOS' }}</td>
                <td width="25%"><strong>Departamento:</strong> {{ $filters['departamento'] ?: 'TODOS' }}</td>
            </tr>
        </table>
    </div>

    @php
        $totalEscuelas = count($rows);
        $totalPlazas = 0;
        $totalAgentes = 0;
        $totalSumaCobertura = 0;
        
        foreach ($rows as $row) {
            $totalPlazas += $row->cupof_count;
            $totalAgentes += $row->agent_count;
            $totalSumaCobertura += $row->coverage_percent;
        }
        
        $promedioCobertura = $totalEscuelas > 0 ? round($totalSumaCobertura / $totalEscuelas) : 0;
    @endphp

    <table width="100%" style="margin-bottom: 15px;">
        <tr>
            <td width="25%" style="padding-right: 10px;">
                <div class="summary-card">
                    <div class="summary-val">{{ number_format($totalEscuelas, 0, ',', '.') }}</div>
                    <div class="summary-lbl">Escuelas Filtradas</div>
                </div>
            </td>
            <td width="25%" style="padding-right: 10px;">
                <div class="summary-card">
                    <div class="summary-val">{{ number_format($totalPlazas, 0, ',', '.') }}</div>
                    <div class="summary-lbl">Total Plazas (Cargos)</div>
                </div>
            </td>
            <td width="25%" style="padding-right: 10px;">
                <div class="summary-card">
                    <div class="summary-val">{{ number_format($totalAgentes, 0, ',', '.') }}</div>
                    <div class="summary-lbl">Total Agentes únicos</div>
                </div>
            </td>
            <td width="25%">
                <div class="summary-card" style="border-left: 4px solid #10B981;">
                    <div class="summary-val">{{ $promedioCobertura }}%</div>
                    <div class="summary-lbl">Promedio Cobertura Activa</div>
                </div>
            </td>
        </tr>
    </table>

    <table class="data-table">
        <thead>
            <tr>
                <th width="30%">Escuela / CUE</th>
                <th width="20%">Ubicación</th>
                <th width="8%" class="text-center">Plazas</th>
                <th width="8%" class="text-center">Agentes</th>
                <th width="10%" class="text-center">Dotación Nominal</th>
                <th width="8%" class="text-center">Cobertura</th>
                <th width="8%" class="text-center">Extras (Supl.)</th>
                <th width="8%" class="text-center">Sin Cobertura</th>
            </tr>
        </thead>
        <tbody>
            @if ($totalEscuelas === 0)
                <tr>
                    <td colspan="8" class="text-center" style="padding: 30px; color: #9CA3AF;">
                        No se encontraron establecimientos con los criterios de búsqueda seleccionados.
                    </td>
                </tr>
            @else
                @foreach ($rows as $row)
                    @php
                        $coverageColor = 'badge-red';
                        if ($row->coverage_percent >= 90) {
                            $coverageColor = 'badge-green';
                        } elseif ($row->coverage_percent >= 75) {
                            $coverageColor = 'badge-amber';
                        }
                        
                        $dotacionColor = $row->relacion_planta_percent > 100 ? 'badge-blue' : 'badge-gray';
                    @endphp
                    <tr>
                        <td>
                            <div class="school-name">{{ $row->nombre }}</div>
                            <div class="school-cue">CUE: {{ $row->cue }}</div>
                        </td>
                        <td>
                            <strong>{{ $row->departamento }}</strong><br>
                            <span style="color: #6B7280; font-size: 8.5px;">{{ $row->localidad ?: 'Sin Localidad' }}</span>
                        </td>
                        <td class="text-center" style="font-weight: bold; font-size: 11px;">
                            {{ $row->cupof_count }}
                        </td>
                        <td class="text-center" style="font-weight: bold; font-size: 11px;">
                            {{ $row->agent_count }}
                        </td>
                        <td class="text-center">
                            <span class="badge {{ $dotacionColor }}">
                                {{ $row->relacion_planta_percent }}%
                            </span>
                        </td>
                        <td class="text-center">
                            <span class="badge {{ $coverageColor }}">
                                {{ $row->coverage_percent }}%
                            </span>
                        </td>
                        <td class="text-center" style="color: #4B5563;">
                            @if ($row->extra_agents_count > 0)
                                <span style="color: #1E429F; font-weight: bold;">+{{ $row->extra_agents_count }}</span>
                            @else
                                -
                            @endif
                        </td>
                        <td class="text-center" style="color: #9B1C1C; font-weight: bold;">
                            {{ $row->uncovered_count ?: '-' }}
                        </td>
                    </tr>
                @endforeach
            @endif
        </tbody>
    </table>

    <footer>
        SIAME - Sistema de Información de Apoyo a la Movilidad Escolar y Auditoría de Planta | <span class="page-number"></span>
    </footer>

</body>
</html>
