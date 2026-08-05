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
3. **Casos Detectados (Mayo 2026):**
   * En la liquidación auditada de Mayo 2026 se identificaron **32 sectores** en esta condición (afectando a **1.942 agentes**).

---

## 3. Estructura de la Tabla de Control en la Aplicación

| Columna | Descripción |
|---|---|
| **Centro** | Código del Centro Salarial (`Centro 98`, `Centro 19`, `Centro 80`, etc.). |
| **Sector** | Número del sector presupuestario auditado. |
| **Establecimiento** | Nombre oficial de la escuela u organización. |
| **Ámbito** | Badge de gestión (`PÚBLICO` o `PRIVADO`). |
| **Nivel** | Nivel educativo (Primaria, Secundaria, Superior, etc.). |
| **Radio SIGE** | Radio asignado administrativamente en SIGE. |
| **Radio Sueldo** | Radio determinado a partir de la mediana de liquidación en haberes. |
| **R. Circ / R. Cam** | Radios teóricos calculados por distancia a la Plaza 25 de Mayo y caminos. |
| **Personal Afectado** | Cantidad total de agentes perjudicados por la alícuota menor. |
| **Gestión y Acciones** | Estado de gestión (`PENDIENTE`, `EN_INVESTIGACION`, `CORREGIDO`) y notas del auditor. |

---

## 4. Procedimiento de Saneamiento Sugerido

1. **Paso 1:** Comprobar la norma de creación del radio en SIGE.
2. **Paso 2:** Emitir el dictamen favorable para la readecuación del adicional en el sistema de liquidaciones.
3. **Paso 3:** Registrar el cambio en la plataforma marcando el sector como **`CORREGIDO EN LIQUIDACIÓN`**.
