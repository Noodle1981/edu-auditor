import React, { useEffect, useState, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { useGlobal } from '../Context/GlobalContext';
import { useDebounce } from '../Hooks/useDebounce';
import { GlassCard } from '../Components/GlassCard';
import { Pagination } from '../Components/Pagination';

const Designaciones = () => {
  const { analytics, loadingAnalytics, fetchAnalytics, openAgentModal } = useGlobal();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Navigation states
  const [view, setView] = useState('padron'); // 'padron' | 'auditoria' | 'escuelas'
  const [tab, setTab] = useState('exceso'); // 'exceso' | 'multi'

  // Sub-tables pagination states
  const [pageExceso, setPageExceso] = useState(1);
  const [pageMulti, setPageMulti] = useState(1);
  const [pageEscuelasDesig, setPageEscuelasDesig] = useState(1);

  // Advanced Audit Data states
  const [auditData, setAuditData] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // General Filter states
  const [search, setSearch] = useState('');
  const [cue, setCue] = useState('');
  const [turno, setTurno] = useState('');
  const [revista, setRevista] = useState('');
  const [page, setPage] = useState(1);

  // Debounced inputs
  const debouncedSearch = useDebounce(search, 450);
  const debouncedCue = useDebounce(cue, 450);

  // General Data states
  const [desigs, setDesigs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Track filters to reset page on change during render, avoiding double fetch
  const [prevFilters, setPrevFilters] = useState({
    debouncedSearch: '',
    debouncedCue: '',
    turno: '',
    revista: '',
  });

  if (
    prevFilters.debouncedSearch !== debouncedSearch ||
    prevFilters.debouncedCue !== debouncedCue ||
    prevFilters.turno !== turno ||
    prevFilters.revista !== revista
  ) {
    setPrevFilters({
      debouncedSearch,
      debouncedCue,
      turno,
      revista,
    });
    setPage(1);
  }

  // 1. Fetch general paginated designaciones
  useEffect(() => {
    let isMounted = true;
    const fetchDesignacionesData = async () => {
      setLoading(true);
      try {
        let queryParams = new URLSearchParams();
        if (debouncedSearch) queryParams.append('search', debouncedSearch);
        if (debouncedCue) queryParams.append('cue', debouncedCue);
        if (turno) queryParams.append('turno', turno);
        if (revista) queryParams.append('revista', revista);
        queryParams.append('page', page.toString());
        queryParams.append('limit', '15');

        const res = await fetch(`/api/designaciones/search?${queryParams.toString()}`);
        const result = await res.json();

        if (isMounted) {
          setDesigs(result.data || []);
          setTotal(result.total || 0);
          setTotalPages(result.total_pages || 1);
        }
      } catch (e) {
        console.error('Error fetching designaciones data:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (view === 'padron') {
      fetchDesignacionesData();
    }
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, debouncedCue, turno, revista, page, view]);

  // 2. Fetch Audit Data (On-Demand) when entering Auditoría view
  useEffect(() => {
    if (view !== 'auditoria') return;

    const fetchAuditData = async () => {
      setLoadingAudit(true);
      try {
        const res = await fetch('/api/auditorias');
        const result = await res.json();
        setAuditData(result);
      } catch (e) {
        console.error('Error fetching advanced auditorias:', e);
      } finally {
        setLoadingAudit(false);
      }
    };

    fetchAuditData();
  }, [view]);

  // Local Pagination Calculations for Sub-tables
  const ITEMS_PER_PAGE = 6;
  const ITEMS_PER_PAGE_ESCUELAS = 8;

  const currentExceso = useMemo(() => {
    return (auditData?.exceso_horas || []).slice(
      (pageExceso - 1) * ITEMS_PER_PAGE,
      pageExceso * ITEMS_PER_PAGE
    );
  }, [auditData, pageExceso]);

  const totalPagesExceso = Math.ceil((auditData?.exceso_horas || []).length / ITEMS_PER_PAGE) || 1;

  const currentMulti = useMemo(() => {
    return (auditData?.multi_cargos_fijos || []).slice(
      (pageMulti - 1) * ITEMS_PER_PAGE,
      pageMulti * ITEMS_PER_PAGE
    );
  }, [auditData, pageMulti]);

  const totalPagesMulti = Math.ceil((auditData?.multi_cargos_fijos || []).length / ITEMS_PER_PAGE) || 1;

  const currentEscuelasDesig = useMemo(() => {
    return (analytics?.escuelas_designaciones || []).slice(
      (pageEscuelasDesig - 1) * ITEMS_PER_PAGE_ESCUELAS,
      pageEscuelasDesig * ITEMS_PER_PAGE_ESCUELAS
    );
  }, [analytics, pageEscuelasDesig]);

  const totalPagesEscuelasDesig = Math.ceil((analytics?.escuelas_designaciones || []).length / ITEMS_PER_PAGE_ESCUELAS) || 1;

  const totalCargosRankeados = useMemo(() => {
    return (analytics?.escuelas_designaciones || []).reduce((acc, curr) => acc + curr.count, 0);
  }, [analytics]);

  const totalDocentesUnicosRankeados = useMemo(() => {
    return (analytics?.escuelas_designaciones || []).reduce((acc, curr) => acc + curr.docentes_unicos, 0);
  }, [analytics]);

  const escuelaMayorVolumen = useMemo(() => {
    return (analytics?.escuelas_designaciones || [])[0];
  }, [analytics]);

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
    <SIAMELayout>
      <Head title="Buscar Designaciones" />
      <div className="flex flex-col gap-6">
        {view === 'padron' && (
          <>
            {/* Filters Card */}
            <GlassCard className="p-6 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-magnifying-glass"></i> Buscar Cargo
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nombre, DNI o Legajo..."
                    className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-school"></i> CUE Escuela
                  </label>
                  <input
                    type="text"
                    value={cue}
                    onChange={(e) => setCue(e.target.value)}
                    placeholder="Ej: 7000..."
                    className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-clock"></i> Turno
                  </label>
                  <select
                    value={turno}
                    onChange={(e) => setTurno(e.target.value)}
                    className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-700 cursor-pointer"
                  >
                    <option value="">TODOS</option>
                    <option value="MAÑANA">MAÑANA</option>
                    <option value="TARDE">TARDE</option>
                    <option value="VESPERTINO">VESPERTINO</option>
                    <option value="NOCHE">NOCHE</option>
                    <option value="JORNADA COMPLETA">JORNADA COMPLETA</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-file-shield"></i> Sit. Revista
                  </label>
                  <select
                    value={revista}
                    onChange={(e) => setRevista(e.target.value)}
                    className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-700 cursor-pointer"
                  >
                    <option value="">TODAS</option>
                    <option value="TITULAR">TITULAR</option>
                    <option value="SUPLENTE">SUPLENTE</option>
                    <option value="INTERINO">INTERINO</option>
                    <option value="REEMPLAZANTE">REEMPLAZANTE</option>
                  </select>
                </div>
              </div>
            </GlassCard>

            {/* Tool Links Panel */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-orange-50/15 border border-orange-100/50 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col gap-0.5">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-chart-line text-[#FE8204]"></i> Módulos Avanzados de Planta y Control
                </h4>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                  Herramientas cruzadas y ranking de distribución de planta física
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setView('auditoria')}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white border border-cyan-100 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800 shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-scale-balanced text-cyan-600"></i> Auditoría de Planta
                </button>
                <button
                  onClick={() => setView('escuelas')}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white border border-blue-100 text-blue-700 hover:bg-blue-50 hover:text-blue-800 shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-briefcase text-blue-600"></i> Escuelas por Volumen
                </button>
              </div>
            </div>

            {/* Full-width Unified Cargos Table Container */}
            <GlassCard className="p-8 bg-white flex flex-col min-h-[400px] w-full">
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Cargos en Designaciones Oficiales</h3>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                    Cruce de planta oficial autorizada en la base de designaciones
                  </p>
                </div>
                <span className="text-xs px-3.5 py-1.5 bg-[#FE8204]/8 text-[#FE8204] border border-[#FE8204]/10 rounded-full font-black uppercase tracking-wider shadow-sm">
                  {loading ? 'Buscando...' : `${total.toLocaleString('es-AR')} cargos`}
                </span>
              </div>

              <div className="flex-1 w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                      <th className="px-6 py-4">Docente</th>
                      <th className="px-6 py-4">DNI</th>
                      <th className="px-6 py-4">Establecimiento</th>
                      <th className="px-6 py-4">CUE</th>
                      <th className="px-6 py-4">Cargo/Horas</th>
                      <th className="px-6 py-4">Turno</th>
                      <th className="px-6 py-4">Revista</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-20 text-center text-gray-400">
                          <i className="fa-solid fa-spinner fa-spin text-2xl text-[#FE8204] mb-2"></i>
                          <p className="font-bold text-[10px] uppercase tracking-widest">Buscando en la base de datos...</p>
                        </td>
                      </tr>
                    ) : desigs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-20 text-center text-gray-400">
                          <i className="fa-solid fa-briefcase-slash text-3xl text-gray-300 mb-2"></i>
                          <p className="font-bold text-[10px] uppercase tracking-widest">No se encontraron designaciones registradas</p>
                        </td>
                      </tr>
                    ) : (
                      desigs.map((des) => (
                        <tr
                          key={des.id}
                          className="hover:bg-gray-50/50 cursor-pointer transition-colors duration-300"
                          onClick={() => openAgentModal(des.dni)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900">{des.nombre_agente}</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                Legajo: {des.legajo || 'S/D'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">{des.dni}</td>
                          <td className="px-6 py-4">
                            <div className="max-w-[280px] truncate text-gray-500 font-semibold" title={des.establecimiento}>
                              {des.establecimiento}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">{des.cue || '-'}</td>
                          <td className="px-6 py-4">
                            {des.cargo_horas}{' '}
                            {des.horas_catedra > 0 && (
                              <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-50 border border-cyan-100 text-cyan-600 font-bold ml-1">
                                {des.horas_catedra} Hs
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">{des.turno || 'S/D'}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                des.situacion_revista === 'TITULAR'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : 'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {des.situacion_revista}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openAgentModal(des.dni)}
                              className="px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider bg-white border border-gray-100 shadow-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 cursor-pointer active:scale-95 transition-all ml-auto flex items-center gap-1"
                            >
                              <i className="fa-solid fa-eye text-[9px]"></i> Ver Ficha
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => setPage(p)}
                  totalItems={total}
                  itemsName="cargos"
                />
              )}
            </GlassCard>
          </>
        )}

        {view === 'escuelas' && (
          <GlassCard className="p-8 bg-white flex flex-col min-h-[500px]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-briefcase text-blue-600 animate-pulse"></i> Ranking de Escuelas por Volumen de Cargos
                </h3>
                <p className="text-xs font-semibold text-gray-400">
                  Análisis descriptivo de cargos oficiales frente a docentes únicos de planta por CUE
                </p>
              </div>
              <button
                onClick={() => setView('padron')}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gray-50 border border-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-100 shadow-sm active:scale-95 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i> Volver al Padrón
              </button>
            </div>

            {/* KPI Cards for ranking */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex flex-col gap-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cargos Oficiales Totales (Top 6)</span>
                <span className="text-2xl font-black text-gray-900">{totalCargosRankeados.toLocaleString('es-AR')} cargos</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex flex-col gap-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Docentes Únicos Afectados</span>
                <span className="text-2xl font-black text-gray-900">{totalDocentesUnicosRankeados.toLocaleString('es-AR')} agentes</span>
              </div>
              {escuelaMayorVolumen && (
                <div className="bg-[#FE8204]/5 border border-[#FE8204]/10 p-6 rounded-2xl flex flex-col gap-1.5">
                  <span className="text-[10px] text-[#FE8204] font-bold uppercase tracking-wider">Mayor Concentración de Planta</span>
                  <span className="text-sm font-black text-gray-900 truncate" title={escuelaMayorVolumen.establecimiento}>
                    {escuelaMayorVolumen.establecimiento}
                  </span>
                </div>
              )}
            </div>

            {/* Escuelas Table */}
            <div className="flex-1 w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                    <th className="px-6 py-4">CUE</th>
                    <th className="px-6 py-4">Nombre del Establecimiento</th>
                    <th className="px-6 py-4 text-center">Cargos Designados</th>
                    <th className="px-6 py-4 text-center">Agentes Únicos</th>
                    <th className="px-6 py-4 text-center">Tasa Concentración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                  {loadingAnalytics ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Cargando ranking...</td>
                    </tr>
                  ) : analytics?.escuelas_designaciones?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Sin datos de ranking disponibles.</td>
                    </tr>
                  ) : (
                    currentEscuelasDesig.map((esc) => {
                      const ratio = esc.count / (esc.docentes_unicos || 1);
                      return (
                        <tr key={esc.cue} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-mono font-bold text-gray-900">CUE {esc.cue}</td>
                          <td className="px-6 py-4 font-black text-gray-800">{esc.establecimiento}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg font-black">
                              {esc.count} cargos
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-700">
                            <strong>{esc.docentes_unicos}</strong> agentes
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-1 bg-[#FE8204]/5 text-[#FE8204] border border-[#FE8204]/10 rounded-lg font-black">
                              {ratio.toFixed(2)} cargos/agente
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loadingAnalytics && analytics?.escuelas_designaciones && (
              <Pagination
                currentPage={pageEscuelasDesig}
                totalPages={totalPagesEscuelasDesig}
                onPageChange={setPageEscuelasDesig}
                totalItems={analytics.escuelas_designaciones.length}
                itemsName="escuelas"
              />
            )}
          </GlassCard>
        )}

        {view === 'auditoria' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sub-tab selection */}
            <div className="lg:col-span-3 flex flex-col gap-2 bg-white border border-gray-100 p-4 rounded-3xl shadow-sm">
              {[
                { id: 'exceso', label: 'Exceso de Carga Horaria (>50h)', icon: 'fa-solid fa-hourglass-half' },
                { id: 'multi', label: 'Cargos Múltiples Fijos (3+)', icon: 'fa-solid fa-layer-group' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full px-5 py-4 text-xs font-black uppercase tracking-wider rounded-2xl flex items-center gap-3 cursor-pointer transition-all border ${
                    tab === item.id
                      ? 'bg-gradient-to-r from-[#FE8204]/8 to-[#FE8204]/2 text-[#FE8204] border-[#FE8204]/10 shadow-sm shadow-[#FE8204]/5'
                      : 'bg-white text-gray-500 hover:text-gray-900 border-transparent hover:bg-gray-50'
                  }`}
                >
                  <i className={`${item.icon} text-sm ${tab === item.id ? 'text-[#FE8204]' : 'text-gray-400'}`}></i>
                  {item.label}
                </button>
              ))}

              <div className="h-px bg-gray-100 my-2"></div>
              <button
                onClick={() => setView('padron')}
                className="w-full px-5 py-4 text-xs font-black uppercase tracking-wider rounded-2xl flex items-center gap-3 cursor-pointer transition-all bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                <i className="fa-solid fa-chevron-left text-sm text-gray-400"></i>
                Volver al Padrón
              </button>
            </div>

            {/* Results table */}
            <div className="lg:col-span-9 flex flex-col gap-6">
              {tab === 'exceso' && (
                <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
                  <div className="flex flex-col gap-1 mb-6">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Agentes con Exceso de Horas Cátedra</h3>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      Cargas horarias acumuladas que superan el límite estatutario de 50 horas
                    </p>
                  </div>

                  <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                          <th className="px-6 py-4">Docente</th>
                          <th className="px-6 py-4">DNI</th>
                          <th className="px-6 py-4">Legajo</th>
                          <th className="px-6 py-4 text-center">Cargos Activos</th>
                          <th className="px-6 py-4 text-center">Total Horas Carga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                        {loadingAudit ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Ejecutando cruce de datos...</td>
                          </tr>
                        ) : !auditData?.exceso_horas || auditData.exceso_horas.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center">
                              <EmptyState text="No se hallaron agentes que excedan el límite regulatorio de horas cátedra." />
                            </td>
                          </tr>
                        ) : (
                          currentExceso.map((agent) => (
                            <tr key={agent.dni} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(agent.dni)}>
                              <td className="px-6 py-4 font-black text-gray-900">{agent.nombre_agente}</td>
                              <td className="px-6 py-4 font-bold text-gray-800">{agent.dni}</td>
                              <td className="px-6 py-4 font-mono text-gray-400">{agent.legajo || 'S/D'}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg font-bold">
                                  {agent.cargos_activos} cargos
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full font-black animate-pulse">
                                  {agent.total_horas} Hs Cátedra
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!loadingAudit && auditData?.exceso_horas?.length > 0 && (
                    <Pagination
                      currentPage={pageExceso}
                      totalPages={totalPagesExceso}
                      onPageChange={setPageExceso}
                      totalItems={auditData.exceso_horas.length}
                      itemsName="docentes"
                    />
                  )}
                </GlassCard>
              )}

              {tab === 'multi' && (
                <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
                  <div className="flex flex-col gap-1 mb-6">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Docentes con Cargos Múltiples Fijos de Planta</h3>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      Agentes con 3 o más cargos activos sin registrar horas cátedra (desempeño de planta)
                    </p>
                  </div>

                  <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                          <th className="px-6 py-4">Docente</th>
                          <th className="px-6 py-4">DNI</th>
                          <th className="px-6 py-4">Legajo</th>
                          <th className="px-6 py-4 text-center">Cargos de Planta</th>
                          <th className="px-6 py-4 text-center">Compatibilidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                        {loadingAudit ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Ejecutando cruce de datos...</td>
                          </tr>
                        ) : !auditData?.multi_cargos_fijos || auditData.multi_cargos_fijos.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center">
                              <EmptyState text="Ningún agente posee incompatibilidad por acumulación de cargos de planta." />
                            </td>
                          </tr>
                        ) : (
                          currentMulti.map((agent) => (
                            <tr key={agent.dni} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(agent.dni)}>
                              <td className="px-6 py-4 font-black text-gray-900">{agent.nombre_agente}</td>
                              <td className="px-6 py-4 font-bold text-gray-800">{agent.dni}</td>
                              <td className="px-6 py-4 font-mono text-gray-400">{agent.legajo || 'S/D'}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-3 py-1 bg-cyan-50 text-cyan-600 border border-cyan-100 rounded-full font-black">
                                  {agent.cargos_activos} cargos
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full font-black uppercase tracking-wider text-[9px] animate-pulse">
                                  Auditoría Requerida
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!loadingAudit && auditData?.multi_cargos_fijos?.length > 0 && (
                    <Pagination
                      currentPage={pageMulti}
                      totalPages={totalPagesMulti}
                      onPageChange={setPageMulti}
                      totalItems={auditData.multi_cargos_fijos.length}
                      itemsName="docentes"
                    />
                  )}
                </GlassCard>
              )}
            </div>
          </div>
        )}
      </div>
    </SIAMELayout>
  );
};

export default Designaciones;
