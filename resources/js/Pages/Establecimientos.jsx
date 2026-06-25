import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { useGlobal } from '../Context/GlobalContext';
import { useDebounce } from '../Hooks/useDebounce';
import { GlassCard } from '../Components/GlassCard';
import { Pagination } from '../Components/Pagination';

const Establecimientos = () => {
  const { openAgentModal, activeYear } = useGlobal();

  // Filters State
  const [search, setSearch] = useState('');
  const [direccionArea, setDireccionArea] = useState('');
  const [nivelEducativo, setNivelEducativo] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [page, setPage] = useState(1);

  // Dynamic Filters Options
  const [filterOptions, setFilterOptions] = useState({
    direcciones: [],
    niveles: [],
    departamentos: []
  });

  // Debounced inputs
  const debouncedSearch = useDebounce(search, 450);

  // Data States
  const [establecimientos, setEstablecimientos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Selected Establishment Details (Modal/Panel)
  const [selectedEstId, setSelectedEstId] = useState(null);
  const [estDetail, setEstDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cupofSearch, setCupofSearch] = useState('');

  // Track filter changes to reset page
  const [prevFilters, setPrevFilters] = useState({
    debouncedSearch: '',
    direccionArea: '',
    nivelEducativo: '',
    departamento: '',
  });

  if (
    prevFilters.debouncedSearch !== debouncedSearch ||
    prevFilters.direccionArea !== direccionArea ||
    prevFilters.nivelEducativo !== nivelEducativo ||
    prevFilters.departamento !== departamento
  ) {
    setPrevFilters({
      debouncedSearch,
      direccionArea,
      nivelEducativo,
      departamento,
    });
    setPage(1);
  }

  // Fetch unique filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch('/api/establecimientos/filters');
        const data = await res.json();
        setFilterOptions({
          direcciones: data.direcciones || [],
          niveles: data.niveles || [],
          departamentos: data.departamentos || []
        });
      } catch (e) {
        console.error('Error fetching filter options:', e);
      }
    };
    fetchFilters();
  }, []);

  // Fetch paginated establishments
  useEffect(() => {
    let isMounted = true;
    const fetchEstablecimientos = async () => {
      setLoading(true);
      try {
        let queryParams = new URLSearchParams();
        if (debouncedSearch) queryParams.append('search', debouncedSearch);
        if (direccionArea) queryParams.append('direccion_area', direccionArea);
        if (nivelEducativo) queryParams.append('nivel_educativo', nivelEducativo);
        if (departamento) queryParams.append('departamento', departamento);
        queryParams.append('page', page.toString());
        queryParams.append('limit', '15');
        queryParams.append('year', activeYear);

        const res = await fetch(`/api/establecimientos?${queryParams.toString()}`);
        const result = await res.json();

        if (isMounted) {
          setEstablecimientos(result.data || []);
          setTotal(result.total || 0);
          setTotalPages(result.total_pages || 1);
        }
      } catch (e) {
        console.error('Error fetching establishments:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEstablecimientos();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, direccionArea, nivelEducativo, departamento, page, activeYear]);

  // Fetch specific establishment detail when selected
  useEffect(() => {
    if (!selectedEstId) {
      setEstDetail(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await fetch(`/api/establecimientos/${selectedEstId}?year=${activeYear}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.establecimiento) {
            setEstDetail(data);
          } else {
            if (isMounted) setEstDetail(null);
          }
        } else {
          if (isMounted) setEstDetail(null);
        }
      } catch (e) {
        console.error('Error fetching establishment detail:', e);
        if (isMounted) setEstDetail(null);
      } finally {
        if (isMounted) {
          setLoadingDetail(false);
        }
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedEstId, activeYear]);

  // Filter CUPOFs within the detail panel
  const filteredCupofs = estDetail?.cupofs?.filter(c => {
    const searchLower = cupofSearch.toLowerCase();
    return (
      c.cupof?.toLowerCase().includes(searchLower) ||
      c.cargo_horas?.toLowerCase().includes(searchLower) ||
      c.agents?.some(a => a.nombre_agente?.toLowerCase().includes(searchLower) || a.dni?.includes(searchLower))
    );
  }) || [];

  // Calculate Audit Summary for the selected school
  const auditSummary = React.useMemo(() => {
    if (!estDetail || !estDetail.cupofs) return null;

    let totalCupofs = estDetail.cupofs.length;
    let covered = 0;
    let uncoveredLicenseNoReplacement = 0;
    let uncoveredChainLicense = 0;
    let extraAgents = 0;

    estDetail.cupofs.forEach(c => {
      const agents = c.agents || [];
      if (agents.length === 1) {
        const agent = agents[0];
        if (agent.tiene_licencia_activa) {
          uncoveredLicenseNoReplacement++;
        } else {
          covered++;
        }
      } else if (agents.length > 1) {
        // Count active agents and replacements
        let activeCount = 0;
        let replacementsCount = 0;
        agents.forEach(a => {
          const rev = (a.situacion_revista || "").toUpperCase();
          if (rev === 'SUPLENTE' || rev === 'REEMPLAZANTE') {
            replacementsCount++;
          }
          if (!a.tiene_licencia_activa) {
            activeCount++;
          }
        });
        
        extraAgents += replacementsCount;
        
        if (activeCount > 0) {
          covered++;
        } else {
          uncoveredChainLicense++;
        }
      }
    });

    const uncovered = uncoveredLicenseNoReplacement + uncoveredChainLicense;
    const coveragePercent = totalCupofs > 0 ? Math.round((covered / totalCupofs) * 100) : 0;

    return {
      totalCupofs,
      covered,
      uncovered,
      uncoveredLicenseNoReplacement,
      uncoveredChainLicense,
      extraAgents,
      coveragePercent
    };
  }, [estDetail]);

  return (
    <SIAMELayout>
      <Head title="Buscar Establecimientos" />
      <div className="flex flex-col gap-6">
        
        {/* Title */}
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Padrones y Estructura de Establecimientos
          </h1>
          <p className="text-sm text-gray-500 font-semibold mt-1">
            Consulta de escuelas, infraestructura y cobertura nominal de cargos y plantas orgánicas funcionales (POF/PON).
          </p>
        </div>

        {/* Filters Card */}
        <GlassCard className="p-6 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-magnifying-glass"></i> Buscar Escuela
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre de escuela o CUE..."
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-layer-group"></i> Dirección de Área
              </label>
              <select
                value={direccionArea}
                onChange={(e) => setDireccionArea(e.target.value)}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-750 cursor-pointer"
              >
                <option value="">TODAS</option>
                {filterOptions.direcciones.map(dir => (
                  <option key={dir} value={dir}>{dir}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-graduation-cap"></i> Nivel Educativo
              </label>
              <select
                value={nivelEducativo}
                onChange={(e) => setNivelEducativo(e.target.value)}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-755 cursor-pointer"
              >
                <option value="">TODOS</option>
                {filterOptions.niveles.map(niv => (
                  <option key={niv} value={niv}>{niv}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-map-location-dot"></i> Departamento
              </label>
              <select
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-760 cursor-pointer"
              >
                <option value="">TODOS</option>
                {filterOptions.departamentos.map(dpto => (
                  <option key={dpto} value={dpto}>{dpto}</option>
                ))}
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Master-Detail Split Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Side: Establishments List */}
          <div className={`${selectedEstId ? 'lg:col-span-6 xl:col-span-5' : 'lg:col-span-12'} transition-all duration-300`}>
            <GlassCard className="p-6 bg-white flex flex-col min-h-[400px] w-full">
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Escuelas Registradas</h3>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                    Establecimientos educativos y sus plantas funcionales
                  </p>
                </div>
                <span className="text-xs px-3.5 py-1.5 bg-[#FE8204]/8 text-[#FE8204] border border-[#FE8204]/10 rounded-full font-black uppercase tracking-wider shadow-sm">
                  {loading ? 'Buscando...' : `${total.toLocaleString('es-AR')} escuelas`}
                </span>
              </div>

              <div className="flex-1 w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                      <th className="px-6 py-4">Escuela / CUE</th>
                      <th className="px-6 py-4">Ubicación</th>
                      {!selectedEstId && <th className="px-6 py-4">Modalidades</th>}
                      <th className="px-6 py-4 text-center">Plazas</th>
                      <th className="px-6 py-4 text-center">Agentes</th>
                      <th className="px-6 py-4 text-center">Cobertura</th>
                      <th className="px-6 py-4 text-center">Agentes de Más</th>
                      <th className="px-6 py-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-650">
                    {loading ? (
                      <tr>
                        <td colSpan={selectedEstId ? 7 : 8} className="px-6 py-20 text-center text-gray-400">
                          <i className="fa-solid fa-spinner fa-spin text-2xl text-[#FE8204] mb-2"></i>
                          <p className="font-bold text-[10px] uppercase tracking-widest">Cargando escuelas...</p>
                        </td>
                      </tr>
                    ) : establecimientos.length === 0 ? (
                      <tr>
                        <td colSpan={selectedEstId ? 7 : 8} className="px-6 py-20 text-center text-gray-400">
                          <i className="fa-solid fa-folder-open text-3xl text-gray-300 mb-2"></i>
                          <p className="font-bold text-[10px] uppercase tracking-widest">No se encontraron establecimientos</p>
                        </td>
                      </tr>
                    ) : (
                      establecimientos.map((est) => {
                        const isSelected = est.id === selectedEstId;
                        return (
                          <tr
                            key={est.id}
                            className={`hover:bg-gray-50/50 transition-colors duration-200 cursor-pointer ${
                              isSelected ? 'bg-[#FE8204]/5 hover:bg-[#FE8204]/8' : ''
                            }`}
                            onClick={() => setSelectedEstId(est.id)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-gray-900 truncate max-w-[280px]" title={est.nombre}>
                                  {est.nombre}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold tracking-wider mt-0.5">CUE: {est.cue}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col text-[11px]">
                                <span className="font-bold text-gray-800 uppercase">{est.departamento}</span>
                                <span className="text-gray-400 font-medium">{est.localidad || 'Sin localidad'}</span>
                              </div>
                            </td>
                            {!selectedEstId && (
                              <td className="px-6 py-4 max-w-[200px]">
                                <div className="flex flex-wrap gap-1">
                                  {est.modalidades && est.modalidades.length > 0 ? (
                                    est.modalidades.slice(0, 2).map((m, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-black uppercase tracking-wider border border-gray-200"
                                      >
                                        {m.direccion_area} - {m.nivel_educativo}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-450 text-[10px]">Sin modalidad</span>
                                  )}
                                  {est.modalidades && est.modalidades.length > 2 && (
                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-black border border-gray-200">
                                      +{est.modalidades.length - 2}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 text-center">
                              <span className="font-black text-gray-900 text-sm">{est.cupof_count}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-black text-gray-900 text-sm">{est.agent_count}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                                  est.coverage_percent >= 90
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : est.coverage_percent >= 75
                                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                                      : 'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                  {est.coverage_percent}%
                                </span>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{est.covered_count} / {est.cupof_count}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {est.extra_agents_count > 0 ? (
                                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black rounded-full uppercase tracking-wider">
                                  +{est.extra_agents_count}
                                </span>
                              ) : (
                                <span className="text-gray-400 font-medium">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEstId(est.id);
                                }}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  isSelected
                                    ? 'bg-[#FE8204] text-white border-transparent'
                                    : 'bg-gray-50 text-gray-400 hover:text-[#FE8204] hover:bg-[#FE8204]/5 border-gray-100'
                                }`}
                              >
                                <i className="fa-solid fa-chevron-right text-xs"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })
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
                  itemsName="escuelas"
                />
              )}
            </GlassCard>
          </div>

          {/* Right Side: Establishment Details & CUPOF Hierarchy */}
          {selectedEstId && (
            <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-6 animate-fade-in">
              <GlassCard className="p-6 bg-white border border-gray-100 shadow-md relative min-h-[400px]">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedEstId(null)}
                  className="absolute top-4 right-4 p-2 bg-gray-50 hover:bg-red-50 hover:text-red-500 border border-gray-100 text-gray-400 rounded-xl transition-all cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>

                {loadingDetail ? (
                  <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#FE8204] mb-3"></i>
                    <p className="font-bold text-[10px] uppercase tracking-widest">Cargando planta nominal y física...</p>
                  </div>
                ) : estDetail && estDetail.establecimiento ? (
                  <div className="flex flex-col gap-6">
                    
                    {/* Header */}
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#FE8204] bg-[#FE8204]/8 px-2.5 py-1 rounded-full border border-[#FE8204]/10 shadow-sm inline-block mb-2">
                        Año de Consulta: {activeYear}
                      </span>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight leading-snug">
                        {estDetail.establecimiento.nombre}
                      </h2>
                      <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">
                        CUE: {estDetail.establecimiento.cue} | CUE Edificio Principal: {estDetail.establecimiento.cue_edificio_principal || 'S/D'}
                      </p>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Infrastructure & General Details */}
                    <div>
                      <h4 className="text-[10px] text-gray-450 font-black uppercase tracking-widest mb-3">
                        <i className="fa-solid fa-circle-info mr-1 text-[#FE8204]/70"></i> Información Física e Infraestructura
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-semibold">
                        <div className="flex flex-col bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Dirección</span>
                          <span className="text-gray-800 mt-1 uppercase text-[11px]">
                            {estDetail.establecimiento.calle || 'S/D'} {estDetail.establecimiento.numero_puerta}
                          </span>
                        </div>
                        <div className="flex flex-col bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ubicación</span>
                          <span className="text-gray-800 mt-1 uppercase text-[11px]">
                            {estDetail.establecimiento.localidad} - {estDetail.establecimiento.zona_departamento}
                          </span>
                        </div>
                        <div className="flex flex-col bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Teléfono VoIP / Letra Zona</span>
                          <span className="text-gray-800 mt-1 uppercase text-[11px]">
                            {estDetail.establecimiento.te_voip || 'S/D'} / Zona {estDetail.establecimiento.letra_zona || 'S/D'}
                          </span>
                        </div>
                        <div className="flex flex-col bg-gray-50/50 p-3 rounded-xl border border-gray-100 col-span-1 sm:col-span-2">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Coordenadas y CUI</span>
                          <span className="text-gray-800 mt-1 text-[11px] font-mono">
                            CUI: {estDetail.establecimiento.cui || 'S/D'} | Lat: {estDetail.establecimiento.latitud ?? 'S/D'}, Long: {estDetail.establecimiento.longitud ?? 'S/D'}
                          </span>
                        </div>
                        <div className="flex flex-col bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Establecimiento Cabecera</span>
                          <span className="text-gray-800 mt-1 text-[11px] truncate uppercase" title={estDetail.establecimiento.establecimiento_cabecera}>
                            {estDetail.establecimiento.establecimiento_cabecera || 'No registra'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Radios y Georreferencia Oficial (Excel) */}
                    {estDetail.establecimiento.punto_partida && (
                      <div className="bg-gray-50/40 p-4 rounded-2xl border border-gray-100 flex flex-col gap-3">
                        <h4 className="text-[10px] text-gray-450 font-black uppercase tracking-widest flex items-center gap-1.5">
                          <i className="fa-solid fa-map-location-dot text-[#FE8204]"></i> Radios y Georreferencia Oficial
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
                          <div className="flex flex-col bg-white p-3 rounded-xl border border-gray-100/50 shadow-sm">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Km 0 / Origen</span>
                            <span className="text-gray-800 mt-1 uppercase text-[10px] truncate" title={estDetail.establecimiento.punto_partida}>
                              {estDetail.establecimiento.punto_partida}
                            </span>
                          </div>
                          
                          <div className="flex flex-col bg-white p-3 rounded-xl border border-gray-100/50 shadow-sm">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Distancia Camino</span>
                            <span className="text-gray-900 mt-1 font-black text-[11px]">
                              {estDetail.establecimiento.distancia_camino ? `${parseFloat(estDetail.establecimiento.distancia_camino).toFixed(1)} km` : 'S/D'}{' '}
                              {estDetail.establecimiento.tiempo_google_auto && (
                                <span className="text-gray-400 font-normal">({estDetail.establecimiento.tiempo_google_auto})</span>
                              )}
                            </span>
                          </div>
                          
                          <div className="flex flex-col bg-white p-3 rounded-xl border border-gray-100/50 shadow-sm">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Radio Camino</span>
                            <span className="text-gray-900 mt-1 font-black text-[11px]">
                              Radio {estDetail.establecimiento.radio_camino || 'S/D'}
                            </span>
                          </div>

                          <div className="flex flex-col bg-white p-3 rounded-xl border border-gray-100/50 shadow-sm">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Línea Recta (Circ)</span>
                            <span className="text-gray-900 mt-1 font-black text-[11px]">
                              {estDetail.establecimiento.dist_circunf ? `${parseFloat(estDetail.establecimiento.dist_circunf).toFixed(1)} km` : 'S/D'}{' '}
                              <span className="text-gray-450 font-semibold">(Rad {estDetail.establecimiento.radio_circ || 'S/D'})</span>
                            </span>
                          </div>
                        </div>
                        {estDetail.establecimiento.observacion && (
                          <div className="text-[10px] text-gray-500 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 italic leading-snug">
                            <strong>Observación:</strong> {estDetail.establecimiento.observacion}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Modalities List */}
                    {estDetail.establecimiento.modalidades && estDetail.establecimiento.modalidades.length > 0 && (
                      <div>
                        <h4 className="text-[10px] text-gray-450 font-black uppercase tracking-widest mb-3">
                          <i className="fa-solid fa-graduation-cap mr-1 text-[#FE8204]/70"></i> Modalidades y Legalidad de la Escuela
                        </h4>
                        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 font-black text-[9px] uppercase tracking-wider">
                                <th className="px-4 py-2.5">Área / Nivel</th>
                                <th className="px-4 py-2.5 text-center">Radio</th>
                                <th className="px-4 py-2.5">Creación Legal</th>
                                <th className="px-4 py-2.5 text-center">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 font-semibold text-gray-650">
                              {estDetail.establecimiento.modalidades.map((mod) => (
                                <tr key={mod.id} className="hover:bg-gray-50/30">
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span className="text-gray-900 font-bold">{mod.direccion_area}</span>
                                      <span className="text-[10px] text-gray-400">{mod.nivel_educativo} | Sector: {mod.sector || 'S/D'}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col items-center">
                                      <span className="text-gray-950 font-bold">
                                        Radio {mod.radio ? parseFloat(mod.radio) : 'S/D'}
                                      </span>
                                      {mod.radio_sige !== null && mod.radio_sige !== undefined && (
                                        <span className={`text-[8.5px] font-black uppercase mt-1 px-1.5 py-0.5 rounded ${
                                          parseFloat(mod.radio) !== parseFloat(mod.radio_sige)
                                            ? 'text-red-700 bg-red-50 border border-red-100 animate-pulse'
                                            : 'text-gray-400 bg-gray-50 border border-gray-100'
                                        }`}>
                                          SiGE: {mod.radio_sige}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-gray-500 text-[10px] max-w-[150px] truncate" title={mod.inst_legal_creacion}>
                                    {mod.inst_legal_creacion || 'Sin Instrumento'}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`px-2 py-0.5 text-[8.5px] font-black uppercase rounded-full ${
                                        mod.estado_validacion === 'CORRECTO'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                                      }`}
                                    >
                                      {mod.estado_validacion || 'PENDIENTE'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <hr className="border-gray-100" />

                    {/* Resumen de Auditoría de Planta (POF vs PON) */}
                    {auditSummary && (
                      <div className="bg-gray-50/50 rounded-[20px] border border-gray-150 p-4.5 flex flex-col gap-4">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <h4 className="text-[10px] text-gray-450 font-black uppercase tracking-widest flex items-center gap-1.5">
                            <i className="fa-solid fa-chart-pie text-[#FE8204]/70"></i> Resumen de Auditoría de Planta (POF vs PON)
                          </h4>
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border tracking-wider ${
                            auditSummary.coveragePercent >= 90
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : auditSummary.coveragePercent >= 75
                                ? 'bg-amber-50 text-amber-700 border-amber-100'
                                : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            Cobertura Activa: {auditSummary.coveragePercent}%
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                          {/* Cobertura Card */}
                          <div className="flex flex-col bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm justify-between gap-1">
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Cargos Cubiertos</span>
                              <i className="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
                            </div>
                            <span className="text-xl font-black text-gray-900 mt-1 leading-none">
                              {auditSummary.covered} <span className="text-[9px] font-bold text-gray-400">/ {auditSummary.totalCupofs} plazas</span>
                            </span>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${auditSummary.coveragePercent}%` }}></div>
                            </div>
                          </div>

                          {/* Vacantes Card */}
                          <div className="flex flex-col bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm justify-between gap-1">
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Plazas Descubiertas</span>
                              <i className="fa-solid fa-triangle-exclamation text-red-500 text-sm animate-pulse"></i>
                            </div>
                            <span className="text-xl font-black text-gray-900 mt-1 leading-none">
                              {auditSummary.uncovered} <span className="text-[9px] font-bold text-gray-400">sin reemplazo</span>
                            </span>
                            <span className="text-[9px] text-red-650 font-black mt-2 uppercase tracking-wide truncate" title={`${auditSummary.uncoveredLicenseNoReplacement} s/suplente | ${auditSummary.uncoveredChainLicense} cadena lic.`}>
                              {auditSummary.uncoveredLicenseNoReplacement} s/suplente | {auditSummary.uncoveredChainLicense} cadena
                            </span>
                          </div>

                          {/* Extra Agents Card */}
                          <div className="flex flex-col bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm justify-between gap-1">
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Agentes de Más (Sobrecarga)</span>
                              <i className="fa-solid fa-people-arrows text-blue-500 text-sm"></i>
                            </div>
                            <span className="text-xl font-black text-gray-900 mt-1 leading-none">
                              +{auditSummary.extraAgents} <span className="text-[9px] font-bold text-gray-400">suplentes/reempl.</span>
                            </span>
                            <span className="text-[9px] text-blue-600 font-black mt-2 uppercase tracking-wide">
                              En planta por licencias activas
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <hr className="border-gray-100" />

                    {/* CUPOFs and Hierarchy Section */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                            Estructura de Cargos y Coberturas (CUPOF)
                          </h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                            Cruce nominal de plazas para el año escolar actual
                          </p>
                        </div>
                        <div className="w-full sm:w-64 relative">
                          <input
                            type="text"
                            value={cupofSearch}
                            onChange={(e) => setCupofSearch(e.target.value)}
                            placeholder="Buscar CUPOF, cargo o agente..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white text-gray-900 placeholder-gray-400 pl-8"
                          />
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-[10px] text-gray-400"></i>
                        </div>
                      </div>

                      {filteredCupofs.length === 0 ? (
                        <div className="p-8 text-center text-gray-450 border-2 border-dashed border-gray-100 rounded-2xl">
                          <i className="fa-solid fa-address-book text-2xl text-gray-300 mb-2"></i>
                          <p className="text-[10px] font-bold uppercase tracking-widest">No se hallaron cargos coincidentes</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
                          {filteredCupofs.map((cupof) => {
                            const { titulares_interinos = [], suplentes = [], reemplazantes = [], otros = [] } = cupof.hierarchy || {};
                            
                            // Reconstruct hierarchical sorted list (sequential replacement chain)
                            const sortedAgents = [];
                            let currentLevel = 0;
                            
                            titulares_interinos.forEach((a) => {
                              sortedAgents.push({ ...a, level: currentLevel });
                            });
                            
                            if (titulares_interinos.length > 0) {
                              currentLevel = 1;
                            }
                            
                            currentLevel = Math.max(1, currentLevel);
                            suplentes.forEach((a, idx) => {
                              sortedAgents.push({ ...a, level: currentLevel + idx });
                            });
                            
                            if (suplentes.length > 0) {
                              currentLevel = currentLevel + suplentes.length;
                            }
                            
                            currentLevel = Math.max(2, currentLevel);
                            reemplazantes.forEach((a, idx) => {
                              sortedAgents.push({ ...a, level: currentLevel + idx });
                            });
                            
                            if (reemplazantes.length > 0) {
                              currentLevel = currentLevel + reemplazantes.length;
                            }
                            
                            currentLevel = Math.max(3, currentLevel);
                            otros.forEach((a, idx) => {
                              sortedAgents.push({ ...a, level: currentLevel + idx });
                            });


                            return (
                              <div key={cupof.cupof} className="shrink-0 border border-gray-150 rounded-2xl bg-gray-50/20 overflow-hidden shadow-sm hover:shadow transition-shadow">
                                {/* CUPOF Summary Header */}
                                <div className="bg-gray-50/70 border-b border-gray-100 p-3.5 flex justify-between items-start gap-4">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-xs font-black text-gray-950 select-all tracking-tight">
                                        {cupof.cupof}
                                      </span>
                                      <span className={`px-2 py-0.5 text-[8.5px] font-black uppercase rounded-full border tracking-wider shrink-0 ${
                                        cupof.agents.length > 1
                                          ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                                          : 'bg-blue-50 text-blue-700 border-blue-100'
                                      }`}>
                                        {cupof.agents.length === 1 ? '1 Persona' : `${cupof.agents.length} Personas`}
                                      </span>
                                    </div>
                                    <span className="text-[10.5px] font-black text-gray-700 mt-2 uppercase">
                                      {cupof.cargo_horas || 'Cargo sin denominación'}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span className="text-[9px] px-2 py-0.5 bg-[#FE8204]/8 text-[#FE8204] font-black border border-[#FE8204]/10 rounded uppercase">
                                      {cupof.turno || 'S/D'}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-900">
                                      {cupof.horas_catedra ?? 0} hs
                                    </span>
                                  </div>
                                </div>

                                {/* Hierarchy Replacement Chains */}
                                <div className="p-4 flex flex-col gap-3 bg-white">
                                  {sortedAgents.length === 0 ? (
                                    <p className="text-[10px] font-bold text-gray-400 uppercase italic">
                                      CUPOF vacío. Plaza sin cobertura registrada.
                                    </p>
                                  ) : (
                                    sortedAgents.map((agent) => {
                                      const isLicense = agent.tiene_licencia_activa;
                                      
                                      let indentClass = "";
                                      let hasConnector = false;
                                      
                                      if (agent.level > 0) {
                                        indentClass = "pl-4 border-l border-dashed border-gray-350 relative";
                                        hasConnector = true;
                                      }

                                      let badgeColor = "bg-gray-100 text-gray-700 border-gray-200";
                                      const revUpper = (agent.situacion_revista || "").toUpperCase();
                                      if (revUpper === 'TITULAR') {
                                        badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
                                      } else if (revUpper === 'INTERINO') {
                                        badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
                                      } else if (revUpper === 'SUPLENTE') {
                                        badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                                      } else if (revUpper === 'REEMPLAZANTE') {
                                        badgeColor = 'bg-rose-100 text-rose-700 border-rose-200';
                                      }

                                      return (
                                        <div
                                          key={agent.id}
                                          className={`flex flex-col gap-2 ${indentClass}`}
                                          style={agent.level > 0 ? { marginLeft: `${agent.level * 20}px` } : {}}
                                        >
                                          {hasConnector && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-0 border-t border-dashed border-gray-300"></div>
                                          )}
                                          
                                          <div className="flex justify-between items-start p-2.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100/50 transition-all">
                                            <div className="flex flex-col">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-1.5 py-0.5 text-[8.5px] font-black uppercase rounded border ${badgeColor}`}>
                                                  {agent.situacion_revista}
                                                </span>
                                                <button
                                                  onClick={() => openAgentModal(agent.dni)}
                                                  className="text-xs font-black text-[#FE8204] hover:underline text-left cursor-pointer"
                                                >
                                                  {agent.nombre_agente}
                                                </button>
                                              </div>
                                              <span className="text-[9.5px] text-gray-400 mt-1 font-semibold">
                                                DNI: {agent.dni} | Norma: {agent.norma_legal || 'S/D'}
                                              </span>
                                            </div>

                                            <div className="text-right shrink-0">
                                              {isLicense ? (
                                                <span className="px-2 py-0.5 bg-red-50 text-red-650 border border-red-100 text-[8.5px] font-black rounded-full uppercase tracking-wider block shadow-sm">
                                                  Licencia Activa
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-650 border border-emerald-100 text-[8.5px] font-black rounded-full uppercase tracking-wider block shadow-sm">
                                                  Activo
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {isLicense && (
                                            <div className="px-3 py-2 bg-red-50/30 border border-red-100/50 rounded-xl text-[10px] text-red-700 font-semibold flex items-center gap-2 shadow-sm animate-pulse">
                                              <i className="fa-solid fa-triangle-exclamation text-red-450"></i>
                                              <span>
                                                Licencia de {agent.licencia_activa_detalle?.dias} días por: {agent.licencia_activa_detalle?.tipo_licencia}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                    <i className="fa-solid fa-school text-4xl text-gray-200 mb-3"></i>
                    <p className="font-bold text-[10px] uppercase tracking-widest">Selecciona un establecimiento para auditar su planta</p>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

        </div>
      </div>
    </SIAMELayout>
  );
};

export default Establecimientos;
