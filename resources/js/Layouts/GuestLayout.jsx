import React from 'react';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#fcfcfc] relative px-4 py-12 overflow-hidden">
            {/* Background decorative gradients */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#FE8204]/6 to-transparent rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/4 to-transparent rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md flex flex-col items-center relative z-10">
                {/* Header Logo */}
                <div className="mb-8 flex flex-col items-center gap-3">
                    <Link href="/" className="group flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FE8204] to-[#ff5e00] flex items-center justify-center text-white shadow-lg shadow-[#FE8204]/20 group-hover:scale-105 transition-transform duration-300">
                            <i className="fa-solid fa-graduation-cap text-3xl"></i>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-black text-gray-900 tracking-tight leading-none">SIAME</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 leading-none">
                                Sistema Integral de Agentes
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Premium Glassmorphic Card */}
                <div className="w-full bg-white border border-gray-100 rounded-[32px] shadow-xl p-8">
                    {children}
                </div>

                {/* Footer note */}
                <div className="mt-8 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                    Ministerio de Educación
                </div>
            </div>
        </div>
    );
}
