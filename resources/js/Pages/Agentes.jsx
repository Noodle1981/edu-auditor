import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { useGlobal } from '../Context/GlobalContext';
import { useDebounce } from '../Hooks/useDebounce';
import { GlassCard } from '../Components/GlassCard';
import { Pagination } from '../Components/Pagination';

const Agentes = () => {
  const { openAgentModal } = useGlobal();

  // Filter states
  const [search, setSearch] = useState('');
  const [revista, setRevista] = useState('');
  const [turno, setTurno] = useState('');
  const [cue, setCue] = useState('');
  const [norma, setNorma] = useState('');
  const [page, setPage] = useState(1);

  // Debounced states for free inputs
  const debouncedSearch = useDebounce(search, 450);
  const debouncedCue = useDebounce(cue, 450);
  const debouncedNorma = useDebounce(norma, 450);

  // Data states
  const [agents, setAgents] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Track filters to reset page on change during render, avoiding double fetch
  const [prevFilters, setPrevFilters] = useState({
    debouncedSearch: '',
    revista: '',
    turno: '',
    debouncedCue: '',
    debouncedNorma: '',
  });

  if (
    prevFilters.debouncedSearch !== debouncedSearch ||
    prevFilters.revista !== revista ||
    prevFilters.turno !== turno ||
    prevFilters.debouncedCue !== debouncedCue ||
    prevFilters.debouncedNorma !== debouncedNorma
  ) {
    setPrevFilters({
      debouncedSearch,
      revista,
      turno,
      debouncedCue,
      debouncedNorma,
    });
    setPage(1);
  }

  // Fetch agents data
  useEffect(() => {
    let isMounted = true;
    const fetchAgentesData = async () => {
      setLoading(true);
      try {
        let queryParams = new URLSearchParams();
        if (debouncedSearch) queryParams.append('search', debouncedSearch);
        if (revista) queryParams.append('revista', revista);
        if (turno) queryParams.append('turno', turno);
        if (debouncedCue) queryParams.append('cue', debouncedCue);
        if (debouncedNorma) queryParams.append('norma_legal', debouncedNorma);
        queryParams.append('page', page.toString());
        queryParams.append('limit', '20');

        const res = await fetch(`/api/agentes?${queryParams.toString()}`);
        const result = await res.json();

        if (isMounted) {
          setAgents(result.data || []);
          setTotal(result.total || 0);
          setTotalPages(result.total_pages || 1);
        }
      } catch (e) {
        console.error('Error fetching agents data:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAgentesData();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, revista, turno, debouncedCue, debouncedNorma, page]);

  const cleanSchoolsString = (schools) => {
    if (!schools) return 'No especificada';
    if (schools.includes(',')) {
      return schools
        .split(',')
        .map((s) => s.trim())
        .filter((v, i, a) => a.indexOf(v) === i)
        .join('; ');
    }
    return schools;
  };

  return (
    <SIAMELayout>
      <Head title="Buscar Agentes" />
      <div className="flex flex-col gap-6">
        {/* Filters Panel Card */}
        <GlassCard className="p-6 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-magnifying-glass"></i> Buscar Agente
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
                <i className="fa-solid fa-shield"></i> Sit. Revista
              </label>
              <select
                value={revista}
                onChange={(e) => setRevista(e.target.value)}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-700 cursor-pointer"
              >
                <option value="">TODAS</option>
                <option value="TITULAR">TITULAR</option>
                <option value="INTERINO">INTERINO</option>
                <option value="SUPLENTE">SUPLENTE</option>
                <option value="REEMPLAZANTE">REEMPLAZANTE</option>
              </select>
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
                <i className="fa-solid fa-school"></i> CUE Escuela
              </label>
              <input
                type="text"
                value={cue}
                onChange={(e) => setCue(e.target.value)}
                placeholder="Prefijo CUE (ej: 700...)"
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-file-signature"></i> Norma Legal
              </label>
              <input
                type="text"
                value={norma}
                onChange={(e) => setNorma(e.target.value)}
                placeholder="Resolución, Decreto..."
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>
        </GlassCard>

        {/* Table Card */}
        <GlassCard className="p-8 bg-white flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Padrón Unificado de Agentes</h3>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Cargos consolidados obtenidos en tiempo real del repositorio de datos</p>
            </div>
            <span className="text-xs px-3.5 py-1.5 bg-[#FE8204]/8 text-[#FE8204] border border-[#FE8204]/10 rounded-full font-black uppercase tracking-wider shadow-sm">
              {loading ? 'Buscando...' : `${total.toLocaleString('es-AR')} agentes`}
            </span>
          </div>

          {/* Responsive Table Container */}
          <div className="flex-1 w-full overflow-x-auto rounded-[24px] border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                  <th className="px-8 py-5">Agente</th>
                  <th className="px-8 py-5">DNI</th>
                  <th className="px-8 py-5">Legajo</th>
                  <th className="px-8 py-5">Género</th>
                  <th className="px-8 py-5">Cargos Activos</th>
                  <th className="px-8 py-5">Escuelas de Desempeño</th>
                  <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center text-gray-400">
                      <i className="fa-solid fa-spinner fa-spin text-2xl text-[#FE8204] mb-2"></i>
                      <p className="font-bold text-[10px] uppercase tracking-widest">Buscando en la base de datos...</p>
                    </td>
                  </tr>
                ) : agents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center text-gray-400">
                      <i className="fa-solid fa-users-slash text-3xl text-gray-300 mb-2"></i>
                      <p className="font-bold text-[10px] uppercase tracking-widest">No se encontraron agentes con los filtros indicados</p>
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => {
                    const isMulti = agent.cargos_activos > 1;
                    const rowClass = isMulti ? 'bg-[#FE8204]/8 hover:bg-[#FE8204]/12' : 'hover:bg-gray-50/50';
                    const schoolsText = cleanSchoolsString(agent.escuelas);

                    return (
                      <tr key={agent.dni} className={`transition-colors duration-300 cursor-pointer ${rowClass}`} onClick={() => openAgentModal(agent.dni)}>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900">{agent.nombre_agente}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Legajo: {agent.legajo || 'S/D'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 font-bold text-gray-900">{agent.dni}</td>
                        <td className="px-8 py-5 font-mono text-gray-400">{agent.legajo || 'S/D'}</td>
                        <td className="px-8 py-5">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                              agent.genero === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {agent.genero}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black leading-none ${
                                isMulti ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {agent.cargos_activos}
                            </span>
                            {agent.total_horas_catedra > 0 && (
                              <span className="text-[10px] font-bold text-cyan-600">
                                {agent.total_horas_catedra} Hs
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="max-w-[280px] truncate text-gray-500 font-semibold" title={schoolsText}>
                            {schoolsText}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openAgentModal(agent.dni)}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white border border-gray-100 shadow-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <i className="fa-solid fa-eye text-[9px]"></i>
                            Ver Detalles
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination component */}
          {!loading && totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              totalItems={total}
              itemsName="agentes"
            />
          )}
        </GlassCard>
      </div>
    </SIAMELayout>
  );
};

export default Agentes;
