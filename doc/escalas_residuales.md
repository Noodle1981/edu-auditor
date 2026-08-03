# Módulo de Auditoría de Escalas Residuales y Registros de Transición Salarial

**Sistema:** EDU-Auditor — Sistema de Auditoría de Compensación Geográfica y Haberes Docentes  
**Documento:** Especificación Técnica y Funcional del Módulo de Escalas Residuales  
**Ubicación:** `doc/escalas_residuales.md`  

---

## 1. Introducción y Contexto Histórico

En la Provincia de San Juan, la compensación salarial por zona inhóspita y ubicación geográfica de los establecimientos educativos está regulada por la **Ley de Radios Docentes**. A lo largo del tiempo, esta compensación ha atravesado dos grandes etapas normativas y salariales:

1. **Escala Histórica (Ley Original):**
   Fijaba porcentajes de bonificación sobre el Sueldo Básico (código A01) organizados en alícuotas tradicionales:
   $$\text{Radio 1: } 20\% \quad | \quad \text{Radio 2: } 30\% \quad | \quad \text{Radio 3: } 40\% \quad | \quad \text{Radio 4: } 80\% \quad | \quad \text{Radio 5: } 100\% \quad | \quad \text{Radio 6: } 120\% \quad | \quad \text{Radio 7: } 140\%$$

2. **Escala Paritaria Vigente (Actualización Salarial):**
   Fruto de los acuerdos paritarios entre el Ministerio de Educación y los gremios docentes, las alícuotas fueron elevadas para mejorar la cobertura de traslado y radicación:
   $$\text{Radio 1: } 40\% \quad | \quad \text{Radio 2: } 50\% \quad | \quad \text{Radio 3: } 60\% \quad | \quad \text{Radio 4: } 95\% \quad | \quad \text{Radio 5: } 115\% \quad | \quad \text{Radio 6: } 135\% \quad | \quad \text{Radio 7: } 155\%$$

Sin embargo, en las liquidaciones mensuales del sistema de sueldos (Código de Adicional **A04 - Radio Docente**) persisten registros donde el porcentaje pagado no coincide con los enteros de la escala vigente. El **Módulo de Escalas Residuales** fue creado específicamente para auditar, clasificar y sanear estos casos.

---

## 2. ¿Qué son los Registros Residuales?

Un **Registro Residual** es cualquier liquidación de haberes donde la relación entre el adicional de radio pagado ($A04$) y el sueldo básico ($A01$) arroja una alícuota que difiere de la tabla paritaria estándar:

$$\text{Porcentaje Pagado (\%)} = \left( \frac{A04}{A01} \right) \times 100$$

En la liquidación auditada de Mayo 2026, el sistema identificó **194 registros residuales**, divididos en dos categorías principales:

### A. 📜 Ley Histórica (37 Registros)
Corresponden a liquidaciones que continúan utilizando los porcentajes de la ley original (80%, 120%, 140%). 
* **Origen:** Docentes con derechos adquiridos antes de las actualizaciones paritarias o cargos congelados por normativas de transición.

### B. ⚖️ Nueva Paritaria / Adicionales Jerárquicos (157 Registros)
Corresponden a porcentajes no enteros o compuestos (ejemplos: `53,97%`, `80,95%`, `104,23%`, `128,18%`, `182,15%`).
* **Origen:** Directivos, vicedirectores, supervisores y personal jerárquico que perciben adicionales específicos sobre la base de cálculo de zona, retroactivos o liquidaciones proporcionales por horas cátedra.

---

## 3. Fundamento Técnico y Jurídico

### ¿Para qué sirve este módulo?
1. **Evitar Falsos Positivos:** Sin este módulo, el motor de auditoría interpretaría un $80\%$ (Radio 4 Ley Histórica) o un $128\%$ como un "Sobrepago" o "Liquidación Errónea" respecto a la norma actual. El módulo permite aislar estos casos para evaluarlos con su contexto normativo real.
2. **Resguardo del Principio de Legalidad:** Garantizar que cada liquidación atípica esté debidamente respaldada por un Decreto, Resolución Ministerial o Paritaria que avale su permanencia.
3. **Saneamiento Gradual del Sistema de Haberes:** Proporcionar al Ministerio de Educación una matriz limpia para migrar progresivamente los cargos históricos a la escala vigente o validar los derechos adquiridos legítimos.

