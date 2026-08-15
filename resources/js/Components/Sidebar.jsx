import { Link, usePage } from '@inertiajs/react';

export const Sidebar = () => {
  const { url, props } = usePage();
  const user = props.auth?.user;
  const isAdmin = user && user.role === 'admin';

  const menuItems = isAdmin
    ? [
        { href: '/auditoria-sueldos', label: 'Auditoría de Sueldos', icon: 'fa-solid fa-file-invoice-dollar' },
        { href: '/mapa', label: 'Mapa Escolar (Geográfico)', icon: 'fa-solid fa-map-location-dot' },
        { href: '/mapa-sueldos', label: 'Mapa Salarial (Sueldos)', icon: 'fa-solid fa-money-bill-transfer' },
        { href: '/admin/importar', label: 'Cargar Datos', icon: 'fa-solid fa-cloud-arrow-up' },
        { href: '/admin/edificios', label: 'Gestión Edificios', icon: 'fa-solid fa-building' },
        { href: '/admin/establecimientos', label: 'Gestión Establecimientos', icon: 'fa-solid fa-school-flag' },
        { href: '/admin/oficinas-centrales', label: 'Gestión Oficinas', icon: 'fa-solid fa-briefcase' },
      ]
    : [
        { href: '/auditoria-sueldos', label: 'Auditoría de Sueldos', icon: 'fa-solid fa-file-invoice-dollar' },
        { href: '/mapa', label: 'Mapa Escolar (Geográfico)', icon: 'fa-solid fa-map-location-dot' },
        { href: '/mapa-sueldos', label: 'Mapa Salarial (Sueldos)', icon: 'fa-solid fa-money-bill-transfer' },
      ];

  const isActive = (href) => {
    if (href === '/mapa') {
      return url === '/mapa' || url === '/';
    }
    return url === href || url.startsWith(`${href}/`) || url.startsWith(`${href}?`) || url.startsWith(`${href}#`);
  };

  return (
    <div className="w-[56px] sm:w-[68px] md:w-[72px] shrink-0 no-print">
      <aside className="fixed left-0 top-[60px] w-[56px] sm:w-[68px] md:w-[72px] h-[calc(100vh-60px)] bg-[#FE8204] border-r border-[#E07000]/20 flex flex-col z-30 shadow-md">
        {/* Sidebar Navigation */}
        <nav className="flex-1 px-2.5 py-6 flex flex-col gap-2.5 overflow-y-auto custom-scrollbar overflow-x-hidden items-center">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 cursor-pointer border ${
                  active
                    ? 'bg-white text-[#FE8204] border-white shadow-md font-bold'
                    : 'text-white/80 hover:text-white hover:bg-white/15 border-transparent'
                }`}
              >
                <i className={`${item.icon} text-lg transition-transform ${active ? 'scale-110 text-[#FE8204]' : 'text-white'}`}></i>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
};
