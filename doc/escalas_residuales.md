# Módulo de Auditoría de Escalas Residuales y Registros de Transición Salarial

**Sistema:** EDU-Auditor — Sistema de Auditoría de Compensación Geográfica y Haberes Docentes  
**Documento:** Especificación Técnica y Funcional del Módulo de Escalas Residuales  
**Ubicación:** `doc/escalas_residuales.md`  

---

## 1. Introducción y Contexto Histórico

En la Provincia de San Juan, la compensación salarial por zona inhóspita y ubicación geográfica de los establecimientos educativos está regulada por la **Ley de Radios Docentes**. A lo largo del tiempo, esta compensación ha atravesado dos grandes etapas normativas:

1. **Escala Histórica (Ley Original):**
   Fijaba porcentajes de bonificación sobre el Sueldo Básico organizados en alícuotas tradicionales:
   $$\text{R1: } 20\% \quad | \quad \text{R2: } 30\% \quad | \quad \text{R3: } 40\% \quad | \quad \text{R4: } 80\% \quad | \quad \text{R5: } 100\% \quad | \quad \text{R6: } 120\% \quad | \quad \text{R7: } 140\%$$

2. **Escala Paritaria Vigente (Actualización Salarial):**
   Fruto de los acuerdos paritarios, las alícuotas fueron elevadas para mejorar la cobertura de radicación:
   $$\text{R1: } 40\% \quad | \quad \text{R2: } 50\% \quad | \quad \text{R3: } 60\% \quad | \quad \text{R4: } 95\% \quad | \quad \text{R5: } 115\% \quad | \quad \text{R6: } 135\% \quad | \quad \text{R7: } 155\%$$

---

## 2. Categorías de Registros Residuales y Clasificación de Alícuotas

En la liquidación auditada, el sistema clasifica las alícuotas en tres categorías precisas:

1. **Ley Paritaria:** Corresponden a los porcentajes vigentes elevados por acuerdo paritario.
2. **Ley Histórica:** Corresponden a docentes o cargos que conservan alícuotas fijas tradicionales (80%, 120%, 140%).
3. **Porcentaje Irregular:** Corresponden a porcentajes descalibrados o no enteros (ejemplos: `53,97%`, `104,08%`, `182,15%`).
   * **Origen:** Absorción de adicionales jerárquicos o topes presupuestarios aplicados masivamente sobre sectores de liquidación.

---

## 3. Estructura de la Tabla en la Aplicación

Para garantizar máxima legibilidad y evitar columnas redundantes, la información administrativa se organiza de la siguiente manera:

| Columna | Descripción |
|---|---|
| **Centro** | Badge naranja con el código de Centro Salarial (`98`, `19`, `80`, `63`, etc.). |
| **Sector** | Número del sector presupuestario auditado. |
| **Establecimiento / Escuela** | Nombre de la escuela con datos integrados de CUE, Nivel y Departamento (`CUE: 700012300 INICIAL • CAPITAL`). |
| **Radio Sueldo (A04)** | Radio abonado con alícuota en texto plano negrita (ej. **`R4 (104.08%)`**), sin recuadros amarillos ni emojis. |
| **Liquidaciones** | Cantidad de liquidaciones de haberes afectadas (`COUNT(DISTINCT cuil)`). |
| **Escala Detectada** | Badge clasificatorio (`Ley Paritaria`, `Ley Histórica` o `Porcentaje Irregular`). |
| **Dictamen Auditor** | `PENDIENTE`, `JUSTIFICADO_LEGAL`, `ERROR_LIQUIDACION`, `CASO_ESPECIAL`. |
| **Acción / Gestión** | Modal para ingresar Decreto/Norma respaldatoria y observaciones del auditor. |
