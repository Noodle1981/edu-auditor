---
description: Reestructuración proyecto
---

Necesito hacer una nueva versíon, vamos a amar un monolito, back laravel y fron react, es decir nos evitamos api entre ellas, usaremos todas las buenas practicas de seguridad, vamos usar 2 usuarios, admin y user

el contexto del proyecto es el siguiente, tenemos achivos csv, que se cargan mediante mediante la logica de pyhton, es decir que cada vez que suba Designaciónes.csv, Licencias.csv, reporte_agentes.csv, los crear_base_datos_agentes.py, crear_base_datos_designaciones.py y crear_base_datos_licencias se encargaran de alimentar a la db, si bien hay 4 bases distintas, yo necesito unificarla para una sola db. database.sqlite, crear la logica de los modelos, eloquent, tablas, ect. ademas tambien crear los controladores necesarios, cada py, deberia alimetar a una sola db. usar el react creado con las vista creadas, por supuesto usar las rutas para que laravel muestre los datos de la nueva db. este es el nuevo repositorio https://github.com/Noodle1981/edu-auditor.git, trabajar sobre una rama feature/laraveliando. Si tienes dudas, sugerencias, para implementar un plan de etapa, sprint, ect. puedes hacerlo.