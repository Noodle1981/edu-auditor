---
description: System Prompt & Reglas de Diseño Visual – Proyecto EDU-Auditor (Ministerio de Educación de San Juan)
---

# Gobierno de San Juan / Ministerio de Educación — Guía de Diseño Visual y Reglas de UI

**Propósito:** Especificar de forma estricta la arquitectura visual, tokens, paleta institucional, componentes y jerarquía de interfaz de usuario para la plataforma **EDU-Auditor**. Toda interfaz generada o modificada debe cumplir estas reglas sin excepción.

---

## 1. Identidad Institucional y Principios de Diseño

### Carácter Gubernamental:
La interfaz debe ser **limpia, institucional, sobria, moderna y de alta legibilidad**.
* **Uso del Naranja Institucional (`#FE8204`):** Es el color primario de marca (EduFinanciero). Se utiliza en cabeceras de tablas (`<thead>`), pestaña activa expandida, botones primarios de acción, íconos destacados y badges de Centros Salariales.
* **Prohibiciones:** 
  * Queda prohibido el uso de degradados neón, glassmorphism con desenfoques excesivos, modos oscuros (Dark Mode) para herramientas administrativas o tarjetas con bordes laterales de color (`border-l-4`).

### Estándares de Accesibilidad (WCAG 2.1 AA):
* Relación de contraste mínima de 4.5:1 para texto normal sobre fondos claros.
* Jerarquía tipográfica clara y espaciados confortables para personal docente, administrativo y autoridades.

---

## 2. Paleta de Colores Institucional (EduFinanciero)

### A. Marca / Gobierno (Oficial)
* **Naranja Institucional (Primario Dominante / Acento):** `#FE8204` (Hover: `#E07000`).
* **Negro / Gris Oscuro Institucional (Texto Principal):** `#1A1A1C` / `#1E293B`.
* **Blanco / Superficie (Tarjetas y Modales):** `#FFFFFF`.
* **Gris de Fondo General:** `#F8FAFC` o `#F1F5F9`.

### B. Colores Funcionales y Estado de Auditoría
* **Éxito / Coincidencia:** Verde sobrio (`#15803D` / Fondo tenue: `#DCFCE7` / `bg-emerald-600`).
* **Advertencia / Desvío Menor:** Ámbar (`#B45309` / Fondo tenue: `#FEF3C7`).
* **Peligro / Sobrepago / Desvío Crítico:** Rojo institucional (`#B91C1C` / Fondo tenue: `#FEE2E2`).
* **Texto Secundario / Muted:** `#64748B`.

---

## 3. Estructura y Reglas para Componentes de Interfaz

### 3.1. Navegación Principal por Pestañas (Acordeón Minimalista)
* **Pestañas Inactivas (Modo Ultra-Compacto):**
  * Renders únicamente como botón cuadrado compacto (`w-9 h-9 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-100 flex items-center justify-center`).
  * Muestra **exclusivamente el ícono característico** de la pestaña con su color temático y posee tooltip `title="..."`.
* **Pestaña Activa (Modo Expandido):**
  * Se expande suavemente (`transition-all duration-300 px-4 py-2 bg-[#FE8204] text-white border border-[#FE8204] rounded-xl shadow-md font-black text-xs gap-2 flex items-center`).
  * Muestra el **ícono en blanco + Título Completo + Insignia (Badge) Blanca de Conteo** (`bg-white/20 text-white font-black rounded-full px-2 py-0.5`).

### 3.2. Navegación Secundaria (Sub-Pestañas en Otros Sectores)
* Barra contenedora tenue (`bg-slate-100/90 rounded-2xl border border-slate-200 shadow-xs p-1.5 flex items-center gap-2`).
* Sub-Pestaña Activa: Naranja institucional (`bg-[#FE8204] text-white border border-[#FE8204] rounded-xl font-black text-xs px-4 py-2.5 shadow-md`).
* Sub-Pestaña Inactiva: Fondo blanco (`bg-white text-slate-700 border border-slate-200 rounded-xl font-black text-xs px-4 py-2.5 hover:bg-slate-50`).

