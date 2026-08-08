# Módulo de Auditoría de Subpago Salarial (Pagan MENOS que SIGE)

**Sistema:** EDU-Auditor — Sistema de Auditoría de Compensación Geográfica y Haberes Docentes  
**Documento:** Especificación Técnica y Funcional del Módulo de Sectores con Subpago  
**Ubicación:** `doc/pagan_menos.md`  

---

## 1. Definición y Objetivo del Módulo

El módulo de **Pagan MENOS que SIGE** tiene como objetivo detectar, cuantificar e investigar los sectores presupuestarios donde la alícuota abonada por concepto de adicional por zona (**Radio Sueldo**) **es menor al radio oficial asignado administrativamente a la escuela en el SIGE**.

$$\text{Condición de Perjuicio: } \text{Radio Sueldo} < \text{Radio SIGE Oficial}$$

---

## 2. Fundamento de Derechos y Legalidad

1. **Perjuicio al Personal:**
   Liquidar un porcentaje de zona inferior al aprobado por norma legal perjudica directamente el poder adquisitivo del personal docente y no docente que trabaja en escuelas rurales o inhóspitas.
2. **Reclamos Administrativos y Retroactivos:**
   Detectar proactivamente estos casos evita acumulaciones de reclamos administrativos y futuros juicios de reajuste salarial con intereses contra el Estado provincial.

---

## 3. Estructura de la Tabla de Control en la Aplicación

La tabla cuenta con cabecera en Naranja Institucional (`bg-[#FE8204] text-white font-black`) y columnas optimizadas:

| Columna | Descripción |
|---|---|
| **Centro** | Badge naranja con el código de Centro Salarial (`98`, `19`, `80`, `63`, etc.). |
| **Sector** | Número del sector presupuestario auditado. |
| **Establecimiento** | Nombre oficial de la escuela u organización. |
| **Ámbito** | Badge de gestión (`PÚBLICO` o `PRIVADO`). |
| **Nivel** | Nivel educativo (Primaria, Secundaria, Superior, etc.). |
| **Radio SIGE** | Radio asignado administrativamente en SIGE (**`R1`** al **`R7`**). |
| **Radio Sueldo** | Radio determinado a partir de la mediana de liquidación en haberes (**`R1`** al **`R7`**). |
| **Desviación** | Badge simplificado de desvío (ej. **`🟡 -1`**). |
| **R. Circ / R. Cam** | Radios teóricos calculados por distancia a la Plaza 25 de Mayo y caminos. |
| **Liquidaciones** | Cantidad total de liquidaciones/recibos perjudicados (`COUNT(DISTINCT cuil)`). |
| **Gestión y Acciones** | Estado de gestión (`PENDIENTE`, `EN_INVESTIGACION`, `CORREGIDO`, `JUSTIFICADO`) y notas del auditor. |

---

## 4. Procedimiento de Saneamiento Sugerido

1. **Paso 1:** Comprobar la norma de creación del radio en SIGE.
2. **Paso 2:** Emitir el dictamen favorable para la readecuación del adicional en el sistema de liquidaciones.
3. **Paso 3:** Registrar el cambio en la plataforma marcando el sector como **`CORREGIDO EN LIQUIDACIÓN`**.
