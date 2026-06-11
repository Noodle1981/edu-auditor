# Original User Request

## Initial Request — 2026-06-11T18:36:39Z

Preparación del repositorio e inicialización de un nuevo proyecto Laravel con Inertia.js y React para la plataforma EDU-Auditor.

Working directory: d:\paradeb_instrumentacion
Integrity mode: development

## Requirements

### R1. Respaldo de archivos existentes
Mover todos los archivos y carpetas del frontend actual de React (en el directorio raíz) a una carpeta temporal llamada `_old_frontend/` y los archivos de base de datos a `_old_database/`. Evitar respaldar `node_modules` o archivos del sistema innecesarios.

### R2. Inicialización de Laravel con Inertia y React
Inicializar un nuevo proyecto Laravel en el directorio raíz del espacio de trabajo utilizando Composer. Instalar Laravel Breeze y configurarlo con la pila de React e Inertia.js, asegurando la instalación exitosa de dependencias de PHP y Node.js.

### R3. Configuración del Repositorio Git
Configurar el repositorio Git local para que apunte al origen remoto `https://github.com/Noodle1981/edu-auditor.git` en la rama `feature/laraveliando`.

## Verification Plan

### Automated Tests
- Validar la instalación de Laravel ejecutando `php artisan --version` y comprobar que responde correctamente.
- Validar la compilación del frontend ejecutando `npm run build` en la raíz del proyecto para comprobar que no existan errores de compilación con Vite.
- Validar la configuración del repositorio Git ejecutando `git remote -v` y `git branch --show-current`.

## Acceptance Criteria

### Estructura del Proyecto
- [ ] El directorio raíz contiene la estructura limpia de un proyecto Laravel.
- [ ] Los archivos de código fuente originales (carpeta `src`, `public`, etc.) están movidos a `_old_frontend/`.
- [ ] Las bases de datos antiguas están respaldadas en `_old_database/`.
- [ ] La carpeta `node_modules/` original en la raíz fue eliminada antes de la nueva instalación para evitar conflictos de dependencias.

### Dependencias e Integración
- [ ] `composer.json` contiene la dependencia de `laravel/breeze` e `inertiajs/inertia-laravel`.
- [ ] `package.json` contiene `@inertiajs/react`, `react` y `react-dom`.
- [ ] La compilación de producción con `npm run build` finaliza de manera exitosa sin errores de TypeScript o Vite.

### Control de Versiones
- [ ] La configuración local de Git tiene como remote origin a `https://github.com/Noodle1981/edu-auditor.git`.
- [ ] El espacio de trabajo local se encuentra actualmente en la rama `feature/laraveliando`.
