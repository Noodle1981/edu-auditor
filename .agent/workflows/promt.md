---
description: Vamos a hacer modificaciones
---

http://radios_cupof.test/mapa


Aquí tienes la explicación de cada regla:
1. COINCIDE
Se asigna este estado cuando el RADIO SIGE (km) coincide con los radios calculados por la auditoría (ya sea el basado en la distancia en línea recta/circunferencia o el basado en el camino real).
Significado: La asignación en el sistema es correcta y consistente con la ubicación geográfica del establecimiento.
Ejemplo: Si el radio calculado por camino es 3 y el sistema (SIGE) tiene registrado 3, el estado es COINCIDE.
2. DISTINTO
Se asigna cuando el RADIO SIGE (km) es diferente a los radios calculados por la auditoría.
Significado: Indica una posible asignación incorrecta en el sistema que debería ser revisada, aunque la diferencia no se considera crítica o "incongruente" bajo criterios técnicos más severos.
Ejemplo: Si el radio calculado es 3 pero el sistema tiene registrado 4, y la distancia del camino justifica un radio menor, se marca como DISTINTO.
3. INCONGRUENTE
Este estado representa una asignación errónea más severa. Según las notas de tu tabla, ocurre generalmente cuando el RADIO SIGE (km) es mayor al que debería corresponder según los cálculos.
Significado: Existe una contradicción lógica importante. Por ejemplo, cuando el radio asignado en el sistema es mucho más alto de lo que permite la distancia real medida, o cuando los propios datos de la auditoría (distancia vs. radio calculado) no guardan relación lógica entre sí.
Observación: El radio 4 km es el que presenta la mayor cantidad de estas inconsistencias en tus datos.
Referencia de Radios por Distancia
Basado en el análisis de tus datos, los radios parecen seguir estas reglas generales de distancia (aunque hay excepciones por casos particulares):
Radio 1: de 0 a 5 km.
Radio 2: de 5 a 10 km.
Radio 3: de 10 a 20 km.
Radio 4: de 20 a 30 km.
Radio 5: de 30 a 50 km.
Radio 6: más de 50 km.

la idea es presentar cada punto con sus numeros de radios en el formato actual naranja, y si filtro , estado, deberia aparecer los iconos de colores que coinciden (verde) incongruente (amarillo) y distinto (rojo),  as su vez ir desmarcando, por si quiero ver solo un tipo de estado. , tambien marcar los kilometros 0, ver como podriamos dibujar los "radios" para ver como "caen" un radio que no va en otro. La idea es auditar y demostrar la investigaciíon