---

## 4. Objetivos del Módulo

| Objetivo | Descripción Funcional |
| :--- | :--- |
| **1. Identificación Automática** | Detectar e ingresar automáticamente en la mesa de revisión todos los recibos A04 que no coincidan con la matriz paritaria vigente. |
| **2. Trazabilidad Institucional** | Vincular cada sector en revisión con el **Establecimiento escolar, CUE, Departamento geográfico y Radio SIGE oficial**. |
| **3. Dictamen del Auditor** | Permitir al auditor asignar un estado oficial: `🟢 JUSTIFICADO LEGAL (DECRETO)`, `🔴 ERROR LIQUIDACIÓN`, `🟣 CASO ESPECIAL` o `PENDIENTE`. |
| **4. Registro del Aval Normativo** | Habilitar un campo de texto para asentar el número de norma (ej. *Decreto N° 1420/89*, *Resolución N° 405-ME-2021*) que respalda el porcentaje pagado. |
| **5. Memoria de Auditoría (Persistencia)** | Las clasificaciones y resoluciones guardadas se conservan en la base de datos para que en **las liquidaciones de meses futuros (Junio 2026 en adelante) el sistema reconozca automáticamente las justificaciones** y no vuelva a requerir revisión manual. |

---

## 5. Estructura de Datos (Modelo en la Aplicación)

El módulo se soporta en la tabla de la base de datos `auditoria_sueldo_registros_viejos` y el modelo Eloquent `App\Models\AuditoriaSueldoRegistroViejo`:

```sql
CREATE TABLE auditoria_sueldo_registros_viejos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nomina_id INTEGER NOT NULL,
    sector INTEGER NULL,
    zona VARCHAR(255) NULL,
    a01_basico DECIMAL(12,2) NOT NULL,
    a04_radio DECIMAL(12,2) NOT NULL,
    porcentaje_pagado DECIMAL(8,2) NOT NULL,
    escala_detectada VARCHAR(255) DEFAULT 'LEY HISTORICA', -- 'LEY HISTORICA' | 'NUEVA PARITARIA'
    clasificacion_auditor VARCHAR(255) DEFAULT 'PENDIENTE', -- 'PENDIENTE' | 'JUSTIFICADO_LEGAL' | 'ERROR_LIQUIDACION' | 'CASO_ESPECIAL'
    resolucion_aval TEXT NULL,                             -- N° de Decreto o Resolución
    notas_auditor TEXT NULL,                               -- Justificación técnica del auditor
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (nomina_id) REFERENCES nominas_sueldos(id) ON DELETE CASCADE
);
```

---

## 6. Guía de Uso Operativo para el Auditor

1. **Ingreso al Módulo:**
   Acceder a **`Auditoria de Sueldos`** en la barra lateral o ingresar a `http://radios_cupof.test/auditoria-sueldos`.
2. **Navegación a la Pestaña:**
   Hacer clic en la segunda pestaña: **`Escalas & Residuales (194)`**.
3. **Análisis del Registro:**
   * Revisar el **Sector**, el **Establecimiento / Escuela vinculada**, el **Departamento** y la comparación entre el **Radio SIGE** y el **Radio Sueldo (A04)**.
4. **Dictamen y Asignación de Norma:**
   * En la columna **Dictamen / Clasificación**, seleccionar la opción adecuada (ej. `🟢 JUSTIFICADO LEGAL (DECRETO)`).
   * En la columna **Decreto / Resolución Aval**, ingresar la norma que respalda el adicional (ej. `Decreto 1420/89`).
5. **Guardado Automático:**
   * El sistema guarda los datos inmediatamente en la base de datos al cambiar el combo o al salir de la casilla de texto.
