# Módulo de Inconsistencias de Zona Geográfica vs Letra de Zona SIGE

**Sistema:** EDU-Auditor — Sistema de Auditoría de Compensación Geográfica y Haberes Docentes  
**Documento:** Especificación Técnica y Funcional del Módulo de Inconsistencia de Zona  
**Ubicación:** `doc/inconsistencia_zona.md`  

---

## 1. Definición del Módulo

El módulo de **Inconsistencia de Zona** audita la correspondencia entre la **Letra de Zona de Inhospitalidad** asignada al edificio escolar (Zonas A, B, C, D, E, F, G, L, M, R, V) y los datos de liquidación y ubicación departamental.

---

## 2. Matriz Oficial de Zonas de San Juan

En la Provincia de San Juan, la clasificación por zona de inhospitalidad responde a franjas territoriales y de acceso:

| Letra Zona | Denominación / Ámbito | Departamentos / Zonas Típicas |
| :---: | :--- | :--- |
| **A / C** | Urbana Central | Capital, Santa Lucía, Chimbas, Rawson, Rivadavia. |
| **D / E** | Suburbana / Semi-Rural | Pocito, Albardón, Caucete, Angaco, 9 de Julio. |
| **F / G** | Rural Próxima | San Martín, Zonda, Ullum, 25 de Mayo, Sarmiento. |
| **L / M** | Rural Alejada | Jáchal, Iglesia, Calingasta. |
| **R / V** | Inhóspita / De Alta Montaña | Valle Fértil, Albergues de Iglesia/Jáchal, Pedernal. |

---

## 3. Detección de Inconsistencias

El sistema genera una alerta de **Inconsistencia de Zona** en los siguientes casos:

1. **Discrepancia entre Código A04 y Letra del Edificio:**
   Cuando la nómina salarial liquida una zona que difiere de la letra registrada en la tabla `edificios`.
2. **Ubicación Geográfica Imposible:**
   Por ejemplo, un establecimiento radicado en el departamento *Capital* o *Rivadavia* con asignación de *Zona R (Inhóspita)*, o una escuela de *Valle Fértil* o *Iglesia* con *Zona A (Urbana)*.

---

## 4. Objetivos y Utilidad Operativa

1. **Ordenamiento de la Matriz Geográfica:** Garantizar la coherencia entre el catastro escolar, el mapa y la liquidación.
2. **Cálculo de Distancias Viales (Radio Camino):** Integrar los radios de circunferencia y camino en kilómetros desde la Plaza 25 de Mayo para validar la letra de zona asignada.
3. **Auditoría Preventiva:** Identificar escuelas que hayan cambiado de edificio físico sin actualización de la letra de zona.
