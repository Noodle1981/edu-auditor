import pandas as pd
import sqlite3
import re
import time

t0 = time.time()
print("=== POBLANDO FECHA DE NACIMIENTO Y ANTIGUEDAD DESDE EXCEL ===")

db_path = "database/database.sqlite"
excel_path = "SUELDO202605_DefAjustado_escuelas_minimizado.xlsx"

print("Cargando Excel...")
df = pd.read_excel(excel_path, usecols=['CUIL', 'FECHA DE NACIMIENTO', 'ANTIGUEDAD'])
df = df.dropna(subset=['CUIL'])

excel_map = {}
for idx, row in df.iterrows():
    try:
        cuil_clean = str(int(float(row['CUIL'])))
    except:
        continue

    if not cuil_clean or cuil_clean in excel_map:
        continue
    
    fnac_raw = str(row['FECHA DE NACIMIENTO']) if pd.notna(row['FECHA DE NACIMIENTO']) else ''
    fnac_clean = re.sub(r'[^0-9]', '', fnac_raw.split('.')[0])
    
    fnac_formatted = None
    if len(fnac_clean) == 5:
        fnac_clean = '0' + fnac_clean
    if len(fnac_clean) == 6:
        day = fnac_clean[0:2]
        month = fnac_clean[2:4]
        year_short = int(fnac_clean[4:6])
        year_full = 1900 + year_short if year_short >= 25 else 2000 + year_short
        fnac_formatted = f"{day}/{month}/{year_full}"

    antig_val = None
    if pd.notna(row['ANTIGUEDAD']):
        try:
            antig_val = int(float(row['ANTIGUEDAD']))
        except:
            pass

    if fnac_formatted or antig_val is not None:
        excel_map[cuil_clean] = (fnac_formatted, antig_val)

print(f"Excel mapeado ({len(excel_map)} personas en {round(time.time() - t0, 2)}s). Leyendo Base de Datos...")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, cuil FROM nomina_sueldo_registros")
db_rows = cursor.fetchall()

updates = []
for r_id, r_cuil in db_rows:
    cuil_clean = re.sub(r'[^0-9]', '', str(r_cuil or ''))
    if cuil_clean in excel_map:
        fnac, antig = excel_map[cuil_clean]
        updates.append((fnac, antig, r_id))

print(f"Realizando {len(updates)} actualizaciones en la base de datos...")

cursor.executemany("""
    UPDATE nomina_sueldo_registros 
    SET fecha_nacimiento = COALESCE(?, fecha_nacimiento),
        antiguedad_anios = COALESCE(?, antiguedad_anios)
    WHERE id = ?
""", updates)

conn.commit()
conn.close()

print(f"OK! {len(updates)} registros de nomina actualizados con exito en {round(time.time() - t0, 2)}s.")
