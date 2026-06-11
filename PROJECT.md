# Project: EDU-Auditor Migration

## Architecture
- **Frontend**: Inertia.js with React (migrated from a pure React SPA).
- **Backend**: Laravel framework (v10 or v11 depending on Composer default).
- **Database**: SQLite or other configured local databases (existing backups moved to `_old_database/`).
- **Build System**: Vite for asset compilation.

## Code Layout
- Root: Laravel project files (app, config, database, public, resources, routes, tests, composer.json, package.json, vite.config.js, etc.)
- `_old_frontend/`: Backup of previous React frontend code (src, public, config files).
- `_old_database/`: Backup of previous sqlite database files.

## Milestones
| # | Name | Scope | Dependencies | Status | Conversation ID |
|---|------|-------|--------------|--------|-----------------|
| 1 | Repo Prep & Backup | Move old frontend and databases, remove node_modules | none | DONE | bb3134d0-b4d6-459f-8e00-91527930418f |
| 2 | Laravel Init | Initialize new Laravel project in root | M1 | DONE | 2228d499-b4f8-4fb0-918e-8b0119d39d3f |
| 3 | Breeze & Inertia React | Install Breeze and set up Inertia.js + React | M2 | DONE | 2228d499-b4f8-4fb0-918e-8b0119d39d3f |
| 4 | Git Configuration | Configure git remote origin and feature/laraveliando branch | M3 | DONE | 2228d499-b4f8-4fb0-918e-8b0119d39d3f |

## Interface Contracts
- **Laravel Inertia Response Protocol**: All controllers return Inertia rendering page templates with matching props.
- **Node/Vite asset configuration**: Vite configuration resolves `@/` alias to `/resources/js/` directory for Inertia React pages.
