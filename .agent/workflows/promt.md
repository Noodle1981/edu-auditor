---
description: Vamos a hacer modificaciones
---

vamos a darle una funcionalidad a http://paradeb_instrumentacion.test/auditoria, para accesos directos a componentes importantes, es decir ahi necesito de http://paradeb_instrumentacion.test/licencias

<button class="px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer transition-all border bg-[#FE8204] text-white border-[#FE8204] shadow-md shadow-[#FE8204]/20">⚖️ Tablero de Auditoría</button> y tambien <button class="px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer transition-all border bg-white text-gray-500 hover:text-gray-900 border-gray-100 hover:bg-gray-50">⚖️ Tablero de Auditoría</button>

de http://paradeb_instrumentacion.test/designaciones necesito 

<button class="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white border border-cyan-100 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800 shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"><i class="fa-solid fa-scale-balanced text-cyan-600"></i> Auditoría de Planta</button>

y 

#app > div > div.flex-1.flex.flex-col.min-w-0 > main > div > div.flex.flex-col.sm\:flex-row.justify-between.items-start.sm\:items-center.gap-4.bg-orange-50\/15.border.border-orange-100\/50.rounded-2xl.p-5.shadow-sm > div.flex.gap-3 > button.px-4.py-2\.5.rounded-xl.text-xs.font-black.uppercase.tracking-wider.bg-white.border.border-blue-100.text-blue-700.hover\:bg-blue-50.hover\:text-blue-800.shadow-sm.active\:scale-95.transition-all.flex.items-center.gap-1\.5.cursor-pointer

es decir que en http://paradeb_instrumentacion.test/auditoria hay que sacar todo y poner lo puse antes, como botones de accesos, te doy la libertad de ponerlo como quieras, aunque te sugeririas cuadros sobre botones, que representen a diferente tipo de auditoria, por ejemplo Designaciones y Licencia,  en donde buscas los botones debes quitarlo de esas vistas, revisar si se pueden usar los mismo controladores