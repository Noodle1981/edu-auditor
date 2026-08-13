import pandas as pd

df = pd.read_excel('SUELDO202605_DefAjustado_escuelas_minimizado.xlsx', usecols=['APELLIDO Y NOMBRE', 'CUIL', 'FECHA DE NACIMIENTO', 'ANTIGUEDAD', 'CENTRO', 'SECTOR'])
row = df[df['CUIL'].astype(str).str.contains('16997691')]
print("=== REGISTRO EN EXCEL MINIMIZADO ===")
print(row.to_string())
