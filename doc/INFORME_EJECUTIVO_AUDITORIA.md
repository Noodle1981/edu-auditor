# INFORME EJECUTIVO DE AUDITORÍA SALARIAL Y COMPENSACIÓN GEOGRÁFICA (RADIO DOCENTE)

**A:** Autoridades del Ministerio de Educación de la Provincia de San Juan  
**DE:** Área de Auditoría y Control Administrativo de Liquidaciones  
**ASUNTO:** Informe Diagnóstico, Cruce de Datos y Plan de Saneamiento de adicionales por Compensación Geográfica (Nómina Salarial vs. Sistema SIGE)  
**FECHA:** Mayo / Junio 2026  
**ESTADO:** Finalizado / Listo para Evaluación  

---

## 1. RESUMEN EJECUTIVO

El presente documento constituye el informe técnico y diagnóstico derivado del análisis automatizado de la liquidación salarial docente y no docente de la Provincia de San Juan. Mediante la implementación del sistema informático **EDU-Auditor**, se realizó por primera vez un cruce de datos masivo entre la **Nómina Real de Haberes** (más de 30.000 liquidaciones salariales), la **Base de Datos Administrativa Oficial SIGE** (establecimientos, edificios y radios legales) y el **Padrón Maestro de Agentes (CUPOF)**.

### Mensaje Clave de Tranquilidad Institucional:
> **El 85% al 90% de la nómina salarial provincial se encuentra en situación de COINCIDENCIA TOTAL Y CONFORMIDAD LEGAL.** Los desvíos e inconsistencias detectados no responden a conductas fraudulentas individuales de docentes, sino a **descalibres sistémicos acumulados a lo largo de décadas** producto de paritarias salariales, topes presupuestarios y traslados edilicios no sincronizados entre las áreas administrativas.

---

## 2. METODOLOGÍA Y DESCUBRIMIENTO TÉCNICO CLAVE

Para lograr un diagnóstico certero y eliminar falsas alarmas, la auditoría superó el criterio histórico de analizar los sectores salariales como códigos aislados.

### 2.1. Clave Compuesta de Análisis: `CENTRO SALARIAL + SECTOR PRESUPUESTARIO`
Se determinó que la única forma unívoca de auditar la nómina es combinar el código de **CENTRO** (que identifica la repartición liquidadora y la situación de revista del personal) con el número de **SECTOR** (que representa la dependencia física o funcional):

$$\text{Identificador Unívoco de Liquidación} = \text{CENTRO} + \text{SECTOR}$$

* **Centro 98:** Docentes Titulares e Interinos en Cargos.
* **Centro 19:** Docentes Suplentes (Reemplazantes).
* **Centro 80:** Personal Transferido (Cargos y Horas Cátedra Nivel Medio).
* **Centro 85:** Docentes de Nivel Superior.
* **Centro 63 / 64:** Personal de Enseñanza Privada (Subvencionada).
* **Centro 69:** Personal Administrativo y de Servicios General.

### 2.2. Cálculo de Alícuota Mediana y Determinación del Radio
Para cada combinación de `CENTRO + SECTOR`, se calculó la alícuota porcentual mediana del adicional por compensación geográfica (**Código A04 - Radio**) sobre el sueldo básico (**Código A01**), clasificando el radio determinado (R1 a R7) y contrastándolo de forma transparente con la norma legal aprobada en el SIGE.

---

## 3. HALLAZGOS PRINCIPALES Y DIAGNÓSTICO POR MÓDULOS

### 3.1. Módulo 1: Sectores con Sobrepago Salarial (Pagan MÁS que SIGE)
* **Diagnóstico:** Se identificaron **61 sectores presupuestarios** (que impactan sobre **2.327 liquidaciones/agentes**) donde la alícuota abonada en haberes supera al radio asignado legalmente a la escuela en el SIGE.
* **Niveles de Desvío:**
  * **🔴 Desviación Crítica (`🔴 +2` a `🔴 +5` Radios):** Casos donde la nómina abona alícuotas de zonas muy inhóspitas (ej. Radio 4 o 5) en escuelas que administrativamente figuran en zona urbana (Radio 1 o 2).
  * **🔴 Desviación Estándar (`🔴 +1` Radio):** Discrepancias de un tramo generadas por paritarias locales o normativas no aplicadas en la base del SIGE.
* **Impacto:** Representa un erogamiento presupuestario en exceso sin sustento administrativo formal que genera riesgo de observaciones por órganos de control fiscal.

### 3.2. Módulo 2: Sectores con Subpago Salarial (Pagan MENOS que SIGE)
* **Diagnóstico:** Se identificaron **32 sectores presupuestarios** (que impactan sobre **1.942 liquidaciones/agentes**) donde el adicional abonado es menor al radio legal que corresponde a la institución educativa según el SIGE.
* **Impacto:** Liquida un porcentaje menor al aprobado por decreto provincial en escuelas rurales o alejadas, lo que perjudica el poder adquisitivo docente y genera riesgo imminente de reclamos administrativos, cartas documento y juicios de reajuste con intereses retroactivos contra el Estado.

