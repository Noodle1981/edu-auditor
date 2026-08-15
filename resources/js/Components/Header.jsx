import { Link, usePage, router } from '@inertiajs/react';

export const Header = () => {
  const { url, props } = usePage();
  const user = props.auth?.user;

  const getPageMeta = () => {
    if (url.startsWith('/auditoria-sueldos')) {
      return { title: 'Auditoría de Sueldos y Liquidaciones' };
    } else if (url.startsWith('/mapa-sueldos')) {
      return { title: 'Mapa Salarial (Sueldos vs SIGE)' };
    } else if (url.startsWith('/mapa')) {
      return { title: 'Mapa Escolar (Geográfico)' };
    } else if (url.startsWith('/admin/importar')) {
      return { title: 'Carga y Actualización de Datos' };
    } else {
      return { title: 'Auditoría de Sueldos y Liquidaciones' };
    }
  };

  const handlePeriodoChange = (e) => {
    const periodo = e.target.value;
    router.get('/auditoria-sueldos', { periodo }, { preserveState: false });
  };

  const meta = getPageMeta();

  const displayRole = user?.role === 'admin' ? 'Administrador' : 'Administrativo';

  return (
    <header className="fixed top-0 left-0 w-full h-[60px] bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 z-40 shadow-xs backdrop-blur-md bg-white/95">
      {/* Left: Official Logo + Page Title */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        <Link href="/auditoria-sueldos" title="Ministerio de Educación - Gobierno de San Juan" className="shrink-0 flex items-center">
          <img src="/logoMinisterio.png" alt="Ministerio de Educación" className="h-8 sm:h-9 md:h-10 w-auto object-contain" />
        </Link>
        <div className="h-7 w-px bg-slate-200 hidden sm:block"></div>
        <h1 className="text-xs sm:text-base md:text-lg font-black text-[#1A1A1C] tracking-tight leading-tight truncate max-w-[170px] sm:max-w-none">
          {meta.title}
        </h1>
      </div>

      {/* Center: Period Selector (only if nominas is present) */}
      {props.nominas && props.nominas.length > 0 && (
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 shadow-xs">
            <i className="fa-solid fa-calendar-days text-[#FE8204] text-xs"></i>
            <select
              value={props.nominaSeleccionada?.periodo || ''}
              onChange={handlePeriodoChange}
              className="bg-white border border-slate-300 text-[#1A1A1C] text-xs font-bold rounded-lg focus:ring-[#FE8204] focus:border-[#FE8204] block px-2.5 py-0.5 cursor-pointer outline-none"
            >
              {props.nominas.map((n) => (
                <option key={n.id} value={n.periodo}>
                  Mayo {n.periodo.split('-')[0]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Right: Profile Icon + Tooltip & Logout Action */}
      <div className="flex items-center gap-4 self-end md:self-auto">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div
              className="w-10 h-10 rounded-xl bg-[#FE8204] border border-[#E07000]/30 flex items-center justify-center text-white shadow-sm text-lg cursor-pointer hover:bg-[#E07000] active:scale-95 transition-all"
            >
              <i className={`fa-solid ${user?.role === 'admin' ? 'fa-user-tie' : 'fa-user-gear'}`}></i>
            </div>

            {/* Globo de Información en Hover */}
            <div className="absolute right-0 top-full mt-2.5 hidden group-hover:flex flex-col bg-white text-slate-900 border border-slate-200 shadow-xl rounded-xl px-4 py-2.5 z-50 whitespace-nowrap animate-fade-in pointer-events-none min-w-[140px]">
              <div className="absolute -top-1.5 right-3.5 w-3 h-3 bg-white border-t border-l border-slate-200 rotate-45"></div>
              <span className="text-xs font-black text-slate-900 leading-tight">{user?.name || 'Usuario'}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{displayRole}</span>
            </div>
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
