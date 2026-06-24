---
description: Vamos a hacer modificaciones
---

Este proyecto es una base, asi que está sujeto a modificaciones, 

primero debemos tener en cuenta que significa POF (Planta organica Funcional) que son las cantidades de plazas a cubrir en un establecimiento para que funcione, y luego tenemos PON (Planta organica nominal) que son la cantidad de agentes que estan trabajando / cubriendo esas plazas.

en el contexto ideal una escuela que necesita 10 plazas, estan cubiertos por 10 agentes, pero puede pasar que 2 agentes se encuentran de licencias, entonces hay 14 agentes en PON para un PON DE 10, se les paga 10 personas fijas y 2 más

el contexto de una cupof es la siguiente, si alguien es dueña de esa plaza es TITULAR, si la plaza no tiene dueño, la ocupa un INTERINO

un titular o interino, en caso de licencia lo cubre un suplemente, en el caso que cubra a un suplemente, lo cubre un reemplazante, en caso que se cubra a un reemplazantes se cubre con otro reemplanzante, asi como tantos reemplazantes se necesite

es decir que un cupof puede ser

cupof titular
cupof interino
cupof titular / suplente
cupof titular / suplente / reemplazante
cupof titular / suplente / reemplazante / reemplazante 0 mas
cupof interino
cupof interino / suplente
cupof interino / suplente / reemplazante 
cupor interino / suplente / reemplezante / reemplazante o mas



entonces entendido esto, necesito una vista, que se llame establecimientos, en donde se filtre por direccion_area, nivel_educativo tabla modalidades, departamento tabla edificio,, recordar que el CUE el establecimiento se asocia al CUPOFF. armar un plan por favor 