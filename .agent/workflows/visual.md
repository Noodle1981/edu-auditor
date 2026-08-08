---
description: System Prompt & Reglas de Diseño Visual – 
---

Gobierno de San Juan / Ministerio de Educación
Propósito: Especificar de forma estricta la arquitectura visual, tokens, paleta institucional y jerarquía de UI para las aplicaciones web y sistemas del Ministerio de Educación de San Juan. Toda interfaz generada debe cumplir estas reglas sin excepción.

1. Identidad Institucional y Principios de Diseño
Carácter Gubernamental:

La interfaz debe ser limpia, institucional, sobria y de alta legibilidad.

Queda estrictamente prohibido: Uso de tendencias de diseño SaaS comercial de startups (ej. Glassmorphic borroso con colores neón, degradados naranjas/móviles, bordes con brillos o estilos tipo "Dark Mode" para sistemas administrativos).

Estándares de Accesibilidad (WCAG 2.1 AA):

Relación de contraste mínima de 4.5:1 para texto normal sobre fondos claros.

Jerarquía de fuentes y espaciados amplios para garantizar el uso por parte de personal docente, administrativo y autoridades.

2. Paleta de Colores Institucional (EduFinanciero - Ministerio de Educación)
La paleta se divide en colores oficiales de marca (EduFinanciero) y colores funcionales de interfaz:

A. Marca / Gobierno (Oficial)
Naranja Institucional (Primario Dominante / Acento / Íconos): #FE8204 / #FF5E00 (Aporta identidad EduFinanciero, peso visual en íconos, botones principales y destaca acciones).

Negro / Gris Oscuro Institucional (Estructura y Texto): #1A1A1C / #1E293B (Aporta legibilidad, peso institucional y sobriedad en tipografía, headers y sidebars).

Blanco / Superficie: #FFFFFF (Fondo de tarjetas, modales y tablas).

Gris de Fondo Institucional: #F8FAFC o #F1F5F9 (Fondo general de la pantalla).

B. Colores de Estado y Auditoría (Sistemas Educativos / SIGE)
Éxito / Coincidencia: Verde sobrio (#15803D / Fondo tenue: #DCFCE7).

Advertencia / Desvío: Naranja o Ámbar (#B45309 / Fondo tenue: #FEF3C7).

Peligro / Error / Sin Coincidencia: Rojo institucional (#B91C1C / Fondo tenue: #FEE2E2).

Texto Principal: #1A1A1C (Gris muy oscuro / Negro institucional).

Texto Secundario / Muted: #64748B.

3. Estructura y Reglas para Componentes de Interfaz
3.1. Tarjetas de Métricas (KPI Cards / Dashboard)
Fondo y Bordes: Las tarjetas deben tener fondo blanco (bg-white), borde sutil de 1px en todo el contorno (border border-slate-200) y esquinas redondeadas estándar (rounded-lg o rounded-xl, máximo 12px-16px).

Prohibido: No usar bordes gruesos de color únicamente en la izquierda (Left Border). Tampoco usar sombras de color difusas.

Visualización de Datos:

El dato numérico principal debe ir en tamaño prominente (text-2xl o text-3xl), en peso font-bold y en tono oscuro neutro (#1A1A1C) o en el color del estado si es un KPI crítico. Los íconos de las tarjetas deben ser de color naranja (#FE8204).

Los indicadores de estado (porcentajes de coincidencia, desvíos) deben usar Badges o Chips pequeños (ej. pill con fondo al 10% y texto oscuro) en lugar de íconos gigantes envueltos en círculos de colores.

Si la métrica es porcentual (ej: Tasa de coincidencia 95.4%), incluir una barra de progreso fina horizontal (h-1.5) de color verde tenue.

3.2. Botones de Acción
Botón Principal (Acción de Sistema): Fondo Naranja Oficial (bg-[#FE8204] hover:bg-[#E07000]), texto blanco, peso font-semibold, esquinas rounded-lg.

Botón Secundario / Cancelar: Fondo transparente o neutro (bg-slate-100 hover:bg-slate-200), texto gris oscuro (text-slate-700).

Prohibido: Botones super redondeados tipo píldora (rounded-full) o con sombras gigantes de colores.

3.3. Tablas de Datos (Listados de Centros / Agentes / Auditar)
Contenedor con borde completo fino border border-slate-200 y sombra sutil shadow-sm.

Cabecera (<thead>): Fondo gris neutro (bg-slate-50), texto en mayúsculas pequeñas (text-[11px]), peso font-bold, tracking espaciado (tracking-wider), color de texto #64748B.

Filas (<tbody>): Separadores finos (divide-y divide-slate-100), efecto hover tenue en gris (hover:bg-slate-50/80).

Fila Activa / Seleccionada: Tinte neutro o naranja muy suave (bg-orange-50/40).

4. Tipografía y Estilos de Texto
Fuente Estándar: Inter o system-ui (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto).

Encabezados:

Títulos de sección: font-bold text-slate-900.

Subtítulos / Muted: font-medium text-slate-500 text-sm.

Lenguaje Institucional: Usar terminología oficial del ámbito educativo/estatal (ej. "Centros Educativos", "Establecimientos", "Agentes Afectados", "Cruce de Liquidaciones SIGE").

5. Diccionario de Tokens de Estilo (Configuración CSS / Tailwind)
Toda la generación de código debe referenciar estas variables de Tailwind CSS v3 / v4:

CSS
/* Paleta de Colores Institucionales */
--color-gob-primary: #FE8204;
--color-gob-primary-hover: #E07000;
--color-gob-dark: #1A1A1C;
--color-gob-accent: #FE8204;

/* Superficies */
--color-bg-app: #F8FAFC;
--color-surface-card: #FFFFFF;
--color-border-subtle: #E2E8F0;

/* Tipografía */
--font-sans: 'Inter', sans-serif;