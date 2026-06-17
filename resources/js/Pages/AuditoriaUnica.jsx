import React, { useState } from 'react';
import SIAMELayout from '@/Layouts/SIAMELayout';
import { Head } from '@inertiajs/react';

export default function AuditoriaUnica() {
    const [dni, setDni] = useState('');
    const [loading, setLoading] = useState(false);
    const [agentData, setAgentData] = useState(null);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        const cleanDni = dni.trim();
        if (!cleanDni) return;

        setLoading(true);
        setError(null);
        setAgentData(null);

        try {
            const res = await fetch(`/api/agentes/${cleanDni}`);
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error('No se encontró ningún agente con el DNI ingresado.');
                }
                throw new Error('Ocurrió un error al consultar los datos.');
            }
            const data = await res.json();
            if (!data || !data.nombre_agente) {
                throw new Error('No se encontraron registros de planta activos para el DNI ingresado.');
            }
            setAgentData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return dateStr;
    };

    return (
        <SIAMELayout>
            <Head>
                <title>Auditoría Única por DNI</title>
                <meta name="description" content="Consulta y auditoría unificada de cargos, licencias y designaciones por DNI." />
            </Head>

            {/* Custom print styles */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    aside, header, .no-print, button, input {
                        display: none !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    body, .min-h-screen, main {
                        background-color: white !important;
                        color: black !important;
                    }
                    .print-report-container {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: transparent !important;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                }
            `}} />

            {/* Search header (hidden in print) */}
            <div className="no-print mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                    Auditoría Única de Agente
                </h1>
                <p className="text-sm text-gray-500 font-semibold mt-1">
                    Cruce de datos y expediente unificado de planta, cargos y licencias por DNI.
                </p>

                {/* Search Bar Box */}
                <div className="mt-6 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm max-w-xl">
                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="relative flex-1">
                            <i className="fa-solid fa-id-card absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input
                                id="dni-search-input"
                                type="text"
                                value={dni}
                                onChange={(e) => setDni(e.target.value)}
                                placeholder="Ingresa DNI del agente (ej. 20130692)"
                                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-900 focus:border-[#FE8204] focus:ring-[#FE8204] focus:ring-1 outline-none transition-all duration-200"
                                required
                            />
                        </div>
                        <button
                            id="dni-search-submit"
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-[#FE8204] to-[#ff5e00] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-[#FE8204]/25 hover:shadow-lg hover:from-[#ff5e00] hover:to-[#e04f00] active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? (
                                <i className="fa-solid fa-spinner fa-spin mr-1.5"></i>
                            ) : (
                                <i className="fa-solid fa-magnifying-glass mr-1.5"></i>
                            )}
                            Buscar
                        </button>
                    </form>

                    {error && (
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50/50 border border-red-100 rounded-xl p-3 animate-pulse">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                            <span>{error}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading placeholder (hidden in print) */}
            {loading && (
                <div className="no-print py-16 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#FE8204]/20 border-t-[#FE8204] rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest animate-pulse">Consultando registros...</span>
                </div>
            )}

            {/* Initial state placeholder (hidden in print) */}
            {!loading && !agentData && !error && (
                <div className="no-print py-16 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center text-center p-8 bg-white/40">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 text-2xl mb-4">
                        <i className="fa-solid fa-file-invoice"></i>
                    </div>
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Esperando consulta</h3>
                    <p className="text-xs text-gray-400 font-semibold max-w-sm mt-2 leading-relaxed">
                        Ingresa un número de DNI arriba para realizar la auditoría, consolidar incompatibilidades y generar el reporte PDF.
                    </p>
                </div>
            )}

            {/* Audit Report Container */}
            {agentData && (
                <div className="print-report-container bg-white border border-gray-150 rounded-[32px] shadow-sm p-8 md:p-10 relative">
                    
                    {/* Floating print button (hidden in print) */}
                    <div className="no-print absolute top-6 right-6 flex gap-2">
                        <button
                            id="print-pdf-button"
                            onClick={handlePrint}
                            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-cyan-500/20 hover:shadow-lg active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                            <i className="fa-solid fa-print"></i>
                            Imprimir / Guardar PDF
                        </button>
                    </div>

                    {/* Report Header Logo & Title */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-gray-100 pb-8 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FE8204] to-[#ff5e00] flex items-center justify-center text-white shadow-md shadow-[#FE8204]/20">
                                <i className="fa-solid fa-graduation-cap text-2xl"></i>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">SIAME</h2>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 block leading-none">
                                    Ministerio de Educación
                                </span>
                            </div>
                        </div>
                        <div className="text-left md:text-right">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Reporte Único de Auditoría</h3>
                            <span className="text-xs text-gray-400 font-semibold block mt-1">
                                Fecha de Emisión: {new Date().toLocaleDateString('es-AR')}
                            </span>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="mt-8">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#FE8204] mb-4 flex items-center gap-1.5">
                            <i className="fa-solid fa-user-shield"></i>
                            1. Datos del Agente
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                            <div>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Nombre Completo</span>
                                <span className="text-sm font-black text-gray-800 mt-1 block">{agentData.nombre_agente}</span>
                            </div>
                            <div>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Documento (DNI)</span>
                                <span className="text-sm font-black text-gray-800 mt-1 block">{agentData.dni}</span>
                            </div>
                            <div>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Género</span>
                                <span className="text-sm font-black text-gray-800 mt-1 block">{agentData.genero === 'F' ? 'Femenino' : 'Masculino'}</span>
                            </div>
                            <div>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Legajo Principal</span>
                                <span className="text-sm font-black text-gray-800 mt-1 block">{agentData.legajo || 'No especificado'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Workload Metrics */}
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="border border-gray-100 rounded-2xl p-6 bg-white flex justify-between items-center shadow-sm">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Cargos Activos</span>
                                <span className="text-xl font-black text-gray-800 mt-1.5 block">{agentData.cargos_count} plazas</span>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-lg">
                                <i className="fa-solid fa-briefcase"></i>
                            </div>
                        </div>
                        <div className="border border-gray-100 rounded-2xl p-6 bg-white flex justify-between items-center shadow-sm">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Horas Registradas</span>
                                <span className="text-xl font-black text-gray-800 mt-1.5 block">{(agentData.total_horas_catedra ?? 0)} hs</span>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center text-lg">
                                <i className="fa-solid fa-clock"></i>
                            </div>
                        </div>
                        <div className="border border-gray-100 rounded-2xl p-6 bg-white flex justify-between items-center shadow-sm">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Horas Licenciadas</span>
                                <span className="text-xl font-black text-purple-600 mt-1.5 block">{(agentData.auditoria.horas_licenciadas ?? 0)} hs</span>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center text-lg">
                                <i className="fa-solid fa-hospital-user"></i>
                            </div>
                        </div>
                        <div className="border border-gray-100 rounded-2xl p-6 bg-white flex justify-between items-center shadow-sm">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Horas Activas Netas</span>
                                <span className={`text-xl font-black mt-1.5 block ${
                                    (agentData.auditoria.horas_activas_netas ?? 0) > 50 ? 'text-red-650' : 'text-emerald-650'
                                }`}>{(agentData.auditoria.horas_activas_netas ?? 0)} hs</span>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${
                                (agentData.auditoria.horas_activas_netas ?? 0) > 50 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'
                            }`}>
                                <i className="fa-solid fa-user-check"></i>
                            </div>
                        </div>
                    </div>

                    {/* Warnings and Incompatibilities Alerts */}
                    <div className="mt-8">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#FE8204] mb-4 flex items-center gap-1.5">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                            2. Diagnóstico de Incompatibilidades y Alertas
                        </h4>
                        
                        <div className="space-y-3">
                            {/* Hours Audit Alert - 3 States */}
                            {agentData.auditoria.status_auditoria === 'incompatibilidad_critica' ? (
                                <div className="flex gap-4 p-5 rounded-2xl bg-red-50/50 border border-red-100 text-red-900">
                                    <div className="text-red-500 text-xl mt-0.5">
                                        <i className="fa-solid fa-circle-exclamation animate-bounce"></i>
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-black uppercase tracking-wider">Incompatibilidad Horaria Crítica</h5>
                                        <p className="text-xs font-semibold text-gray-650 mt-1 leading-relaxed">
                                            El docente acumula un total de <strong>{agentData.total_horas_catedra} horas registradas</strong> de manera totalmente activa (sin licencias vigentes hoy), excediendo el límite estatutario permitido de 50 horas en <strong>{agentData.total_horas_catedra - 50} horas</strong>. Se requiere citación inmediata para opción de cargos.
                                        </p>
                                    </div>
                                </div>
                            ) : agentData.auditoria.status_auditoria === 'exceso_justificado' ? (
                                <div className="flex gap-4 p-5 rounded-2xl bg-amber-50/50 border border-amber-100 text-amber-900">
                                    <div className="text-amber-500 text-xl mt-0.5">
                                        <i className="fa-solid fa-circle-info"></i>
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-black uppercase tracking-wider">Exceso de Horas Justificado por Licencia</h5>
                                        <p className="text-xs font-semibold text-gray-650 mt-1 leading-relaxed">
                                            El docente registra <strong>{agentData.total_horas_catedra} horas de cátedra</strong>, superando el límite de 50 horas, pero cuenta con licencias vigentes hoy que reducen su carga activa efectiva a <strong>{agentData.auditoria.horas_activas_netas} horas</strong>. La situación se encuentra justificada administrativamente.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-4 p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100 text-emerald-900">
                                    <div className="text-emerald-500 text-xl mt-0.5">
                                        <i className="fa-solid fa-circle-check"></i>
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-black uppercase tracking-wider">Carga Horaria Regular</h5>
                                        <p className="text-xs font-semibold text-gray-650 mt-1 leading-relaxed">
                                            El agente posee una carga horaria total de <strong>{agentData.total_horas_catedra} horas</strong>, cumpliendo con los límites de compatibilidad regulados.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Multi-school / geographic dispersion alert */}
                            {Object.keys(agentData.escuelas_fisicas || {}).length > 2 && (
                                <div className="flex gap-4 p-5 rounded-2xl bg-amber-50/50 border border-amber-100 text-amber-900">
                                    <div className="text-amber-500 text-xl mt-0.5">
                                        <i className="fa-solid fa-map-pin"></i>
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-black uppercase tracking-wider">Alta Dispersión Geográfica</h5>
                                        <p className="text-xs font-semibold text-gray-650 mt-1 leading-relaxed">
                                            El agente cumple funciones simultáneas en <strong>{Object.keys(agentData.escuelas_fisicas).length} establecimientos educativos diferentes</strong>. Esto incrementa significativamente el riesgo de superposición horaria por tiempos de traslado físico entre escuelas.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Active Leave Alert */}
                            {agentData.auditoria.tiene_licencia_activa && (
                                <div className="flex gap-4 p-5 rounded-2xl bg-purple-50/50 border border-purple-100 text-purple-900">
                                    <div className="text-purple-500 text-xl mt-0.5">
                                        <i className="fa-solid fa-hospital-user"></i>
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-black uppercase tracking-wider">Trámite de Licencia Activo</h5>
                                        <p className="text-xs font-semibold text-gray-650 mt-1 leading-relaxed">
                                            El agente posee un total de <strong>{agentData.auditoria.licencias_activas.length} licencia(s) vigentes</strong> en la fecha de hoy. Las licencias vigentes justifican un total de <strong>{agentData.auditoria.horas_licenciadas} horas</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Cargos Table */}
                    <div className="mt-10 page-break">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#FE8204] mb-4 flex items-center gap-1.5">
                            <i className="fa-solid fa-users-viewfinder"></i>
                            3. Detalle de Cargos en Planta Activa
                        </h4>
                        <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100">
                                            <th className="px-5 py-4">Sec/Centro</th>
                                            <th className="px-5 py-4">Establecimiento</th>
                                            <th className="px-5 py-4">CUPOF</th>
                                            <th className="px-5 py-4 text-center">Horas</th>
                                            <th className="px-5 py-4">Turno</th>
                                            <th className="px-5 py-4">Revista</th>
                                            <th className="px-5 py-4">Norma Legal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-xs text-gray-750">
                                        {agentData.cargos.map((cargo, idx) => (
                                            <tr key={cargo.id || idx} className="hover:bg-gray-50/40">
                                                <td className="px-5 py-4 font-black">{cargo.centro || 'N/A'}</td>
                                                <td className="px-5 py-4 font-semibold text-gray-900 leading-snug">
                                                    {cargo.establecimiento}
                                                    {cargo.cue && <span className="block text-[10px] text-gray-400 mt-0.5">CUE: {cargo.cue}</span>}
                                                </td>
                                                <td className="px-5 py-4 font-medium text-gray-500 font-mono">{cargo.cupof}</td>
                                                <td className="px-5 py-4 font-black text-center text-gray-900">{cargo.horas_catedra ?? 0} Hs.</td>
                                                <td className="px-5 py-4 font-semibold text-gray-500 uppercase tracking-wider">{cargo.turno || 'N/A'}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        cargo.situacion_revista === 'TITULAR'
                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                            : cargo.situacion_revista === 'INTERINO'
                                                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                    }`}>
                                                        {cargo.situacion_revista}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 font-medium text-gray-500">{cargo.norma_legal || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Licencias Section (if any) */}
                    {agentData.licencias && agentData.licencias.length > 0 && (
                        <div className="mt-10 page-break">
                            <h4 className="text-xs font-black uppercase tracking-widest text-[#FE8204] mb-4 flex items-center gap-1.5">
                                <i className="fa-solid fa-file-medical"></i>
                                4. Trámites de Licencias Médicas / Especiales
                            </h4>
                            <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100">
                                                <th className="px-5 py-4">ID Trámite</th>
                                                <th className="px-5 py-4">Tipo de Licencia</th>
                                                <th className="px-5 py-4">Desde</th>
                                                <th className="px-5 py-4">Hasta</th>
                                                <th className="px-5 py-4 text-center">Días</th>
                                                <th className="px-5 py-4">Documento Respaldo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-xs text-gray-750">
                                            {agentData.licencias.map((lic, idx) => (
                                                <tr key={lic.id || idx} className="hover:bg-gray-50/40">
                                                    <td className="px-5 py-4 font-black">{lic.id_tramite || 'N/A'}</td>
                                                    <td className="px-5 py-4 font-semibold text-gray-900 leading-snug">{lic.tipo_licencia}</td>
                                                    <td className="px-5 py-4 font-medium text-gray-500">{formatDate(lic.fecha_inicio)}</td>
                                                    <td className="px-5 py-4 font-medium text-gray-500">{formatDate(lic.fecha_fin)}</td>
                                                    <td className="px-5 py-4 font-black text-center text-gray-900">{lic.dias} días</td>
                                                    <td className="px-5 py-4 font-medium text-gray-500">{lic.documento_respaldo || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Designaciones Section (if any) */}
                    {agentData.designaciones && agentData.designaciones.length > 0 && (
                        <div className="mt-10 page-break">
                            <h4 className="text-xs font-black uppercase tracking-widest text-[#FE8204] mb-4 flex items-center gap-1.5">
                                <i className="fa-solid fa-briefcase"></i>
                                5. Registro Histórico de Designaciones
                            </h4>
                            <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100">
                                                <th className="px-5 py-4">Establecimiento</th>
                                                <th className="px-5 py-4">CUPOF</th>
                                                <th className="px-5 py-4 text-center">Horas</th>
                                                <th className="px-5 py-4">Fecha Alta</th>
                                                <th className="px-5 py-4">Situación Revista</th>
                                                <th className="px-5 py-4">Norma Legal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-xs text-gray-750">
                                            {agentData.designaciones.map((des, idx) => (
                                                <tr key={des.id || idx} className="hover:bg-gray-50/40">
                                                    <td className="px-5 py-4 font-semibold text-gray-900 leading-snug">
                                                        {des.establecimiento}
                                                        {des.cue && <span className="block text-[10px] text-gray-400 mt-0.5">CUE: {des.cue}</span>}
                                                    </td>
                                                    <td className="px-5 py-4 font-medium text-gray-500 font-mono">{des.cupof}</td>
                                                    <td className="px-5 py-4 font-black text-center text-gray-900">{des.horas_catedra ?? 0} Hs.</td>
                                                    <td className="px-5 py-4 font-medium text-gray-500">{formatDate(des.fecha_alta)}</td>
                                                    <td className="px-5 py-4">
                                                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-50 text-gray-600 border border-gray-100">
                                                            {des.situacion_revista}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 font-medium text-gray-500">{des.norma_legal || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Report Footer */}
                    <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider gap-4">
                        <div>
                            SIAME — Plataforma de Auditoría Educativa
                        </div>
                        <div>
                            © {new Date().getFullYear()} Ministerio de Educación. Todos los derechos reservados.
                        </div>
                    </div>
                </div>
            )}
        </SIAMELayout>
    );
}
