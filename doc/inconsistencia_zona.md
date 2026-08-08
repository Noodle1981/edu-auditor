# Módulo de Auditoría de Inconsistencia de Zonas Geográficas

**Sistema:** EDU-Auditor — Sistema de Auditoría de Compensación Geográfica y Haberes Docentes  
**Documento:** Especificación Técnica y Funcional del Módulo de Inconsistencia de Zonas  
**Ubicación:** `doc/inconsistencia_zona.md`  

---

## 1. Definición del Problema

Una **Inconsistencia de Zona Geográfica** ocurre cuando la denominación textual del departamento o zona registrada en la nómina de sueldos no coincide con la zona geográfica del edificio escolar registrada en el SIGE.

$$\text{Condición: } \text{UPPER}(\text{zona\_sueldo}) \neq \text{UPPER}(\text{zona\_sige})$$

---

## 2. Propósito de la Auditoría

1. **Detección de Traslados Edilicios no Declarados:**
   Permite detectar escuelas que cambiaron de edificio o departamento sin que se haya actualizado el código de zona presupuestaria en la nómina.
2. **Homologación de Criterios Territorial:**
   Garantiza que la nomenclatura geográfica del Ministerio de Educación coincida exactamente con la división política provincial de San Juan (*Calingasta*, *Jáchal*, *Iglesia*, *Valle Fértil*).

---

## 3. Estructura de la Tabla en la Aplicación

La tabla cuenta con cabeceras en Naranja Institucional (`bg-[#FE8204] text-white font-black`) y columnas estandarizadas:

| Columna | Descripción |
|---|---|
| **Centro** | Badge naranja con el código de Centro Salarial (`98`, `19`, `80`, `63`, etc.). |
| **Sector** | Número del sector presupuestario auditado. |
| **Establecimiento** | Nombre de la escuela o dependencia. |
| **Zona Sueldo** | Nombre o código de zona registrado en la nómina salarial. |
| **Zona SIGE Edificio** | Departamento o zona geográfica oficial del edificio escolar. |
| **Radio Sueldo** | Radio abonado en haberes (**`R1`** al **`R7`**). |
| **Radio SIGE** | Radio legal asignado en SIGE (**`R1`** al **`R7`**). |
| **Liquidaciones** | Cantidad total de liquidaciones de haberes afectadas (`COUNT(DISTINCT cuil)`). |
