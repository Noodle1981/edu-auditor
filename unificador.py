import sqlite3
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
unified_db = os.path.join(base_dir, "database.db")

# Paths de origen
src_agentes = os.path.join(base_dir, "agentes.db")
src_designaciones = os.path.join(base_dir, "designaciones.db")
src_licencias = os.path.join(base_dir, "licencias.db")
src_establecimientos = os.path.join(base_dir, "establecimientos.sqlite")

print("=== INICIANDO PROCESO DE UNIFICACIÓN EN database.db ===")

# 1. Eliminar base de datos unificada previa si existe para recreación limpia
if os.path.exists(unified_db):
    print("Eliminando base de datos unificada anterior...")
    try:
        os.remove(unified_db)
    except Exception as e:
        print(f"Error al eliminar database.db: {e}. Asegurate de cerrar procesos que la bloqueen.")
        exit(1)

# Conectar a la base de datos unificada nueva
conn = sqlite3.connect(unified_db)
cursor = conn.cursor()

def copiar_tabla(src_db_path, src_table, dest_table=None):
    if not dest_table:
        dest_table = src_table
        
    if not os.path.exists(src_db_path):
        print(f"Error: Base de datos origen no encontrada en {src_db_path}!")
        return False
        
    print(f"Copiando tabla '{src_table}' desde '{os.path.basename(src_db_path)}'...")
    try:
        # ATTACH de la base de datos origen
        cursor.execute(f"ATTACH DATABASE ? AS src_db", (src_db_path,))
        
        # Crear tabla copia y poblarla
        cursor.execute(f"CREATE TABLE {dest_table} AS SELECT * FROM src_db.{src_table}")
        
        # Obtener cantidad de filas copiadas
        cursor.execute(f"SELECT COUNT(*) FROM {dest_table}")
        count = cursor.fetchone()[0]
        print(f"  --> Copiada con éxito! {count:,} registros insertados.")
        
        # DETACH
        cursor.execute("DETACH DATABASE src_db")
        return True
    except Exception as e:
        print(f"  --> Error copiando tabla '{src_table}': {e}")
        try:
            cursor.execute("DETACH DATABASE src_db")
        except:
            pass
        return False

# 2. Ejecutar copias nativas en C (ultra veloces con ATTACH)
copiar_tabla(src_agentes, "agentes")
copiar_tabla(src_designaciones, "designaciones")
copiar_tabla(src_licencias, "licencias")
copiar_tabla(src_establecimientos, "establecimientos")
copiar_tabla(src_establecimientos, "edificios")
copiar_tabla(src_establecimientos, "modalidades")

# 3. Crear índices optimizados para cruces y búsquedas en submilisegundos
print("\nCreando índices relacionales unificados...")
try:
    # Índices Agentes
    cursor.execute("CREATE INDEX idx_agentes_dni ON agentes(dni)")
    cursor.execute("CREATE INDEX idx_agentes_cue ON agentes(cue)")
    cursor.execute("CREATE INDEX idx_agentes_nombre ON agentes(nombre_agente)")
    cursor.execute("CREATE INDEX idx_agentes_revista ON agentes(situacion_revista)")
    
    # Índices Designaciones
    cursor.execute("CREATE INDEX idx_designaciones_dni ON designaciones(dni)")
    cursor.execute("CREATE INDEX idx_designaciones_cue ON designaciones(cue)")
    cursor.execute("CREATE INDEX idx_designaciones_nombre ON designaciones(nombre_agente)")
    
    # Índices Licencias
    cursor.execute("CREATE INDEX idx_licencias_dni ON licencias(dni)")
    cursor.execute("CREATE INDEX idx_licencias_inicio ON licencias(fecha_inicio)")
    cursor.execute("CREATE INDEX idx_licencias_fin ON licencias(fecha_fin)")
    
    # Índices Establecimientos Físicos
    cursor.execute("CREATE INDEX idx_establecimientos_cue ON establecimientos(cue)")
    cursor.execute("CREATE INDEX idx_establecimientos_edificio ON establecimientos(edificio_id)")
    cursor.execute("CREATE INDEX idx_edificios_id ON edificios(id)")
    cursor.execute("CREATE INDEX idx_modalidades_est ON modalidades(establecimiento_id)")
    
    conn.commit()
    print("Índices creados exitosamente!")
except Exception as e:
    print(f"Error al crear índices: {e}")

# Obtener tamaño final de base de datos
db_size_mb = os.path.getsize(unified_db) / (1024 * 1024)
print(f"\n=== UNIFICACIÓN COMPLETADA EXITOSAMENTE! ===")
print(f"Base de datos consolidada creada en: {unified_db}")
print(f"Tamaño del archivo unificado: {db_size_mb:.2f} MB")

conn.close()