### 3.3. Módulo 3: Conflictos Internos de Datos SIGE
* **Diagnóstico:** Se detectaron **33 sectores presupuestarios** donde una misma escuela o sector posee múltiples niveles o anexos en la base SIGE con distintos radios asignados.
* **Causa:** Escuelas primarias y secundarias que comparten el mismo número de sector presupuestario pero tienen distintas alícuotas aprobadas, o escuelas sedes con anexos rurales.

### 3.4. Módulo 4: Depuración de Catálogo y Registros Residuales
* **Diagnóstico de Catálogo:** Se analizaron **3.190 registros del catálogo de Centros y Sectores**, detectando sectores sin uso actual en la nómina salarial, haberes no catalogados y sectores con baja volumetría.
* **Registros Residuales (194 casos):**
  * **Ley Histórica (109 registros):** Agentes o cargos que conservan alícuotas de la ley original de radios (80%, 120%, 140%).
  * **Porcentajes Irregulares (85 registros):** Liquidaciones con alícuotas compuestas o descalibradas (ej. `53,97%`, `104,08%`, `182,15%`). El análisis demostró que se trata de la absorción masiva de adicionales jerárquicos o topes salariales aplicados sobre todo el sector.

---

## 4. CAUSAS DE FONDO IDENTIFICADAS

1. **Paritarias Acumuladas:** Las actualizaciones paritarias elevaron las alícuotas (ej. Radio 4 pasó del 80% al 95%, Radio 5 del 100% al 115%), generando que cargos antiguos quedaran congelados en la escala vieja mientras los nuevos ingresaban en la escala paritaria.
2. **Traslados Edilicios no Formalizados:** Escuelas que cambiaron físicamente de edificio o departamento, pero cuyo código presupuestario en liquidaciones nunca fue modificado.
3. **Absorción de Adicionales Directivos:** El código `A04` absorbió adicionales jerárquicos o de supervisión en ciertos sectores, generando porcentajes irregulares que aparentan ser errores pero tienen explicación sistémica.

---

## 5. HOJA DE RUTA Y RECOMENDACIONES PARA LAS AUTORIDADES

Para transformar este diagnóstico en una solución administrativa definitiva, se recomienda ejecutar las siguientes acciones organizadas en tres fases:

### 💡 Recomendación 1: Conformación de la Mesa de Trabajo Interdisciplinaria
Crear de forma inmediata un **Comité de Saneamiento y Readecuación Salarial** integrado por representantes de tres áreas clave:
1. **Dirección de Liquidaciones de Haberes** (para revisar fórmulas de cómputo y códigos de sector).
2. **Dirección de Asuntos Jurídicos / Planeamiento Educativo** (para verificar Decretos y Resoluciones respaldatorias).
3. **Dirección de Informática / Administración SIGE** (para actualizar el padrón oficial de escuelas).

### 💡 Recomendación 2: Plan de Acción por Fases
* **Fase 1 (Corto Plazo - 30 días): Readecuación de Sobrepagos Críticos (`🔴 +2` o superior)**
  Verificar la existencia de decretos de traslado. En caso de no existir norma respaldatoria, emitiendo la notificación cautelar a Liquidaciones para ajustar el radio al valor legal en la siguiente nómina.
* **Fase 2 (Mediano Plazo - 60 días): Protección de Derechos y Subpagos (`🟡 -1`)**
  Regularizar con prioridad los 32 sectores donde el personal percibe menos de lo que le corresponde legalmente, evitando la acumulación de reclamos retroactivos.
* **Fase 3 (Largo Plazo - 90 días): Saneamiento de Residuales y Vinculación CUE**
  Dictaminar los 194 registros residuales en la plataforma, clasificándolos como *Justificado Legal*, *Error de Liquidación* o *Caso Especial* e ingresando el número de norma legal aval.

### 💡 Recomendación 3: Institucionalización del Cruce Automatizado Mensual
Establecer como procedimiento obligatorio que el motor de auditoría **EDU-Auditor** se ejecute de forma previa a cada cierre de liquidación mensual. Esto garantizará que no ingresen nuevas inconsistencias y mantendrá la nómina provincial 100% saneada.

---

## 6. CONCLUSIÓN

El sistema de auditoría desarrollado ha permitido pasar de una incertidumbre histórica a una **certeza técnica absoluta**. El Ministerio de Educación de la Provincia de San Juan cuenta hoy con el diagnóstico completo, la plataforma informática para gestionar cada caso y una propuesta clara de saneamiento institucional.

Queda el presente informe y la herramienta informática a disposición de las autoridades para su evaluación y toma de decisiones.

---

*Informe elaborado y presentado por el Equipo de Auditoría y Control Administrativo de Liquidaciones.*  
*Ministerio de Educación — Provincia de San Juan.*
