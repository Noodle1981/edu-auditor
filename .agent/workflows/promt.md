---
description: Para ordenar la pantalla estructuralmente antes de tocar el diseño fino, conviene aplicar una serie de refactorizaciones clave.
---

CONTEXTO Y REGLAS:
Toma como referencia estricta las reglas visuales, paleta de colores y componentes definidos en el archivo `visual.md`.

OBJETIVO DEL SPRINT:
Refactorizar y limpiar el layout/código de la vista: [Nombre de la Pestaña, ej: "Cruce Escuelas & Sectores"].

TAREAS ESPECÍFICAS:
1. Pestañas y Navegación: Convertir el tab activo en un indicador neutro/institucional con borde o acento mínimo (sin cambiar todo el color de la pantalla).
2. Panel de Filtros: Agrupar la barra de búsqueda y los dropdowns en una sola línea compacta.
3. Tabla de Datos:
   - Fondo blanco para la tarjeta contenedora y cabecera neutra (`bg-slate-50`).
   - Quitar rellenos/pastillas de color de todas las celdas numéricas. Usar texto plano alineado a la derecha.
   - Reemplazar los indicadores de estado pesados por badges o chips pequeños (ej. sólo el texto `MÁS (+1)` en un chip suave).
4. Botón de Exportación: Ajustar el botón de "Descargar Excel" al estilo de botón secundario/institucional sin opacar la tabla.
5. Preveer responsividad



Podés encararlo en este orden para ir de lo general a lo particular:

Sprint 0 (Shell / Layout Principal): Header general, Sidebar (cambiándolo a un tono oscuro/institucional) y la barra superior de pestañas (Tabs neutros).

Sprint 1 (Vista Resumen & KPIs): Rediseño de la cuadrícula de tarjetas métricas principales.

Sprint 2 (Vistas de Tablas de Cruce - Pagan MÁS / Pagan MENOS): Estandarización del grid de datos, badges de estado y comportamiento de filtros.

Sprint 3 (Vista Escalas & Residenciales / Inconsistencias): Formularios en línea, selects dentro de celdas (PENDIENTE, dictámenes) y observaciones.

Sprint 4 (Depuración & Diagnóstico): Tablas con acciones directas (Botones de Sanear / Vincular).