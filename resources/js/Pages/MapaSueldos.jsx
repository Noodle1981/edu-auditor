import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { getTheoreticalRadio } from './MapView';
import Modal from '../Components/Modal';

const MapView = lazy(() => import('./MapView'));

export default function MapaSueldos({ edificios = [] }) {
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

  // Stats calculation
  const stats = useMemo(() => {
    let totalEst = 0;
    let coinciden = 0;
    let sobrepago = 0;
    let subpago = 0;

    filteredEdificios.forEach((ed) => {
      (ed.establecimientos || []).forEach((est) => {
        totalEst++;
        (est.modalidades || []).forEach((m) => {
          if (m.color_sueldo === 'SOBREPAGO') sobrepago++;
          else if (m.color_sueldo === 'SUBPAGO') subpago++;
          else coinciden++;
        });
      });
    });

    return {
      totalEdificios: filteredEdificios.length,
      totalEstablecimientos: totalEst,
      coinciden,
      sobrepago,
      subpago
    };
  }, [filteredEdificios]);

  return (
    <SIAMELayout fullWidth hideHeader>
      <Head title="Mapa Salarial (Sueldos A04 vs Geografía) — EDU-Auditor" />

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
                    AUDITORÍA EN VIVO
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
              edificios={filteredEdificios}
              onSelectEdificio={(ed) => {
                setSelectedEdificio(ed);
                setIsPanelMinimized(false);
              }}
              selectedEdificioId={selectedEdificio?.id}
              showDeptoBorders={showDeptoBorders}
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

          {/* Right Detail Side Panel */}
          {selectedEdificio && selectedEdificio.establecimientos && (
            <aside
              className={`absolute right-0 top-0 h-full flex flex-col border-l border-gray-200 bg-white shadow-2xl transition-all duration-300 z-[1000] ${
                isPanelMinimized ? 'w-0' : 'w-[380px] md:w-[420px]'
              }`}
            >
              <button
                onClick={() => setIsPanelMinimized(!isPanelMinimized)}
                className="absolute left-0 top-1/2 z-[1001] flex h-16 w-6 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-xl border-y border-l border-gray-200 bg-white text-gray-400 shadow-md hover:text-[#FE8204]"
              >
                <i className={`fa-solid fa-chevron-${isPanelMinimized ? 'left' : 'right'} text-[10px]`}></i>
              </button>

              {!isPanelMinimized && (
                <div className="flex h-full w-full flex-col bg-white overflow-y-auto custom-scrollbar p-6 space-y-6">
                  {/* Header */}
                  <div className="border-b border-gray-100 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider">
                        CUI {selectedEdificio.cui}
                      </span>
                      <button
                        onClick={() => setSelectedEdificio(null)}
                        className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <h2 className="text-base font-black text-gray-900 mt-1">
                      {selectedEdificio.establecimientos[0]?.nombre || 'Edificio Escolar'}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {selectedEdificio.calle} {selectedEdificio.numero_puerta}, {selectedEdificio.localidad}
                    </p>
                  </div>

                  {/* Auditoría Salarial Km 0 */}
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-700 flex items-center gap-1.5">
                      <i className="fa-solid fa-scale-balanced text-purple-600"></i>
                      Auditoría de Compensación Km 0
                    </h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-purple-100">
                        <span className="font-bold text-gray-500">Plaza de Origen</span>
                        <span className="font-black text-gray-900 uppercase">{selectedEdificio.punto_partida || 'PLAZA 25 DE MAYO'}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-purple-100">
                        <span className="font-bold text-gray-500">Distancia en Carretera</span>
                        <span className="font-black text-gray-950">
                          {selectedEdificio.distancia_camino ? `${parseFloat(selectedEdificio.distancia_camino).toFixed(1)} km` : 'S/D'}
                          {selectedEdificio.tiempo_google_auto && ` (${selectedEdificio.tiempo_google_auto})`}
                        </span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-purple-100">
                        <span className="font-bold text-gray-500">Radio de Camino (Juez Físico)</span>
                        <span className="font-black text-gray-950">Radio {selectedEdificio.radio_camino || 'S/D'}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-purple-100">
                        <span className="font-bold text-gray-500">Distancia en Línea Recta</span>
                        <span className="font-black text-gray-950">
                          {selectedEdificio.dist_circunf ? `${parseFloat(selectedEdificio.dist_circunf).toFixed(1)} km` : 'S/D'}
                          (Radio {selectedEdificio.radio_circ || 'S/D'})
                        </span>
                      </div>

                      {/* Radio Sueldo Row */}
                      {selectedEdificio.establecimientos[0]?.modalidades[0]?.radio_sueldo && (
                        <div className="flex justify-between py-1.5 pt-2 border-t border-purple-200">
                          <span className="font-bold text-purple-900">Radio Sueldos (A04)</span>
                          <span className="font-black text-purple-700 text-sm">
                            Radio {selectedEdificio.establecimientos[0].modalidades[0].radio_sueldo}
                            ({selectedEdificio.establecimientos[0].modalidades[0].porc_sueldo}%)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dictamen badge */}
                    {(() => {
                      const mod = selectedEdificio.establecimientos[0]?.modalidades[0];
                      if (!mod) return null;

                      if (mod.color_sueldo === 'SOBREPAGO') {
                        return (
                          <div className="p-3 bg-purple-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm">
                            <i className="fa-solid fa-arrow-trend-up text-lg"></i>
                            <div>
                              <div>🟣 ALERTA SOBREPAGO SALARIAL</div>
                              <div className="text-[10px] font-normal opacity-90">
                                Radio Sueldo ({mod.radio_sueldo}) supera a SIGE ({mod.radio_sige}) y Geografía.
                              </div>
                            </div>
                          </div>
                        );
                      } else if (mod.color_sueldo === 'SUBPAGO') {
                        return (
                          <div className="p-3 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm">
                            <i className="fa-solid fa-arrow-trend-down text-lg"></i>
                            <div>
                              <div>🔵 ALERTA SUBPAGO (PERJUICIO DOCENTE)</div>
                              <div className="text-[10px] font-normal opacity-90">
                                Radio Sueldo ({mod.radio_sueldo}) por debajo de SIGE ({mod.radio_sige}).
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm">
                            <i className="fa-solid fa-circle-check text-lg"></i>
                            <div>
                              <div>🟢 AUDITORÍA SALARIAL LIMPIA</div>
                              <div className="text-[10px] font-normal opacity-90">
                                El Sueldo pagado coincide exactamente con el SIGE.
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })()}
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
