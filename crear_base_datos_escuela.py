import sqlite3
import os
import sys

# Get project root folder
base_dir = os.path.dirname(os.path.abspath(__file__))

src_db_path = os.path.join(base_dir, "_old_database", "establecimientos.sqlite")
dest_db_path = os.path.join(base_dir, "database", "database.sqlite")

print("Starting School Database Seeding Process...")

if not os.path.exists(src_db_path):
    print(f"Error: Source database not found at {src_db_path}!")
    sys.exit(1)

if not os.path.exists(os.path.dirname(dest_db_path)):
    os.makedirs(os.path.dirname(dest_db_path), exist_ok=True)

src_conn = None
dest_conn = None

try:
    src_conn = sqlite3.connect(src_db_path)
    dest_conn = sqlite3.connect(dest_db_path)
    
    # Enable foreign keys
    dest_conn.execute("PRAGMA foreign_keys = OFF;") # Turn off foreign keys temporarily to clear and populate
    
    src_cursor = src_conn.cursor()
    dest_cursor = dest_conn.cursor()
    
    # Step 1: Clean destination tables
    print("Step 1: Cleaning existing school tables in destination database...")
    dest_cursor.execute("DELETE FROM modalidades")
    dest_cursor.execute("DELETE FROM establecimientos")
    dest_cursor.execute("DELETE FROM edificios")
    
    # Step 2: Copy Edificios
    print("Step 2: Copying Edificios...")
    src_cursor.execute("""
        SELECT id, cui, calle, numero_puerta, orientacion, codigo_postal, localidad, 
               latitud, longitud, letra_zona, zona_departamento, te_voip, 
               created_at, updated_at, deleted_at 
        FROM edificios
    """)
    edificios_rows = src_cursor.fetchall()
    print(f"Found {len(edificios_rows)} buildings to copy.")
    
    dest_cursor.executemany("""
        INSERT INTO edificios (
            id, cui, calle, numero_puerta, orientacion, codigo_postal, localidad, 
            latitud, longitud, letra_zona, zona_departamento, te_voip, 
            created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, edificios_rows)
    
    # Step 3: Copy Establecimientos
    print("Step 3: Copying Establecimientos...")
    src_cursor.execute("""
        SELECT id, edificio_id, cue, cue_edificio_principal, nombre, 
               establecimiento_cabecera, created_at, updated_at, deleted_at 
        FROM establecimientos
    """)
    est_rows = src_cursor.fetchall()
    print(f"Found {len(est_rows)} schools to copy.")
    
    dest_cursor.executemany("""
        INSERT INTO establecimientos (
            id, edificio_id, cue, cue_edificio_principal, nombre, 
            establecimiento_cabecera, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, est_rows)
    
    # Step 4: Copy Modalidades
    print("Step 4: Copying Modalidades...")
    src_cursor.execute("""
        SELECT id, establecimiento_id, direccion_area, nivel_educativo, sector, 
               categoria, inst_legal_categoria, radio, inst_legal_radio, 
               inst_legal_categoria_bis, inst_legal_creacion, ambito, validado, 
               created_at, updated_at, deleted_at, estado_validacion, 
               validado_por_user_id, validado_en, zona, observaciones, campos_auditados 
        FROM modalidades
    """)
    modalidades_rows = src_cursor.fetchall()
    print(f"Found {len(modalidades_rows)} modalities to copy.")
    
    dest_cursor.executemany("""
        INSERT INTO modalidades (
            id, establecimiento_id, direccion_area, nivel_educativo, sector, 
            categoria, inst_legal_categoria, radio, inst_legal_radio, 
            inst_legal_categoria_bis, inst_legal_creacion, ambito, validado, 
            created_at, updated_at, deleted_at, estado_validacion, 
            validado_por_user_id, validado_en, zona, observaciones, campos_auditados
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, modalidades_rows)
    
    dest_conn.commit()
    print("School database seeding completed successfully!")
    
except Exception as e:
    if dest_conn:
        dest_conn.rollback()
    print(f"Seeding process failed! Error: {e}")
    sys.exit(1)
finally:
    if src_conn:
        src_conn.close()
    if dest_conn:
        # Re-enable foreign keys
        try:
            dest_conn.execute("PRAGMA foreign_keys = ON;")
            dest_conn.close()
        except:
            pass
