import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { useGlobal } from '../Context/GlobalContext';
import { useDebounce } from '../Hooks/useDebounce';
import { GlassCard } from '../Components/GlassCard';
import { Pagination } from '../Components/Pagination';

const Licencias = () => {
  const { openAgentModal } = useGlobal();

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

  // Fetch general paginated licenses
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

    fetchLicenciasData();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, tipo, debouncedMin, debouncedMax, page]);

  return (
    <SIAMELayout>
      <Head title="Buscar Licencias" />
      <div className="flex flex-col gap-6">
        
        {/* Title */}
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Padrón de Licencias
          </h1>
          <p className="text-sm text-gray-500 font-semibold mt-1">
            Consulta y filtro unificado de inasistencias y movimientos especiales.
          </p>
        </div>

        {/* Filters Card */}
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

        {/* List Card */}
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
                      key={lic.id}
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
      </div>
    </SIAMELayout>
  );
};

export default Licencias;
