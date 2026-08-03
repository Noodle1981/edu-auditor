# Módulo de Auditoría de Sobrepago Salarial (Pagan MÁS que SIGE)

**Sistema:** EDU-Auditor — Sistema de Auditoría de Compensación Geográfica y Haberes Docentes  
**Documento:** Especificación Técnica y Funcional del Módulo de Sectores con Sobrepago  
**Ubicación:** `doc/pagan_mas.md`  

---

## 1. Definición y Objetivo del Módulo

El módulo de **Pagan MÁS que SIGE** tiene como objetivo prioritario detectar, cuantificar e investigar los sectores presupuestarios donde la alícuota abonada por concepto de adicional por zona (Código **A04 - Radio Docente**) **supera al radio oficial registrado en la base administrativa SIGE y a la realidad geográfica del camino**.

$$\text{Condición de Alerta: } \text{Radio Sueldo (A04)} > \text{Radio SIGE Oficial}$$

---

## 2. Fundamento Financiero y Legal

1. **Riesgo Fiscal y Sobrepago del Estado:**
   La liquidación de un radio superior al asignado oficialmente representa un erogamiento presupuestario en exceso sin sustento normativo, lo que genera un impacto financiero acumulativo mes a mes en la nómina provincial.
2. **Desequilibrio de Paridad Salarial:**
   Causa inequidad entre establecimientos ubicados en la misma zona geográfica donde uno percibe la bonificación correcta y otro recibe una bonificación inflada.
3. **Casos Críticos Detectados (Mayo 2026):**
   * En la liquidación auditada de Mayo 2026 se identificaron **30 sectores** en esta condición (afectando a **1.694 liquidaciones docentes**).
   * **Ejemplo Emblemático (Sector 726 - Zonda):** La *Escuela Comercio Nocturna Dr. Santiago Cortánez* en Zonda abona **Radio 6 (135%)**, cuando en el SIGE y en la medición geográfica figura en **Radio 1 (40%)**. Representa un desvío extremo de $+5$ radios (+95% de sobreprecio sobre el sueldo básico).

---

## 3. Matriz de Clasificación de Desvíos

El módulo categoriza los sectores con sobrepago según el grado de desviación:

| Nivel de Desvío | Diferencia | Acción Requerida |
| :--- | :--- | :--- |
| 🔴 **Desviación Extrema** | $+3$ a $+5$ Radios | Suspensión cautelar preventiva y citación a liquidaciones. |
| 🟠 **Desviación Moderada** | $+2$ Radios | Revisión de expediente de creación o traslado de edificio. |
| 🟡 **Desviación Menor** | $+1$ Radio | Verificación de discrepancia vial o paritaria local. |

---

## 4. Funcionalidades del Módulo en la Aplicación

1. **Tabla de Control Interactiva:**
   Filtra y muestra exclusivamente los sectores donde $\text{Radio Sueldo} > \text{Radio SIGE}$, detallando el porcentaje pagado vs el porcentaje oficial.
2. **Cálculo de Docentes Afectados:**
   Muestra el número exacto de filas docentes de la nómina A04 impactadas en cada sector.
3. **Pase a Gestión y Expediente:**
   Permite cambiar el estado de gestión (`PENDIENTE` $\rightarrow$ `EN_INVESTIGACION` $\rightarrow$ `JUSTIFICADO` / `CORREGIDO`) y adjuntar el número de actuación administrativa.

---

## 5. Procedimiento de Saneamiento Sugerido

1. **Paso 1:** Verificar si existe algún Decreto o Resolución de traslado edilicio no volcado en el SIGE.
2. **Paso 2:** Si no existe norma respaldatoria, emitir la notificación al área de Liquidación de Haberes para ajustar la alícuota A04 al valor SIGE legal en la siguiente nómina.
3. **Paso 3:** Marcar el sector en el sistema como **`CORREGIDO EN LIQUIDACIÓN`**.
