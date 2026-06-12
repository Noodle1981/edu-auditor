import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { useGlobal } from '../Context/GlobalContext';
import { useDebounce } from '../Hooks/useDebounce';
import { GlassCard } from '../Components/GlassCard';
import { Pagination } from '../Components/Pagination';

const Licencias = () => {
  const { analytics, loadingAnalytics, openAgentModal } = useGlobal();

  // Navigation states
  const [view, setView] = useState('padron'); // 'padron' | 'auditoria' | 'escuelas'
  const [tab, setTab] = useState('extrema'); // 'extrema' | 'solapamiento' | 'fuera_termino' | 'sin_suplente'

  // Sub-tables pagination states
  const [pageExtrema, setPageExtrema] = useState(1);
  const [pageSolapamientos, setPageSolapamientos] = useState(1);
  const [pageSinSuplente, setPageSinSuplente] = useState(1);
  const [pageFueraTermino, setPageFueraTermino] = useState(1);
  const [pageEscuelas, setPageEscuelas] = useState(1);

  // Late filing licenses local states
  const [lateLics, setLateLics] = useState([]);
  const [loadingLate, setLoadingLate] = useState(false);

  // General Filter states
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('');
  const [minDias, setMinDias] = useState('');
  const [maxDias, setMaxDias] = useState('');
  const [page, setPage] = useState(1);

  // Debounced inputs for padrón search
  const debouncedSearch = useDebounce(search, 450);
  const debouncedMin = useDebounce(minDias, 450);
  const debouncedMax = useDebounce(maxDias, 450);

  // General Data states
  const [lics, setLics] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Track filters to reset page on change during render, avoiding double fetch
  const [prevFilters, setPrevFilters] = useState({
    debouncedSearch: '',
    tipo: '',
    debouncedMin: '',
    debouncedMax: '',
  });

  if (
    prevFilters.debouncedSearch !== debouncedSearch ||
    prevFilters.tipo !== tipo ||
    prevFilters.debouncedMin !== debouncedMin ||
    prevFilters.debouncedMax !== debouncedMax
  ) {
    setPrevFilters({
      debouncedSearch,
      tipo,
      debouncedMin,
      debouncedMax,
    });
    setPage(1);
  }

  // 1. Fetch general paginated licenses
  useEffect(() => {
    let isMounted = true;
    const fetchLicenciasData = async () => {
      setLoading(true);
      try {
        let queryParams = new URLSearchParams();
        if (debouncedSearch) queryParams.append('search', debouncedSearch);
        if (tipo) queryParams.append('tipo', tipo);
        if (debouncedMin) queryParams.append('dias_min', debouncedMin);
        if (debouncedMax) queryParams.append('dias_max', debouncedMax);
        queryParams.append('page', page.toString());
        queryParams.append('limit', '15');

        const res = await fetch(`/api/licencias/search?${queryParams.toString()}`);
        const result = await res.json();

        if (isMounted) {
          setLics(result.data || []);
          setTotal(result.total || 0);
          setTotalPages(result.total_pages || 1);
        }
      } catch (e) {
        console.error('Error fetching licencias data:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (view === 'padron') {
      fetchLicenciasData();
    }
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, tipo, debouncedMin, debouncedMax, page, view]);

  // 2. Fetch recent licenses to calculate "Fuera de Término"
  useEffect(() => {
    if (view !== 'auditoria' || tab !== 'fuera_termino') return;

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
  }, [view, tab]);

  const itemsPerPage = 10;

  // Pagination helper
  const paginateArray = (array, pageNumber) => {
    const start = (pageNumber - 1) * itemsPerPage;
    return array.slice(start, start + itemsPerPage);
  };

  return (
    <SIAMELayout>
      <Head title="Buscar Licencias" />
      <div className="flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2.5 flex-wrap bg-gray-50/20 border border-gray-100 rounded-2xl p-2.5 shadow-sm max-w-max">
          {[
            { id: 'padron', label: '📋 Padrón de Licencias' },
            { id: 'auditoria', label: '⚖️ Tablero de Auditoría' },
            { id: 'escuelas', label: '🏫 Escuelas Críticas' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer transition-all border ${
                view === item.id
                  ? 'bg-[#FE8204] text-white border-[#FE8204] shadow-md shadow-[#FE8204]/20'
                  : 'bg-white text-gray-500 hover:text-gray-900 border-gray-100 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ========================================================
            VIEW: Padrón de Licencias
            ======================================================== */}
        {view === 'padron' && (
          <>
            <GlassCard className="p-6 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-magnifying-glass"></i> Buscar Agente
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nombre, DNI o Documento..."
                    className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-notes-medical"></i> Tipo de Licencia
                  </label>
                  <input
                    type="text"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    placeholder="Artículo de licencia..."
                    className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-minus"></i> Duración Mínima
                  </label>
                  <input
                    type="number"
                    value={minDias}
                    onChange={(e) => setMinDias(e.target.value)}
                    placeholder="Días mínimos..."
                    className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-plus"></i> Duración Máxima
                  </label>
                  <input
                    type="number"
                    value={maxDias}
                    onChange={(e) => setMaxDias(e.target.value)}
                    placeholder="Días máximos..."
                    className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Historial Unificado de Licencias</h3>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Planillas consolidadas obtenidas de licencias.db</p>
                </div>
                <span className="text-xs px-3.5 py-1.5 bg-[#FE8204]/8 text-[#FE8204] border border-[#FE8204]/10 rounded-full font-black uppercase tracking-wider shadow-sm">
                  {loading ? 'Cargando...' : `${total.toLocaleString('es-AR')} licencias`}
                </span>
              </div>

              <div className="flex-1 w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                      <th className="px-8 py-5">Agente</th>
                      <th className="px-8 py-5">DNI</th>
                      <th className="px-8 py-5">Tipo Licencia</th>
                      <th className="px-8 py-5">N° Respaldo</th>
                      <th className="px-8 py-5">Fecha Inicio</th>
                      <th className="px-8 py-5">Fecha Fin</th>
                      <th className="px-8 py-5 text-center">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-20 text-center text-gray-400">
                          <i className="fa-solid fa-spinner fa-spin text-2xl text-[#FE8204] mb-2"></i>
                          <p className="font-bold text-[10px] uppercase tracking-widest">Buscando licencias registradas...</p>
                        </td>
                      </tr>
                    ) : lics.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-20 text-center text-gray-400">
                          <i className="fa-solid fa-file-excel text-3xl text-gray-300 mb-2"></i>
                          <p className="font-bold text-[10px] uppercase tracking-widest">No se hallaron licencias con los filtros aplicados</p>
                        </td>
                      </tr>
                    ) : (
                      lics.map((lic) => (
                        <tr
                          key={lic.id_tramite}
                          className="hover:bg-gray-50/50 transition-colors duration-200 cursor-pointer"
                          onClick={() => openAgentModal(lic.dni)}
                        >
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900">{lic.nombre_agente}</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Trámite ID: #{lic.id_tramite}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 font-bold text-gray-900">{lic.dni}</td>
                          <td className="px-8 py-5 text-[#FE8204] font-black">{lic.tipo_licencia}</td>
                          <td className="px-8 py-5 font-mono text-cyan-600">
                            <i className="fa-solid fa-file-invoice mr-1.5"></i>
                            {lic.documento_respaldo}
                          </td>
                          <td className="px-8 py-5">{lic.fecha_inicio}</td>
                          <td className="px-8 py-5">{lic.fecha_fin}</td>
                          <td className="px-8 py-5 text-center">
                            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold">
                              {lic.dias} días
                            </span>
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
                  itemsName="licencias"
                />
              )}
            </GlassCard>
          </>
        )}

        {/* ========================================================
            VIEW: Tablero de Auditoría
            ======================================================== */}
        {view === 'auditoria' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Sub-tab buttons */}
            <div className="lg:col-span-3 flex flex-col gap-2 bg-white border border-gray-100 p-4 rounded-3xl shadow-sm">
              {[
                { id: 'extrema', label: 'Licencias Extremas (>365d)', icon: 'fa-solid fa-calendar-xmark' },
                { id: 'solapamiento', label: 'Solapamientos por Agente', icon: 'fa-solid fa-clone' },
                { id: 'sin_suplente', label: 'Licencias Médicas sin Suplente', icon: 'fa-solid fa-user-slash' },
                { id: 'fuera_termino', label: 'Licencias Fuera de Término', icon: 'fa-solid fa-clock-rotate-left' }
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
            </div>

            {/* Right Column: Tabular Results */}
            <div className="lg:col-span-9 flex flex-col gap-6">
              {/* Tab: Extremas */}
              {tab === 'extrema' && (
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
                            <tr key={lic.id_tramite} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(lic.dni)}>
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
              {tab === 'solapamiento' && (
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
                          paginateArray(analytics.solapamientos, pageSolapamientos).map((sol) => (
                            <tr key={`${sol.dni}-${sol.ini1}-${sol.ini2}`} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(sol.dni)}>
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
              {tab === 'sin_suplente' && (
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
                          paginateArray(analytics.sin_suplente, pageSinSuplente).map((alert) => (
                            <tr key={`${alert.dni}-${alert.cue}-${alert.fecha_inicio}`} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(alert.dni)}>
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
              {tab === 'fuera_termino' && (
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
                          paginateArray(lateLics, pageFueraTermino).map((lic) => (
                            <tr key={lic.id_tramite} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => openAgentModal(lic.dni)}>
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
                      totalPages={Math.ceil(lateLics.length / itemsPerPage)}
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
            VIEW: Escuelas Críticas
            ======================================================== */}
        {view === 'escuelas' && (
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
                    paginateArray(analytics.escuelas_licencias, pageEscuelas).map((esc) => (
                      <tr key={esc.cue} className="hover:bg-gray-50/50">
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
                          <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full font-black">
                            {esc.count} licencias
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-700">
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
                currentPage={pageEscuelas}
                totalPages={Math.ceil(analytics.escuelas_licencias.length / itemsPerPage)}
                onPageChange={setPageEscuelas}
                totalItems={analytics.escuelas_licencias.length}
                itemsName="escuelas"
              />
            )}
          </GlassCard>
        )}
      </div>
    </SIAMELayout>
  );
};

export default Licencias;
