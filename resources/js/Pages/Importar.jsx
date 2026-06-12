import React, { useEffect, useState, useRef } from 'react';
import { Head } from '@inertiajs/react';
import SIAMELayout from '../Layouts/SIAMELayout';
import { GlassCard } from '../Components/GlassCard';

const Importar = () => {
  const [file, setFile] = useState(null);
  const [type, setType] = useState('agentes');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    fetchHistory();
  }, []);

  // Poll history if there are pending or running imports
  useEffect(() => {
    const hasActiveImports = history.some(
      (item) => item.status === 'pending' || item.status === 'running'
    );

    if (hasActiveImports) {
      const interval = setInterval(() => {
        fetchHistory();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [history]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setMessage(null);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, seleccione un archivo CSV para importar.');
      return;
    }

    setUploading(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await window.axios.post('/api/imports/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setMessage('Importación iniciada en segundo plano con éxito.');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchHistory();
      } else {
        setError(res.data.error || 'Ocurrió un error al iniciar la importación.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Error de red o de servidor al subir el archivo.'
      );
    } finally {
      setUploading(false);
    }
  };

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

  return (
    <SIAMELayout>
      <Head title="Cargar Datos" />
      <div className="flex flex-col gap-6 animate-fade-in">
        {/* Info Header Card */}
        <GlassCard className="p-8 bg-white flex flex-col gap-6">
          <div className="flex items-start gap-4 pb-4 border-b border-gray-50">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center text-2xl shadow-sm">
              <i className="fa-solid fa-file-import"></i>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">
                Panel de Importación y Carga de Novedades (Admin)
              </h2>
              <p className="text-xs font-semibold text-gray-400">
                Carga archivos CSV oficiales para actualizar la planta de Agentes, Designaciones o Licencias en la base de datos unificada
              </p>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Upload Form Card */}
          <GlassCard className="p-6 bg-white lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex flex-col mb-4 pb-3 border-b border-gray-50">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-upload text-[#FE8204]"></i> Cargar Archivo Nuevo
                </h4>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                  Selecciona la entidad y el archivo correspondiente
                </p>
              </div>

              <form onSubmit={handleUpload} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Tipo de Base de Datos
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FE8204]/30 focus:bg-white transition-all text-gray-700 cursor-pointer"
                  >
                    <option value="agentes">Agentes (reporte_agentes.csv)</option>
                    <option value="designaciones">Designaciones (Designaciones.csv)</option>
                    <option value="licencias">Licencias (Licencia.csv)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Seleccionar Archivo CSV
                  </label>
                  <div className="relative border border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors p-4 text-center cursor-pointer">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".csv"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-1 text-xs">
                      <i className="fa-solid fa-cloud-arrow-up text-lg text-gray-400"></i>
                      {file ? (
                        <span className="font-bold text-gray-800 break-all">{file.name}</span>
                      ) : (
                        <span className="text-gray-400">Arrastre o seleccione un CSV</span>
                      )}
                      {file && (
                        <span className="text-[9px] text-gray-400 font-bold uppercase">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {message && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] font-bold text-emerald-800 flex items-start gap-2">
                    <i className="fa-solid fa-circle-check text-xs mt-0.5"></i>
                    <span>{message}</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] font-bold text-rose-800 flex items-start gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-xs mt-0.5"></i>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className={`px-4 py-3 bg-[#FE8204] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                    uploading || !file ? 'opacity-55 cursor-not-allowed' : 'hover:bg-[#e07203]'
                  }`}
                >
                  {uploading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin animate-spin mr-1"></i> Subiendo...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-play"></i> Iniciar Importación
                    </>
                  )}
                </button>
              </form>
            </div>
          </GlassCard>

          {/* History Card */}
          <GlassCard className="p-6 bg-white lg:col-span-8 flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-50">
                <div>
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-clock-rotate-left text-cyan-600"></i> Historial de Cargas
                  </h4>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                    Últimas operaciones de actualización registradas
                  </p>
                </div>
                <button
                  onClick={fetchHistory}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-[10px] font-black text-gray-600 tracking-wider uppercase transition-all duration-200 active:scale-95 flex items-center gap-1 cursor-pointer shadow-sm bg-white"
                >
                  <i className="fa-solid fa-rotate"></i> Actualizar
                </button>
              </div>

              <div className="w-full overflow-x-auto rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse min-w-max text-[11px] font-semibold text-gray-600">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b border-gray-100">
                      <th className="px-4 py-3">ID Log</th>
                      <th className="px-4 py-3">Archivo Cargado</th>
                      <th className="px-4 py-3">Registros</th>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Fecha Inicio</th>
                      <th className="px-4 py-3">Duración / Terminado</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-black uppercase tracking-widest text-[9px]">
                          <i className="fa-solid fa-spinner fa-spin mr-1"></i> Cargando Historial...
                        </td>
                      </tr>
                    ) : history.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
                          No se registran importaciones previas en la base de datos.
                        </td>
                      </tr>
                    ) : (
                      history.map((log) => {
                        const start = log.started_at ? new Date(log.started_at) : null;
                        const end = log.completed_at ? new Date(log.completed_at) : null;
                        let duration = '-';
                        if (start && end) {
                          const diffSecs = Math.round((end - start) / 1000);
                          duration = `${diffSecs}s`;
                        }

                        return (
                          <tr key={log.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                            <td className="px-4 py-3 font-mono font-bold text-gray-900">#{log.id}</td>
                            <td className="px-4 py-3 truncate max-w-[150px]" title={log.filename}>
                              {log.filename}
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-800">
                              {(log.records_count || 0).toLocaleString('es-AR')}
                            </td>
                            <td className="px-4 py-3 font-black text-gray-700 truncate max-w-[100px]" title={log.user?.email || 'N/A'}>
                              {log.user?.name || log.user?.email || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-[10px] text-gray-400">
                              {start ? start.toLocaleString('es-AR') : '-'}
                            </td>
                            <td className="px-4 py-3 text-[10px]">
                              {end ? (
                                <span className="text-gray-500">
                                  {end.toLocaleTimeString('es-AR')} ({duration})
                                </span>
                              ) : log.status === 'failed' && log.error_message ? (
                                <span className="text-rose-600 font-bold max-w-[150px] truncate block" title={log.error_message}>
                                  Error: {log.error_message}
                                </span>
                              ) : (
                                <span className="text-gray-400 font-bold uppercase tracking-wider animate-pulse">En curso...</span>
                              )}
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
    </SIAMELayout>
  );
};

export default Importar;
