import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useGlobal } from '../Context/GlobalContext';

export const Header = () => {
  const { url, props } = usePage();
  const user = props.auth?.user;
  
  const { activeYear, setActiveYear, stats, refreshAll, loadingStats, loadingAnalytics, loadingTraslados } = useGlobal();

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
    } else if (url.startsWith('/auditoria') || url.startsWith('/agentes') || url.startsWith('/licencias') || url.startsWith('/designaciones') || url.startsWith('/traslados') || url.startsWith('/auditoria-unica')) {
      return {
        title: 'Centro de Auditoría y Control',
        subtitle: 'Consolidación centralizada de cargos, licencias, designaciones, traslados e incompatibilidades'
      };
    } else if (url.startsWith('/importar')) {
      return {
        title: 'Carga y Actualización del Repositorio de Datos',
        subtitle: 'Panel administrativo para la subida de planillas CSV/Excel e importación'
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
              ODS Sincronizado ({activeYear})
              <span className="text-cyan-400">|</span>
              Alta Reciente: <strong className="text-cyan-700">{stats.registro_mas_reciente}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Profile & Refresh Action */}
      <div className="flex items-center gap-6 self-end md:self-auto">
        {/* Year Select Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Año Lectivo</span>
          <select
            value={activeYear}
            onChange={(e) => setActiveYear(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-100 hover:border-gray-200 rounded-xl text-xs font-black text-gray-700 focus:outline-none cursor-pointer transition-all shadow-sm"
          >
            <option value="2027">2027</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
          </select>
        </div>

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
          
          <Link
            href={route('logout')}
            method="post"
            as="button"
            className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100/50 flex items-center justify-center text-red-500 hover:text-red-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Cerrar sesión"
          >
            <i className="fa-solid fa-right-from-bracket text-sm"></i>
          </Link>
        </div>
      </div>
    </header>
  );
};
