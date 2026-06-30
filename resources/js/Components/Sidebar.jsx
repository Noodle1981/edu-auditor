import React from 'react';
import { Link, usePage } from '@inertiajs/react';

export const Sidebar = () => {
  const { url, props } = usePage();
  const user = props.auth?.user;
  const isAdmin = user && user.role === 'admin';

  const menuItems = isAdmin
    ? [
        { href: '/admin/importar', label: 'Cargar Datos', icon: 'fa-solid fa-cloud-arrow-up' },
        { href: '/admin/edificios', label: 'Gestión Edificios', icon: 'fa-solid fa-building' },
        { href: '/admin/establecimientos', label: 'Gestión Establecimientos', icon: 'fa-solid fa-school-flag' },
        { href: '/establecimientos', label: 'Establecimientos', icon: 'fa-solid fa-school' },
        { href: '/mapa', label: 'Mapa Escolar', icon: 'fa-solid fa-map-location-dot' },
        { href: '/auditoria-automatizada', label: 'Auditoría Automatizada', icon: 'fa-solid fa-wand-magic-sparkles' }
      ]
    : [
        { href: '/establecimientos', label: 'Establecimientos', icon: 'fa-solid fa-school' },
        { href: '/mapa', label: 'Mapa Escolar', icon: 'fa-solid fa-map-location-dot' },
        { href: '/auditoria-automatizada', label: 'Auditoría Automatizada', icon: 'fa-solid fa-wand-magic-sparkles' },
      ];

  const isActive = (href) => {
    if (href === '/mapa') {
      return url === '/mapa' || url === '/';
    }
    return url === href || url.startsWith(`${href}/`) || url.startsWith(`${href}?`) || url.startsWith(`${href}#`);
  };

  return (
    <div className="w-[72px] shrink-0 h-screen no-print relative">
      <aside className="w-[72px] bg-gradient-to-b from-[#FE8204] to-[#ff5e00] border-r border-[#ff5e00]/10 flex flex-col h-screen fixed top-0 left-0 z-30 shadow-md">
        {/* Sidebar Logo */}
        <div className="p-3 border-b border-white/10 flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#FE8204] shadow-md shrink-0">
            <i className="fa-solid fa-graduation-cap text-2xl"></i>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 py-6 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden items-center">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 cursor-pointer border ${
                  active
                    ? 'bg-white/20 text-white border-white/10 shadow-sm font-bold'
                    : 'text-white/70 hover:text-white hover:bg-white/10 border-transparent'
                }`}
              >
                <i className={`${item.icon} text-lg transition-transform ${active ? 'scale-110 text-white' : 'text-white/60'}`}></i>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
};
