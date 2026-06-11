import re
import csv
import sqlite3
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(base_dir, "Licencia.csv")
db_path = os.path.join(base_dir, "licencias.db")

print("Starting Database Creation Process for Licencias...")
if not os.path.exists(csv_path):
    print(f"Error: CSV file not found at {csv_path}!")
    exit(1)

try:
    print("Step 1: Reading raw lines and skipping report headers...")
    with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
        raw_lines = f.readlines()
        
    # Find header starting with 'IdTramite'
    header_idx = -1
    for idx, line in enumerate(raw_lines):
        if line.strip().startswith("IdTramite"):
            header_idx = idx
            break
            
    if header_idx == -1:
        print("Error: Could not find header starting with 'IdTramite' in Licencia.csv!")
        exit(1)
        
    data_lines = raw_lines[header_idx + 1:]
    
    print("Step 2: Grouping logical records...")
    logical_rows_str = []
    current_row_str = ""
    
    for line in data_lines:
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r'^\d+', stripped):
            if current_row_str:
                logical_rows_str.append(current_row_str)
            current_row_str = stripped
        else:
            current_row_str += " " + stripped
            
    if current_row_str:
        logical_rows_str.append(current_row_str)
        
    print(f"Grouped {len(logical_rows_str)} logical records from CSV.")
    
    # Establish SQLite connection (re-runnable, will delete table if exists)
    print("Step 3: Connecting to SQLite and creating table structure...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("DROP TABLE IF EXISTS licencias")
    cursor.execute("""
        CREATE TABLE licencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_tramite INTEGER,
            fecha_carga TEXT,
            nombre_agente TEXT,
            dni TEXT,
            genero TEXT,
            tipo_licencia TEXT,
            documento_respaldo TEXT,
            fecha_inicio TEXT,
            fecha_fin TEXT,
            dias INTEGER,
            referencia_interna INTEGER
        )
    """)
    
    print("Step 4: Parsing and normalising records...")
    insert_data = []
    
    for idx, row_str in enumerate(logical_rows_str):
        cleaned_str = row_str.replace('\n', ' ').replace('\r', ' ').strip()
        if cleaned_str.startswith('"') and cleaned_str.endswith('"'):
            cleaned_str = cleaned_str[1:-1]
        cleaned_str = cleaned_str.replace('""', '"')
        
        reader = csv.reader([cleaned_str])
        parsed_row = next(reader)
        
        if len(parsed_row) < 11:
            parsed_row += [''] * (11 - len(parsed_row))
            
        id_tramite = int(parsed_row[0].strip()) if parsed_row[0].strip().isdigit() else 0
        fecha_carga = parsed_row[1].strip()
        
        # Agent Name
        nombre_agente = parsed_row[2].strip().replace('"', '')
        nombre_agente = re.sub(r'\s+', ' ', nombre_agente).upper()
        
        dni = parsed_row[3].strip()
        genero = parsed_row[4].strip().upper()
        tipo_licencia = parsed_row[5].strip()
        documento_respaldo = parsed_row[6].strip()
        fecha_inicio = parsed_row[7].strip()
        fecha_fin = parsed_row[8].strip()
        
        dias = int(parsed_row[9].strip()) if parsed_row[9].strip().isdigit() else 0
        referencia_interna = int(parsed_row[10].strip()) if parsed_row[10].strip().isdigit() else 0
        
        insert_data.append((
            id_tramite, fecha_carga, nombre_agente, dni, genero, tipo_licencia,
            documento_respaldo, fecha_inicio, fecha_fin, dias, referencia_interna
        ))

    print(f"Step 5: Inserting {len(insert_data)} rows into licencias database...")
    cursor.executemany("""
        INSERT INTO licencias (
            id_tramite, fecha_carga, nombre_agente, dni, genero, tipo_licencia,
            documento_respaldo, fecha_inicio, fecha_fin, dias, referencia_interna
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, insert_data)
    
    print("Step 6: Creating database indexes for sub-millisecond querying...")
    cursor.execute("CREATE INDEX idx_licencias_dni ON licencias(dni)")
    cursor.execute("CREATE INDEX idx_licencias_nombre ON licencias(nombre_agente)")
    cursor.execute("CREATE INDEX idx_licencias_tipo ON licencias(tipo_licencia)")
    cursor.execute("CREATE INDEX idx_licencias_inicio ON licencias(fecha_inicio)")
    cursor.execute("CREATE INDEX idx_licencias_fin ON licencias(fecha_fin)")
    
    conn.commit()
    conn.close()
    print("Database creation and population completed successfully!")
    print(f"New separate database file created at: {db_path}")

except Exception as e:
    print(f"Database population process failed! Error: {e}")
