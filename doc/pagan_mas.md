# Módulo de Auditoría de Sobrepago Salarial (Pagan MÁS que SIGE)

**Sistema:** EDU-Auditor — Sistema de Auditoría de Compensación Geográfica y Haberes Docentes  
**Documento:** Especificación Técnica y Funcional del Módulo de Sectores con Sobrepago  
**Ubicación:** `doc/pagan_mas.md`  

---

## 1. Definición y Objetivo del Módulo

El módulo de **Pagan MÁS que SIGE** tiene como objetivo prioritario detectar, cuantificar e investigar los sectores presupuestarios donde la alícuota abonada por concepto de adicional por zona (**Radio Sueldo**) **supera al radio oficial registrado en la base administrativa SIGE**.

$$\text{Condición de Alerta: } \text{Radio Sueldo} > \text{Radio SIGE Oficial}$$

---

## 2. Fundamento Financiero y Legal

1. **Riesgo Fiscal y Sobrepago del Estado:**
   La liquidación de un radio superior al asignado oficialmente representa un erogamiento presupuestario en exceso sin sustento normativo, generando un impacto financiero acumulativo en la nómina provincial.
2. **Desequilibrio de Paridad Salarial:**
   Causa inequidad entre establecimientos ubicados en la misma zona geográfica donde uno percibe la bonificación correcta y otro recibe una bonificación inflada.
3. **Casos Críticos Detectados:**
   Se analiza la combinación unívoca **`CENTRO + SECTOR`** para evitar confundir establecimientos públicos con colegios privados.

---

## 3. Matriz de Clasificación de Desvíos

| Nivel de Desvío | Badge Visual | Acción Requerida |
| :--- | :--- | :--- |
| 🔴 **Desviación Crítica** | `🔴 +2` a `🔴 +5` | Suspensión cautelar preventiva y citación a liquidaciones. |
| 🔴 **Desviación Estándar** | `🔴 +1` | Revisión de expediente de creación, traslado de edificio o discrepancia vial. |

---

## 4. Estructura de la Tabla de Control en la Aplicación

La tabla se presenta con cabeceras en Naranja Institucional (`bg-[#FE8204] text-white font-black`) y columnas independientes:

| Columna | Descripción |
|---|---|
| **Centro** | Badge naranja con el código de Centro Salarial (`98`, `19`, `80`, `63`, etc.). |
| **Sector** | Número del sector presupuestario auditado. |
| **Establecimiento** | Nombre oficial de la escuela u organización. |
| **Ámbito** | Badge de gestión (`PÚBLICO` o `PRIVADO`). |
| **Nivel** | Nivel educativo (Primaria, Secundaria, Superior, etc.). |
| **Radio SIGE** | Radio asignado administrativamente en SIGE (**`R1`** al **`R7`**). |
| **Radio Sueldo** | Radio determinado a partir de la mediana de liquidación en haberes (**`R1`** al **`R7`**). |
| **Desviación** | Badge simplificado de desvío (ej. **`🔴 +1`**). |
| **R. Circ / R. Cam** | Radios teóricos calculados por distancia a la Plaza 25 de Mayo y caminos. |
| **Liquidaciones** | Cantidad total de agentes/recibos impactados por el sobrepago (`COUNT(DISTINCT cuil)`). |
| **Gestión y Acciones** | Estado de gestión (`PENDIENTE`, `EN_INVESTIGACION`, `CORREGIDO`, `JUSTIFICADO`) y notas del auditor. |

---

## 5. Procedimiento de Saneamiento Sugerido

1. **Paso 1:** Verificar si existe algún Decreto o Resolución de traslado edilicio no volcado en el SIGE.
2. **Paso 2:** Si no existe norma respaldatoria, emitir la notificación al área de Liquidación de Haberes para ajustar el radio al valor SIGE legal en la siguiente nómina.
3. **Paso 3:** Marcar el sector en el sistema como **`CORREGIDO EN LIQUIDACIÓN`**.
