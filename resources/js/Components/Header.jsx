import React from 'react';
import { usePage } from '@inertiajs/react';
import { useGlobal } from '../Context/GlobalContext';

export const Header = () => {
  const { url, props } = usePage();
  const user = props.auth?.user;
  
  const { stats, refreshAll, loadingStats, loadingAnalytics, loadingTraslados } = useGlobal();

  const getPageMeta = () => {
    if (url === '/dashboard' || url === '/') {
      return {
        title: 'Tablero de Control e Instrumentación de Agentes',
        subtitle: 'Ministerio de Educación - Planificación e Instrumentación Docente'
      };
    } else if (url.startsWith('/agentes')) {
      return {
        title: 'Buscador y Padrón Unificado de Agentes',
        subtitle: 'Resultados de búsqueda con DNI consolidados y cargos activos'
      };
    } else if (url.startsWith('/licencias')) {
      return {
        title: 'Padrón Unificado de Licencias Médicas',
        subtitle: 'Movimientos y justificaciones de inasistencia por DNI'
      };
    } else if (url.startsWith('/designaciones')) {
      return {
        title: 'Cargos en Designaciones Oficiales',
        subtitle: 'Cruce de planta oficial autorizada en designaciones'
      };
    } else if (url.startsWith('/traslados')) {
      return {
        title: 'Auditoría de Traslados y Dispersión Geográfica',
        subtitle: 'Cálculo ortodrómico real mediante geolocalización satelital de establecimientos'
      };
    } else if (url.startsWith('/auditoria')) {
      return {
        title: 'Tablero Avanzado de Auditoría de Datos e Integridad',
        subtitle: 'Cruce, consistencia de DNI e integridad de bases de datos SQLite oficiales'
      };
    } else if (url.startsWith('/importar')) {
      return {
        title: 'Carga y Actualización del Repositorio de Datos',
        subtitle: 'Panel administrativo para la subida de planillas CSV e importación'
      };
    } else {
      return {
        title: 'SIAME - Sistema Integral Agentes',
        subtitle: 'Sistema Integral Agentes Ministerio de Educación'
      };
    }
  };

  const meta = getPageMeta();
  const isRefreshing = loadingStats || loadingAnalytics || loadingTraslados;

  const displayRole = user?.role === 'admin' ? 'Administrador' : 'Administrativo';

  return (
    <header className="bg-white border-b border-gray-100 px-10 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 z-20 sticky top-0 backdrop-blur-md bg-white/95">
      {/* Page Title & Badges */}
      <div className="flex-1 flex flex-col gap-1.5">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
          {meta.title}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs font-semibold text-gray-400">
            {meta.subtitle}
          </p>
          {stats?.registro_mas_reciente && (
            <div className="text-[10px] px-3 py-1 bg-cyan-50/50 text-cyan-600 border border-cyan-100 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
              <i className="fa-solid fa-server text-[9px]"></i>
              ODS Sincronizado
              <span className="text-cyan-400">|</span>
              Alta Reciente: <strong className="text-cyan-700">{stats.registro_mas_reciente}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Profile & Refresh Action */}
      <div className="flex items-center gap-6 self-end md:self-auto">
        <button
          onClick={refreshAll}
          disabled={isRefreshing}
          className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          title="Sincronizar base de datos"
        >
          <i className={`fa-solid fa-arrows-rotate text-sm ${isRefreshing ? 'fa-spin text-[#FE8204]' : ''}`}></i>
        </button>

        <div className="h-8 w-px bg-gray-100"></div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-xs font-black text-gray-900">{user?.name || 'Usuario'}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{displayRole}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 shadow-sm text-lg">
            <i className={`fa-solid ${user?.role === 'admin' ? 'fa-user-tie' : 'fa-user-gear'}`}></i>
          </div>
        </div>
      </div>
    </header>
  );
};
