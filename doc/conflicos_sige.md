# Módulo de Saneamiento de Conflictos de Datos Internos SIGE

**Sistema:** EDU-Auditor — Sistema de Auditoría de Compensación Geográfica y Haberes Docentes  
**Documento:** Especificación Técnica y Funcional del Módulo de Conflictos Internos SIGE  
**Ubicación:** `doc/conflicos_sige.md`  

---

## 1. Definición del Problema

Un **Conflicto Interno SIGE** ocurre cuando **un mismo código de Sector Presupuestario (Sector A04)** tiene registradas múltiples modalidades o niveles educativos en la base de datos SIGE (`modalidades`), y a cada una de ellas se le ha asignado un **Radio oficial diferente**.

$$\text{Condición de Conflicto: } \text{COUNT}(\text{DISTINCT } \text{modalidades.radio FOR } \text{sector}) > 1$$

En la auditoría de la plataforma se identificaron **27 sectores presupuestarios** con esta ambigüedad interna.

---

## 2. Origen Técnico de los Conflictos

1. **Sectores Compartidos entre Primaria y Secundaria:**
   Sectores donde una escuela primaria y una escuela secundaria comparten el mismo número de sector, pero la norma legal aprobó un incremento de radio para el nivel secundario y no para el primario (o viceversa).
2. **Edificios con Anexos en Distintas Ubicaciones:**
   Escuelas donde la sede central está en un departamento central (Radio 1 o 2) y el anexo funciona en una zona rural (Radio 4 o 5), pero ambas modalidades liquidan bajo el mismo sector presupuestario.
3. **Carga Duplicada en SIGE:**
   Errores de tipeo en las normativas cargadas históricamente en el SIGE.

---

## 3. Ejemplos Reales de Conflictos Detectados

* **Sector 685 (La Chimbera / Fray Justo):**
  * *Nivel Primario / Adultos:* Radio 4
  * *Nivel Secundario:* Radio 5
  * *Efecto:* Docentes liquidados con el mismo sector presupuestario perciben radios distintos según la dirección de área.
* **Sector 768 (Albergue Josefa Ramírez):**
  * *Modalidad Albergue:* Radio 6
  * *Modalidad Primaria Común:* Radio 5

---

## 4. Estrategia de Resolución y Saneamiento

El módulo de **Conflictos SIGE** proporciona tres vías de solución:

```mermaid
graph TD
    A["Sector con Conflicto SIGE (Multi-Radio)"] --> B{"¿Tiene Anexo o Nivel Distinto?"}
    B -- Sí --> C["Vía 1: Desglose en 2 Sectores Presupuestarios Independientes"]
    B -- No --> D{"¿Es un Error de Carga?"}
    D -- Sí --> E["Vía 2: Unificación al Radio Vigente según Decreto"]
    D -- No --> F["Vía 3: Homologación por Mayoría Nivel Educativo"]
```

---

## 5. Funcionalidades en el Panel de Auditoría

1. **Identificación Transparente:**
   Muestra el listado de los 27 sectores en conflicto, listando los radios distintos conviviendo en el SIGE (ej. `Radio 1, Radio 4`), las escuelas involucradas y las direcciones de área.
2. **Asignación de Dictamen Técnico:**
   Permite al auditor documentar qué radio debe prevalecer para cada nivel educativo o si se requiere emitir una nueva resolución de desglose de sector.
