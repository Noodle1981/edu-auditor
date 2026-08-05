# Módulo de Auditoría de Escalas Residuales y Registros de Transición Salarial

**Sistema:** EDU-Auditor — Sistema de Auditoría de Compensación Geográfica y Haberes Docentes  
**Documento:** Especificación Técnica y Funcional del Módulo de Escalas Residuales  
**Ubicación:** `doc/escalas_residuales.md`  

---

## 1. Introducción y Contexto Histórico

En la Provincia de San Juan, la compensación salarial por zona inhóspita y ubicación geográfica de los establecimientos educativos está regulada por la **Ley de Radios Docentes**. A lo largo del tiempo, esta compensación ha atravesado dos grandes etapas normativas:

1. **Escala Histórica (Ley Original):**
   Fijaba porcentajes de bonificación sobre el Sueldo Básico organizados en alícuotas tradicionales:
   $$\text{Radio 1: } 20\% \quad | \quad \text{Radio 2: } 30\% \quad | \quad \text{Radio 3: } 40\% \quad | \quad \text{Radio 4: } 80\% \quad | \quad \text{Radio 5: } 100\% \quad | \quad \text{Radio 6: } 120\% \quad | \quad \text{Radio 7: } 140\%$$

2. **Escala Paritaria Vigente (Actualización Salarial):**
   Fruto de los acuerdos paritarios, las alícuotas fueron elevadas para mejorar la cobertura de radicación:
   $$\text{Radio 1: } 40\% \quad | \quad \text{Radio 2: } 50\% \quad | \quad \text{Radio 3: } 60\% \quad | \quad \text{Radio 4: } 95\% \quad | \quad \text{Radio 5: } 115\% \quad | \quad \text{Radio 6: } 135\% \quad | \quad \text{Radio 7: } 155\%$$

---

## 2. Categorías de Registros Residuales

En la liquidación auditada de Mayo 2026, el sistema identificó **194 registros residuales**, divididos en dos categorías principales:

### A. Ley Histórica (109 Registros - Ley Vieja / Desconocida)
Corresponden a liquidaciones que continúan utilizando los porcentajes de la ley original (80%, 120%, 140%). 
* **Origen:** Docentes con derechos adquiridos antes de las actualizaciones paritarias o cargos congelados por normativas de transición. Se clasifican de forma manual y se dividen en dos sub-pestañas:
  - **Sectores Vinculados a Escuela (85 registros)**.
  - **Sectores Desvinculados / Sin Escuela (24 registros)**.

### B. Nueva Paritaria / Adicionales Jerárquicos (85 Registros)
Corresponden a porcentajes no enteros o compuestos (ejemplos: `53,97%`, `80,95%`, `104,23%`, `128,18%`).
* **Origen:** Directivos, vicedirectores, supervisores y personal jerárquico que perciben adicionales específicos sobre la base de cálculo de zona.

---

## 3. Estructura de la Tabla en la Aplicación

Todas las tablas de **Escalas & Residuales** muestran de forma limpia y separada las columnas:

| Columna | Descripción |
|---|---|
| **Centro** | Código del Centro Salarial (`Centro 98`, `Centro 19`, `Centro 80`, etc.). |
| **Sector** | Número del sector presupuestario. |
| **Establecimiento** | Nombre de la escuela o repartición. |
| **Porcentaje Pagado** | Porcentaje de bonificación pagado en haberes. |
| **Escala Detectada** | `LEY HISTORICA` o `NUEVA PARITARIA`. |
| **Dictamen Auditor** | `PENDIENTE`, `JUSTIFICADO_LEGAL`, `ERROR_LIQUIDACION`, `CASO_ESPECIAL`. |
| **Decreto / Norma** | Número de norma respaldatoria (ej. *Decreto N° 1420/89*). |
| **Notas del Auditor** | Justificación técnica del auditor. |
