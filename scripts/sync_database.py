import sqlite3
import shutil
import datetime
import os
import sys
import pandas as pd

def sync_databases(dry_run=False):
    db_target_path = "database/database.sqlite"
    db_source_path = "database/establecimientos.sqlite"

    if not os.path.exists(db_target_path) or not os.path.exists(db_source_path):
        print(f"Error: Database file missing. Target: {db_target_path}, Source: {db_source_path}")
        sys.exit(1)

    print(f"=== Starting DB Sync (dry_run={dry_run}) ===")

    # Step 1: Backup target DB
    if not dry_run:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"database/database.sqlite.bak_{timestamp}"
        shutil.copy2(db_target_path, backup_path)
        print(f"[OK] Created backup at: {backup_path}")

    conn_target = sqlite3.connect(db_target_path)
    conn_source = sqlite3.connect(db_source_path)

    cursor_target = conn_target.cursor()
    cursor_source = conn_source.cursor()

    stats = {
        'edificios_updated': 0,
        'establecimientos_updated': 0,
        'establecimientos_inserted': 0,
        'modalidades_updated': 0,
        'modalidades_inserted': 0,
    }

    try:
        if not dry_run:
            cursor_target.execute("BEGIN TRANSACTION;")

        # -------------------------------------------------------------
        # 1. EDIFICIOS SYNC (Match by CUI)
        # -------------------------------------------------------------
        print("\n--- Syncing `edificios` ---")
        edif_cols_to_sync = ['calle', 'numero_puerta', 'orientacion', 'codigo_postal', 'localidad', 
                             'latitud', 'longitud', 'letra_zona', 'zona_departamento', 'te_voip']
        
        cursor_source.execute(f"SELECT cui, {', '.join(edif_cols_to_sync)} FROM edificios")
        source_edificios = cursor_source.fetchall()

        for row in source_edificios:
            cui = row[0]
            values = dict(zip(edif_cols_to_sync, row[1:]))

            # Fetch current target values
            cursor_target.execute(f"SELECT {', '.join(edif_cols_to_sync)} FROM edificios WHERE cui = ?", (cui,))
            target_row = cursor_target.fetchone()

            if not target_row:
                print(f"  [Warning] CUI {cui} found in source but missing in target buildings!")
                continue

            target_values = dict(zip(edif_cols_to_sync, target_row))

            # Compare values
            needs_update = False
            for k in edif_cols_to_sync:
                if str(target_values[k]) != str(values[k]) and not (target_values[k] is None and values[k] is None):
                    needs_update = True
                    break

            if needs_update:
                stats['edificios_updated'] += 1
                if not dry_run:
                    set_clause = ", ".join([f"{k} = ?" for k in edif_cols_to_sync])
                    params = [values[k] for k in edif_cols_to_sync] + [cui]
                    cursor_target.execute(f"UPDATE edificios SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE cui = ?", params)

        print(f"Edificios updated: {stats['edificios_updated']}")

        # -------------------------------------------------------------
        # 2. ESTABLECIMIENTOS SYNC (Match by ID / CUE)
        # -------------------------------------------------------------
        print("\n--- Syncing `establecimientos` ---")
        est_cols_to_sync = ['edificio_id', 'cue', 'cue_edificio_principal', 'nombre', 'establecimiento_cabecera']
        
        cursor_source.execute(f"SELECT id, {', '.join(est_cols_to_sync)} FROM establecimientos")
        source_establecimientos = cursor_source.fetchall()

        for row in source_establecimientos:
            est_id = row[0]
            values = dict(zip(est_cols_to_sync, row[1:]))

            cursor_target.execute(f"SELECT {', '.join(est_cols_to_sync)} FROM establecimientos WHERE id = ?", (est_id,))
            target_row = cursor_target.fetchone()

            if not target_row:
                # Insert missing establishment
                stats['establecimientos_inserted'] += 1
                print(f"  [INSERT] New establishment ID {est_id}: CUE={values['cue']}, Nombre='{values['nombre']}'")
                if not dry_run:
                    cols_str = "id, " + ", ".join(est_cols_to_sync) + ", created_at, updated_at"
                    placeholders = "?, " + ", ".join(["?"] * len(est_cols_to_sync)) + ", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP"
                    params = [est_id] + [values[k] for k in est_cols_to_sync]
                    cursor_target.execute(f"INSERT INTO establecimientos ({cols_str}) VALUES ({placeholders})", params)
            else:
                target_values = dict(zip(est_cols_to_sync, target_row))

                needs_update = False
                for k in est_cols_to_sync:
                    if str(target_values[k]) != str(values[k]) and not (target_values[k] is None and values[k] is None):
                        needs_update = True
                        break

                if needs_update:
                    stats['establecimientos_updated'] += 1
                    if not dry_run:
                        set_clause = ", ".join([f"{k} = ?" for k in est_cols_to_sync])
                        params = [values[k] for k in est_cols_to_sync] + [est_id]
                        cursor_target.execute(f"UPDATE establecimientos SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", params)

        print(f"Establecimientos updated: {stats['establecimientos_updated']}, inserted: {stats['establecimientos_inserted']}")

        # -------------------------------------------------------------
        # 3. MODALIDADES SYNC (Match by ID)
        # -------------------------------------------------------------
        print("\n--- Syncing `modalidades` ---")
        mod_cols_to_sync = ['establecimiento_id', 'direccion_area', 'nivel_educativo', 'sector', 
                            'categoria', 'inst_legal_categoria', 'radio', 'inst_legal_radio', 
                            'inst_legal_categoria_bis', 'inst_legal_creacion', 'ambito', 'validado', 
                            'estado_validacion', 'validado_por_user_id', 'validado_en', 'zona', 
                            'observaciones', 'campos_auditados']

        cursor_source.execute(f"SELECT id, {', '.join(mod_cols_to_sync)} FROM modalidades")
        source_modalidades = cursor_source.fetchall()

        for row in source_modalidades:
            mod_id = row[0]
            values = dict(zip(mod_cols_to_sync, row[1:]))

            cursor_target.execute(f"SELECT {', '.join(mod_cols_to_sync)} FROM modalidades WHERE id = ?", (mod_id,))
            target_row = cursor_target.fetchone()

            if not target_row:
                # Insert missing modalidad
                stats['modalidades_inserted'] += 1
                print(f"  [INSERT] New modalidad ID {mod_id}: est_id={values['establecimiento_id']}, area='{values['direccion_area']}'")
                if not dry_run:
                    cols_str = "id, " + ", ".join(mod_cols_to_sync) + ", created_at, updated_at"
                    placeholders = "?, " + ", ".join(["?"] * len(mod_cols_to_sync)) + ", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP"
                    params = [mod_id] + [values[k] for k in mod_cols_to_sync]
                    cursor_target.execute(f"INSERT INTO modalidades ({cols_str}) VALUES ({placeholders})", params)
            else:
                target_values = dict(zip(mod_cols_to_sync, target_row))

                needs_update = False
                for k in mod_cols_to_sync:
                    if str(target_values[k]) != str(values[k]) and not (target_values[k] is None and values[k] is None):
                        needs_update = True
                        break

                if needs_update:
                    stats['modalidades_updated'] += 1
                    if not dry_run:
                        set_clause = ", ".join([f"{k} = ?" for k in mod_cols_to_sync])
                        params = [values[k] for k in mod_cols_to_sync] + [mod_id]
                        cursor_target.execute(f"UPDATE modalidades SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", params)

        print(f"Modalidades updated: {stats['modalidades_updated']}, inserted: {stats['modalidades_inserted']}")

        if not dry_run:
            conn_target.commit()
            print("\n[SUCCESS] Transaction committed successfully!")

    except Exception as e:
        if not dry_run:
            conn_target.rollback()
            print(f"\n[ERROR] Transaction rolled back due to error: {e}")
        raise e
    finally:
        conn_target.close()
        conn_source.close()

    print("\n=== Sync Summary ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    is_dry_run = "--dry-run" in sys.argv
    sync_databases(dry_run=is_dry_run)
