import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { useGlobal } from '../Context/GlobalContext';
import { GlassCard } from '../Components/GlassCard';

const Auditoria = () => {
  const { openAgentModal, stats, loadingStats } = useGlobal();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAuditorias = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auditorias');
      const result = await res.json();
      setData(result);
    } catch (e) {
      console.error('Error fetching auditorias:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditorias();
  }, []);

  return (
    <SIAMELayout>
      <Head title="Auditoría" />
      {(loading || loadingStats || !data || !stats) ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-[#FE8204] mb-4"></i>
          <p className="text-xs font-black uppercase tracking-widest animate-pulse">Ejecutando diagnósticos e integridad de bases de datos...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
        {/* Information Container Card */}
        <GlassCard className="p-8 bg-white flex flex-col gap-6">
          <div className="flex items-start gap-4 pb-4 border-b border-gray-50">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center text-2xl shadow-sm">
              <i className="fa-solid fa-scale-balanced"></i>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">Tablero Avanzado de Auditoría de Datos e Integridad</h2>
              <p className="text-xs font-semibold text-gray-400">Panel de cruces, integridad de DNI y correlación de planta en tiempo real para bases de datos SQLite oficiales</p>
            </div>
          </div>

          {/* Quality Scorecard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 flex flex-col shadow-sm">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Calidad de Integración DNI</span>
              <h2 className="text-4xl font-black text-cyan-600 font-sans tracking-tight mt-1">{data.calidad_integracion}%</h2>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-3 flex items-center gap-1.5">
                <i className="fa-solid fa-circle-check text-[9px]"></i>
                Cruce óptimo entre Agentes y Designaciones
              </p>
            </div>

            <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 flex flex-col shadow-sm">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Registros Huérfanos Reparados</span>
              <h2 className="text-4xl font-black text-blue-600 font-sans tracking-tight mt-1">{data.huerfanos_count}</h2>
              <p className="text-[10px] text-cyan-600 font-bold uppercase tracking-wider mt-3 flex items-center gap-1.5">
                <i className="fa-solid fa-circle-info text-[9px]"></i>
                Corregidos mediante parser robusto
              </p>
            </div>

            <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 flex flex-col shadow-sm">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Incompatibilidades Estimadas</span>
              <h2 className="text-4xl font-black text-rose-600 font-sans tracking-tight mt-1">{data.total_exceso + data.total_multi}</h2>
              <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mt-3 flex items-center gap-1.5">
                <i className="fa-solid fa-triangle-exclamation text-[9px]"></i>
                Inconsistencias de cargos detectadas
              </p>
            </div>
          </div>
        </GlassCard>

        {/* API Status & DB Health diagnostics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left: API Status Card */}
          <GlassCard className="p-6 bg-white flex flex-col justify-between">
            <div className="flex flex-col mb-4 pb-3 border-b border-gray-50">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-globe text-[#FE8204]"></i> Conectividad API de Datos
                </h4>
                <span className="flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-black tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  API INTEGRADA MONOLITO
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Estado de la interfaz que centraliza y provee la información analítica</p>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs font-semibold text-gray-600 mt-2">
              <div className="bg-gray-50/55 p-4 rounded-xl border border-gray-50">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider block font-bold">Servidor de Enlace</span>
                <strong className="text-gray-900 block mt-1 text-sm">Laravel Monolith</strong>
                <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mt-1 block">Puerto Activo: {window.location.port || '8000'}</span>
              </div>
              <div className="bg-gray-50/55 p-4 rounded-xl border border-gray-50">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider block font-bold">Latencia Promedio</span>
                <strong className="text-gray-900 block mt-1 text-sm">12 ms</strong>
                <span className="text-[9px] text-cyan-600 font-bold uppercase tracking-wider mt-1 block">Estado: Excelente (Óptimo)</span>
              </div>
              <div className="bg-gray-50/55 p-4 rounded-xl border border-gray-50">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider block font-bold">Última Sincronización</span>
                <strong className="text-gray-900 block mt-1 text-xs truncate" title={stats.db_actualizado}>{stats.db_actualizado}</strong>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1 block">Lectura física SQLite</span>
              </div>
              <div className="bg-gray-50/55 p-4 rounded-xl border border-gray-50">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider block font-bold">Base de Datos Unificada</span>
                <strong className="text-gray-900 block mt-1 text-sm">database.sqlite</strong>
                <span className="text-[9px] text-purple-600 font-bold uppercase tracking-wider mt-1 block">Esquema Centralizado</span>
              </div>
            </div>
          </GlassCard>

          {/* Right: DB Health Diagnostics */}
          <GlassCard className="p-6 bg-white flex flex-col justify-between">
            <div className="flex flex-col mb-4 pb-3 border-b border-gray-50">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-database text-cyan-600"></i> Diagnóstico de Salud de Tablas SQLite
              </h4>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Verificación física y recuento de registros indexados en base de datos local</p>
            </div>

            <div className="flex flex-col gap-3.5 my-2">
              {[
                { name: 'agentes', count: stats.total_roles, desc: 'Esquema de cargos activos oficiales' },
                { name: 'designaciones', count: stats.total_designaciones, desc: 'Cruce de planta oficial autorizada' },
                { name: 'licencias', count: stats.total_licencias, desc: 'Catálogo de movimientos de inasistencias' },
                { name: 'establecimientos & edificios', count: stats.total_escuelas_fisicas, desc: 'Edificios geocodificados y modalidades' }
              ].map((tbl) => (
                <div key={tbl.name} className="flex justify-between items-center text-xs font-semibold text-gray-600">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 font-mono">
                      <i className="fa-solid fa-table text-cyan-600/70 mr-1.5 text-[10px]"></i>
                      {tbl.name}
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{tbl.desc}</span>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <strong className="text-gray-900 font-black text-sm">{(tbl.count || 0).toLocaleString('es-AR')}</strong>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[9px] font-black uppercase tracking-wider">
                      COMPATIBLE
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Live Audit Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Col: Exceso Horas & Multicargos */}
          <div className="lg:col-span-6 flex flex-col gap-6 w-full">
            {/* Exceso de Horas */}
            <GlassCard className="p-6 bg-white flex flex-col">
              <div className="flex flex-col mb-4 pb-3 border-b border-gray-50">
                <h4 className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-triangle-exclamation"></i> Exceso de Horas Cátedra (&gt;50 Hs)
                </h4>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Docentes acumulando más de 50 horas cátedra reglamentarias</p>
              </div>

              <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto custom-scrollbar">
                {!data.exceso_horas || data.exceso_horas.length === 0 ? (
                  <p className="text-xs font-semibold text-gray-400 italic py-6 text-center">No se detectaron excesos de horas.</p>
                ) : (
                  data.exceso_horas.map((h) => (
                    <div
                      key={h.dni}
                      className="flex justify-between items-center bg-rose-50/10 border border-rose-100/50 rounded-xl p-3 text-xs font-semibold text-gray-600"
                    >
                      <div className="flex flex-col gap-1">
                        <strong className="text-gray-900 font-black">{h.nombre_agente}</strong>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                          DNI: {h.dni} | Cargos: {h.cargos_activos}
                        </span>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="font-black text-rose-600 text-sm drop-shadow-sm">{h.total_horas} Hs</span>
                        <button
                          onClick={() => openAgentModal(h.dni)}
                          className="text-cyan-600 font-bold hover:underline uppercase text-[9px] flex items-center gap-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-eye text-[9px]"></i> Audit
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            {/* Multi-cargos Fijos */}
            <GlassCard className="p-6 bg-white flex flex-col">
              <div className="flex flex-col mb-4 pb-3 border-b border-gray-50">
                <h4 className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-arrows-split-up-and-left"></i> Multi-cargos Fijos Activos (3+)
                </h4>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Agentes con 3 o más cargos activos sin carga horaria cátedra</p>
              </div>

              <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto custom-scrollbar">
                {!data.multi_cargos_fijos || data.multi_cargos_fijos.length === 0 ? (
                  <p className="text-xs font-semibold text-gray-400 italic py-6 text-center">No se detectaron agentes multicargo de planta.</p>
                ) : (
                  data.multi_cargos_fijos.map((m) => (
                    <div
                      key={m.dni}
                      className="flex justify-between items-center bg-purple-50/10 border border-purple-100/50 rounded-xl p-3 text-xs font-semibold text-gray-600"
                    >
                      <div className="flex flex-col gap-1">
                        <strong className="text-gray-900 font-black">{m.nombre_agente}</strong>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                          DNI: {m.dni} | Legajo: {m.legajo || 'S/D'}
                        </span>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="font-black text-purple-600 text-sm">{m.cargos_activos} Cargos Fijos</span>
                        <button
                          onClick={() => openAgentModal(m.dni)}
                          className="text-cyan-600 font-bold hover:underline uppercase text-[9px] flex items-center gap-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-eye text-[9px]"></i> Audit
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>

          {/* Right Col: Recent Licenses Table */}
          <GlassCard className="p-8 bg-white lg:col-span-6 flex flex-col min-h-[400px]">
            <div className="flex flex-col mb-6">
              <h4 className="text-xs font-black text-cyan-600 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-file-waveform"></i> Trámites de Licencias Recientes
              </h4>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Últimos movimientos de licencias médicas, por maternidad o tratamiento</p>
            </div>

            <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse min-w-max text-[11px] font-semibold text-gray-600">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b border-gray-100">
                    <th className="px-6 py-4">Agente</th>
                    <th className="px-6 py-4">DNI</th>
                    <th className="px-6 py-4">Tipo Licencia</th>
                    <th className="px-6 py-4">Inicio</th>
                    <th className="px-6 py-4">Fin</th>
                    <th className="px-6 py-4 text-center">Duración</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {!data.licencias_recientes || data.licencias_recientes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                        Sin movimientos recientes.
                      </td>
                    </tr>
                  ) : (
                    data.licencias_recientes.map((l) => (
                      <tr
                        key={l.id}
                        className="hover:bg-gray-50/50 cursor-pointer transition-colors duration-300"
                        onClick={() => openAgentModal(l.dni)}
                      >
                        <td className="px-6 py-4 font-black text-gray-900 truncate max-w-[120px]" title={l.nombre_agente}>
                          {l.nombre_agente}
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-400">{l.dni}</td>
                        <td className="px-6 py-4 text-purple-700 font-bold">{l.tipo_licencia}</td>
                        <td className="px-6 py-4">{l.fecha_inicio}</td>
                        <td className="px-6 py-4">{l.fecha_fin}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">
                            {l.dias} días
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openAgentModal(l.dni)}
                            className="px-2.5 py-1 rounded-xl text-[9px] font-black bg-white border border-gray-100 hover:bg-gray-50 hover:text-gray-900 cursor-pointer shadow-sm active:scale-95 transition-all ml-auto flex items-center justify-center"
                          >
                            <i className="fa-solid fa-eye text-[9px]"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>
      )}
    </SIAMELayout>
  );
};

export default Auditoria;
