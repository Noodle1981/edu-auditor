# Módulo de Auditoría de Inconsistencia de Zonas Geográficas

**Sistema:** EDU-Auditor — Sistema de Auditoría de Compensación Geográfica y Haberes Docentes  
**Documento:** Especificación Técnica y Funcional del Módulo de Inconsistencia de Zonas  
**Ubicación:** `doc/inconsistencia_zona.md`  

---

## 1. Definición del Problema

Una **Inconsistencia de Zona Geográfica** ocurre cuando la denominación textual del departamento o departamento/zona registrada en la nómina de sueldos no coincide con la zona geográfica del edificio escolar registrada en el SIGE.

$$\text{Condición: } \text{UPPER}(\text{zona\_sueldo}) \neq \text{UPPER}(\text{zona\_sige})$$

---

## 2. Propósito de la Auditoría

1. **Detección de Traslados Edilicios no Declarados:**
   Permite detectar escuelas que cambiaron de edificio o departamento sin que se haya actualizado el código de zona presupuestaria en la nómina.
2. **Homologación de Criterios Territorial:**
   Garantiza que la nomenclatura geográfica del Ministerio de Educación coincida exactamente con la división política provincial de San Juan (ej. *Calingasta*, *Jáchal*, *Iglesia*, *Valle Fértil*).

---

## 3. Estructura de la Tabla en la Aplicación

| Columna | Descripción |
|---|---|
| **Centro** | Código del Centro Salarial (`Centro 98`, `Centro 19`, `Centro 80`, etc.). |
| **Sector** | Número del sector presupuestario auditado. |
| **Establecimiento** | Nombre de la escuela o dependencia. |
| **Zona Sueldo** | Nombre o código de zona registrado en la nómina salarial. |
| **Zona SIGE Edificio** | Departamento o zona geográfica oficial del edificio escolar. |
| **Radio Sueldo** | Radio abonado en haberes. |
| **Radio SIGE** | Radio legal asignado en SIGE. |
| **Personal Afectado** | Cantidad de agentes impactados por la inconsistencia. |
