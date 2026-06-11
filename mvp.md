¡Qué excelente y realista contexto! Lo que me estás describiendo es un escenario clásico en la ingeniería de software y la modernización de sistemas gubernamentales o corporativos:

Un sistema legado (SIGE) con una base de datos monstruosa (miles de tablas, lógica de negocio metida directamente en base de datos mediante triggers/procedures, deuda técnica acumulada de años).
Un intento de modernización (EDUGE) "por las malas" (intentando hacer espejo, ingeniería inversa de miles de tablas estructuradas de forma antigua) que lleva año y medio empantanado.
Tu propuesta: construir desde la perspectiva del negocio (los datos consolidados que realmente importan) en lugar de la infraestructura heredada.
Para responder a tus preguntas en forma directa: Sí, es absolutamente factible, y de hecho, es una de las estrategias de salvataje y modernización más exitosas que existen. Vamos a desglosar por qué y cómo planificarlo.

1. El Enfoque del "Sistema de Salvataje desde 0" (Usando los Reportes como Semilla)
Intentar replicar un sistema heredado de miles de tablas suele ser una trampa. Esas miles de tablas existen por parches históricos, malas decisiones de diseño o normalizaciones extremas de hace 20 años.

Sin embargo, los reportes oficiales (como tus CSV de Agentes, Licencias y Designaciones) representan la verdad de negocio consolidada. Son el resultado final de toda esa complejidad simplificado en conceptos que los humanos entienden: "Este es un agente, que tiene esta designación (cargo) y está usando esta licencia en esta fecha".

¿Cómo funcionaría un salvataje "desde 0"?
Modelo Orientado al Dominio (DDD): En lugar de miles de tablas, diseñamos un esquema limpio con solo las entidades clave de negocio: Agente, Establecimiento (Escuela), Designación (Cargo), Licencia e Incompatibilidad/Auditoría.
Sembrado (Seeding): Usamos los scripts de carga que estamos diseñando para "sembrar" (poblar) este nuevo sistema con el histórico consolidado de SIGE.
Transicionalidad: A partir de esa foto inicial limpia, le agregamos las pantallas de edición (ABM/CRUD) y flujos de trabajo (workflow) para que la carga de nuevas licencias o designaciones se haga directamente en este nuevo sistema limpio, con firmas digitales modernas.
Pasás de un dinosaurio de 2.000 tablas a un sistema moderno, mantenible y veloz de 15 a 20 tablas.

2. El Enfoque del "Portal Avanzado mediante APIs" (BFF - Backend For Frontend)
Si la empresa de EDUGE finalmente logra hacer funcionar su sistema pero este resulta lento, complejo o con una interfaz de usuario antigua, tu portal avanzado es la mejor solución intermedia.

Patrón BFF (Backend-for-Frontend): Tu portal no se conecta a las miles de tablas de EDUGE. Se conecta a las APIs de EDUGE para leer y escribir datos.
Sincronización Inteligente: Podés tener una base de datos local rápida (como PostgreSQL o SQLite) en tu portal. Cada noche (o cada hora) consultás las APIs de EDUGE para traerte los reportes/novedades y los guardás localmente.
Velocidad y UX Increíbles: Cuando los directores o administrativos consulten tu portal, las búsquedas e informes se generarán en milisegundos usando tus índices optimizados, en lugar de hacer sufrir al backend de EDUGE.
3. ¿Cómo planificar el MVP que estamos haciendo hoy?
Lo que estamos haciendo ahora con reporte_agentes.csv, Licencia.csv y Designaciones.csv es el cemento de esta estrategia. Estamos creando lo que en ingeniería de datos se llama un ODS (Operational Data Store) o un Data Mart.

Al tener estas tres fuentes cargadas en SQLite, podemos lograr cosas espectaculares que hoy SIGE probablemente no hace (o hace de forma muy lenta):

Detección de Inconsistencias (Cruces de Datos):
¿Hay agentes con licencias por largo tratamiento cargadas, pero que al mismo tiempo figuran con designaciones activas en otra escuela?
¿Hay DNI en el reporte de licencias que no existen en el padrón de agentes?
Cálculo de Incompatibilidades en Tiempo Real: Cruzar las horas cátedra de las designaciones con los turnos declarados y las licencias vigentes para ver si alguien está excedido o superpuesto.
Conclusión
Tu visión es sumamente acertada. No solo es viable, sino que es estratégicamente más inteligente que intentar pelear contra el diseño de base de datos heredado. Si EDUGE falla, tenés un MVP listo para convertirse en sistema independiente. Si EDUGE tiene éxito, tenés la base de datos optimizada para consumir sus APIs y montar un portal de visualización y auditoría premium en cuestión de semanas.