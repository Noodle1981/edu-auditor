import { Link, usePage, router } from '@inertiajs/react';

export const Header = () => {
  const { url, props } = usePage();
  const user = props.auth?.user;

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

  const handlePeriodoChange = (e) => {
    const periodo = e.target.value;
    router.get('/auditoria-sueldos', { periodo }, { preserveState: false });
  };

  const meta = getPageMeta();

  const displayRole = user?.role === 'admin' ? 'Administrador' : 'Administrativo';

  return (
    <header className="bg-white border-b border-gray-100 px-10 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 z-20 sticky top-0 backdrop-blur-md bg-white/95">
      {/* Left: Page Title & Subtitle */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
          {meta.title}
        </h1>
        <p className="text-xs font-semibold text-gray-400">
          {meta.subtitle}
        </p>
      </div>

      {/* Center: Period Selector (only if nominas is present) */}
      {props.nominas && props.nominas.length > 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
            <i className="fa-solid fa-calendar-days text-[#FE8204] text-xs"></i>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Período:</span>
            <select
              value={props.nominaSeleccionada?.periodo || ''}
              onChange={handlePeriodoChange}
              className="bg-white border border-gray-300 text-gray-900 text-[11px] font-bold rounded-lg focus:ring-[#FE8204] focus:border-[#FE8204] block px-2.5 py-0.5 cursor-pointer outline-none"
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

      {/* Right: Profile & Refresh Action */}
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
