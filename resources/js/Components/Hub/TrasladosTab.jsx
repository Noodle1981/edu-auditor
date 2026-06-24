import React, { useState, useEffect } from 'react';
import { useGlobal } from '../../Context/GlobalContext';
import { GlassCard } from '../GlassCard';
import { Pagination } from '../Pagination';

export const TrasladosTab = () => {
  const { traslados, loadingTraslados, fetchTraslados, openAgentModal } = useGlobal();

  useEffect(() => {
    fetchTraslados();
  }, []);

  // Navigation states
  const [view, setView] = useState('padron'); // 'padron' | 'dispersion' | 'pares_criticos'
  
  // Filter states
  const [filterCue, setFilterCue] = useState('');
  const [filterCueA, setFilterCueA] = useState('');
  const [filterCueB, setFilterCueB] = useState('');

  // Pagination states for sub-tables
  const [pageGeneral, setPageGeneral] = useState(1);
  const [pageDispersion, setPageDispersion] = useState(1);
  const [pagePares, setPagePares] = useState(1);

  // Reset pagination when parameters or views change
  useEffect(() => {
    setPageGeneral(1);
    setPageDispersion(1);
    setPagePares(1);
  }, [view, filterCue, filterCueA, filterCueB]);

  if (loadingTraslados || !traslados) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <i className="fa-solid fa-spinner fa-spin text-4xl text-[#FE8204] mb-4"></i>
        <p className="text-xs font-black uppercase tracking-widest">Calculando trayectos y auditorías físicas...</p>
      </div>
    );
  }

  const { stats, data } = traslados;

  // Filter local data array based on states
  let filteredData = [...data];
  let filterLabel = '';

  if (filterCue) {
    filteredData = data.filter(
      (item) => String(item.cue1) === filterCue || String(item.cue2) === filterCue
    );
    filterLabel = `Filtrado por Escuela CUE: ${filterCue}`;
  } else if (filterCueA && filterCueB) {
    filteredData = data.filter(
      (item) =>
        (String(item.cue1) === filterCueA && String(item.cue2) === filterCueB) ||
        (String(item.cue1) === filterCueB && String(item.cue2) === filterCueA)
    );
    const firstMatch = filteredData[0];
    const nameA = firstMatch ? (String(firstMatch.cue1) === filterCueA ? firstMatch.escuela1 : firstMatch.escuela2) : `CUE ${filterCueA}`;
    const nameB = firstMatch ? (String(firstMatch.cue1) === filterCueA ? firstMatch.escuela2 : firstMatch.escuela1) : `CUE ${filterCueB}`;
    filterLabel = `Trayecto: ${nameA} ⇆ ${nameB}`;
  }

  const getSemaforoClass = (semaforo) => {
    switch (semaforo) {
      case 'rojo':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'amarillo':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'verde':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleSwitchView = (newView) => {
    setView(newView);
    // Clean filters when changing sub-views
    if (newView !== 'padron') {
      setFilterCue('');
      setFilterCueA('');
      setFilterCueB('');
    }
  };

  const clearFilters = () => {
    setFilterCue('');
    setFilterCueA('');
    setFilterCueB('');
    setView('padron');
  };

  // Local Pagination calculations
  const ITEMS_PER_PAGE_GENERAL = 8;
  const ITEMS_PER_PAGE_DISPERSION = 6;
  const ITEMS_PER_PAGE_PARES = 6;

  // General paginated items
  const currentGeneral = filteredData.slice(
    (pageGeneral - 1) * ITEMS_PER_PAGE_GENERAL,
    pageGeneral * ITEMS_PER_PAGE_GENERAL
  );
  const totalPagesGeneral = Math.ceil(filteredData.length / ITEMS_PER_PAGE_GENERAL) || 1;

  // Dispersion paginated items (Rojos and Amarillos only: >= 5km)
  const highDispersionData = data.filter((item) => item.distancia_km >= 5.0);
  const currentDispersion = highDispersionData.slice(
    (pageDispersion - 1) * ITEMS_PER_PAGE_DISPERSION,
    pageDispersion * ITEMS_PER_PAGE_DISPERSION
  );
  const totalPagesDispersion = Math.ceil(highDispersionData.length / ITEMS_PER_PAGE_DISPERSION) || 1;

  // Pares criticos
  const paresCriticos = stats.pares_criticos || [];
  const currentPares = paresCriticos.slice(
    (pagePares - 1) * ITEMS_PER_PAGE_PARES,
    pagePares * ITEMS_PER_PAGE_PARES
  );
  const totalPagesPares = Math.ceil(paresCriticos.length / ITEMS_PER_PAGE_PARES) || 1;

  return (
    <div className="flex flex-col gap-8">
      {/* Navigation Tabs */}
      <div className="flex gap-2.5 flex-wrap bg-gray-50/20 border border-gray-100 rounded-2xl p-2.5 shadow-sm max-w-max">
        {[
          { id: 'padron', label: '📋 Padrón de Traslados' },
          { id: 'dispersion', label: '🚨 Alta Dispersión (5km+)' },
          { id: 'pares_criticos', label: '🏫 Pares de Escuelas Críticos' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handleSwitchView(item.id)}
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

      {/* Dynamic Title and Filters Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-orange-50/15 border border-orange-100/50 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <i className="fa-solid fa-circle-info text-[#FE8204]"></i>
            {filterLabel ? filterLabel : 'Cálculos y Auditorías Geográficas en Tiempo Real'}
          </h4>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
            {filterLabel ? 'Cruce exclusivo de trayectos filtrados' : 'Desglose y distancias entre escuelas por DNI'}
          </p>
        </div>
        {filterLabel && (
          <button
            onClick={clearFilters}
            className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white border border-red-100 text-red-500 hover:bg-red-50 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <i className="fa-solid fa-filter-circle-xmark text-sm"></i> Limpiar Filtros
          </button>
        )}
      </div>

      {/* ========================================================
          VIEW: Padrón de Traslados (General)
          ======================================================== */}
      {view === 'padron' && (
        <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Trayectos Geográficos de Agentes</h3>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Listado de agentes con cargos en escuelas múltiples con cálculo ortodrómico
              </p>
            </div>
            <span className="text-xs px-3.5 py-1.5 bg-[#FE8204]/8 text-[#FE8204] border border-[#FE8204]/10 rounded-full font-black uppercase tracking-wider shadow-sm">
              {filteredData.length.toLocaleString('es-AR')} trayectos
            </span>
          </div>

          <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                  <th className="px-6 py-4">Agente</th>
                  <th className="px-6 py-4">Escuela Origen (CUE)</th>
                  <th className="px-6 py-4">Escuela Destino (CUE)</th>
                  <th className="px-6 py-4">Conflicto de Horario</th>
                  <th className="px-6 py-4 text-center">Distancia Real</th>
                  <th className="px-6 py-4 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                {currentGeneral.map((item) => (
                  <tr
                    key={`${item.dni}-${item.cue1}-${item.cue2}`}
                    className="hover:bg-gray-50/50 cursor-pointer transition-colors duration-200"
                    onClick={() => openAgentModal(item.dni)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900">{item.nombre_agente}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">DNI: {item.dni}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate" title={item.escuela1}>
                      {item.escuela1}{' '}
                      <span
                        className="text-[9px] text-gray-400 hover:text-[#FE8204] underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterCue(String(item.cue1));
                        }}
                      >
                        (CUE: {item.cue1})
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate" title={item.escuela2}>
                      {item.escuela2}{' '}
                      <span
                        className="text-[9px] text-gray-400 hover:text-[#FE8204] underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterCue(String(item.cue2));
                        }}
                      >
                        (CUE: {item.cue2})
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.conflictivo ? (
                        <span className="px-2.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase">
                          {item.tipo_conflicto}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase">
                          Ninguno
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full font-black border text-[11px] ${getSemaforoClass(item.semaforo)}`}>
                        {item.distancia_km} KM
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openAgentModal(item.dni)}
                        className="px-3 py-1.5 rounded-lg border border-gray-100 text-[9px] font-black uppercase text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-1 shadow-sm ml-auto cursor-pointer"
                      >
                        <i className="fa-solid fa-id-card"></i> Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPagesGeneral > 1 && (
            <Pagination
              currentPage={pageGeneral}
              totalPages={totalPagesGeneral}
              onPageChange={setPageGeneral}
              totalItems={filteredData.length}
              itemsName="trayectos"
            />
          )}
        </GlassCard>
      )}

      {/* ========================================================
          VIEW: Alta Dispersión (5km+)
          ======================================================== */}
      {view === 'dispersion' && (
        <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Docentes con Alta Dispersión</h3>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Agentes que deben trasladarse a más de 5 kilómetros entre sus escuelas asignadas
              </p>
            </div>
            <span className="text-xs px-3.5 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-full font-black uppercase tracking-wider shadow-sm animate-pulse">
              {highDispersionData.length.toLocaleString('es-AR')} alertas críticas
            </span>
          </div>

          <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                  <th className="px-6 py-4">Agente</th>
                  <th className="px-6 py-4">Trayecto Crítico</th>
                  <th className="px-6 py-4 text-center">Gravedad</th>
                  <th className="px-6 py-4 text-center">Distancia Física</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                {currentDispersion.map((item) => (
                  <tr
                    key={`${item.dni}-${item.cue1}-${item.cue2}`}
                    className="hover:bg-gray-50/50 cursor-pointer transition-colors duration-200"
                    onClick={() => openAgentModal(item.dni)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900">{item.nombre_agente}</span>
                        <span className="text-[10px] text-gray-400">DNI: {item.dni}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-[11px] font-medium text-gray-500 gap-0.5">
                        <span>A: {item.escuela1}</span>
                        <span>B: {item.escuela2}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                          item.semaforo === 'rojo'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}
                      >
                        {item.semaforo === 'rojo' ? 'Extremo (>15km)' : 'Moderado (>5km)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3.5 py-1 rounded-lg border font-black text-sm ${getSemaforoClass(item.semaforo)}`}>
                        {item.distancia_km} KM
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openAgentModal(item.dni)}
                        className="px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider bg-white border border-gray-100 shadow-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 cursor-pointer active:scale-95 transition-all ml-auto flex items-center gap-1"
                      >
                        <i className="fa-solid fa-eye text-[9px]"></i> Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPagesDispersion > 1 && (
            <Pagination
              currentPage={pageDispersion}
              totalPages={totalPagesDispersion}
              onPageChange={setPageDispersion}
              totalItems={highDispersionData.length}
              itemsName="alertas"
            />
          )}
        </GlassCard>
      )}

      {/* ========================================================
          VIEW: Pares de Escuelas Críticos
          ======================================================== */}
      {view === 'pares_criticos' && (
        <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Cruce de Escuelas Críticas (Pares)</h3>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Establecimientos que acumulan la mayor cantidad de docentes compartidos en sus plantas físicas
              </p>
            </div>
            <span className="text-xs px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-black uppercase tracking-wider shadow-sm">
              Top {paresCriticos.length} pares críticos
            </span>
          </div>

          <div className="w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                  <th className="px-6 py-4">Escuela A (CUE)</th>
                  <th className="px-6 py-4">Escuela B (CUE)</th>
                  <th className="px-6 py-4 text-center">Docentes Compartidos</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                {currentPares.map((pair) => (
                  <tr key={`${pair.cueA}-${pair.cueB}`} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 max-w-[260px] truncate" title={pair.nombreA}>
                      {pair.nombreA}{' '}
                      <span className="text-[10px] text-gray-400 font-mono">(CUE: {pair.cueA})</span>
                    </td>
                    <td className="px-6 py-4 max-w-[260px] truncate" title={pair.nombreB}>
                      {pair.nombreB}{' '}
                      <span className="text-[10px] text-gray-400 font-mono">(CUE: {pair.cueB})</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3.5 py-1.5 bg-[#FE8204]/8 text-[#FE8204] border border-[#FE8204]/10 rounded-full font-black text-xs">
                        {pair.count} docentes
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setFilterCueA(String(pair.cueA));
                          setFilterCueB(String(pair.cueB));
                          setView('padron');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-gray-100 text-[9px] font-black uppercase text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-1 shadow-sm ml-auto cursor-pointer"
                      >
                        <i className="fa-solid fa-filter"></i> Ver Trayectos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPagesPares > 1 && (
            <Pagination
              currentPage={pagePares}
              totalPages={totalPagesPares}
              onPageChange={setPagePares}
              totalItems={paresCriticos.length}
              itemsName="pares"
            />
          )}
        </GlassCard>
      )}
    </div>
  );
};
