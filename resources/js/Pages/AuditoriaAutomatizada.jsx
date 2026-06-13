import React, { useState } from 'react';
import SIAMELayout from '@/Layouts/SIAMELayout';
import { Head } from '@inertiajs/react';

export default function AuditoriaAutomatizada() {
    const [dni, setDni] = useState('');
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        const cleanDni = dni.trim();
        if (!cleanDni) return;

        setLoading(true);
        setError(null);
        setReportData(null);

        try {
            const res = await fetch(`/api/agentes/${cleanDni}/analisis-local`);
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error('No se encontró ningún agente con el DNI ingresado.');
                }
                throw new Error('Ocurrió un error al generar el diagnóstico de auditoría.');
            }
            const data = await res.json();
            setReportData(data.report);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const parseBoldText = (text) => {
        const parts = text.split('**');
        return parts.map((part, idx) => {
            if (idx % 2 === 1) {
                return <strong key={idx} className="font-black text-gray-900">{part}</strong>;
            }
            return part;
        });
    };

    const renderMarkdown = (text) => {
        if (!text) return null;
        const lines = text.split('\n');
        return lines.map((line, idx) => {
            let cleanLine = line.trim();
            
            // Headers
            if (cleanLine.startsWith('###')) {
                return <h4 key={idx} className="text-xs font-black text-gray-800 uppercase tracking-wider mt-4 mb-2 flex items-center gap-1">{cleanLine.replace('###', '').trim()}</h4>;
            }
            if (cleanLine.startsWith('##')) {
                return <h3 key={idx} className="text-sm font-black text-[#FE8204] uppercase tracking-widest mt-6 mb-3 border-b border-gray-150 pb-1.5">{cleanLine.replace('##', '').trim()}</h3>;
            }
            if (cleanLine.startsWith('#')) {
                return <h2 key={idx} className="text-lg font-black text-gray-900 tracking-tight mt-8 mb-4">{cleanLine.replace('#', '').trim()}</h2>;
            }
            
            // Bullet points
            if (cleanLine.startsWith('-') || cleanLine.startsWith('*')) {
                const content = cleanLine.substring(1).trim();
                return (
                    <li key={idx} className="ml-5 list-disc text-xs text-gray-600 mb-1.5 leading-relaxed">
                        {parseBoldText(content)}
                    </li>
                );
            }

            // Ordered list
            if (/^\d+\./.test(cleanLine)) {
                const content = cleanLine.replace(/^\d+\./, '').trim();
                return (
                    <li key={idx} className="ml-5 list-decimal text-xs text-gray-600 mb-1.5 leading-relaxed">
                        {parseBoldText(content)}
                    </li>
                );
            }
            
            // Paragraph
            if (cleanLine === '') {
                return <div key={idx} className="h-3"></div>;
            }
            
            return <p key={idx} className="text-xs text-gray-650 leading-relaxed mb-2">{parseBoldText(cleanLine)}</p>;
        });
    };

    return (
        <SIAMELayout>
            <Head>
                <title>Auditoría Automatizada de Agente</title>
                <meta name="description" content="Reporte de incompatibilidades y auditoría reglada local." />
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
                }
            `}} />

            {/* Search header (hidden in print) */}
            <div className="no-print mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    Auditoría Automatizada de Agente
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/8 border border-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-wider">Local</span>
                </h1>
                <p className="text-sm text-gray-500 font-semibold mt-1">
                    Diagnóstico inmediato de incompatibilidades horarias, superposición geográfica y discrepancias en base de datos.
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
                                placeholder="Ingresa DNI del agente (ej. 34697263)"
                                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-900 focus:border-[#FE8204] focus:ring-[#FE8204] focus:ring-1 outline-none transition-all duration-200"
                                required
                            />
                        </div>
                        <button
                            id="dni-search-submit"
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-emerald-500/25 hover:shadow-lg hover:from-teal-600 hover:to-emerald-700 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                        >
                            {loading ? (
                                <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                                <i className="fa-solid fa-bolt"></i>
                            )}
                            Analizar
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
                <div className="no-print py-16 flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                        <i className="fa-solid fa-bolt absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 text-lg animate-pulse"></i>
                    </div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest animate-pulse">Generando Reporte de Auditoría...</span>
                </div>
            )}

            {/* Initial state placeholder (hidden in print) */}
            {!loading && !reportData && !error && (
                <div className="no-print py-16 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center text-center p-8 bg-white/40">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-emerald-500 text-2xl mb-4 shadow-sm">
                        <i className="fa-solid fa-magnifying-glass-chart"></i>
                    </div>
                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Esperando DNI</h3>
                    <p className="text-xs text-gray-400 font-semibold max-w-sm mt-2 leading-relaxed">
                        Ingresa el DNI del docente arriba. El sistema recopilará sus cargos, designaciones y licencias de forma automática para generar un informe de auditoría instantáneo.
                    </p>
                </div>
            )}

            {/* Report Content */}
            {reportData && (
                <div className="space-y-8">
                    {/* Printable Report Wrapper */}
                    <div className="print-report-container bg-white border border-gray-150 rounded-[32px] shadow-sm p-8 md:p-10 relative">
                        {/* Print action button (hidden in print) */}
                        <div className="no-print absolute top-6 right-6">
                            <button
                                onClick={handlePrint}
                                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-cyan-500/20 hover:shadow-lg active:scale-95 cursor-pointer flex items-center gap-1.5"
                            >
                                <i className="fa-solid fa-file-pdf"></i>
                                Descargar Reporte PDF
                            </button>
                        </div>

                        {/* Report Header Logo & Title */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-gray-100 pb-8 gap-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                                    <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">SIAME Automatizado</h2>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 block leading-none">
                                        Auditoría Reglamentaria Local
                                    </span>
                                </div>
                            </div>
                            <div className="text-left md:text-right">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Informe de Auditoría</h3>
                                <span className="text-xs text-gray-400 font-semibold block mt-1">
                                    Motor de Reglas SIAME
                                </span>
                            </div>
                        </div>

                        {/* Report Body */}
                        <div className="prose max-w-none text-xs">
                            {renderMarkdown(reportData)}
                        </div>

                        {/* Report Footer */}
                        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            <div>
                                SIAME — Ministerio de Educación
                            </div>
                            <div>
                                Generado: {new Date().toLocaleDateString('es-AR')}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </SIAMELayout>
    );
}
