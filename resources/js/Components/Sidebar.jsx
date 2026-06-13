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
    { href: '/auditoria-unica', label: 'Auditoría Única', icon: 'fa-solid fa-file-shield' },
    { href: '/auditoria-automatizada', label: 'Auditoría Automatizada', icon: 'fa-solid fa-wand-magic-sparkles' },
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
    <div className="w-[72px] shrink-0 h-screen no-print relative">
      <aside className="w-[72px] hover:w-64 bg-gradient-to-b from-[#FE8204] to-[#ff5e00] border-r border-[#ff5e00]/10 flex flex-col h-screen fixed top-0 left-0 z-30 transition-all duration-300 ease-in-out group overflow-x-hidden shadow-md">
        {/* Sidebar Logo */}
        <div className="p-3 border-b border-white/10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#FE8204] shadow-md shrink-0">
            <i className="fa-solid fa-graduation-cap text-2xl"></i>
          </div>
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap select-none">
            <span className="text-xl font-black text-white tracking-tight leading-none">SIAME</span>
            <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1.5 leading-snug">
              Sistema de Agentes
            </span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 py-6 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-[14px] py-4 rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer border ${
                  active
                    ? 'bg-white/20 text-white border-white/10 shadow-sm font-bold'
                    : 'text-white/70 hover:text-white hover:bg-white/10 border-transparent'
                }`}
              >
                <i className={`${item.icon} text-lg transition-transform shrink-0 w-5 text-center ${active ? 'scale-110 text-white' : 'text-white/60'}`}></i>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap select-none">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
};
