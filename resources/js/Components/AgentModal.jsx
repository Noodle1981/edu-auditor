import React, { useState, useEffect } from 'react';
import { useGlobal } from '../Context/GlobalContext';

export const AgentModal = () => {
  const { selectedAgentDni, closeAgentModal } = useGlobal();
  const [activeTab, setActiveTab] = useState('general');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedAgentDni) {
      setProfile(null);
      return;
    }

    const fetchAgentDetails = async () => {
      setLoading(true);
      setActiveTab('general');
      try {
        const res = await fetch(`/api/agentes/${selectedAgentDni}`);
        const data = await res.json();
        setProfile(data);
      } catch (e) {
        console.error('Error fetching agent details:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentDetails();
  }, [selectedAgentDni]);

  if (!selectedAgentDni) return null;

  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371.0;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getDistanceDetails = () => {
    if (!profile || !profile.escuelas_fisicas) return null;
    const keys = Object.keys(profile.escuelas_fisicas);
    if (keys.length < 2) return null;

    const esc1 = profile.escuelas_fisicas[keys[0]];
    const esc2 = profile.escuelas_fisicas[keys[1]];

    if (esc1.latitud && esc1.longitud && esc2.latitud && esc2.longitud) {
      const lat1 = Number(esc1.latitud);
      const lon1 = Number(esc1.longitud);
      const lat2 = Number(esc2.latitud);
      const lon2 = Number(esc2.longitud);

      if (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2)) {
        const dist = haversine(lat1, lon1, lat2, lon2);
        let severity = 'verde';
        let severityColor = 'text-emerald-600 border-emerald-100 bg-emerald-50/50';
        let textStatus = 'APTO (Traslado Viable)';

        if (dist > 15.0) {
          severity = 'rojo';
          severityColor = 'text-red-600 border-red-100 bg-red-50/50';
          textStatus = 'INVIABLE EN CAMBIO TURNO';
        } else if (dist > 5.0) {
          severity = 'amarillo';
          severityColor = 'text-[#FE8204] border-[#FE8204]/10 bg-[#FE8204]/5';
          textStatus = 'TIEMPO VIAJE AJUSTADO';
        }

        return { dist, severity, severityColor, textStatus };
      }
    }
    return null;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeAgentModal();
    }
  };

  const distDetails = getDistanceDetails();

  return (
    <div 
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300"
    >
      {/* Modal Card */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-4xl bg-white rounded-[32px] border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Ficha Unificada del Agente</span>
            <h2 id="modal-title" className="text-xl font-black text-gray-900 tracking-tight leading-none mt-1">
              {loading ? 'Cargando...' : profile?.nombre_agente || 'Detalles del Agente'}
            </h2>
          </div>
          <button
            onClick={closeAgentModal}
            className="w-10 h-10 rounded-xl bg-white hover:bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        {!loading && profile && (
          <div className="px-8 py-4 border-b border-gray-50 bg-gray-50/10 flex gap-2 flex-wrap">
            {[
              { id: 'general', label: 'Ficha General', icon: 'fa-solid fa-address-card' },
              { id: 'cargos', label: 'Cargos y Designaciones', icon: 'fa-solid fa-briefcase' },
              { id: 'licencias', label: 'Licencias y Movimientos', icon: 'fa-solid fa-file-medical' },
              { id: 'mapa', label: 'Ubicación y Geolocalización', icon: 'fa-solid fa-map-location-dot' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer transition-all border ${
                  activeTab === tab.id
                    ? 'bg-[#FE8204] text-white border-[#FE8204] shadow-md shadow-[#FE8204]/20'
                    : 'bg-white text-gray-500 hover:text-gray-900 border-gray-100 hover:bg-gray-50'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <i className="fa-solid fa-spinner fa-spin text-4xl text-[#FE8204]"></i>
              <p className="mt-4 font-bold text-xs uppercase tracking-widest text-gray-400">Obteniendo base unificada...</p>
            </div>
          ) : !profile ? (
            <p className="text-center py-10 text-gray-500">Error al cargar la información.</p>
          ) : (
            <>
              {/* VIEW: Ficha General */}
              {activeTab === 'general' && (
                <div className="flex flex-col gap-6">
                  {/* Grid summary card */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: 'Documento (DNI)', value: profile.dni, icon: 'fa-solid fa-id-card' },
                      { label: 'Número Legajo', value: profile.legajo || 'S/D', icon: 'fa-solid fa-user-tag' },
                      { label: 'Género', value: profile.genero === 'F' ? 'Femenino' : 'Masculino', icon: 'fa-solid fa-venus-mars' },
                      { label: 'Cargos Activos', value: `${profile.cargos_count} cargos`, icon: 'fa-solid fa-briefcase' },
                      {
                        label: 'Carga Horaria',
                        value: profile.total_horas_catedra > 0 ? `${profile.total_horas_catedra} Hs Cátedra` : '0 Hs (Planta)',
                        icon: 'fa-solid fa-clock'
                      },
                    ].map((item) => (
                      <div key={item.label} className="bg-gray-50/50 border border-gray-100/80 rounded-2xl p-4 flex flex-col gap-1.5 shadow-sm">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <i className={item.icon}></i>
                          {item.label}
                        </span>
                        <span className="text-sm font-black text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recommendation / Evaluation Card */}
                  <div
                    className={`border rounded-[24px] p-6 flex gap-4 items-start shadow-sm transition-all ${
                      profile.auditoria?.tiene_licencia_activa
                        ? 'bg-purple-50/40 border-purple-100 text-purple-900'
                        : profile.auditoria?.alerta_incompatibilidad_horas
                        ? 'bg-red-50/40 border-red-100 text-red-900'
                        : profile.auditoria?.alerta_multi_cargo
                        ? 'bg-cyan-50/40 border-cyan-100 text-cyan-900'
                        : 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${
                        profile.auditoria?.tiene_licencia_activa
                          ? 'bg-purple-100 text-purple-700'
                          : profile.auditoria?.alerta_incompatibilidad_horas
                          ? 'bg-red-100 text-red-700'
                          : profile.auditoria?.alerta_multi_cargo
                          ? 'bg-cyan-100 text-cyan-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {profile.auditoria?.tiene_licencia_activa ? (
                        <i className="fa-solid fa-file-medical"></i>
                      ) : profile.auditoria?.alerta_incompatibilidad_horas ? (
                        <i className="fa-solid fa-triangle-exclamation"></i>
                      ) : profile.auditoria?.alerta_multi_cargo ? (
                        <i className="fa-solid fa-arrows-split-up-and-left"></i>
                      ) : (
                        <i className="fa-solid fa-circle-check"></i>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <h4 className="font-black text-sm uppercase tracking-wider">
                        {profile.auditoria?.tiene_licencia_activa
                          ? 'Licencia Médica Activa Detectada'
                          : profile.auditoria?.alerta_incompatibilidad_horas
                          ? 'Exceso Horario Crítico Detectado'
                          : profile.auditoria?.alerta_multi_cargo
                          ? 'Multicargo Regular en Planta'
                          : 'Situación Regular Apta'}
                      </h4>
                      <p className="text-xs leading-relaxed font-semibold">
                        {profile.auditoria?.tiene_licencia_activa ? (
                          <>
                            Este agente goza actualmente de una licencia:{' '}
                            <strong>{profile.auditoria.licencias_activas?.map((l) => l.tipo_licencia).join(', ') || ''}</strong>. Se
                            debería validar su situación con el documento de respaldo:{' '}
                            <strong>{profile.auditoria.licencias_activas?.[0]?.documento_respaldo || ''}</strong>.
                          </>
                        ) : profile.auditoria?.alerta_incompatibilidad_horas ? (
                          <>
                            El docente acumula un total de <strong>{profile.total_horas_catedra} Horas Cátedra</strong>, lo cual{' '}
                            <span className="text-red-700 font-bold">supera el tope legal de 50 horas cátedra</span>. Requiere
                            auditoría de compatibilidad de horarios inter-escuela.
                          </>
                        ) : profile.auditoria?.alerta_multi_cargo ? (
                          <>
                            El agente se desempeña en <strong>{profile.cargos_count} cargos activos</strong> dentro de los límites
                            horarios estatutarios.
                          </>
                        ) : (
                          <>Agente con cargo único y situación regularizada.</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: Cargos y Designaciones */}
              {activeTab === 'cargos' && (
                <div className="flex flex-col gap-8">
                  {/* Padrón Agentes */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Cargos Activos (agentes.db)</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Planta docente cargada en el padrón unificado</p>
                    </div>
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-4">Establecimiento</th>
                            <th className="px-6 py-4">CUE</th>
                            <th className="px-6 py-4">CUPOF</th>
                            <th className="px-6 py-4">Cargo / Asignatura</th>
                            <th className="px-6 py-4">Turno</th>
                            <th className="px-6 py-4">Revista</th>
                            <th className="px-6 py-4">Alta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                          {profile.cargos.map((c) => (
                            <tr key={c.id} className="hover:bg-gray-50/50">
                              <td className="px-6 py-4 max-w-[200px] truncate" title={c.establecimiento}>{c.establecimiento}</td>
                              <td className="px-6 py-4 font-bold text-gray-900">{c.cue || '-'}</td>
                              <td className="px-6 py-4 font-mono text-[10px] text-gray-400">{c.cupof}</td>
                              <td className="px-6 py-4">
                                {c.cargo_horas}{' '}
                                {c.horas_catedra > 0 && (
                                  <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-50 border border-cyan-100 text-cyan-600 font-bold ml-1">
                                    {c.horas_catedra} Hs
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">{c.turno || 'S/D'}</td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                    c.situacion_revista === 'TITULAR'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {c.situacion_revista}
                                </span>
                              </td>
                              <td className="px-6 py-4">{c.fecha_alta || 'S/D'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Padrón Designaciones */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Designaciones Oficiales (designaciones.db)</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Cruce de cargos vigentes registrados en designaciones oficiales</p>
                    </div>
                    {profile.designaciones.length === 0 ? (
                      <p className="text-xs font-semibold text-gray-400 italic py-4">Sin registros en designaciones.db</p>
                    ) : (
                      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-max">
                          <thead>
                            <tr className="bg-gray-50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b border-gray-100">
                              <th className="px-6 py-4">Establecimiento</th>
                              <th className="px-6 py-4">CUE</th>
                              <th className="px-6 py-4">CUPOF</th>
                              <th className="px-6 py-4">Cargo / Asignatura</th>
                              <th className="px-6 py-4">Turno</th>
                              <th className="px-6 py-4">Revista</th>
                              <th className="px-6 py-4">Alta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                            {profile.designaciones.map((d) => (
                              <tr key={d.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 max-w-[200px] truncate" title={d.establecimiento}>{d.establecimiento}</td>
                                <td className="px-6 py-4 font-bold text-gray-900">{d.cue || '-'}</td>
                                <td className="px-6 py-4 font-mono text-[10px] text-gray-400">{d.cupof}</td>
                                <td className="px-6 py-4">
                                  {d.cargo_horas}{' '}
                                  {d.horas_catedra > 0 && (
                                    <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-50 border border-cyan-100 text-cyan-600 font-bold ml-1">
                                      {d.horas_catedra} Hs
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4">{d.turno || 'S/D'}</td>
                                <td className="px-6 py-4">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                      d.situacion_revista === 'TITULAR'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {d.situacion_revista}
                                  </span>
                                </td>
                                <td className="px-6 py-4">{d.fecha_alta || 'S/D'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW: Licencias */}
              {activeTab === 'licencias' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Historial y Trámites de Licencias (licencias.db)</h3>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Cartas médicas y licencias autorizadas cruzadas por DNI</p>
                  </div>
                  {profile.licencias.length === 0 ? (
                    <p className="text-xs font-semibold text-gray-400 italic py-6 text-center">Sin licencias médicas o trámites registrados.</p>
                  ) : (
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-4">Trámite ID</th>
                            <th className="px-6 py-4">Tipo Licencia</th>
                            <th className="px-6 py-4">Respaldo</th>
                            <th className="px-6 py-4">Fecha Inicio</th>
                            <th className="px-6 py-4">Fecha Fin</th>
                            <th className="px-6 py-4 text-center">Duración</th>
                            <th className="px-6 py-4 text-right">Estado Actual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-600">
                          {profile.licencias.map((l) => {
                            const isAct = profile.auditoria?.licencias_activas?.some((al) => al.id_tramite === l.id_tramite);
                            return (
                              <tr key={l.id_tramite} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 font-bold text-gray-900">#{l.id_tramite}</td>
                                <td className="px-6 py-4 text-[#FE8204] font-bold">{l.tipo_licencia}</td>
                                <td className="px-6 py-4 font-mono text-cyan-600"><i className="fa-solid fa-file-invoice mr-1.5"></i> {l.documento_respaldo}</td>
                                <td className="px-6 py-4">{l.fecha_inicio}</td>
                                <td className="px-6 py-4">{l.fecha_fin}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className="text-[10px] px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold">
                                    {l.dias} días
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {isAct ? (
                                    <span className="px-3 py-1 rounded-full text-[9px] font-black bg-purple-100 text-purple-700 border border-purple-200 animate-pulse">
                                      <i className="fa-solid fa-spinner fa-spin mr-1 text-[8px]"></i> ACTIVA
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 rounded-full text-[9px] font-black bg-gray-100 text-gray-400">
                                      HISTÓRICA
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: Ubicación y Geolocalización */}
              {activeTab === 'mapa' && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Ficha Geográfica y de Contacto de Escuelas (establecimientos.sqlite)</h3>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Datos de localización física, VoIP y coordenadas satelitales de las escuelas asociadas</p>
                  </div>

                  {!profile.escuelas_fisicas || Object.keys(profile.escuelas_fisicas).length === 0 ? (
                    <p className="text-xs font-semibold text-gray-400 italic py-6 text-center">CUEs no georreferenciados en la base de datos.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      {/* Left: Schools Cards */}
                      <div className="md:col-span-7 flex flex-col gap-4">
                        {distDetails && (
                          <div className={`border-[1.5px] border-dashed rounded-2xl p-4 flex gap-4 items-center shadow-sm ${distDetails.severityColor}`}>
                            <div className="w-10 h-10 rounded-full bg-white/60 border border-gray-100/50 flex items-center justify-center text-lg">
                              <i className="fa-solid fa-route"></i>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-black text-xs uppercase tracking-wider text-gray-800">Ruta de Dispersión Geográfica</h4>
                              <p className="text-[10px] font-semibold text-gray-500 mt-1 leading-normal">
                                El agente posee una separación real de <strong className="text-gray-900">{distDetails.dist.toFixed(2)} km</strong> entre sus escuelas.{' '}
                                Traslado: <strong className="uppercase">{distDetails.textStatus}</strong>.
                              </p>
                            </div>
                          </div>
                        )}

                        {Object.values(profile.escuelas_fisicas || {}).map((esc) => (
                          <div
                            key={esc.cue}
                            className="bg-gray-50/40 border border-gray-100 rounded-2xl p-5 flex flex-col gap-3 relative shadow-sm"
                          >
                            <span className="absolute top-4 right-4 text-[9px] font-black px-2.5 py-1 rounded-full bg-[#FE8204]/8 text-[#FE8204] border border-[#FE8204]/10 shadow-sm">
                              CUE {esc.cue}
                            </span>
                            <h4 className="text-xs font-black text-gray-900 uppercase pr-20 leading-snug">
                              {esc.nombre_establecimiento || esc.nombre || 'Establecimiento sin nombre'}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <i className="fa-solid fa-map-pin text-[#FE8204] text-xs w-4"></i>
                                <span className="text-gray-700 truncate">{esc.calle} {esc.numero_puerta || 'S/N'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <i className="fa-solid fa-earth-americas text-emerald-500 text-xs w-4"></i>
                                <span className="text-gray-700 truncate">Depto: {esc.departamento || 'S/D'} ({esc.localidad})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <i className="fa-solid fa-layer-group text-blue-500 text-xs w-4"></i>
                                <span className="text-gray-700 truncate">{esc.nivel_educativo || 'Sin Nivel'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <i className="fa-solid fa-phone-volume text-purple-500 text-xs w-4"></i>
                                <span className="text-cyan-600 font-bold">VoIP: {esc.te_voip || 'S/D'}</span>
                              </div>
                              <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                                <i className="fa-solid fa-compass text-rose-500 text-xs w-4"></i>
                                <span className="text-gray-700">Zona: {esc.zona || 'S/D'} | CP: {esc.codigo_postal || 'S/D'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Right: Mock Radar Sweeper */}
                      <div className="md:col-span-5 bg-gray-950 border border-gray-800 rounded-[24px] p-6 h-80 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
                        {/* Radar sweep lines */}
                        <div className="absolute inset-4 border border-cyan-500/10 rounded-full flex items-center justify-center">
                          <div className="w-4/5 h-4/5 border border-cyan-500/15 rounded-full flex items-center justify-center">
                            <div className="w-3/5 h-3/5 border border-cyan-500/25 border-dashed rounded-full flex items-center justify-center">
                              <div className="w-1/3 h-1/3 border border-cyan-500/35 rounded-full flex items-center justify-center"></div>
                            </div>
                          </div>
                        </div>

                        {/* Sweep Radar Line */}
                        <div className="absolute w-[50%] h-[50%] top-0 left-0 bg-gradient-to-br from-cyan-500/10 to-transparent transform-origin-bottom-right rotate-0 animate-[radar-sweep_5s_infinite_linear] border-r border-cyan-400/30"></div>

                        <i className="fa-solid fa-satellite-dish text-cyan-400 text-3xl mb-4 relative z-10 animate-bounce"></i>
                        <span className="text-cyan-400 font-black text-xs uppercase tracking-widest relative z-10">Geolocalización Activa</span>
                        
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2 relative z-10" id="coords-display">
                          {distDetails ? (
                            <>
                              Separación: <strong className="text-cyan-300 font-black">{distDetails.dist.toFixed(2)} KM</strong>
                            </>
                          ) : (
                            `Coordenadas: ${Object.values(profile.escuelas_fisicas || {})[0]?.latitud || '-'}, ${Object.values(profile.escuelas_fisicas || {})[0]?.longitud || '-'}`
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Radar Animation Injection */}
      <style>{`
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .transform-origin-bottom-right {
          transform-origin: 100% 100%;
        }
      `}</style>
    </div>
  );
};
