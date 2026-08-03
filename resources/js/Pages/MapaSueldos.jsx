import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Head, usePage } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { getTheoreticalRadio } from './MapView';
import Modal from '../Components/Modal';

const MapView = lazy(() => import('./MapView'));

export default function MapaSueldos({ edificios = [] }) {
  const { props } = usePage();
  const user = props.auth?.user;
  const isAdmin = user && user.role === 'admin';

  const edificiosArray = Array.isArray(edificios) ? edificios : [];

  // State Filters
  const [activeFilters, setActiveFilters] = useState({ publico: true, privado: false });
  const [filterDepto, setFilterDepto] = useState('TODOS');
  const [filterNivel, setFilterNivel] = useState('TODOS');
  const [filterEstadoSueldo, setFilterEstadoSueldo] = useState('TODOS'); // TODOS, COINCIDE, SOBREPAGO, SUBPAGO
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEdificio, setSelectedEdificio] = useState(null);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [showDeptoBorders, setShowDeptoBorders] = useState(true);
  const [isSatellite, setIsSatellite] = useState(false);
  const [showPlazas, setShowPlazas] = useState(true);
  const [hoveredEdificioId, setHoveredEdificioId] = useState(null);

  // Form states for report modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    tipo: 'ERROR_DATOS',
    descripcion: '',
    nombre_remitente: '',
    email_remitente: '',
  });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (selectedEdificio) {
      setIsPanelMinimized(false);
    }
  }, [selectedEdificio]);

  const toggleFilter = (key) => {
    setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clearFilters = () => {
    setActiveFilters({ publico: true, privado: false });
    setFilterDepto('TODOS');
    setFilterNivel('TODOS');
    setFilterEstadoSueldo('TODOS');
    setSearchQuery('');
  };

  // Inline updates handlers
  const handleInlineRadioChange = async (modId, newRadioVal) => {
    try {
      const radioVal = newRadioVal === '' ? null : parseInt(newRadioVal);
      const res = await fetch(`/api/modalidades/${modId}/radio`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ radio: radioVal }),
      });
      if (!res.ok) throw new Error('Error en el servidor');
      const data = await res.json();
      showToast(data.message || 'Radio actualizado correctamente');

      setSelectedEdificio((prev) => {
        if (!prev) return prev;
        const nextEsts = (prev.establecimientos || []).map((est) => ({
          ...est,
          modalidades: (est.modalidades || []).map((m) =>
            m.id === modId ? { ...m, radio: radioVal } : m
          ),
        }));
        return { ...prev, establecimientos: nextEsts };
      });
    } catch (err) {
      console.error(err);
      alert('No se pudo actualizar el radio.');
    }
  };

  const handleInlineObsChange = async (modId, textVal) => {
    try {
      const res = await fetch(`/api/modalidades/${modId}/observaciones`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ observaciones: textVal }),
      });
      if (!res.ok) throw new Error('Error servidor');
      const data = await res.json();
      showToast(data.message || 'Justificación guardada');

      setSelectedEdificio((prev) => {
        if (!prev) return prev;
        const nextEsts = (prev.establecimientos || []).map((est) => ({
          ...est,
          modalidades: (est.modalidades || []).map((m) =>
            m.id === modId ? { ...m, observaciones: textVal } : m
          ),
        }));
        return { ...prev, establecimientos: nextEsts };
      });
    } catch (err) {
      console.error(err);
      alert('No se pudo guardar la justificación.');
    }
  };

  const handleInlineObservadoChange = async (modId, isChecked) => {
    try {
      const res = await fetch(`/api/modalidades/${modId}/observado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ radio_observado: isChecked }),
      });
      if (!res.ok) throw new Error('Error servidor');
      showToast(isChecked ? 'Marcado como observado' : 'Desmarcado observado');

      setSelectedEdificio((prev) => {
        if (!prev) return prev;
        const nextEsts = (prev.establecimientos || []).map((est) => ({
          ...est,
          modalidades: (est.modalidades || []).map((m) =>
            m.id === modId ? { ...m, radio_observado: isChecked } : m
          ),
        }));
        return { ...prev, establecimientos: nextEsts };
      });
    } catch (err) {
      console.error(err);
      alert('No se pudo actualizar el estado de observación.');
    }
  };

  // Faceted search options
  const deptosDisponibles = useMemo(() => {
    const set = new Set();
    edificiosArray.forEach((edificio) => {
      if (edificio.zona_departamento) set.add(edificio.zona_departamento);
    });
    return Array.from(set).sort();
  }, [edificiosArray]);

  const nivelesDisponibles = useMemo(() => {
    const set = new Set();
    edificiosArray.forEach((edificio) => {
      (edificio.establecimientos || []).forEach((est) => {
        (est.modalidades || []).forEach((m) => {
          if (m.nivel) set.add(m.nivel);
        });
      });
    });
    return Array.from(set).sort();
  }, [edificiosArray]);

  // Filter Logic for MapaSueldos
  const filteredEdificios = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return edificiosArray
      .map((edificio) => {
        const filteredEsts = (edificio.establecimientos || [])
          .map((est) => {
            const filteredMods = (est.modalidades || []).filter((m) => {
              const matchesScope =
                (m.ambito === 'PUBLICO' && activeFilters.publico) ||
                (m.ambito === 'PRIVADO' && activeFilters.privado);
              const matchesNivel = filterNivel === 'TODOS' || m.nivel === filterNivel;

              let matchesEstadoSueldo = true;
              if (filterEstadoSueldo !== 'TODOS') {
                matchesEstadoSueldo = m.color_sueldo === filterEstadoSueldo;
              }

              return matchesScope && matchesNivel && matchesEstadoSueldo;
            });

            if (filteredMods.length === 0) return null;
            return { ...est, modalidades: filteredMods };
          })
          .filter(Boolean);

        if (filteredEsts.length === 0) return null;

        // Search query check
        if (query.length >= 2) {
          const matchCui = edificio.cui && edificio.cui.toString().includes(query);
          const matchLocalidad = edificio.localidad && edificio.localidad.toLowerCase().includes(query);
          const matchEstName = filteredEsts.some(
            (e) =>
              (e.nombre && e.nombre.toLowerCase().includes(query)) ||
              (e.cue && e.cue.toString().includes(query))
          );
          if (!matchCui && !matchLocalidad && !matchEstName) return null;
        }

        // Depto check
        if (filterDepto !== 'TODOS' && edificio.zona_departamento !== filterDepto) {
          return null;
        }

        return { ...edificio, establecimientos: filteredEsts };
      })
      .filter(Boolean);
  }, [edificiosArray, activeFilters, filterDepto, filterNivel, filterEstadoSueldo, searchQuery]);

  return (
    <SIAMELayout fullWidth hideHeader>
      <Head title="Mapa Salarial (Sueldos A04 vs SIGE) — EDU-Auditor" />

      {/* Toast alert */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white shadow-2xl animate-fade-in">
          <i className="fa-solid fa-[#10B981] fa-circle-check text-emerald-400"></i>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col h-[calc(100vh)] bg-[#f8fafc] overflow-hidden">
        {/* Top Control Bar */}
        <header className="z-20 border-b border-gray-200/80 bg-white/95 px-6 py-3 shadow-sm backdrop-blur shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Title & Subtitle */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600/10 text-purple-600 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-money-bill-transfer"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black text-gray-900 tracking-tight">
                    Mapa de Ejecución Salarial (Radio Sueldos A04)
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-purple-100 text-purple-800">
                    AUDITORÍA SALARIAL
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Contraste espacial entre el sueldo liquidado, el SIGE y la distancia física real.
                </p>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative w-60">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Buscar CUE, escuela..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-[#FE8204] focus:border-[#FE8204]"
                />
              </div>

              {/* Scope Toggles */}
              <div className="flex items-center gap-1 rounded-xl border border-gray-150 bg-gray-55 p-1 shrink-0">
                <button
                  onClick={() => toggleFilter('publico')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeFilters.publico
                      ? 'bg-white text-gray-950 shadow-sm border border-gray-150'
                      : 'text-gray-400 bg-transparent border border-transparent grayscale'
                  }`}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-[#FE8204]"></div>
                  Público
                </button>
                <button
                  onClick={() => toggleFilter('privado')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeFilters.privado
                      ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                      : 'text-gray-400 bg-transparent border border-transparent grayscale'
                  }`}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                  Privado
                </button>
              </div>

              {/* Department Select */}
              <select
                value={filterDepto}
                onChange={(e) => setFilterDepto(e.target.value)}
                className="text-xs font-bold bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-3 py-1.5 focus:ring-[#FE8204]"
              >
                <option value="TODOS">Todos los Deptos</option>
                {deptosDisponibles.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Nivel Select */}
              <select
                value={filterNivel}
                onChange={(e) => setFilterNivel(e.target.value)}
                className="text-xs font-bold bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-3 py-1.5 focus:ring-[#FE8204]"
              >
                <option value="TODOS">Todos los Niveles</option>
                {nivelesDisponibles.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              {/* Estado Salarial Filter Buttons */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setFilterEstadoSueldo('TODOS')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition ${
                    filterEstadoSueldo === 'TODOS'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterEstadoSueldo('COINCIDE')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition flex items-center gap-1 ${
                    filterEstadoSueldo === 'COINCIDE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <i className="fa-solid fa-circle-check text-[9px]"></i>
                  Coincide (🟢)
                </button>
                <button
                  onClick={() => setFilterEstadoSueldo('SOBREPAGO')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition flex items-center gap-1 ${
                    filterEstadoSueldo === 'SOBREPAGO'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <i className="fa-solid fa-arrow-trend-up text-[9px]"></i>
                  Sobrepago (🟣)
                </button>
                <button
                  onClick={() => setFilterEstadoSueldo('SUBPAGO')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition flex items-center gap-1 ${
                    filterEstadoSueldo === 'SUBPAGO'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <i className="fa-solid fa-arrow-trend-down text-[9px]"></i>
                  Subpago (🔵)
                </button>
              </div>

              {/* Reset button */}
              <button
                onClick={clearFilters}
                title="Limpiar Filtros"
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#FE8204]"
              >
                <i className="fa-solid fa-rotate-left text-xs"></i>
              </button>
            </div>
          </div>
        </header>

        {/* Map Container Body */}
        <div className="relative flex-1 w-full h-full overflow-hidden">
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-4 border-[#FE8204] border-t-transparent animate-spin"></div>
                  <span className="text-xs font-bold text-gray-600">Cargando Mapa Salarial...</span>
                </div>
              </div>
            }
          >
            <MapView
              filteredEdificios={filteredEdificios}
              edificios={edificiosArray}
              selectedEdificio={selectedEdificio}
              setSelectedEdificio={setSelectedEdificio}
              hoveredEdificioId={hoveredEdificioId}
              setHoveredEdificioId={setHoveredEdificioId}
              showDeptoBorders={showDeptoBorders}
              filterDepto={filterDepto}
              isSatellite={isSatellite}
              showPlazas={showPlazas}
              mode="sueldos"
            />
          </Suspense>

          {/* Floating Controls (Recentrar, Satélite, Límites, Plazas) */}
          <div className="absolute right-6 top-6 z-[1001] flex flex-col gap-2.5">
            <button
              onClick={() => {
                setSelectedEdificio(null);
                setSelectedEdificio({ latitud: -31.5375, longitud: -68.5364, zoom: 11, _isCenter: true });
              }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-lg hover:text-[#FE8204] transition"
              title="Recentrar Mapa"
            >
              <i className="fa-solid fa-expand text-sm"></i>
            </button>

            <button
              onClick={() => setIsSatellite((v) => !v)}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-lg transition ${
                isSatellite ? 'bg-[#FE8204] text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:text-[#FE8204]'
              }`}
              title={isSatellite ? 'Vista Mapa' : 'Vista Satélite'}
            >
              <i className="fa-solid fa-satellite text-sm"></i>
            </button>

            <button
              onClick={() => setShowDeptoBorders((v) => !v)}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-lg transition ${
                showDeptoBorders ? 'bg-[#FE8204] text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:text-[#FE8204]'
              }`}
              title={showDeptoBorders ? 'Ocultar Límites' : 'Mostrar Límites'}
            >
              <i className="fa-solid fa-map-location text-sm"></i>
            </button>

            <button
              onClick={() => setShowPlazas((v) => !v)}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-lg transition ${
                showPlazas ? 'bg-amber-500 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:text-[#FE8204]'
              }`}
              title={showPlazas ? 'Ocultar Plazas' : 'Mostrar Plazas'}
            >
              <i className="fa-solid fa-star text-sm"></i>
            </button>
          </div>

          {/* Right Collapsible Info Panel */}
          {selectedEdificio && selectedEdificio.establecimientos && (
            <aside
              className={`absolute right-0 top-0 h-full flex flex-col border-l border-gray-250 bg-white shadow-2xl transition-all duration-300 ease-in-out z-[1000] ${
                isPanelMinimized ? 'w-0' : 'w-[380px] md:w-[420px]'
              }`}
            >
              <button
                onClick={() => setIsPanelMinimized(!isPanelMinimized)}
                className="absolute left-0 top-1/2 z-[1001] flex h-16 w-6 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-xl border-y border-l border-gray-200 bg-white text-gray-400 shadow-md hover:text-[#FE8204]"
                aria-label={isPanelMinimized ? 'Expandir panel informativo' : 'Minimizar panel informativo'}
              >
                <i className={`fa-solid fa-chevron-${isPanelMinimized ? 'left' : 'right'} text-[10px]`}></i>
              </button>

              {!isPanelMinimized && (
                <div className="flex h-full w-full flex-col bg-white overflow-hidden">
                  {/* Header */}
                  <div className="border-b border-[#FE8204]/5 bg-[#FE8204]/5 p-5 flex items-start justify-between gap-4 shrink-0">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-xl p-2.5 text-white ${
                        selectedEdificio.ambito === 'PUBLICO' ? 'bg-[#FE8204]' : 'bg-blue-500'
                      }`}>
                        <i className="fa-solid fa-school text-lg"></i>
                      </div>
                      <div>
                        <h2 className="text-[10px] font-black uppercase tracking-wider text-[#FE8204] flex items-center gap-1.5 flex-wrap">
                          <span>{selectedEdificio.zona_departamento || 'Sin Departamento'}</span>
                          <span className="text-[#FE8204]/40">•</span>
                          <span>CUI: {selectedEdificio.cui}</span>
                        </h2>
                        <p className="text-sm font-black text-gray-900 leading-tight mt-0.5">
                          {selectedEdificio.localidad}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                          {selectedEdificio.calle} {selectedEdificio.numero_puerta || ''}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedEdificio(null)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-950 transition-colors"
                      aria-label="Cerrar detalles"
                    >
                      <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                    {/* Establishments list */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                          Establecimientos en este Edificio
                        </h3>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                          CUI: {selectedEdificio.cui}
                        </span>
                      </div>

                      {selectedEdificio.establecimientos.map((est, i) => (
                        <div
                          key={i}
                          className={`rounded-xl border p-4 space-y-3 transition-all duration-300 ${
                            est.modalidades?.some((m) => m.radio_observado)
                              ? 'border-red-200 bg-red-50/20 shadow-sm shadow-red-50'
                              : 'border-gray-150 bg-gray-50/50'
                          }`}
                        >
                          <div>
                            <h4 className="text-xs font-black text-gray-950 leading-snug">
                              {est.nombre}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-bold text-gray-400">CUE: {est.cue}</span>
                              {isAdmin && (
                                <>
                                  <span className="text-gray-300 text-[8px]">•</span>
                                  <a
                                    href={`/admin/establecimientos?search=${est.cue}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] font-black uppercase text-[#FE8204] hover:text-[#e07203] hover:underline flex items-center gap-1 transition-all"
                                  >
                                    <i className="fa-solid fa-pen-to-square text-[9px]"></i>
                                    Editar
                                  </a>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2.5 border-t border-gray-200/60 pt-2.5">
                            {est.modalidades?.map((mod, j) => (
                              <div key={j} className="flex flex-col gap-1.5">
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="rounded-md border border-orange-100 bg-orange-50 px-2 py-0.5 text-[8px] font-black uppercase text-[#FE8204]">
                                    {mod.nivel}
                                  </span>
                                  <span className="rounded-md border border-gray-150 bg-gray-100/50 px-2 py-0.5 text-[8px] font-black text-gray-500">
                                    {mod.area}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                                  {isAdmin ? (
                                    <div className="flex items-center gap-1">
                                      <span>Radio:</span>
                                      <select
                                        value={
                                          mod.radio === 'N/A' || mod.radio === null || mod.radio === undefined
                                            ? ''
                                            : mod.radio
                                        }
                                        onChange={(e) => handleInlineRadioChange(mod.id, e.target.value)}
                                        className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] font-black text-gray-950 focus:border-[#FE8204] focus:outline-none cursor-pointer"
                                      >
                                        <option value="">N/A</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                        <option value="5">5</option>
                                        <option value="6">6</option>
                                        <option value="7">7</option>
                                      </select>
                                    </div>
                                  ) : (
                                    <span>
                                      Radio: <b className="text-gray-950">{mod.radio ?? 'N/A'}</b>
                                    </span>
                                  )}
                                  {mod.radio_sige && mod.radio_sige !== '' && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <span>
                                        SiGE: <b className="text-gray-950">{mod.radio_sige}</b>
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Spatial Audit */}
                                {(() => {
                                  const thRadio = getTheoreticalRadio(
                                    selectedEdificio.punto_partida,
                                    selectedEdificio.dist_circunf
                                  );
                                  if (!thRadio) return null;

                                  const sysRadioRaw =
                                    mod.radio !== null &&
                                    mod.radio !== undefined &&
                                    mod.radio !== 'N/A' &&
                                    mod.radio !== ''
                                      ? mod.radio
                                      : mod.radio_sige;
                                  let s =
                                    sysRadioRaw && sysRadioRaw !== 'N/A' && sysRadioRaw !== ''
                                      ? parseInt(sysRadioRaw)
                                      : null;
                                  if (s === 7) s = 6;
                                  const circ = selectedEdificio.radio_circ
                                    ? parseInt(selectedEdificio.radio_circ)
                                    : null;
                                  const camino = selectedEdificio.radio_camino
                                    ? parseInt(selectedEdificio.radio_camino)
                                    : null;

                                  const hasCirc = circ !== null && !isNaN(circ);
                                  const hasCamino = camino !== null && !isNaN(camino);

                                  let modStatus = 'COINCIDE';
                                  if (mod.radio_justificado) {
                                    modStatus = 'JUSTIFICADO';
                                  } else if (s === null || isNaN(s)) {
                                    modStatus = 'COINCIDE';
                                  } else {
                                    if (hasCirc && hasCamino) {
                                      const matchesCirc = s === circ;
                                      const matchesCamino = s === camino;
                                      if (matchesCirc && matchesCamino) modStatus = 'COINCIDE';
                                      else if (matchesCirc || matchesCamino) modStatus = 'INCONGRUENTE';
                                      else modStatus = 'DISTINTO';
                                    } else if (hasCirc) {
                                      modStatus = s === circ ? 'COINCIDE' : 'DISTINTO';
                                    } else if (hasCamino) {
                                      modStatus = s === camino ? 'COINCIDE' : 'DISTINTO';
                                    }
                                  }

                                  if (modStatus === 'JUSTIFICADO') {
                                    return (
                                      <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-[9px] text-cyan-800 font-bold">
                                        <i className="fa-solid fa-gavel text-cyan-600"></i>
                                        <span>Justificado Legalmente: {mod.inst_legal_radio || 'Decreto/Res'}</span>
                                      </div>
                                    );
                                  } else if (modStatus === 'COINCIDE') {
                                    return (
                                      <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[9px] text-emerald-800 font-bold">
                                        <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                        <span>Coincide: Radio Geográfico {thRadio}</span>
                                      </div>
                                    );
                                  } else if (modStatus === 'INCONGRUENTE') {
                                    return (
                                      <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[9px] text-amber-800 font-bold animate-pulse">
                                        <i className="fa-solid fa-circle-exclamation text-amber-600"></i>
                                        <span>Incongruente: Radio Geográfico es {thRadio} ⚠️</span>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[9px] text-red-750 font-bold">
                                        <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                                        <span>Distinto: Radio Geográfico es {thRadio} ⚠️</span>
                                      </div>
                                    );
                                  }
                                })()}

                                {/* Radio Sueldo Badge */}
                                {mod.radio_sueldo && (
                                  <div
                                    className={`mt-1 flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[9px] font-bold ${
                                      mod.color_sueldo === 'SOBREPAGO'
                                        ? 'border-purple-300 bg-purple-100 text-purple-900'
                                        : mod.color_sueldo === 'SUBPAGO'
                                        ? 'border-blue-300 bg-blue-100 text-blue-900'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1">
                                      <i className="fa-solid fa-file-invoice-dollar text-[10px]"></i>
                                      {mod.color_sueldo === 'SOBREPAGO'
                                        ? '🟣 ALERTA SOBREPAGO SALARIAL'
                                        : mod.color_sueldo === 'SUBPAGO'
                                        ? '🔵 ALERTA SUBPAGO SALARIAL'
                                        : '🟢 Radio Sueldo Coincide con SIGE'}
                                    </span>
                                    <span className="font-black">
                                      R{mod.radio_sueldo} ({mod.porc_sueldo}%)
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Observation per Establishment */}
                            {(() => {
                              const refMod = est.modalidades?.[0];
                              if (!refMod) return null;
                              return (
                                <div className="mt-2.5 border-t border-gray-200/60 pt-2.5">
                                  {isAdmin ? (
                                    <div className="space-y-2">
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase text-gray-400">
                                          Justificación / Detalle
                                        </label>
                                        <textarea
                                          key={`obs-${est.cue}`}
                                          defaultValue={refMod.observaciones || ''}
                                          id={`obs-input-${est.cue}`}
                                          placeholder="Ej. El establecimiento tiene otro radio..."
                                          className="w-full rounded-lg border border-gray-200 bg-white p-2 text-[10px] text-gray-800 focus:border-[#FE8204] focus:outline-none"
                                          rows={2}
                                        />
                                      </div>
                                      <div className="flex items-center justify-between gap-2">
                                        <label className="flex items-center gap-1.5 text-[10px] font-black uppercase cursor-pointer select-none bg-red-50/50 hover:bg-red-100/50 px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={!!refMod.radio_observado}
                                            onChange={(e) => handleInlineObservadoChange(refMod.id, e.target.checked)}
                                            className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-3.5 w-3.5 cursor-pointer"
                                          />
                                          <i className="fa-solid fa-flag text-red-500 text-[10px]"></i>
                                          <span className="text-red-700">Observado</span>
                                        </label>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const el = document.getElementById(`obs-input-${est.cue}`);
                                            if (el) await handleInlineObsChange(refMod.id, el.value);
                                          }}
                                          className="rounded bg-[#FE8204] hover:bg-[#e07203] px-2.5 py-1.5 text-[9px] font-black uppercase text-white transition-colors cursor-pointer"
                                        >
                                          {refMod.observaciones ? 'Actualizar Justificación' : 'Guardar Justificación'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    refMod.observaciones && (
                                      <div className="p-2 rounded-lg bg-red-100/50 border border-red-200 text-[10px] font-medium leading-snug flex items-start gap-1.5">
                                        <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5 shrink-0"></i>
                                        <span className="text-red-800">{refMod.observaciones}</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Georeference and origin Plaza */}
                    {selectedEdificio.punto_partida && (
                      <div className="rounded-xl border border-[#FE8204]/10 bg-[#FE8204]/5 p-4 space-y-3">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-[#FE8204]">
                          Auditoría de Compensación Km 0
                        </h3>
                        <div className="space-y-2 text-[10px]">
                          <div className="flex justify-between items-center py-1 border-b border-[#FE8204]/10">
                            <span className="font-bold text-gray-500">Plaza de Origen</span>
                            <span className="font-black text-gray-900 uppercase truncate max-w-[180px]">
                              {selectedEdificio.punto_partida}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-[#FE8204]/10">
                            <span className="font-bold text-gray-500">Distancia en Carretera</span>
                            <span className="font-black text-gray-950">
                              {selectedEdificio.distancia_camino
                                ? `${parseFloat(selectedEdificio.distancia_camino).toFixed(1)} km`
                                : 'S/D'}
                              {selectedEdificio.tiempo_google_auto && ` (${selectedEdificio.tiempo_google_auto})`}
                            </span>
                          </div>
                          {selectedEdificio.radio_camino && (
                            <div className="flex justify-between items-center py-1 border-b border-[#FE8204]/10">
                              <span className="font-bold text-gray-500">Radio de Camino</span>
                              <span className="font-black text-gray-950">
                                Radio {selectedEdificio.radio_camino}
                              </span>
                            </div>
                          )}
                          {selectedEdificio.dist_circunf && (
                            <div className="flex justify-between items-center py-1 border-b border-[#FE8204]/10">
                              <span className="font-bold text-gray-500">Distancia en Línea Recta</span>
                              <span className="font-black text-gray-950">
                                {parseFloat(selectedEdificio.dist_circunf).toFixed(1)} km (Radio{' '}
                                {selectedEdificio.radio_circ || 'S/D'})
                              </span>
                            </div>
                          )}
                          {selectedEdificio.establecimientos?.[0]?.modalidades?.[0]?.radio_sueldo && (
                            <div className="flex justify-between items-center py-1">
                              <span className="font-bold text-gray-500">Radio Sueldos (A04)</span>
                              <span className="font-black text-[#FE8204]">
                                Radio {selectedEdificio.establecimientos[0].modalidades[0].radio_sueldo}
                                {selectedEdificio.establecimientos[0].modalidades[0].porc_sueldo &&
                                  ` (${selectedEdificio.establecimientos[0].modalidades[0].porc_sueldo}%)`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-gray-100 bg-gray-55 p-4 flex gap-2 shrink-0">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedEdificio.latitud},${selectedEdificio.longitud}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-250 bg-emerald-50 py-3 text-[10px] font-black uppercase tracking-wider text-emerald-700 transition-all hover:bg-emerald-600 hover:text-white"
                    >
                      <i className="fa-solid fa-diamond-turn-right"></i>
                      Cómo llegar
                    </a>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </SIAMELayout>
  );
}
