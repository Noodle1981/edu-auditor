import React from 'react';
import { Link, usePage } from '@inertiajs/react';

export const Sidebar = () => {
  const { url, props } = usePage();
  const user = props.auth?.user;
  const isAdmin = user && user.role === 'admin';

  const menuItems = [
    { href: '/dashboard', label: 'Tablero General', icon: 'fa-solid fa-chart-pie' },
    { href: '/agentes', label: 'Buscar Agentes', icon: 'fa-solid fa-users-rectangle' },
    { href: '/licencias', label: 'Buscar Licencias', icon: 'fa-solid fa-file-medical' },
    { href: '/designaciones', label: 'Buscar Designaciones', icon: 'fa-solid fa-briefcase' },
    { href: '/traslados', label: 'Traslados y Distancias', icon: 'fa-solid fa-map-location-dot' },
    { href: '/auditoria', label: 'Auditoría', icon: 'fa-solid fa-scale-balanced' },
  ];

  if (isAdmin) {
    menuItems.push({ href: '/importar', label: 'Cargar Datos', icon: 'fa-solid fa-cloud-arrow-up' });
  }

  const isActive = (href) => {
    if (href === '/dashboard') {
      return url === '/dashboard' || url === '/';
    }
    return url === href || url.startsWith(`${href}/`) || url.startsWith(`${href}?`) || url.startsWith(`${href}#`);
  };

  return (
    <aside className="w-80 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 z-30">
      {/* Sidebar Logo */}
      <div className="p-8 border-b border-gray-50 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FE8204] to-[#ff5e00] flex items-center justify-center text-white shadow-lg shadow-[#FE8204]/30">
          <i className="fa-solid fa-graduation-cap text-2xl"></i>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black text-gray-900 tracking-tight leading-none">SIAME</span>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 leading-snug">
            Sistema Integral de Agentes del Ministerio de Educación
          </span>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer border ${
                active
                  ? 'bg-gradient-to-r from-[#FE8204]/8 to-[#FE8204]/2 text-[#FE8204] border-[#FE8204]/10 shadow-sm shadow-[#FE8204]/5 font-bold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50 border-transparent'
              }`}
            >
              <i className={`${item.icon} text-lg transition-transform ${active ? 'scale-110 text-[#FE8204]' : 'text-gray-400'}`}></i>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-6 border-t border-gray-50 bg-gray-50/30 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>BD Sincronizada (SQLite)</span>
          </div>
          <div className="text-[10px] text-gray-400 font-medium">
            v2.1.0
          </div>
        </div>

        {/* Logout button */}
        <Link
          href="/logout"
          method="post"
          as="button"
          className="w-full px-4 py-2.5 rounded-xl border border-red-100 hover:border-red-200 text-red-500 hover:text-red-700 bg-red-50/50 hover:bg-red-50 text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
        >
          <i className="fa-solid fa-power-off text-sm"></i>
          <span>Cerrar Sesión</span>
        </Link>
      </div>
    </aside>
  );
};
