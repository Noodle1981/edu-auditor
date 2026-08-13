import pandas as pd
import sqlite3
import re

print("=== POBLANDO FECHA DE NACIMIENTO Y ANTIGÜEDAD DESDE EXCEL ===")

db_path = "database/database.sqlite"
excel_path = "SUELDO202605_DefAjustado_escuelas_minimizado.xlsx"

print("Cargando Excel...")
df = pd.read_excel(excel_path, usecols=['CUIL', 'CENTRO', 'SECTOR', 'FECHA DE NACIMIENTO', 'ANTIGUEDAD'])
print(f"Excel cargado. Filas: {len(df)}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

updated_count = 0

for idx, row in df.iterrows():
    cuil_raw = str(row['CUIL']) if pd.notna(row['CUIL']) else ''
    cuil_clean = re.sub(r'[^0-9]', '', cuil_raw)
    
    if not cuil_clean:
        continue
        
    centro = int(row['CENTRO']) if pd.notna(row['CENTRO']) else None
    sector = int(row['SECTOR']) if pd.notna(row['SECTOR']) else None
    
    fnac_raw = str(row['FECHA DE NACIMIENTO']) if pd.notna(row['FECHA DE NACIMIENTO']) else ''
    fnac_clean = re.sub(r'[^0-9]', '', fnac_raw.split('.')[0])
    
    # Formatear fecha nacimiento DDMMYY -> DD/MM/YYYY
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
        cursor.execute("""
            UPDATE nomina_sueldo_registros 
            SET fecha_nacimiento = COALESCE(?, fecha_nacimiento),
                antiguedad_anios = COALESCE(?, antiguedad_anios)
            WHERE REPLACE(REPLACE(cuil, '-', ''), ' ', '') = ?
              AND centro = ?
              AND sector = ?
        """, (fnac_formatted, antig_val, cuil_clean, centro, sector))
        updated_count += cursor.rowcount

conn.commit()
conn.close()

print(f"✔ Proceso finalizado. Registros actualizados en BD: {updated_count}")
