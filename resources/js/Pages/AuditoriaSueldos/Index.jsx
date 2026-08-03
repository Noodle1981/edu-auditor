import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import SIAMELayout from '../../Layouts/SIAMELayout';
import { GlassCard } from '../../Components/GlassCard';

export default function AuditoriaSueldosIndex({
  nominas = [],
  nominaSeleccionada = null,
  resultados = [],
  viejos = [],
  conflictosSige = [],
  kpis = {}
}) {
  const [activeTab, setActiveTab] = useState('kpi');
  const [search, setSearch] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroGestion, setFiltroGestion] = useState('');

  // Local state for management updates
  const [auditList, setAuditList] = useState(resultados);
  const [viejosList, setViejosList] = useState(viejos);
  const [editingItem, setEditingItem] = useState(null);
  const [notaInput, setNotaInput] = useState('');
  const [estadoGestionInput, setEstadoGestionInput] = useState('PENDIENTE');
  const [updating, setUpdating] = useState(false);

  // Filtering
  const filteredResultados = auditList.filter((item) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !search ||
      (item.sector && item.sector.toString().includes(term)) ||
      (item.nombre_establecimiento && item.nombre_establecimiento.toLowerCase().includes(term)) ||
      (item.localidad && item.localidad.toLowerCase().includes(term)) ||
      (item.cue && item.cue.toString().includes(term));

    const matchesNivel = !filtroNivel || item.nivel_educativo === filtroNivel;
    const matchesGestion = !filtroGestion || item.estado_gestion === filtroGestion;

    return matchesSearch && matchesNivel && matchesGestion;
  });

  const pagaMasList = filteredResultados.filter(
    (item) => item.estado_auditoria === 'PAGA_MAS_QUE_SIGE'
  );
  const pagaMenosList = filteredResultados.filter(
    (item) => item.estado_auditoria === 'PAGA_MENOS_QUE_SIGE'
  );
  const zonasInconsistentesList = filteredResultados.filter(
    (item) => !item.coincide_zona && item.zona_sige
  );

  const nivelesDisponibles = Array.from(
    new Set(auditList.map((i) => i.nivel_educativo).filter(Boolean))
  ).sort();

  const handlePeriodoChange = (e) => {
    const periodo = e.target.value;
    router.get('/auditoria-sueldos', { periodo }, { preserveState: false });
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEstadoGestionInput(item.estado_gestion || 'PENDIENTE');
    setNotaInput(item.notas_auditor || '');
  };

  const saveGestion = async () => {
    if (!editingItem) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/auditoria-sueldos/${editingItem.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          estado_gestion: estadoGestionInput,
          notas_auditor: notaInput
        })
      });
      if (res.ok) {
        setAuditList((prev) =>
          prev.map((i) =>
            i.id === editingItem.id
              ? { ...i, estado_gestion: estadoGestionInput, notas_auditor: notaInput }
              : i
          )
        );
        setEditingItem(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const saveClasificacionViejo = async (id, clasificacion) => {
    try {
      const res = await fetch(`/api/auditoria-sueldos/viejo/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({ clasificacion_auditor: clasificacion })
      });
      if (res.ok) {
        setViejosList((prev) =>
          prev.map((i) => (i.id === id ? { ...i, clasificacion_auditor: clasificacion } : i))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SIAMELayout fullWidth>
      <Head title="Auditoría de Sueldos y Radios — EDU-Auditor" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1920px] mx-auto space-y-6">
        {/* Header Section */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#FE8204]/10 text-[#FE8204] border border-[#FE8204]/20">
              AUDITORÍA DE HABERES
            </span>
            <span className="text-xs font-medium text-gray-500">
              Cruce: Sueldos (A04) × SIGE × Geográfico
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            Auditoría de Radios Docentes por Establecimiento
          </h1>
          <p className="text-sm text-gray-600">
            Control de bonificaciones por ubicación geográfica y seguimiento de liquidaciones salariales.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
          <i className="fa-solid fa-calendar-days text-[#FE8204] text-lg pl-2"></i>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Período:</span>
          <select
            value={nominaSeleccionada?.periodo || ''}
            onChange={handlePeriodoChange}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm font-semibold rounded-xl focus:ring-[#FE8204] focus:border-[#FE8204] block px-3 py-1.5 cursor-pointer"
          >
            {nominas.map((n) => (
              <option key={n.id} value={n.periodo}>
                Mayo {n.periodo.split('-')[0]} ({n.archivo_nombre})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-3 mb-6 custom-scrollbar">
        <button
          onClick={() => setActiveTab('kpi')}
          style={activeTab === 'kpi' ? { backgroundColor: '#FE8204', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'kpi'
              ? 'shadow-md border-transparent'
              : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border-gray-200'
          }`}
        >
          <i className="fa-solid fa-chart-pie"></i>
          Resumen & KPIs
        </button>

        <button
          onClick={() => setActiveTab('escala')}
          style={activeTab === 'escala' ? { backgroundColor: '#FE8204', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'escala'
              ? 'shadow-md border-transparent'
              : 'text-gray-700 bg-gray-100 hover:bg-gray-200 border-gray-200'
          }`}
        >
          <i className="fa-solid fa-scale-balanced"></i>
          Escalas & Residuales ({viejosList.length})
        </button>

        <button
          onClick={() => setActiveTab('paga_mas')}
          style={activeTab === 'paga_mas' ? { backgroundColor: '#dc2626', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'paga_mas'
              ? 'shadow-md border-transparent'
              : 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
          }`}
        >
          <i className="fa-solid fa-arrow-trend-up"></i>
          Pagan MÁS ({kpis.paga_mas_sectores || 0})
        </button>

        <button
          onClick={() => setActiveTab('paga_menos')}
          style={activeTab === 'paga_menos' ? { backgroundColor: '#2563eb', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'paga_menos'
              ? 'shadow-md border-transparent'
              : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'
          }`}
        >
          <i className="fa-solid fa-arrow-trend-down"></i>
          Pagan MENOS ({kpis.paga_menos_sectores || 0})
        </button>

        <button
          onClick={() => setActiveTab('conflictos')}
          style={activeTab === 'conflictos' ? { backgroundColor: '#d97706', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'conflictos'
              ? 'shadow-md border-transparent'
              : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
          }`}
        >
          <i className="fa-solid fa-triangle-exclamation"></i>
          Conflictos SIGE ({conflictosSige.length})
        </button>

        <button
          onClick={() => setActiveTab('zonas')}
          style={activeTab === 'zonas' ? { backgroundColor: '#9333ea', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'zonas'
              ? 'shadow-md border-transparent'
              : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'
          }`}
        >
          <i className="fa-solid fa-location-dot"></i>
          Inconsistencia Zona ({kpis.zonas_inconsistentes_sectores || 0})
        </button>

        <button
          onClick={() => setActiveTab('tracking')}
          style={activeTab === 'tracking' ? { backgroundColor: '#059669', color: '#ffffff' } : {}}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 flex items-center gap-2 border ${
            activeTab === 'tracking'
              ? 'shadow-md border-transparent'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
          }`}
        >
          <i className="fa-solid fa-list-check"></i>
          Seguimiento & Gestión
        </button>
      </div>

      {/* Global Filter Bar for Tables */}
      {activeTab !== 'kpi' && activeTab !== 'escala' && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-gray-400 text-sm"></i>
            <input
              type="text"
              placeholder="Buscar sector, CUE o escuela..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:ring-[#FE8204] focus:border-[#FE8204]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-3 py-2 focus:ring-[#FE8204]"
            >
              <option value="">Todos los Niveles</option>
              {nivelesDisponibles.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <select
              value={filtroGestion}
              onChange={(e) => setFiltroGestion(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-300 text-gray-700 rounded-xl px-3 py-2 focus:ring-[#FE8204]"
            >
              <option value="">Todos los Estados Gestión</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="EN_INVESTIGACION">EN INVESTIGACIÓN</option>
              <option value="JUSTIFICADO">JUSTIFICADO</option>
              <option value="CORREGIDO">CORREGIDO</option>
            </select>
          </div>
        </div>
      )}

      {/* TAB 1: KPI & EXECUTIVE RESUMEN */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          {/* Top KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-5 border-l-4 border-l-[#FE8204]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Sectores Auditados
                  </span>
                  <div className="text-2xl font-black text-gray-900 mt-1">
                    {kpis.total_sectores || 0}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {(kpis.total_filas_docentes || 0).toLocaleString()} liquidaciones A04
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#FE8204]/10 text-[#FE8204] flex items-center justify-center text-xl">
                  <i className="fa-solid fa-building-columns"></i>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Tasa de Coincidencia
                  </span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {kpis.porcentaje_coincidencia || 0}%
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    Sueldo = SIGE (88,9% ajustado)
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Pagan MÁS que SIGE
                  </span>
                  <div className="text-2xl font-black text-red-600 mt-1">
                    {kpis.paga_mas_sectores || 0} sectores
                  </div>
                  <span className="text-xs text-red-600 font-semibold">
                    {(kpis.paga_mas_docentes || 0).toLocaleString()} docentes afectados
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-arrow-trend-up"></i>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Pagan MENOS que SIGE
                  </span>
                  <div className="text-2xl font-black text-blue-600 mt-1">
                    {kpis.paga_menos_sectores || 0} sectores
                  </div>
                  <span className="text-xs text-blue-600 font-semibold">
                    {(kpis.paga_menos_docentes || 0).toLocaleString()} docentes afectados
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-arrow-trend-down"></i>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Detailed Status Breakdown */}
          <div className="grid grid-cols-1 gap-6">
            <GlassCard className="p-6">
              <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-list-ol text-[#FE8204]"></i>
                Distribución del Estado de Auditoría
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-sm font-bold text-emerald-900">Coincidencia Total (Sueldo = SIGE = Geo)</span>
                  </div>
                  <span className="text-sm font-black text-emerald-700">458 sectores</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-teal-50 rounded-xl border border-teal-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                    <span className="text-sm font-bold text-teal-900">Coincide SIGE y Camino/Circunferencia</span>
                  </div>
                  <span className="text-sm font-black text-teal-700">327 sectores</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-sm font-bold text-red-900">Paga MÁS que SIGE (Exceso de liquidación)</span>
                  </div>
                  <span className="text-sm font-black text-red-700">30 sectores (1.694 filas)</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-sm font-bold text-blue-900">Paga MENOS que SIGE (Perjuicio al docente)</span>
                  </div>
                  <span className="text-sm font-black text-blue-700">25 sectores (1.674 filas)</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                    <span className="text-sm font-bold text-slate-800">Sectores Sin Registro en SIGE PÚBLICO</span>
                  </div>
                  <span className="text-sm font-black text-slate-700">184 sectores (6.173 filas)</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* TAB 2: ESCALAS Y REGISTROS VIEJOS */}
      {activeTab === 'escala' && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
              <i className="fa-solid fa-scale-balanced text-[#FE8204]"></i>
              Matriz Comparativa de Escalas de Radio Docente
            </h2>
            <p className="text-xs text-gray-600 mb-4">
              Comparativa entre la escala original de la Ley de Radios y las alícuotas vigentes actualizadas por acuerdos paritarios.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-700 border-collapse">
                <thead className="text-xs uppercase bg-gray-100 text-gray-700 border-b">
                  <tr>
                    <th className="px-4 py-3 font-bold">Radio</th>
                    <th className="px-4 py-3 font-bold">% Ley Original</th>
                    <th className="px-4 py-3 font-bold">% Paritaria Vigente</th>
                    <th className="px-4 py-3 text-right font-bold">Liquidaciones Auditadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 1</td>
                    <td className="px-4 py-3">20%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">40%</td>
                    <td className="px-4 py-3 text-right font-black">16.142</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 2</td>
                    <td className="px-4 py-3">30%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">50%</td>
                    <td className="px-4 py-3 text-right font-black">13.572</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 3</td>
                    <td className="px-4 py-3">40%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">60%</td>
                    <td className="px-4 py-3 text-right font-black">10.291</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 4</td>
                    <td className="px-4 py-3">80%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">95%</td>
                    <td className="px-4 py-3 text-right font-black">7.385 (+27 escala vieja)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 5</td>
                    <td className="px-4 py-3">100%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">115%</td>
                    <td className="px-4 py-3 text-right font-black">4.261</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 6</td>
                    <td className="px-4 py-3">120%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">135%</td>
                    <td className="px-4 py-3 text-right font-black">4.683 (+6 escala vieja)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">Radio 7</td>
                    <td className="px-4 py-3">140%</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">155%</td>
                    <td className="px-4 py-3 text-right font-black">327 (+4 escala vieja)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Sub-panel de Registros Escala Vieja */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-amber-900 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                  Registros Residuales con Escala Vieja / Desconocida ({viejosList.length})
                </h3>
                <p className="text-xs text-gray-600">
                  Docentes liquidados con porcentaje antiguo (80%, 120%, 140%). Requiere clasificación manual.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 custom-scrollbar">
              <table className="w-full text-xs text-left text-gray-700">
                <thead className="text-xs uppercase bg-amber-50 text-amber-900 border-b sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Sector</th>
                    <th className="px-3 py-2">Zona</th>
                    <th className="px-3 py-2 text-right">A01 Básico</th>
                    <th className="px-3 py-2 text-right">A04 Radio</th>
                    <th className="px-3 py-2 text-center">% Pagado</th>
                    <th className="px-3 py-2">Escala</th>
                    <th className="px-3 py-2 text-center">Clasificación Auditor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {viejosList.map((v) => (
                    <tr key={v.id} className="hover:bg-amber-50/50">
                      <td className="px-3 py-2 font-bold text-gray-900">{v.sector}</td>
                      <td className="px-3 py-2 font-bold">{v.zona}</td>
                      <td className="px-3 py-2 text-right font-mono">${v.a01_basico.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">${v.a04_radio.toLocaleString()}</td>
                      <td className="px-3 py-2 text-center font-black text-amber-700">
                        {v.porcentaje_pagado}%
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800">
                          {v.escala_detectada}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select
                          value={v.clasificacion_auditor || 'PENDIENTE'}
                          onChange={(e) => saveClasificacionViejo(v.id, e.target.value)}
                          className="text-[11px] font-semibold bg-white border border-amber-300 rounded px-2 py-1 focus:ring-amber-500"
                        >
                          <option value="PENDIENTE">PENDIENTE</option>
                          <option value="ERROR_LIQUIDACION">ERROR LIQUIDACIÓN</option>
                          <option value="CASO_ESPECIAL">CASO ESPECIAL</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 3: CONFLICTOS INTERNOS SIGE */}
      {activeTab === 'conflictos' && (
        <GlassCard className="p-6">
          <h2 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
            Sectores SIGE con Conflicto Interno ({conflictosSige.length} Sectores)
          </h2>
          <p className="text-xs text-gray-600 mb-4">
            Sectores que poseen múltiples radios oficiales en la base de datos `modalidades`. Requieren desambiguación.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-xs uppercase bg-amber-50 text-amber-900 border-b">
                <tr>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3">Radios en SIGE</th>
                  <th className="px-4 py-3">Niveles Afectados</th>
                  <th className="px-4 py-3">Establecimientos Relacionados</th>
                  <th className="px-4 py-3 text-right">Modalidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {conflictosSige.map((c) => (
                  <tr key={c.sector} className="hover:bg-amber-50/50">
                    <td className="px-4 py-3 font-black text-gray-900 text-sm">{c.sector}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                        [{c.radios_distintos}]
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{c.niveles}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">{c.establecimientos}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-600">{c.cant_modalidades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB 4: PAGAN MÁS QUE SIGE */}
      {activeTab === 'paga_mas' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-red-900 flex items-center gap-2">
                <i className="fa-solid fa-arrow-trend-up text-red-600"></i>
                Establecimientos que PAGAN MÁS que su Radio SIGE ({pagaMasList.length})
              </h2>
              <p className="text-xs text-gray-600">
                Sectores donde la liquidación de haberes ($A04) abona un porcentaje superior al fijado administrativamente.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-xs uppercase bg-red-50 text-red-900 border-b">
                <tr>
                  <th className="px-3 py-3 font-bold">Sector</th>
                  <th className="px-3 py-3 font-bold">Nivel</th>
                  <th className="px-3 py-3 font-bold">Zona</th>
                  <th className="px-3 py-3 font-bold">Establecimiento</th>
                  <th className="px-3 py-3 font-bold">CUE</th>
                  <th className="px-3 py-3 text-center font-bold">Radio Sueldo</th>
                  <th className="px-3 py-3 text-center font-bold">Radio SIGE</th>
                  <th className="px-3 py-3 text-center font-bold">R. Circ</th>
                  <th className="px-3 py-3 text-center font-bold">R. Cam</th>
                  <th className="px-3 py-3 text-right font-bold">Docentes</th>
                  <th className="px-3 py-3 text-center font-bold">Gestión</th>
                  <th className="px-3 py-3 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagaMasList.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/50">
                    <td className="px-3 py-3 font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3 font-semibold text-gray-700">{item.nivel_educativo || 'GENERAL'}</td>
                    <td className="px-3 py-3 font-bold">{item.zona_sueldo}</td>
                    <td className="px-3 py-3 font-bold text-gray-900 max-w-xs truncate">
                      {item.nombre_establecimiento || 'No Registrado'}
                    </td>
                    <td className="px-3 py-3 font-mono text-gray-500">{item.cue || '-'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-red-100 text-red-800">
                        R{item.radio_sueldo}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-gray-700">R{item.radio_sige || '-'}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.radio_circ || '-'}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.radio_camino || '-'}</td>
                    <td className="px-3 py-3 text-right font-black text-red-700">{item.total_filas_docentes}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          item.estado_gestion === 'CORREGIDO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.estado_gestion === 'JUSTIFICADO'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.estado_gestion}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB 5: PAGAN MENOS QUE SIGE */}
      {activeTab === 'paga_menos' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-blue-900 flex items-center gap-2">
                <i className="fa-solid fa-arrow-trend-down text-blue-600"></i>
                Establecimientos que PAGAN MENOS que su Radio SIGE ({pagaMenosList.length})
              </h2>
              <p className="text-xs text-gray-600">
                Sectores donde los docentes perciben una bonificación inferior al radio oficial asignado a la escuela.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-xs uppercase bg-blue-50 text-blue-900 border-b">
                <tr>
                  <th className="px-3 py-3 font-bold">Sector</th>
                  <th className="px-3 py-3 font-bold">Nivel</th>
                  <th className="px-3 py-3 font-bold">Zona</th>
                  <th className="px-3 py-3 font-bold">Establecimiento</th>
                  <th className="px-3 py-3 font-bold">CUE</th>
                  <th className="px-3 py-3 text-center font-bold">Radio Sueldo</th>
                  <th className="px-3 py-3 text-center font-bold">Radio SIGE</th>
                  <th className="px-3 py-3 text-center font-bold">R. Circ</th>
                  <th className="px-3 py-3 text-center font-bold">R. Cam</th>
                  <th className="px-3 py-3 text-right font-bold">Docentes</th>
                  <th className="px-3 py-3 text-center font-bold">Gestión</th>
                  <th className="px-3 py-3 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagaMenosList.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/50">
                    <td className="px-3 py-3 font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3 font-semibold text-gray-700">{item.nivel_educativo || 'GENERAL'}</td>
                    <td className="px-3 py-3 font-bold">{item.zona_sueldo}</td>
                    <td className="px-3 py-3 font-bold text-gray-900 max-w-xs truncate">
                      {item.nombre_establecimiento || 'No Registrado'}
                    </td>
                    <td className="px-3 py-3 font-mono text-gray-500">{item.cue || '-'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-blue-100 text-blue-800">
                        R{item.radio_sueldo}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-gray-700">R{item.radio_sige || '-'}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.radio_circ || '-'}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.radio_camino || '-'}</td>
                    <td className="px-3 py-3 text-right font-black text-blue-700">{item.total_filas_docentes}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          item.estado_gestion === 'CORREGIDO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.estado_gestion === 'JUSTIFICADO'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.estado_gestion}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB 6: ZONAS INCONSISTENTES */}
      {activeTab === 'zonas' && (
        <GlassCard className="p-6">
          <h2 className="text-base font-black text-purple-900 mb-2 flex items-center gap-2">
            <i className="fa-solid fa-location-dot text-purple-600"></i>
            Inconsistencias de Letra de Zona ({zonasInconsistentesList.length} Sectores)
          </h2>
          <p className="text-xs text-gray-600 mb-4">
            Sectores donde la letra de zona del recibo (ZONA sueldos) difiere de la letra registrada en el edificio (SIGE).
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-xs uppercase bg-purple-50 text-purple-900 border-b">
                <tr>
                  <th className="px-3 py-3">Sector</th>
                  <th className="px-3 py-3">Establecimiento</th>
                  <th className="px-3 py-3 text-center">Zona Sueldos</th>
                  <th className="px-3 py-3 text-center">Zona SIGE Edificio</th>
                  <th className="px-3 py-3 text-center">Radio Sueldo</th>
                  <th className="px-3 py-3 text-center">Radio SIGE</th>
                  <th className="px-3 py-3 text-right">Docentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {zonasInconsistentesList.map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/50">
                    <td className="px-3 py-3 font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3 font-bold text-gray-900">{item.nombre_establecimiento || 'No Registrado'}</td>
                    <td className="px-3 py-3 text-center font-bold text-red-600">{item.zona_sueldo}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-600">{item.zona_sige}</td>
                    <td className="px-3 py-3 text-center font-bold">R{item.radio_sueldo}</td>
                    <td className="px-3 py-3 text-center font-bold">R{item.radio_sige || '-'}</td>
                    <td className="px-3 py-3 text-right font-black text-gray-700">{item.total_filas_docentes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB 7: SEGUIMIENTO & GESTION */}
      {activeTab === 'tracking' && (
        <GlassCard className="p-6">
          <h2 className="text-base font-black text-emerald-900 mb-2 flex items-center gap-2">
            <i className="fa-solid fa-list-check text-emerald-600"></i>
            Panel de Seguimiento y Gestión de Auditoría
          </h2>
          <p className="text-xs text-gray-600 mb-4">
            Gestión del ciclo de vida de los sectores observados. Marque progresivamente los sectores como investigados o corregidos.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="text-xs uppercase bg-emerald-50 text-emerald-900 border-b">
                <tr>
                  <th className="px-3 py-3 font-bold">Sector</th>
                  <th className="px-3 py-3 font-bold">Establecimiento</th>
                  <th className="px-3 py-3 font-bold">Estado Auditoría</th>
                  <th className="px-3 py-3 text-center font-bold">Estado Gestión</th>
                  <th className="px-3 py-3 font-bold">Notas del Auditor</th>
                  <th className="px-3 py-3 text-center font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredResultados.map((item) => (
                  <tr key={item.id} className="hover:bg-emerald-50/50">
                    <td className="px-3 py-3 font-black text-gray-900">{item.sector}</td>
                    <td className="px-3 py-3 font-bold text-gray-900 max-w-xs truncate">
                      {item.nombre_establecimiento || 'No Registrado'}
                    </td>
                    <td className="px-3 py-3 font-bold">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded ${
                          item.estado_auditoria === 'PAGA_MAS_QUE_SIGE'
                            ? 'bg-red-100 text-red-800'
                            : item.estado_auditoria === 'PAGA_MENOS_QUE_SIGE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.estado_auditoria}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full ${
                          item.estado_gestion === 'CORREGIDO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.estado_gestion === 'JUSTIFICADO'
                            ? 'bg-purple-100 text-purple-800'
                            : item.estado_gestion === 'EN_INVESTIGACION'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.estado_gestion}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 max-w-xs truncate">
                      {item.notas_auditor || <span className="italic text-gray-400">Sin notas</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                      >
                        Editar Nota
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
            <h3 className="text-base font-black text-gray-900 mb-2">
              Gestión de Auditoría — Sector {editingItem.sector}
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              {editingItem.nombre_establecimiento || 'Establecimiento No Registrado'} (Nivel: {editingItem.nivel_educativo})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Estado de Gestión:
                </label>
                <select
                  value={estadoGestionInput}
                  onChange={(e) => setEstadoGestionInput(e.target.value)}
                  className="w-full text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 focus:ring-[#FE8204]"
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN_INVESTIGACION">EN INVESTIGACIÓN</option>
                  <option value="JUSTIFICADO">JUSTIFICADO (CON NORMA LEGAL)</option>
                  <option value="CORREGIDO">CORREGIDO EN LIQUIDACIÓN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Notas / Expediente / Resolución:
                </label>
                <textarea
                  rows={3}
                  value={notaInput}
                  onChange={(e) => setNotaInput(e.target.value)}
                  placeholder="Ingrese el número de expediente, decreto o detalle de la investigación..."
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-xl p-3 focus:ring-[#FE8204]"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                disabled={updating}
                onClick={saveGestion}
                className="px-4 py-2 text-xs font-bold text-white bg-[#FE8204] hover:bg-[#FE8204]/90 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {updating ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </SIAMELayout>
  );
}