### 3.3. Botones de Descarga en Excel
* **Formato Píldora Cuadrada Icon-Only:**
  * Dimensiones fijas de $36\times36\text{px}$ (`w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0`).
  * Contiene únicamente el ícono `<i className="fa-solid fa-file-excel text-sm"></i>` con tooltip hover (`title="Descargar Reporte Excel"`).
  * **Ubicación:** Siempre ubicado en la **misma línea horizontal que el título principal** de la vista o tarjeta (`flex items-center justify-between gap-4`).

### 3.4. Tarjetas y Contenedores (`GlassCard`)
* **Fondo y Bordes:** Fondo blanco puro (`bg-white`), borde sutil de 1px en todo el contorno (`border border-slate-200/80`), esquinas redondeadas (`rounded-2xl` o `rounded-xl`) y sombra suave (`shadow-sm` / `shadow-xs`).
* **Regla de Borde Izquierdo:** Queda **estrictamente prohibido colocar bordes gruesos de color en el lateral izquierdo** (`border-l-4`). Todas las tarjetas deben compartir la misma estructura de borde envolvente uniforme de 1px.

### 3.5. Barra de Filtros Global para Tablas
* Se presenta en una **única fila horizontal no envolvente** (`flex items-center gap-2.5 overflow-x-auto custom-scrollbar whitespace-nowrap bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-sm mb-6`).
* **Buscador compacto:** `w-64 sm:w-72 shrink-0`.
* **Selects desplegables:** Opciones compactas con títulos directos sin prefijos (`Cruces`, `Niveles`, `Departamentos`, `Ámbitos`, `Radios`, `Gestión`, `Auditoría`).
* **Visibilidad Condicional:** Se oculta automáticamente en *Resumen & KPIs* y en *Otros Sectores* (ya que *Otros Sectores* cuenta con su propio panel de depuración y sub-pestañas).

### 3.6. Tablas de Datos (Listados de Auditoría)
* **Cabecera (`<thead>`):**
  * Fondo **Naranja Institucional (`bg-[#FE8204]`)**.
  * Texto en mayúsculas pequeñas, blanco, en negrita (`text-white font-black uppercase text-[11px] tracking-wider`).
  * Bordes delgados en el tono naranja oscuro (`border-b border-[#E07000]/40 shadow-xs`).
* **Filas (`<tbody>`):**
  * Separadores finos (`divide-y divide-gray-200`).
  * Hover suave (`hover:bg-slate-50/70`).
* **Columna de Recibos/Agentes:** Nombre estandarizado **`Liquidaciones`** (para reflejar conteos de registros salariales de la nómina).
* **Badges de Centro Salarial:** Píldora naranja (`bg-[#FE8204] text-white font-black text-xs rounded-lg px-2 py-0.5`) que muestra **únicamente el número de Centro** (ej. `98`, `19`, `80`, `63` en vez de `Centro 98`).
* **Badges de Coincidencia y Desvío:** Texto conciso sin sobrecargas (`🟢 SI`, `🔴 +1`, `🟡 -1`).
* **Notación de Radios en Celdas:** Notación directa sin íconos ni recuadros amarillos: **`R1`**, **`R2`**, **`R4`** (ejemplo: `R4 (104.08%)`).
* **Integración de Departamento:** En tablas como *Escalas & Residuales*, el departamento se integra dentro de la celda de *Establecimiento / Escuela* (`CUE: 700012300  INICIAL  • CAPITAL`), eliminando columnas redundantes.

### 3.7. Paginación de Tablas (`<Pagination>`)
* Uso obligatorio del componente `<Pagination>` para listados largos (de 15 a 50 ítems por página).
* Incluye botones `< Previo / Siguiente >`, números de página y texto informativo (`Mostrando X a Y de Z registros`).
* Reinicio automático a la página 1 al modificar cualquier filtro o término de búsqueda.

---

## 4. Diccionario de Tokens CSS / Tailwind

```css
/* Paleta de Colores Oficiales EduFinanciero */
--color-primary: #FE8204;
--color-primary-hover: #E07000;
--color-text-dark: #1A1A1C;
--color-bg-app: #F8FAFC;
--color-surface-card: #FFFFFF;
--color-border-subtle: #E2E8F0;

/* Componentes */
--tab-active: bg-[#FE8204] text-white border-[#FE8204];
--tab-inactive: bg-white text-slate-700 border-slate-200;
--btn-excel: bg-emerald-600 hover:bg-emerald-700 text-white w-9 h-9 rounded-xl;
--table-head: bg-[#FE8204] text-white font-black uppercase text-[11px];
```