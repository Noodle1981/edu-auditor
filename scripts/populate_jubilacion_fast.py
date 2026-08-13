import pandas as pd
import sqlite3
import re

print("=== POBLANDO FECHA DE NACIMIENTO Y ANTIGÜEDAD (BATCH RÁPIDO) ===")

db_path = "database/database.sqlite"
excel_path = "SUELDO202605_DefAjustado_escuelas_minimizado.xlsx"

df = pd.read_excel(excel_path, usecols=['CUIL', 'CENTRO', 'SECTOR', 'FECHA DE NACIMIENTO', 'ANTIGUEDAD'])
df = df.dropna(subset=['CUIL'])

batch_data = []
for idx, row in df.iterrows():
    cuil_raw = str(row['CUIL'])
    cuil_clean = re.sub(r'[^0-9]', '', cuil_raw)
    if not cuil_clean:
        continue
    
    centro = int(row['CENTRO']) if pd.notna(row['CENTRO']) else None
    sector = int(row['SECTOR']) if pd.notna(row['SECTOR']) else None
    
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
        batch_data.append((fnac_formatted, antig_val, cuil_clean, centro, sector))

print(f"Total registros preparados: {len(batch_data)}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.executemany("""
    UPDATE nomina_sueldo_registros 
    SET fecha_nacimiento = COALESCE(?, fecha_nacimiento),
        antiguedad_anios = COALESCE(?, antiguedad_anios)
    WHERE REPLACE(REPLACE(cuil, '-', ''), ' ', '') = ?
      AND centro = ?
      AND sector = ?
""", batch_data)

updated = cursor.rowcount
conn.commit()
conn.close()

print(f"✔ Proceso completado. Registros actualizados: {updated}")
