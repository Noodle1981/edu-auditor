import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useGlobal } from '../Context/GlobalContext';

export const Header = () => {
  const { url, props } = usePage();
  const user = props.auth?.user;
  
  const { activeYear, setActiveYear } = useGlobal();

  const getPageMeta = () => {
    if (url === '/dashboard' || url === '/') {
      return {
        title: 'Tablero de Control e Instrumentación de Agentes',
        subtitle: 'Ministerio de Educación - Planificación e Instrumentación Docente'
      };
    } else if (url.startsWith('/auditoria-automatizada')) {
      return {
        title: 'Auditoría Automatizada',
        subtitle: 'Diagnóstico de Perfil Docente y Contexto POF/PON'
      };
    } else if (url.startsWith('/admin/importar')) {
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

        </div>
      </div>

      {/* Profile & Refresh Action */}
      <div className="flex items-center gap-6 self-end md:self-auto">

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
