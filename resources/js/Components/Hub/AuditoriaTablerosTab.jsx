import React, { useEffect, useState, useMemo } from 'react';
import { useGlobal } from '../../Context/GlobalContext';
import { GlassCard } from '../GlassCard';
import { Pagination } from '../Pagination';

export const AuditoriaTablerosTab = () => {
  const { openAgentModal, stats, loadingStats, fetchStats, analytics, loadingAnalytics, fetchAnalytics } = useGlobal();
  const [activeView, setActiveView] = useState('hub'); // 'hub' | 'planta' | 'volumen' | 'licencias' | 'ausentismo'

  // Auditoria Endpoint data (excesos, multi)
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sub-views states
  const [tabPlanta, setTabPlanta] = useState('exceso'); // 'exceso' | 'multi'
  const [filterExceso, setFilterExceso] = useState('todos'); // 'todos' | 'criticos' | 'justificados' | 'sin_exceso'
  const [tabLicencia, setTabLicencia] = useState('extrema'); // 'extrema' | 'solapamiento' | 'fuera_termino' | 'sin_suplente'

  // Pagination states for sub-views
  const [pageExceso, setPageExceso] = useState(1);
  const [pageMulti, setPageMulti] = useState(1);
  const [pageEscuelasDesig, setPageEscuelasDesig] = useState(1);

  const [pageExtrema, setPageExtrema] = useState(1);
  const [pageSolapamientos, setPageSolapamientos] = useState(1);
  const [pageSinSuplente, setPageSinSuplente] = useState(1);
  const [pageFueraTermino, setPageFueraTermino] = useState(1);
  const [pageEscuelasLic, setPageEscuelasLic] = useState(1);

  // Late filing licenses local states (inside Auditoria now)
  const [lateLics, setLateLics] = useState([]);
  const [loadingLate, setLoadingLate] = useState(false);

  // Escuelas volume filters and sorting states
  const [filterDepto, setFilterDepto] = useState('todos');
  const [filterLevel, setFilterLevel] = useState('todos');
  const [sortField, setSortField] = useState('count');
  const [sortDirection, setSortDirection] = useState('desc');

  const itemsPerPage = 8;
  const itemsPerPageLate = 8;
  const itemsPerPageEscuelas = 8;

  // Pagination helper
  const paginateArray = (array, pageNumber, size = itemsPerPage) => {
    const start = (pageNumber - 1) * size;
    return (array || []).slice(start, start + size);
  };

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
    fetchStats();
    fetchAnalytics();
    fetchAuditorias();
  }, []);

  // Fetch recent licenses to calculate "Fuera de Término"
  useEffect(() => {
    if (activeView !== 'licencias' || tabLicencia !== 'fuera_termino') return;

    const fetchLateLicenses = async () => {
      setLoadingLate(true);
      try {
        const res = await fetch('/api/licencias/search?limit=150');
        const json = await res.json();
        const allLics = json.data || [];

        const parseDate = (dStr) => {
          if (!dStr) return null;
          if (dStr.includes('/')) {
            const [d, m, y] = dStr.split('/').map(Number);
            return new Date(y, m - 1, d);
          }
          return new Date(dStr);
        };

        const calculatedLate = allLics
          .map((lic) => {
            const dateInicio = parseDate(lic.fecha_inicio);
            const dateCarga = parseDate(lic.fecha_carga);

            if (dateInicio && dateCarga) {
              const diffTime = dateCarga.getTime() - dateInicio.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              return { ...lic, dias_retraso: diffDays };
            }
            return { ...lic, dias_retraso: 0 };
          })
          .filter((lic) => lic.dias_retraso > 10) // late if submitted after 10 days
          .sort((a, b) => b.dias_retraso - a.dias_retraso);

        setLateLics(calculatedLate);
      } catch (e) {
        console.error('Error loading late licenses:', e);
      } finally {
        setLoadingLate(false);
      }
    };

    fetchLateLicenses();
  }, [activeView, tabLicencia]);

  // Reset pageExceso on filter change
  useEffect(() => {
    setPageExceso(1);
  }, [filterExceso]);

  // Filtered excess hours
  const filteredExceso = useMemo(() => {
    const list = data?.exceso_horas || [];
    if (filterExceso === 'criticos') {
      return list.filter(a => a.status_auditoria === 'incompatibilidad_critica');
    }
    if (filterExceso === 'justificados') {
      return list.filter(a => a.status_auditoria === 'exceso_justificado');
    }
    if (filterExceso === 'sin_exceso') {
      return [];
    }
    return list;
  }, [data, filterExceso]);

  // Local slice paginations for Planta
  const currentExceso = useMemo(() => {
    return paginateArray(filteredExceso, pageExceso, 6);
  }, [filteredExceso, pageExceso]);

  const totalPagesExceso = Math.ceil(filteredExceso.length / 6) || 1;

  const currentMulti = useMemo(() => {
    return paginateArray(data?.multi_cargos_fijos || [], pageMulti, 6);
  }, [data, pageMulti]);

  const totalPagesMulti = Math.ceil((data?.multi_cargos_fijos || []).length / 6) || 1;

  // Reset pageEscuelasDesig on filter or sort change
  useEffect(() => {
    setPageEscuelasDesig(1);
  }, [filterDepto, filterLevel, sortField, sortDirection]);

  // Extract unique departments and levels from designaciones data
  const uniqueDeptos = useMemo(() => {
    const list = analytics?.escuelas_designaciones || [];
    const deptosSet = new Set();
    list.forEach(esc => {
      if (esc.departamento) {
        deptosSet.add(esc.departamento.toUpperCase().trim());
      }
    });
    return Array.from(deptosSet).sort();
  }, [analytics?.escuelas_designaciones]);

  const uniqueLevels = useMemo(() => {
    const list = analytics?.escuelas_designaciones || [];
    const levelsSet = new Set();
    list.forEach(esc => {
      if (esc.nivel_educativo) {
        const parts = esc.nivel_educativo.split(',').map(s => s.toUpperCase().trim());
        parts.forEach(p => {
          if (p) levelsSet.add(p);
        });
      }
    });
    return Array.from(levelsSet).sort();
  }, [analytics?.escuelas_designaciones]);

  // Filtered and sorted schools list
  const filteredAndSortedSchools = useMemo(() => {
    let list = [...(analytics?.escuelas_designaciones || [])];

    // Apply department filter
    if (filterDepto !== 'todos') {
      list = list.filter(esc => esc.departamento?.toUpperCase().trim() === filterDepto);
    }

    // Apply educational level filter
    if (filterLevel !== 'todos') {
      list = list.filter(esc => {
        if (!esc.nivel_educativo) return false;
        const levels = esc.nivel_educativo.split(',').map(s => s.toUpperCase().trim());
        return levels.includes(filterLevel);
      });
    }

    // Apply sorting
    list.sort((a, b) => {
      let valA, valB;
      if (sortField === 'cue') {
        valA = a.cue || '';
        valB = b.cue || '';
      } else if (sortField === 'establecimiento') {
        valA = a.establecimiento || '';
        valB = b.establecimiento || '';
      } else if (sortField === 'count') {
        valA = Number(a.count) || 0;
        valB = Number(b.count) || 0;
      } else if (sortField === 'docentes_unicos') {
        valA = Number(a.docentes_unicos) || 0;
        valB = Number(b.docentes_unicos) || 0;
      } else if (sortField === 'promedio') {
        valA = (Number(a.count) || 0) / (Number(a.docentes_unicos) || 1);
        valB = (Number(b.count) || 0) / (Number(b.docentes_unicos) || 1);
      } else {
        return 0;
      }

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc' 
          ? valA - valB 
          : valB - valA;
      }
    });

    return list;
  }, [analytics?.escuelas_designaciones, filterDepto, filterLevel, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const EmptyState = ({ text }) => (
    <GlassCard className="p-10 bg-white/40 border-dashed border-emerald-200 text-center flex flex-col items-center justify-center gap-4 shadow-sm backdrop-blur-md w-full">
      <div className="w-16 h-16 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center text-3xl shadow-md shadow-emerald-100/30 animate-pulse">
        <i className="fa-solid fa-circle-check"></i>
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Todo en Orden</h4>
        <p className="text-xs font-semibold text-gray-400 max-w-md">{text}</p>
      </div>
    </GlassCard>
  );

  return (
    <div>
      {/* Loading states */}
      {(loading || loadingStats || !data || !stats) ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-[#FE8204] mb-4"></i>
          <p className="text-xs font-black uppercase tracking-widest animate-pulse">Ejecutando diagnósticos e integridad de bases de datos...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">

          {/* Header & Back Navigation */}
          {activeView !== 'hub' && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4 pb-2">
              <button
                onClick={() => setActiveView('hub')}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white border border-gray-150 text-gray-650 hover:bg-gray-50 shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer max-w-max"
              >
                <i className="fa-solid fa-chevron-left"></i> Volver al Panel Central
              </button>

              {/* Top selectors for Planta sub-view */}
              {activeView === 'planta' && (
                <div className="flex flex-col sm:flex-row gap-2 bg-white border border-gray-100 p-1.5 rounded-2xl shadow-sm max-w-max">
                  {[
                    { id: 'exceso', label: 'Exceso de Horas Cátedra (>50h)', icon: 'fa-solid fa-clock' },
                    { id: 'multi', label: 'Cargos Múltiples Fijos (3+)', icon: 'fa-solid fa-layer-group' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTabPlanta(item.id)}
                      className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2.5 cursor-pointer transition-all border ${
                        tabPlanta === item.id
                          ? 'bg-gradient-to-r from-[#FE8204]/8 to-[#FE8204]/2 text-[#FE8204] border-[#FE8204]/10 shadow-sm shadow-[#FE8204]/5'
                          : 'bg-white text-gray-500 hover:text-gray-900 border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <i className={`${item.icon} text-sm ${tabPlanta === item.id ? 'text-[#FE8204]' : 'text-gray-400'}`}></i>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Top selectors for Licencias sub-view */}
              {activeView === 'licencias' && (
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 bg-white border border-gray-100 p-1.5 rounded-2xl shadow-sm max-w-max">
                  {[
                    { id: 'extrema', label: 'Licencias Extremas (>365d)', icon: 'fa-solid fa-calendar-xmark' },
                    { id: 'solapamiento', label: 'Solapamientos', icon: 'fa-solid fa-clone' },
                    { id: 'sin_suplente', label: 'Sin Suplente', icon: 'fa-solid fa-user-slash' },
                    { id: 'fuera_termino', label: 'Fuera de Término', icon: 'fa-solid fa-clock-rotate-left' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTabLicencia(item.id)}
                      className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2.5 cursor-pointer transition-all border ${
                        tabLicencia === item.id
                          ? 'bg-gradient-to-r from-[#FE8204]/8 to-[#FE8204]/2 text-[#FE8204] border-[#FE8204]/10 shadow-sm shadow-[#FE8204]/5'
                          : 'bg-white text-gray-500 hover:text-gray-900 border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <i className={`${item.icon} text-sm ${tabLicencia === item.id ? 'text-[#FE8204]' : 'text-gray-400'}`}></i>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              VIEW: HUB CENTRAL (LANDING PORTAL)
              ======================================================== */}
          {activeView === 'hub' && (
            <>
              {/* Main audit categories boxes grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                
                {/* Box 1: Designaciones & Planta */}
                <GlassCard className="p-8 bg-white flex flex-col justify-between border border-cyan-100/50">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-50">
                      <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-xl">
                        <i className="fa-solid fa-briefcase"></i>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Planta y Cargos (Designaciones)</h3>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Auditorías sobre distribución horaria y volumen de planta escolar</p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                      Analiza la distribución horaria para detectar sobrecarga de horas cátedra (&gt;50 hs), cargos de planta fijos múltiples que superan la normativa de incompatibilidad, y clasifica a las escuelas según su volumen total de cargos asignados.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button
                      onClick={() => setActiveView('planta')}
                      className="px-4 py-3 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-750 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <i className="fa-solid fa-scale-balanced text-sm"></i>
                      Auditoría de Planta
                    </button>
                    <button
                      onClick={() => setActiveView('volumen')}
                      className="px-4 py-3 bg-white border border-cyan-150 text-cyan-700 hover:bg-cyan-50 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <i className="fa-solid fa-chart-column text-sm"></i>
                      Escuelas por Volumen
                    </button>
                  </div>
                </GlassCard>

                {/* Box 2: Licencias & Ausentismo */}
                <GlassCard className="p-8 bg-white flex flex-col justify-between border border-purple-100/50">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-50">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
                        <i className="fa-solid fa-file-medical"></i>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Inasistencias y Licencias</h3>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Diagnóstico de alertas médicas, ausentismo y solapamientos</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                      Controla los plazos de inasistencias médicas. Detecta trámites de duraciones extremas (&gt;365 días), solapamientos de licencias por agente, registros cargados fuera de término provincial y el ranking de escuelas críticas por ausentismo docente.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button
                      onClick={() => setActiveView('licencias')}
                      className="px-4 py-3 bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-750 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <i className="fa-solid fa-notes-medical text-sm"></i>
                      Auditoría de Licencias
                    </button>
                    <button
                      onClick={() => setActiveView('ausentismo')}
                      className="px-4 py-3 bg-white border border-purple-155 text-purple-700 hover:bg-purple-50 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <i className="fa-solid fa-circle-exclamation text-sm"></i>
                      Escuelas Críticas
                    </button>
                  </div>
                </GlassCard>

              </div>
            </>
          )}

          {/* ========================================================
              VIEW: SUB-VIEW: PLANTA (EXCESOS & MULTICARGOS)
              ======================================================== */}
          {activeView === 'planta' && (
            <div className="flex flex-col gap-6">
              {/* Main content tables - Full Width */}
              <div className="w-full flex flex-col gap-6">
                {tabPlanta === 'exceso' && (
                  <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
                    <div className="flex flex-col gap-1 mb-6">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Agentes con Exceso de Horas Cátedra</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        Cargas horarias acumuladas que superan el límite estatutario de 50 horas cátedra semanales
                      </p>
                    </div>

                    {/* Secondary Filter Pills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {[
                        { id: 'todos', label: 'Todos con Exceso', count: (data?.exceso_horas || []).length },
                        { id: 'criticos', label: 'Críticos (No Justificados)', count: (data?.exceso_horas || []).filter(a => a.status_auditoria === 'incompatibilidad_critica').length },
                        { id: 'justificados', label: 'Justificados (Con Licencia)', count: (data?.exceso_horas || []).filter(a => a.status_auditoria === 'exceso_justificado').length },
                        { id: 'sin_exceso', label: 'Sin Exceso (Regular <= 50 hs)', count: 'Regular' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFilterExceso(f.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-2 ${
                            filterExceso === f.id
                              ? 'bg-[#FE8204] text-white border-[#FE8204] shadow-sm'
                              : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:text-gray-700'
                          }`}
                        >
                          {f.label}
                          <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg ${
                            filterExceso === f.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {f.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {filterExceso === 'sin_exceso' ? (
                      <GlassCard className="p-10 bg-emerald-50/10 border-dashed border-emerald-200 text-center flex flex-col items-center justify-center gap-4 shadow-sm backdrop-blur-md w-full my-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center text-3xl shadow-md shadow-emerald-100/30 animate-pulse">
                          <i className="fa-solid fa-circle-check"></i>
                        </div>
                        <div className="flex flex-col gap-1.5 max-w-xl">
                          <h4 className="text-sm font-black text-emerald-900 uppercase tracking-wider">Carga Regular (Hasta 50 Horas Cátedra)</h4>
                          <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                            Los docentes en esta categoría no exceden los límites estatutarios vigentes y se consideran en situation regular en cuanto a su carga horaria activa.
                          </p>
                          <p className="text-xs font-semibold text-gray-400 mt-2">
                            Para consultar o auditar el expediente de un agente en situación regular, utilice el buscador del padrón en la pestaña de <strong>Agentes</strong> o ingrese su DNI directamente en la pestaña de <strong>Auditoría Única</strong>.
                          </p>
                        </div>
                      </GlassCard>
                    ) : (
                      <>
                        <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                          <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                              <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                                <th className="px-6 py-4">Docente</th>
                                <th className="px-6 py-4">DNI</th>
                                <th className="px-6 py-4">Legajo</th>
                                <th className="px-6 py-4 text-center">Carga Activa</th>
                                <th className="px-6 py-4 text-center">Estado / Carga Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                              {filteredExceso.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-6 py-12 text-center">
                                    <EmptyState text="No se hallaron agentes en esta categoría de exceso de horas." />
                                  </td>
                                </tr>
                              ) : (
                                currentExceso.map((agent, idx) => (
                                  <tr key={`${agent.dni}-${idx}`} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(agent.dni)}>
                                    <td className="px-6 py-4 font-black text-gray-900">{agent.nombre_agente}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800">{agent.dni}</td>
                                    <td className="px-6 py-4 font-mono text-gray-400">{agent.legajo || 'S/D'}</td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg font-bold">
                                        {agent.jerga_activa || `${agent.cargos_activos} cargos`}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <div className="flex flex-col items-center justify-center gap-1">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                          agent.status_auditoria === 'exceso_justificado'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-red-100 text-red-700 animate-pulse'
                                        }`}>
                                          {agent.status_auditoria === 'exceso_justificado' ? 'Exceso Cubierto' : 'Incompatibilidad Crítica'}
                                        </span>
                                        <span className="text-[10px] text-gray-450 font-bold leading-none mt-0.5">
                                          Total: {agent.jerga_total}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {filteredExceso.length > 0 && (
                          <Pagination
                            currentPage={pageExceso}
                            totalPages={totalPagesExceso}
                            onPageChange={setPageExceso}
                            totalItems={filteredExceso.length}
                            itemsName="docentes"
                          />
                        )}
                      </>
                    )}
                  </GlassCard>
                )}

                {tabPlanta === 'multi' && (
                  <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
                    <div className="flex flex-col gap-1 mb-6">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Docentes con Cargos Múltiples Fijos de Planta</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        Agentes con 3 o más cargos activos sin registrar horas cátedra (desempeño de planta física)
                      </p>
                    </div>

                    <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-4">Docente</th>
                            <th className="px-6 py-4">DNI</th>
                            <th className="px-6 py-4">Legajo</th>
                            <th className="px-6 py-4 text-center">Total Cargos Fijos</th>
                            <th className="px-6 py-4 text-center">Horas Carga</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                          {data.multi_cargos_fijos.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center">
                                <EmptyState text="No se hallaron agentes con multicargos fijos de planta." />
                              </td>
                            </tr>
                          ) : (
                            currentMulti.map((agent, idx) => (
                              <tr key={`${agent.dni}-${idx}`} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(agent.dni)}>
                                <td className="px-6 py-4 font-black text-gray-900">{agent.nombre_agente}</td>
                                <td className="px-6 py-4 font-bold text-gray-800">{agent.dni}</td>
                                <td className="px-6 py-4 font-mono text-gray-400">{agent.legajo || 'S/D'}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className="px-3 py-1 bg-purple-50 text-purple-600 border border-purple-100 rounded-full font-black">
                                    {agent.cargos_activos} Cargos Fijos
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center text-gray-450 font-bold">
                                  {agent.total_horas} hs (Planta)
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {data.multi_cargos_fijos.length > 0 && (
                      <Pagination
                        currentPage={pageMulti}
                        totalPages={totalPagesMulti}
                        onPageChange={setPageMulti}
                        totalItems={data.multi_cargos_fijos.length}
                        itemsName="docentes"
                      />
                    )}
                  </GlassCard>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: SUB-VIEW: VOLUMEN (ESCUELAS POR VOLUMEN)
              ======================================================== */}
          {activeView === 'volumen' && (
            <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
              <div className="flex flex-col gap-1 mb-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Ranking de Escuelas por Volumen de Cargos y Designaciones</h3>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Establecimientos con mayor concentración de planta docente y designaciones registradas</p>
              </div>

              {/* Filtros y Ordenamiento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Departamento Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Departamento</label>
                  <select
                    value={filterDepto}
                    onChange={(e) => setFilterDepto(e.target.value)}
                    className="bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#FE8204] transition-all cursor-pointer shadow-sm"
                  >
                    <option value="todos">Todos los departamentos</option>
                    {uniqueDeptos.map(depto => (
                      <option key={depto} value={depto}>{depto}</option>
                    ))}
                  </select>
                </div>

                {/* Nivel Educativo Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Nivel Educativo</label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#FE8204] transition-all cursor-pointer shadow-sm"
                  >
                    <option value="todos">Todos los niveles</option>
                    {uniqueLevels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                {/* Sorting Direction & Field Controls */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Orden y Sentido</label>
                  <div className="flex gap-2">
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                      className="bg-white border border-gray-150 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#FE8204] transition-all flex-1 cursor-pointer shadow-sm"
                    >
                      <option value="count">Designaciones</option>
                      <option value="docentes_unicos">Docentes Únicos</option>
                      <option value="promedio">Promedio Cargos/Docente</option>
                      <option value="establecimiento">Nombre Escuela</option>
                      <option value="cue">CUE</option>
                    </select>
                    
                    <button
                      onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="px-4 py-2 bg-gray-50 border border-gray-150 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                      title="Cambiar sentido del orden"
                    >
                      {sortDirection === 'asc' ? (
                        <>
                          <i className="fa-solid fa-arrow-up-1-9 text-sm text-[#FE8204]"></i>
                          Asc
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-arrow-down-9-1 text-sm text-[#FE8204]"></i>
                          Desc
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 select-none">
                      <th 
                        className="px-6 py-4 cursor-pointer hover:bg-gray-100/80 transition-colors group"
                        onClick={() => handleSort('cue')}
                      >
                        <div className="flex items-center gap-1">
                          CUE
                          {sortField === 'cue' ? (
                            <i className={`fa-solid ${sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} text-[#FE8204]`}></i>
                          ) : (
                            <i className="fa-solid fa-sort text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 cursor-pointer hover:bg-gray-100/80 transition-colors group"
                        onClick={() => handleSort('establecimiento')}
                      >
                        <div className="flex items-center gap-1">
                          Establecimiento Escolar
                          {sortField === 'establecimiento' ? (
                            <i className={`fa-solid ${sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} text-[#FE8204]`}></i>
                          ) : (
                            <i className="fa-solid fa-sort text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors group"
                        onClick={() => handleSort('count')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Total Designaciones
                          {sortField === 'count' ? (
                            <i className={`fa-solid ${sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} text-[#FE8204]`}></i>
                          ) : (
                            <i className="fa-solid fa-sort text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors group"
                        onClick={() => handleSort('docentes_unicos')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Docentes Únicos
                          {sortField === 'docentes_unicos' ? (
                            <i className={`fa-solid ${sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} text-[#FE8204]`}></i>
                          ) : (
                            <i className="fa-solid fa-sort text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors group"
                        onClick={() => handleSort('promedio')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Promedio (Cargos/Docente)
                          {sortField === 'promedio' ? (
                            <i className={`fa-solid ${sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} text-[#FE8204]`}></i>
                          ) : (
                            <i className="fa-solid fa-sort text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                    {loadingAnalytics ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Ejecutando cruce de planta...</td>
                      </tr>
                    ) : filteredAndSortedSchools.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          No se encontraron establecimientos escolares que coincidan con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      paginateArray(filteredAndSortedSchools, pageEscuelasDesig, itemsPerPageEscuelas).map((esc, idx) => (
                        <tr key={`${esc.cue}-${idx}`} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-mono font-bold text-gray-900 text-xs">CUE: {esc.cue}</td>
                          <td className="px-6 py-4 font-black text-gray-900 leading-snug">
                            <div className="flex flex-col">
                              <span>{esc.establecimiento}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {esc.departamento && (
                                  <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider bg-gray-100 px-1.5 py-0.5 rounded">
                                    Depto: {esc.departamento}
                                  </span>
                                )}
                                {esc.nivel_educativo && esc.nivel_educativo.split(',').map((level, lIdx) => (
                                  <span key={lIdx} className="text-[8px] text-cyan-600 font-bold uppercase tracking-wider bg-cyan-50 px-1.5 py-0.5 rounded">
                                    {level.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-cyan-50 text-cyan-600 border border-cyan-100 rounded-full font-black">
                              {esc.count} designaciones
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-700">
                            <strong>{esc.docentes_unicos}</strong> docentes
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                              (esc.count / esc.docentes_unicos) >= 2.0
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : 'bg-blue-50 text-blue-750 border border-blue-100'
                            }`}>
                              {(esc.count / esc.docentes_unicos).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!loadingAnalytics && filteredAndSortedSchools.length > 0 && (
                <Pagination
                  currentPage={pageEscuelasDesig}
                  totalPages={Math.ceil(filteredAndSortedSchools.length / itemsPerPageEscuelas)}
                  onPageChange={setPageEscuelasDesig}
                  totalItems={filteredAndSortedSchools.length}
                  itemsName="escuelas"
                />
              )}
            </GlassCard>
          )}

          {/* ========================================================
              VIEW: SUB-VIEW: LICENCIAS (TABLERO COMPLETO)
              ======================================================== */}
          {activeView === 'licencias' && (
            <div className="flex flex-col gap-6">
              {/* Tabular results - Full Width */}
              <div className="w-full flex flex-col gap-6">
                {/* Tab: Extremas */}
                {tabLicencia === 'extrema' && (
                  <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
                    <div className="flex flex-col gap-1 mb-6">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Licencias de Duración Excesiva o Corruptas</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Trámites con más de 365 días continuos o fechas del año 2060/2099</p>
                    </div>

                    <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-4">Agente</th>
                            <th className="px-6 py-4">DNI</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Fecha Inicio</th>
                            <th className="px-6 py-4">Fecha Fin</th>
                            <th className="px-6 py-4 text-center">Duración</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                          {loadingAnalytics ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Cargando análisis...</td>
                            </tr>
                          ) : !analytics?.licencias_incongruentes || analytics.licencias_incongruentes.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Sin licencias incongruentes detectadas.</td>
                            </tr>
                          ) : (
                            paginateArray(analytics.licencias_incongruentes, pageExtrema).map((lic) => (
                              <tr key={lic.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(lic.dni)}>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-black text-gray-900">{lic.nombre_agente}</span>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">ID: #{lic.id_tramite}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900">{lic.dni}</td>
                                <td className="px-6 py-4 text-red-600">{lic.tipo_licencia}</td>
                                <td className="px-6 py-4">{lic.fecha_inicio}</td>
                                <td className="px-6 py-4">{lic.fecha_fin}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-100 font-black">
                                    {lic.dias.toLocaleString('es-AR')} días
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {!loadingAnalytics && analytics?.licencias_incongruentes && (
                      <Pagination
                        currentPage={pageExtrema}
                        totalPages={Math.ceil(analytics.licencias_incongruentes.length / itemsPerPage)}
                        onPageChange={setPageExtrema}
                        totalItems={analytics.licencias_incongruentes.length}
                        itemsName="alertas"
                      />
                    )}
                  </GlassCard>
                )}

                {/* Tab: Solapamientos */}
                {tabLicencia === 'solapamiento' && (
                  <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
                    <div className="flex flex-col gap-1 mb-6">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Solapamiento Crítico de Licencias Vigentes</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Agentes con dos o más licencias médicas simultáneas registradas por DNI</p>
                    </div>

                    <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-4">Docente</th>
                            <th className="px-6 py-4">DNI</th>
                            <th className="px-6 py-4">Licencia 1</th>
                            <th className="px-6 py-4">Período 1</th>
                            <th className="px-6 py-4">Licencia 2</th>
                            <th className="px-6 py-4">Período 2</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                          {loadingAnalytics ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Cargando análisis...</td>
                            </tr>
                          ) : !analytics?.solapamientos || analytics.solapamientos.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Sin solapamientos detectados.</td>
                            </tr>
                          ) : (
                            paginateArray(analytics.solapamientos, pageSolapamientos).map((sol, idx) => (
                              <tr key={`${sol.dni}-${idx}`} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(sol.dni)}>
                                <td className="px-6 py-4">
                                  <span className="text-sm font-black text-gray-900">{sol.nombre_agente}</span>
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900">{sol.dni}</td>
                                <td className="px-6 py-4 text-purple-600">{sol.lic1}</td>
                                <td className="px-6 py-4 text-[10px] font-medium">{sol.ini1} al {sol.fin1}</td>
                                <td className="px-6 py-4 text-cyan-600">{sol.lic2}</td>
                                <td className="px-6 py-4 text-[10px] font-medium">{sol.ini2} al {sol.fin2}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {!loadingAnalytics && analytics?.solapamientos && (
                      <Pagination
                        currentPage={pageSolapamientos}
                        totalPages={Math.ceil(analytics.solapamientos.length / itemsPerPage)}
                        onPageChange={setPageSolapamientos}
                        totalItems={analytics.solapamientos.length}
                        itemsName="conflictos"
                      />
                    )}
                  </GlassCard>
                )}

                {/* Tab: Sin Suplente */}
                {tabLicencia === 'sin_suplente' && (
                  <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
                    <div className="flex flex-col gap-1 mb-6">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Licencias Médicas Vigentes sin Suplente Designado</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Casos donde no se ha cubierto el cargo del titular de licencia en ese turno</p>
                    </div>

                    <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-4">Titular</th>
                            <th className="px-6 py-4">Tipo Licencia</th>
                            <th className="px-6 py-4">Período</th>
                            <th className="px-6 py-4">Escuela (CUE)</th>
                            <th className="px-6 py-4">Turno</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                          {loadingAnalytics ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Cargando análisis...</td>
                            </tr>
                          ) : !analytics?.sin_suplente || analytics.sin_suplente.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Sin licencias activas sin suplencia.</td>
                            </tr>
                          ) : (
                            paginateArray(analytics.sin_suplente, pageSinSuplente).map((alert, idx) => (
                              <tr key={`${alert.dni}-${idx}`} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(alert.dni)}>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-black text-gray-900">{alert.nombre_agente}</span>
                                    <span className="text-[10px] text-gray-400">DNI: {alert.dni}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-purple-600 font-bold">{alert.tipo_licencia}</td>
                                <td className="px-6 py-4 text-[10px] font-medium">{alert.fecha_inicio} al {alert.fecha_fin}</td>
                                <td className="px-6 py-4 max-w-[200px] truncate" title={alert.establecimiento}>
                                  {alert.establecimiento} <span className="text-[10px] text-gray-400 font-bold">(CUE: {alert.cue})</span>
                                </td>
                                <td className="px-6 py-4">{alert.turno}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {!loadingAnalytics && analytics?.sin_suplente && (
                      <Pagination
                        currentPage={pageSinSuplente}
                        totalPages={Math.ceil(analytics.sin_suplente.length / itemsPerPage)}
                        onPageChange={setPageSinSuplente}
                        totalItems={analytics.sin_suplente.length}
                        itemsName="alertas"
                      />
                    )}
                  </GlassCard>
                )}

                {/* Tab: Fuera de término */}
                {tabLicencia === 'fuera_termino' && (
                  <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
                    <div className="flex flex-col gap-1 mb-6">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Carga Fuera de Término de Licencias</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Trámites registrados en la base de datos con un retraso superior a 10 días tras el inicio de la licencia</p>
                    </div>

                    <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-4">Agente</th>
                            <th className="px-6 py-4">DNI</th>
                            <th className="px-6 py-4">Licencia</th>
                            <th className="px-6 py-4">Inicio Licencia</th>
                            <th className="px-6 py-4">Fecha de Carga</th>
                            <th className="px-6 py-4 text-center">Retraso Carga</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                          {loadingLate ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                <i className="fa-solid fa-spinner fa-spin text-xl text-[#FE8204] mb-2"></i>
                                <p className="font-bold text-[9px] uppercase tracking-widest">Ejecutando cruce de auditoría...</p>
                              </td>
                            </tr>
                          ) : lateLics.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Sin alertas de carga tardía encontradas.</td>
                            </tr>
                          ) : (
                            paginateArray(lateLics, pageFueraTermino, itemsPerPageLate).map((lic) => (
                              <tr key={lic.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(lic.dni)}>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-black text-gray-900">{lic.nombre_agente}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Trámite ID: #{lic.id_tramite}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900">{lic.dni}</td>
                                <td className="px-6 py-4 text-[#FE8204] font-black">{lic.tipo_licencia}</td>
                                <td className="px-6 py-4">{lic.fecha_inicio}</td>
                                <td className="px-6 py-4 font-semibold text-gray-800">{lic.fecha_carga}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-[#FE8204] border border-[#FE8204]/20 font-black">
                                    +{lic.dias_retraso} días
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {!loadingLate && lateLics.length > 0 && (
                      <Pagination
                        currentPage={pageFueraTermino}
                        totalPages={Math.ceil(lateLics.length / itemsPerPageLate)}
                        onPageChange={setPageFueraTermino}
                        totalItems={lateLics.length}
                        itemsName="alertas"
                      />
                    )}
                  </GlassCard>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW: SUB-VIEW: AUSENTISMO (ESCUELAS CRÍTICAS)
              ======================================================== */}
          {activeView === 'ausentismo' && (
            <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
              <div className="flex flex-col gap-1 mb-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Ranking de Escuelas con Mayor Volumen de Licencias Médicas</h3>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Cruce de establecimientos según cantidad de licencias del personal asignado</p>
              </div>

              <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                      <th className="px-6 py-4">Nivel y CUE</th>
                      <th className="px-6 py-4">Establecimiento Escolar</th>
                      <th className="px-6 py-4">Localidad y Depto</th>
                      <th className="px-6 py-4 text-center">Total Licencias</th>
                      <th className="px-6 py-4 text-center">Docentes Afectados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                    {loadingAnalytics ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Cargando análisis...</td>
                      </tr>
                    ) : !analytics?.escuelas_licencias || analytics.escuelas_licencias.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Sin datos de escuelas disponibles.</td>
                      </tr>
                    ) : (
                      paginateArray(analytics.escuelas_licencias, pageEscuelasLic, itemsPerPageEscuelas).map((esc, idx) => (
                        <tr key={`${esc.cue}-${idx}`} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[10px] text-[#FE8204] font-black bg-[#FE8204]/5 px-2 py-0.5 rounded border border-[#FE8204]/10">
                                {esc.nivel_educativo || 'S/D'}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">CUE: {esc.cue}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">{esc.establecimiento}</td>
                          <td className="px-6 py-4 text-gray-500">
                            {esc.localidad || 'S/D'} (Depto: {esc.departamento || 'S/D'})
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-red-50 text-red-655 border border-red-100 rounded-full font-black">
                              {esc.count} licencias
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-705">
                            <strong>{esc.docentes}</strong> docentes únicos
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!loadingAnalytics && analytics?.escuelas_licencias && (
                <Pagination
                  currentPage={pageEscuelasLic}
                  totalPages={Math.ceil(analytics.escuelas_licencias.length / itemsPerPageEscuelas)}
                  onPageChange={setPageEscuelasLic}
                  totalItems={analytics.escuelas_licencias.length}
                  itemsName="escuelas"
                />
              )}
            </GlassCard>
          )}

        </div>
      )}
    </div>
  );
};
