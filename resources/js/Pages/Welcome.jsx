import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="Bienvenido" />
            <div className="min-h-screen bg-[#fcfcfc] text-[#1a1a1c] relative flex flex-col justify-between overflow-x-hidden">
                {/* Background decorative gradients */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#FE8204]/8 to-transparent rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/5 to-transparent rounded-full blur-[120px] pointer-events-none"></div>

                {/* Navbar */}
                <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FE8204] to-[#ff5e00] flex items-center justify-center text-white shadow-md shadow-[#FE8204]/20">
                            <i className="fa-solid fa-graduation-cap text-xl"></i>
                        </div>
                        <span className="text-lg font-black tracking-tight text-gray-900">SIAME</span>
                    </div>

                    <nav className="flex items-center gap-4">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FE8204] to-[#ff5e00] hover:from-[#ff5e00] hover:to-[#e04f00] text-white text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-[#FE8204]/25 hover:shadow-lg active:scale-95 cursor-pointer"
                            >
                                Ir al Tablero General <i className="fa-solid fa-arrow-right ml-1.5"></i>
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="px-5 py-2.5 rounded-xl bg-white border border-gray-150 hover:bg-gray-50 text-gray-700 text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
                                >
                                    Iniciar Sesión
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FE8204] to-[#ff5e00] hover:from-[#ff5e00] hover:to-[#e04f00] text-white text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md shadow-[#FE8204]/25 hover:shadow-lg active:scale-95 cursor-pointer"
                                >
                                    Registrarse
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                {/* Hero Section */}
                <main className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col justify-center items-center py-12 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FE8204]/8 border border-[#FE8204]/10 text-[#FE8204] text-[10px] font-black uppercase tracking-wider mb-6 animate-pulse">
                        <i className="fa-solid fa-sparkles"></i>
                        <span>Monolito Unificado Laravel + React</span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-none max-w-4xl">
                        Auditoría Inteligente de{' '}
                        <span className="bg-gradient-to-r from-[#FE8204] to-[#ff5e00] bg-clip-text text-transparent">
                            Planta y Licencias
                        </span>
                    </h1>

                    <p className="mt-6 text-sm sm:text-base text-gray-500 font-semibold max-w-2xl leading-relaxed">
                        Optimización, control de incompatibilidades horarias, geolocalización de establecimientos y cruce de datos en tiempo real para el Ministerio de Educación.
                    </p>

                    <div className="mt-8 flex gap-4">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FE8204] to-[#ff5e00] text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-[#FE8204]/20 active:scale-95 cursor-pointer"
                            >
                                Acceder al Panel
                            </Link>
                        ) : (
                            <Link
                                href={route('login')}
                                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FE8204] to-[#ff5e00] text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-[#FE8204]/20 active:scale-95 cursor-pointer"
                            >
                                Comenzar <i className="fa-solid fa-arrow-right-to-bracket ml-2"></i>
                            </Link>
                        )}
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full mt-20 text-left">
                        {[
                          {
                            title: 'Tablero General',
                            desc: 'Estadísticas unificadas de cargos, géneros, niveles y distribución de personal por CUE.',
                            icon: 'fa-chart-pie',
                            color: 'text-cyan-500 bg-cyan-50/60'
                          },
                          {
                            title: 'Control de Licencias',
                            desc: 'Detección automática de solapamientos temporales y alertas de carga fuera de término.',
                            icon: 'fa-file-medical',
                            color: 'text-purple-500 bg-purple-50/60'
                          },
                          {
                            title: 'Dispersión Geográfica',
                            desc: 'Auditoría física de trayectos inter-escuelas basada en coordenadas satelitales.',
                            icon: 'fa-map-location-dot',
                            color: 'text-emerald-500 bg-emerald-50/60'
                          },
                          {
                            title: 'Cruce de Datos',
                            desc: 'Validación de incompatibilidades horarias superiores a 50 horas cátedra reglamentarias.',
                            icon: 'fa-scale-balanced',
                            color: 'text-amber-500 bg-amber-50/60'
                          }
                        ].map((feat, idx) => (
                          <div 
                            key={idx}
                            className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group"
                          >
                            <div className={`w-12 h-12 rounded-2xl ${feat.color} flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform`}>
                                <i className={`fa-solid ${feat.icon}`}></i>
                            </div>
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">{feat.title}</h4>
                            <p className="mt-3 text-xs text-gray-400 font-semibold leading-relaxed">{feat.desc}</p>
                          </div>
                        ))}
                    </div>
                </main>

                {/* Footer */}
                <footer className="w-full border-t border-gray-100 py-6 text-center text-xs text-gray-400 font-bold uppercase tracking-wider relative z-10 bg-white/20 backdrop-blur-sm">
                    © {new Date().getFullYear()} SIAME — Ministerio de Educación. Todos los derechos reservados.
                </footer>
            </div>
        </>
    );
}
