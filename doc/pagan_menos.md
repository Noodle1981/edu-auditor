# Módulo de Auditoría de Subpago Salarial y Perjuicio Docente (Pagan MENOS que SIGE)

**Sistema:** EDU-Auditor — Sistema de Auditoría de Compensación Geográfica y Haberes Docentes  
**Documento:** Especificación Técnica y Funcional del Módulo de Sectores con Subpago  
**Ubicación:** `doc/pagan_menos.md`  

---

## 1. Definición y Objetivo del Módulo

El módulo de **Pagan MENOS que SIGE** tiene como objetivo identificar los sectores presupuestarios donde la bonificación abonada en concepto de adicional por zona (Código **A04 - Radio Docente**) es **inferior al radio asignado oficialmente en el SIGE o a la distancia física del camino**.

$$\text{Condición de Alerta: } \text{Radio Sueldo (A04)} < \text{Radio SIGE Oficial}$$

---

## 2. Fundamento Social y Jurídico

1. **Protección de los Derechos Salariales Docentes:**
   El adicional por zona inhóspita es un derecho laboral consagrado por estatuto para compensar el costo, tiempo de traslado y condiciones de radicación del personal educativo.
2. **Prevención de Conflictividad Gremiar y Reclamos Retroactivos:**
   Detectar tempranamente establecimientos donde el personal está cobrando menos bonificación de la que le corresponde evita reclamos judiciales por liquidación defectuosa y montos retroactivos acumulados.
3. **Casos Detectados (Mayo 2026):**
   * En la liquidación de Mayo 2026 se identificaron **25 sectores** en esta condición (afectando a **1.674 liquidaciones docentes**).
   * **Ejemplo Emblemático (Sector 681 - Aberastain):** La *Escuela Anexo Normal Superior Sarmiento* en Aberastain (Sarmiento) liquida **Radio 1 (40%)**, mientras que en el SIGE el anexo Aberastain tiene asignado oficialmente **Radio 4 (95%)**. Afecta a 753 liquidaciones docentes subpagadas en un $-3$ de radio (-55% de compensación).

---

## 3. Matriz de Impacto en los Haberes

| Severidad | Diferencia | Impacto en Docente |
| :--- | :--- | :--- |
| 🔵 **Perjuicio Severo** | $-3$ a $-4$ Radios | Diferencia salarial superior al $50\%$ del básico por cargo. |
| 🔵 **Perjuicio Moderado** | $-2$ Radios | Diferencia entre $25\%$ y $45\%$ del sueldo básico. |
| 🔵 **Perjuicio Leve** | $-1$ Radio | Desfasaje menor entre paritaria previa y actual. |

---

## 4. Funcionalidades del Módulo en la Aplicación

1. **Aislamiento de Casos de Subpago:**
   Presenta el listado exclusivo de escuelas y sectores donde el sueldo pagado está por debajo de la norma SIGE.
2. **Cuantificación de Docentes Afectados:**
   Permite dimensionar el volumen de docentes beneficiarios que deben ser reclasificados.
3. **Gestión de Reclasificación:**
   Módulo de anotación para ingresar expedientes de reclasificación o resoluciones de ajuste de haber.

---

## 5. Flujo Operativo para la Corrección

1. **Paso 1:** Validar el edificio físico del establecimiento mediante el **Mapa Escolar (`/mapa`)** para confirmar que la distancia en kilómetros avala el Radio SIGE mayor.
2. **Paso 2:** Comunicar a la Dirección de Personal y Liquidaciones el reajuste del sector al Radio SIGE superior.
3. **Paso 3:** Registrar el cambio en la plataforma indicando la fecha de vigencia de la nueva liquidación.
