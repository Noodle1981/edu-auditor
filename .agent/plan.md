# Plan de Reestructuración: Monolito Laravel + React (EDU-Auditor)

Este documento detalla el plan paso a paso para migrar la aplicación actual (frontend React independiente y backend Python ligero) a un monolito robusto utilizando **Laravel 11+** e **Inertia.js con React** en el frontend.

## 1. Objetivos del Proyecto
- **Monolito sin APIs externas:** Evitar la complejidad de CORS y autenticación distribuida usando Inertia.js.
- **Base de Datos Única y Limpia:** Unificar solo las tablas críticas en un único archivo SQLite (`database/database.sqlite`), descartando las tablas innecesarias.
- **Roles y Permisos Claros:** 
  - `admin`: Acceso total, incluyendo la subida e importación de archivos CSV (`Designaciones.csv`, `Licencia.csv`, `reporte_agentes.csv`) para actualizar la base de datos.
  - `user` (administrativos): Acceso de solo lectura a las visualizaciones, búsquedas y auditorías, sin permisos de actualización de datos.
- **Carga de Datos Automatizada:** Adaptar los scripts de Python para poblar directamente la base de datos de Laravel.
- **Control de Versiones:** Desarrollar en la rama `feature/laraveliando` del repositorio `https://github.com/Noodle1981/edu-auditor.git`.

---

## 2. Plan de Implementación por Fases

### Fase 1: Preparación del Entorno y Estructura del Repositorio
1. **Respaldar el Frontend Actual:** Mover el contenido de `src`, `public`, `vite.config.ts`, `tsconfig.json`, `package.json` y `package-lock.json` a una carpeta temporal `_old_frontend/`.
2. **Respaldar las Bases de Datos:** Mover los archivos `.db` actuales a una carpeta temporal `_old_database/`.
3. **Instalar Laravel:** 
   - Crear el proyecto Laravel en la raíz utilizando Composer.
4. **Instalar Laravel Breeze con React e Inertia:**
   - Instalar Laravel Breeze y ejecutar el instalador para preconfigurar Inertia.js, React, Vite y TailwindCSS de manera automática.
5. **Configurar el Repositorio de Git:**
   - Comprobar que estamos en la rama `feature/laraveliando`.
   - Configurar el remote a `https://github.com/Noodle1981/edu-auditor.git`.

### Fase 2: Unificación y Limpieza de la Base de Datos
1. **Establecer Base de Datos Principal:**
   - Copiar `establecimientos.sqlite` a `database/database.sqlite`.
   - Limpiar la base de datos eliminando las tablas no deseadas (`activity_logs`, `auditorias_eduge`, `historial_estados_modalidad`, `reportes`, etc.).
   - Conservar únicamente las tablas estructurales críticas:
     - `edificios`
     - `establecimientos`
     - `modalidades`
     - `users` (para la gestión de autenticación)
     - Tablas base de Laravel (`migrations`, `sessions`, `password_reset_tokens`, `cache`, etc.).
   - Configurar el archivo `.env` de Laravel para usar SQLite apuntando a `database/database.sqlite`.
2. **Crear Migraciones para las tablas de Importación:**
   - Crear migraciones en Laravel para las tablas `agentes`, `designaciones` y `licencias`.
   - Definir los campos y añadir índices relacionales en DNI, CUE, nombre, etc.
   - Ejecutar `php artisan migrate` para aplicar los cambios en la base de datos unificada.

### Fase 3: Adaptación de los Scripts Python de Carga
1. **Modificar Scripts de Carga:**
   - Actualizar `crear_base_datos_agentes.py`, `crear_base_datos_designaciones.py` y `crear_base_datos_licencias.py` para que escriban sus resultados directamente en `database/database.sqlite` (en lugar de crear archivos de base de datos independientes).
2. **Prescindir del Unificador Externo:**
   - Como la carga se realiza directamente en la base de datos unificada de Laravel, ya no se requiere el script `unificador.py`.
3. **Ejecutar Importaciones:**
   - Ejecutar los 3 scripts de Python para poblar las tablas `agentes`, `designaciones` y `licencias` en la base de datos local.

### Fase 4: Modelos y Controladores Eloquent
1. **Crear Modelos de Laravel:**
   - `Agente`, `Designacion`, `Licencia`
   - `Establecimiento`, `Edificio`, `Modalidad`
   - `User` (ya viene por defecto)
2. **Configurar Relaciones Eloquent:**
   - Un `Agente` se relaciona con sus `Licencias` y `Designaciones` a través de la columna `dni`.
   - Un `Establecimiento` pertenece a un `Edificio` y tiene muchas `Modalidades`.
3. **Desarrollar Controladores:**
   - **`DashboardController`:** Recuperar estadísticas demográficas y de escuelas.
   - **`AgenteController`:** Listado, paginación, filtros y perfil.
   - **`LicenciaController`:** Búsquedas, filtros de días e inconsistencias.
   - **`DesignacionController`:** Búsquedas y filtros.
   - **`AnalyticsController`:** Escuelas con mayores licencias, licencias sin suplente y solapamientos.
   - **`TrasladosController`:** Auditoría de traslados críticos utilizando la distancia Haversine.
   - **`ImportController`:** Controlador accesible únicamente para el rol `admin` que permita cargar los CSVs y disparar/ejecutar de forma interna la actualización de la DB.
4. **Configurar Rutas en Laravel:**
   - Definir las rutas en `routes/web.php` protegiéndolas con los middlewares `auth` y verificación de roles.

### Fase 5: Migración del Frontend (React + Inertia)
1. **Migrar Componentes:** Copiar componentes y vistas desde `_old_frontend/src` a `resources/js/`.
2. **Adaptar Enrutamiento:** Reemplazar `react-router-dom` con el enrutamiento y enlaces de Inertia.
3. **Adaptar Consumo de Datos:** Pasar la información directamente desde los controladores de Laravel como props de Inertia.
4. **Página de Carga de Datos (Exclusiva Admin):**
   - Crear una interfaz administrativa premium con drag-and-drop para subir los archivos `Designaciones.csv`, `Licencia.csv` y `reporte_agentes.csv`.
   - Mostrar estado e historial de importaciones.
   - Restringir la visualización y acceso a esta sección para usuarios no administradores.

### Fase 6: Autenticación y Control de Roles
1. **Usuarios Preexistentes:** La base de datos ya cuenta con dos usuarios creados en la tabla `users`:
   - **Admin:** `Admin@example.com` (Rol: `admin`) -> Tiene permisos para subir los CSVs y ver todo.
   - **User:** `Administrativo@example.com` (Rol: `administrativos`) -> Solo puede ver estadísticas, listados y auditorías. No puede subir archivos.
2. **Configurar Middleware de Seguridad:**
   - Implementar la restricción de rutas en `routes/web.php` usando un middleware que valide el campo `role` del usuario.

---

## 3. Plan de Verificación y Pruebas
1. **Verificación de Carga de Datos (Python):** 
   - Ejecutar los scripts de importación y validar que las filas se inserten correctamente en la base de datos SQLite única.
2. **Prueba de Autenticación y Roles:**
   - Iniciar sesión como `admin` y validar acceso al panel de carga de CSVs.
   - Iniciar sesión como `user` y validar que el acceso al panel de carga y a las rutas de importación esté denegado (HTTP 403).
3. **Verificación de UI y UX:**
   - Asegurar que las vistas React se muestren de forma idéntica, con su diseño premium, y carguen los datos en milisegundos.
