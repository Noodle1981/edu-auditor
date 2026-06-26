import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { GlassCard } from '../Components/GlassCard';
import { useGlobal } from '../Context/GlobalContext';

const Importar = () => {
  const { activeYear } = useGlobal();
  const [csvFiles, setCsvFiles] = useState([]);
  const [loadingCsv, setLoadingCsv] = useState(true);
  const [apiEndpoints, setApiEndpoints] = useState([]);
  const [loadingApi, setLoadingApi] = useState(true);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchCsvStatus = async () => {
    try {
      const res = await window.axios.get('/api/imports/csv-status');
      setCsvFiles(res.data || []);
    } catch (e) {
      console.error('Error fetching CSV status:', e);
    } finally {
      setLoadingCsv(false);
    }
  };

  const fetchApiStatus = async () => {
    try {
      const res = await window.axios.get('/api/imports/api-status');
      setApiEndpoints(res.data || []);
    } catch (e) {
      console.error('Error fetching API status:', e);
    } finally {
      setLoadingApi(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await window.axios.get('/api/imports/history');
      setHistory(res.data || []);
    } catch (e) {
      console.error('Error fetching import history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await window.axios.get('/api/imports/stats');
      setStats(res.data || null);
    } catch (e) {
      console.error('Error fetching import stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const [triggering, setTriggering] = useState(false);

  const triggerImport = async (type) => {
    setTriggering(true);
    try {
      const res = await window.axios.post('/api/imports/trigger', { type });
      alert(res.data.message);
      refreshAllData();
    } catch (e) {
      console.error('Error triggering import:', e);
      alert('Error al iniciar la importación. Revisa la consola o logs.');
    } finally {
      setTriggering(false);
    }
  };

  const refreshAllData = () => {
    setLoadingCsv(true);
    setLoadingApi(true);
    setLoadingHistory(true);
    setLoadingStats(true);
    fetchCsvStatus();
    fetchApiStatus();
    fetchHistory();
    fetchStats();
  };

  useEffect(() => {
    fetchCsvStatus();
    fetchApiStatus();
    fetchHistory();
    fetchStats();
  }, []);

  // Poll history and stats if there are active imports in history
  useEffect(() => {
    const hasActiveImports = history.some(
      (item) => item.status === 'pending' || item.status === 'running'
    );

    if (hasActiveImports) {
      const interval = setInterval(() => {
        fetchCsvStatus();
        fetchHistory();
        fetchStats();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [history]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black tracking-wider uppercase">
            Completado
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-[9px] font-black tracking-wider uppercase">
            Fallado
          </span>
        );
      case 'running':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-[9px] font-black tracking-wider uppercase animate-pulse flex items-center gap-1">
            <i className="fa-solid fa-spinner fa-spin text-[8px]"></i> Procesando
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[9px] font-black tracking-wider uppercase animate-pulse">
            Pendiente
          </span>
        );
    }
  };

  const getYearsList = () => {
    if (!stats) return [];
    const years = new Set();
    stats.cargos_by_year.forEach(item => years.add(item.anio));
    stats.designaciones_by_year.forEach(item => years.add(item.anio));
    stats.licencias_by_year.forEach(item => years.add(item.anio));
    return Array.from(years).sort((a, b) => b - a);
  };

  const getCountsForYear = (y) => {
    const cargo = stats.cargos_by_year.find(item => item.anio === y)?.count || 0;
    const desig = stats.designaciones_by_year.find(item => item.anio === y)?.count || 0;
    const lic = stats.licencias_by_year.find(item => item.anio === y)?.count || 0;
    return { cargo, desig, lic };
  };

  return (
    <SIAMELayout>
      <Head title="Base de Datos y APIs" />
      <div className="flex flex-col gap-6 animate-fade-in">
        {/* Info Header Card */}
        <GlassCard className="p-8 bg-white flex flex-col gap-6">
          <div className="flex justify-between items-start pb-4 border-b border-gray-50 flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center text-2xl shadow-sm">
                <i className="fa-solid fa-database"></i>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">
                  Panel de Estado de Base de Datos y APIs
                </h2>
                <p className="text-xs font-semibold text-gray-400">
                  Monitoreo de bases de datos locales alimentadas por CSV e integración de APIs en el sistema unificado
                </p>
              </div>
            </div>
            <button
              onClick={refreshAllData}
              className="px-4 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 text-xs font-black text-gray-700 tracking-wider uppercase transition-all duration-200 active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm bg-white"
            >
              <i className="fa-solid fa-arrows-rotate"></i> Actualizar Todo
            </button>
          </div>
        </GlassCard>

        {/* KPI Stats Grid */}
        {!loadingStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <GlassCard className="p-5 bg-white flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xl shadow-sm">
                <i className="fa-solid fa-users"></i>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Docentes Únicos</span>
                <span className="text-xl font-black text-gray-900 mt-0.5">
                  {stats.total_agentes.toLocaleString('es-AR')}
                </span>
              </div>
            </GlassCard>
            
            <GlassCard className="p-5 bg-white flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center text-xl shadow-sm">
                <i className="fa-solid fa-school"></i>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Establecimientos Escolares</span>
                <span className="text-xl font-black text-gray-900 mt-0.5">
                  {stats.total_establecimientos.toLocaleString('es-AR')}
                </span>
              </div>
            </GlassCard>

            <GlassCard className="p-5 bg-white flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center text-xl shadow-sm">
                <i className="fa-solid fa-building-columns"></i>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Edificios Educativos</span>
                <span className="text-xl font-black text-gray-900 mt-0.5">
                  {stats.total_edificios.toLocaleString('es-AR')}
                </span>
              </div>
            </GlassCard>

            <GlassCard className="p-5 bg-white flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center text-xl shadow-sm">
                <i className="fa-solid fa-shapes"></i>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Modalidades Activas</span>
                <span className="text-xl font-black text-gray-900 mt-0.5">
                  {stats.total_modalidades.toLocaleString('es-AR')}
                </span>
              </div>
            </GlassCard>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: CSV Files Local Status & DB Volumes */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            
            {/* CSV Files Status */}
            <GlassCard className="p-6 bg-white">
              <div className="flex flex-col mb-4 pb-3 border-b border-gray-50">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-file-csv text-[#FE8204]"></i> Archivos de Datos Locales (CSV)
                </h4>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                  Archivos ubicados en la carpeta `datos_csv/` para alimentar la base de datos
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {loadingCsv ? (
                  <div className="text-center py-6 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    <i className="fa-solid fa-spinner fa-spin mr-1.5"></i> Leyendo archivos locales...
                  </div>
                ) : csvFiles.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 italic text-xs">
                    No se encontraron archivos en la carpeta `datos_csv/`.
                  </div>
                ) : (
                  csvFiles.map((file, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all duration-200 ${
                        file.exists 
                          ? 'bg-gray-50/50 border-gray-100 hover:bg-gray-50' 
                          : 'bg-rose-50/30 border-rose-100/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm shadow-sm ${
                          file.type === 'agentes' 
                            ? 'bg-indigo-50 border border-indigo-100 text-indigo-600' 
                            : 'bg-amber-50 border border-amber-100 text-amber-600'
                        }`}>
                          <i className={file.type === 'agentes' ? 'fa-solid fa-user-tie' : 'fa-solid fa-hospital-user'}></i>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-800 break-all">{file.name}</span>
                          <span className="text-[10px] text-gray-400 font-semibold">{file.description}</span>
                          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">
                            <span>Tamaño: {file.size}</span>
                            <span>•</span>
                            <span>Modif: {file.modified_at}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        {file.exists ? (
                          <>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-bold tracking-wider uppercase">
                              Disponible
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 font-mono mt-0.5">
                              {file.db_records.toLocaleString('es-AR')} reg.
                            </span>
                          </>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-rose-600 text-[8px] font-bold tracking-wider uppercase">
                            No Encontrado
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            {/* Actions Panel */}
            <GlassCard className="p-6 bg-white">
              <div className="flex flex-col mb-4 pb-3 border-b border-gray-50">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-bolt text-emerald-600"></i> Acciones de Actualización (POF/PON)
                </h4>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                  Lanza procesos en segundo plano para poblar la base de datos con los últimos CSV
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-[11px] leading-relaxed font-semibold text-gray-500 mb-2">
                  Estos procesos pueden tomar varios minutos dependiendo del volumen de los archivos. Asegúrate de haber subido los CSV más recientes en el servidor antes de ejecutar.
                </p>

                <button
                  onClick={() => triggerImport('agentes')}
                  disabled={triggering}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    triggering
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-70'
                      : 'bg-white border-emerald-200 hover:border-emerald-500 hover:shadow-md cursor-pointer group'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${triggering ? 'bg-gray-200 text-gray-400' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors'}`}>
                      <i className={`fa-solid ${triggering ? 'fa-spinner fa-spin' : 'fa-users'}`}></i>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                        Actualizar POF
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">
                        Padrón de Agentes (Cargos y Designaciones)
                      </span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-gray-300"></i>
                </button>

                <button
                  onClick={() => triggerImport('licencias')}
                  disabled={triggering}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    triggering
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-70'
                      : 'bg-white border-sky-200 hover:border-sky-500 hover:shadow-md cursor-pointer group'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${triggering ? 'bg-gray-200 text-gray-400' : 'bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors'}`}>
                      <i className={`fa-solid ${triggering ? 'fa-spinner fa-spin' : 'fa-file-medical'}`}></i>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                        Actualizar PON
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">
                        Novedades y Licencias Consolidadas
                      </span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-gray-300"></i>
                </button>

                <button
                  onClick={() => triggerImport('all')}
                  disabled={triggering}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all mt-2 ${
                    triggering
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-70'
                      : 'bg-gray-900 border-gray-900 hover:bg-gray-800 hover:shadow-md cursor-pointer group'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${triggering ? 'bg-gray-700 text-gray-500' : 'bg-gray-800 text-white group-hover:bg-gray-700 transition-colors'}`}>
                      <i className={`fa-solid ${triggering ? 'fa-spinner fa-spin' : 'fa-server'}`}></i>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className={`text-xs font-black uppercase tracking-wider ${triggering ? 'text-gray-500' : 'text-white'}`}>
                        Sincronización Completa
                      </span>
                      <span className={`text-[10px] font-semibold ${triggering ? 'text-gray-500' : 'text-gray-400'}`}>
                        Actualizar TODO (POF y PON) en orden
                      </span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-gray-600"></i>
                </button>
              </div>
            </GlassCard>

          </div>

          {/* Right Column: API Integrations and History */}
          <div className="lg:col-span-6 flex flex-col gap-6">

            {/* API Endpoints Status (Future integration) */}
            <GlassCard className="p-6 bg-white">
              <div className="flex flex-col mb-4 pb-3 border-b border-gray-50">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-nodes text-sky-600"></i> Visor e Integración de APIs (SIGE / EDUGE)
                </h4>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                  Servicios y endpoints externos listos para su futura habilitación
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {loadingApi ? (
                  <div className="text-center py-6 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    <i className="fa-solid fa-spinner fa-spin mr-1.5"></i> Conectando con servicios...
                  </div>
                ) : apiEndpoints.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 italic text-xs">
                    No se han registrado endpoints.
                  </div>
                ) : (
                  apiEndpoints.map((endpoint, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50/20 flex flex-col gap-2 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-black text-gray-800">{endpoint.name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-400 text-[8px] font-black uppercase tracking-wider">
                          {endpoint.status}
                        </span>
                      </div>
                      
                      <p className="text-[10px] font-semibold text-gray-400 leading-normal">
                        {endpoint.description}
                      </p>

                      <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 pt-1 border-t border-gray-50/50 mt-1">
                        <span className="font-bold text-[#FE8204]">{endpoint.method}</span>
                        <span className="truncate max-w-[200px] text-gray-400" title={endpoint.endpoint}>
                          {endpoint.endpoint}
                        </span>
                        <span className="text-[8px] text-gray-400">
                          Check: {new Date(endpoint.last_check).toLocaleTimeString('es-AR')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            {/* History Table */}
            <GlassCard className="p-6 bg-white flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50">
                  <div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-clock-rotate-left text-cyan-600"></i> Historial de Sincronización
                    </h4>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                      Registro de comandos ejecutados en el sistema
                    </p>
                  </div>
                </div>

                <div className="w-full overflow-x-auto rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse min-w-max text-[11px] font-semibold text-gray-600">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b border-gray-100">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Archivo</th>
                        <th className="px-4 py-3">Año</th>
                        <th className="px-4 py-3">Registros</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingHistory ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-400 font-black uppercase tracking-widest text-[9px]">
                            <i className="fa-solid fa-spinner fa-spin mr-1"></i> Cargando Historial...
                          </td>
                        </tr>
                      ) : history.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">
                            No se registran sincronizaciones previas.
                          </td>
                        </tr>
                      ) : (
                        history.map((log) => {
                          const start = log.started_at ? new Date(log.started_at) : null;
                          return (
                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                              <td className="px-4 py-3 font-mono font-bold text-gray-900">#{log.id}</td>
                              <td className="px-4 py-3 truncate max-w-[120px]" title={log.filename}>
                                  {log.filename}
                              </td>
                              <td className="px-4 py-3 font-bold text-gray-700">{log.anio || '-'}</td>
                              <td className="px-4 py-3 font-mono text-gray-800">
                                {(log.records_count || 0).toLocaleString('es-AR')}
                              </td>
                              <td className="px-4 py-3 text-[10px] text-gray-400">
                                {start ? start.toLocaleString('es-AR') : '-'}
                              </td>
                              <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </GlassCard>

          </div>
        </div>
      </div>
    </SIAMELayout>
  );
};

export default Importar;
