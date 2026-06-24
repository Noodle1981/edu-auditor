import React, { useEffect, useState } from 'react';
import { useGlobal } from '../../Context/GlobalContext';
import { useDebounce } from '../../Hooks/useDebounce';
import { GlassCard } from '../GlassCard';
import { Pagination } from '../Pagination';

export const DesignacionesTab = () => {
  const { openAgentModal, activeYear } = useGlobal();

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

  // Fetch general paginated designaciones
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
        queryParams.append('year', activeYear);

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

    fetchDesignacionesData();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, debouncedCue, turno, revista, page, activeYear]);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Padrón de Designaciones
        </h1>
        <p className="text-sm text-gray-500 font-semibold mt-1">
          Consulta consolidada de cargos y designaciones oficiales autorizadas en el sistema.
        </p>
      </div>

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
              className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-770 cursor-pointer"
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
              <i className="fa-solid fa-shield"></i> Sit. Revista
            </label>
            <select
              value={revista}
              onChange={(e) => setRevista(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-770 cursor-pointer"
            >
              <option value="">TODAS</option>
              <option value="TITULAR">TITULAR</option>
              <option value="INTERINO">INTERINO</option>
              <option value="SUPLENTE">SUPLENTE</option>
              <option value="REEMPLAZANTE">REEMPLAZANTE</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* List Card */}
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
                <th className="px-6 py-4">Legajo</th>
                <th className="px-6 py-4">Establecimiento</th>
                <th className="px-6 py-4">CUPOF</th>
                <th className="px-6 py-4">Turno</th>
                <th className="px-6 py-4 text-center">Horas</th>
                <th className="px-6 py-4">Revista</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-2xl text-[#FE8204] mb-2"></i>
                    <p className="font-bold text-[10px] uppercase tracking-widest">Consultando cargos designados...</p>
                  </td>
                </tr>
              ) : desigs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-400">
                    <i className="fa-solid fa-folder-open text-3xl text-gray-300 mb-2"></i>
                    <p className="font-bold text-[10px] uppercase tracking-widest">No se registraron designaciones coincidentes</p>
                  </td>
                </tr>
              ) : (
                desigs.map((des) => (
                  <tr
                    key={des.id}
                    className="hover:bg-gray-50/50 transition-colors duration-200 cursor-pointer"
                    onClick={() => openAgentModal(des.dni)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900">{des.nombre_agente}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Centro: {des.centro || 'S/D'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">{des.dni}</td>
                    <td className="px-6 py-4 font-mono text-gray-400">{des.legajo || 'S/D'}</td>
                    <td className="px-6 py-4 max-w-[220px] truncate" title={des.establecimiento}>
                      {des.establecimiento}
                      {des.cue && <span className="block text-[10px] text-gray-400 font-bold mt-0.5">CUE: {des.cue}</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-450">{des.cupof}</td>
                    <td className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider">{des.turno || 'S/D'}</td>
                    <td className="px-6 py-4 text-center font-black text-gray-900">{des.horas_catedra ?? 0} hs</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          des.situacion_revista === 'TITULAR'
                            ? 'bg-purple-50 text-purple-700 border border-purple-100'
                            : des.situacion_revista === 'INTERINO'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        {des.situacion_revista}
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
            itemsName="cargos"
          />
        )}
      </GlassCard>
    </div>
  );
};
