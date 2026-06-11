import re
import csv
import sqlite3
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(base_dir, "Designaciones.csv")
db_path = os.path.join(base_dir, "designaciones.db")

print("Starting Database Creation Process for Designaciones...")
if not os.path.exists(csv_path):
    print(f"Error: CSV file not found at {csv_path}!")
    exit(1)

# Define expected turn values for normalization
expected_turns_raw_str = (
    "VESPERTINO, MAÑANA, MAÑANA Y TARDE, VESPERTINO / NOCHE, TARDE, "
    "MAÑANA / VESPERTINO, TARDE/VESPERTINO, NOCHE, MAÑANA/TARDE/VESPERTINO/NOCHE, "
    "TARDE / VESPERTINO / NOCHE, INTERTURNO, INTERMEDIO, JORNADA COMPLETA, UNICO, "
    "ROTATIVO: MAÑANA-TARDE-NOCHE, MAÑANA Y TARDE EMER, MAÑANA Y TARDE CON ROTACIÓN, "
    "MAÑANA CON JORNADA EXTENDIDA, TARDE/NOCHE, INTERTURNO / TARDE Y DIURNO"
)

# Clean and normalize expected turns list, sorting by length descending to match longest first
expected_turns = []
for turn_phrase in expected_turns_raw_str.split(','):
    normalized = turn_phrase.replace('/', ' / ').strip().upper()
    if normalized:
        expected_turns.append(normalized)
expected_turns = sorted(list(set(expected_turns)), key=len, reverse=True)

# Helper function to find matching turn in text
def find_matching_turn(text):
    if not text or not isinstance(text, str):
        return None
    text_upper = text.upper()
    for turn in expected_turns:
        if turn in text_upper:
            return turn
    return None

# Helper to combine turns
def combine_turns(current_turno, col_val):
    if not col_val or not isinstance(col_val, str):
        return current_turno
    
    col_upper = col_val.strip().upper()
    # Trigger values for combination
    triggers = [
        "TARDE Y/O VESPERTINO", "TARDE Y VESPERTINO", "VESPERTINO", 
        "TARDE Y MAÑANA", "NOCHE", "INTERTURNO Y TARDE", "MAÑANA", 
        "TARDE", "INTERMEDIO Y TARDE"
    ]
    triggers_upper = [t.upper() for t in triggers]
    
    if col_upper in triggers_upper:
        current_components = [t.strip() for t in current_turno.split(',') if t.strip()] if current_turno else []
        if col_upper not in current_components:
            if current_turno:
                return f"{current_turno}, {col_upper}"
            else:
                return col_upper
    return current_turno

try:
    print("Step 1: Reading and grouping raw lines from CSV...")
    with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
        raw_lines = [line.replace('PRODUCCIÓN: DIBUJO, PINTURA, ESCULTURA Y GRABADO', 'PRODUCCIÓN: DIBUJO - PINTURA - ESCULTURA Y GRABADO').replace('PRODUCCIÓ: DIBUJO, PINTURA, ESCULTURA Y GRABADO', 'PRODUCCIÓ: DIBUJO - PINTURA - ESCULTURA Y GRABADO') for line in f.readlines()]
    
    header_line = raw_lines[0].strip()
    raw_lines = raw_lines[1:]
    
    logical_rows_str = []
    current_row_str = ""
    
    # Group lines that belong to the same logical record
    for line in raw_lines:
        if re.match(r'^"?\d+,', line):
            if current_row_str:
                logical_rows_str.append(current_row_str)
            current_row_str = line
        else:
            current_row_str += " " + line
            
    if current_row_str:
        logical_rows_str.append(current_row_str)
        
    print(f"Grouped {len(logical_rows_str)} logical records from CSV.")
    
    # Establish SQLite connection (re-runnable, will delete table if exists)
    print("Step 2: Connecting to SQLite and creating table structure...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("DROP TABLE IF EXISTS designaciones")
    cursor.execute("""
        CREATE TABLE designaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            centro INTEGER,
            establecimiento TEXT,
            escalafon TEXT,
            cupof TEXT,
            cue INTEGER,
            cargo_horas TEXT,
            horas_catedra INTEGER,
            turno TEXT,
            plan_estudio TEXT,
            nombre_agente TEXT,
            dni TEXT,
            genero TEXT,
            legajo TEXT,
            fecha_alta TEXT,
            situacion_revista TEXT,
            norma_legal TEXT,
            observaciones TEXT,
            control_id TEXT
        )
    """)
    
    print("Step 3: Parsing and normalising records...")
    insert_data = []
    
    for idx, row_str in enumerate(logical_rows_str):
        # Robust parsing for wrapped or unwrapped CSV rows
        cleaned_str = row_str.replace('\n', ' ').replace('\r', ' ').strip()
        if cleaned_str.startswith('"') and cleaned_str.endswith('"'):
            cleaned_str = cleaned_str[1:-1]
            cleaned_str = cleaned_str.replace('""', '"')
            parsed_row = next(csv.reader([cleaned_str]))
        else:
            parsed_row = next(csv.reader([cleaned_str]))
        
        # Extract columns and pad if needed
        # We need at least 16 columns.
        if len(parsed_row) < 16:
            parsed_row += [''] * (16 - len(parsed_row))
            
        # Clean basic values
        centro = int(parsed_row[0].strip()) if parsed_row[0].strip().isdigit() else 0
        establecimiento = parsed_row[1].strip()
        
        # Escalafon normalization
        escalafon = parsed_row[2].strip().replace('"', '')
        escalafon = re.sub(r'\s+', ' ', escalafon).upper()
        escalafon = re.sub(r'ARTE Y DISEÑO', 'DOCENTE', escalafon)
        escalafon = re.sub(r'^PROFESORA IOLE LEBE PALMOLELLI DE MASCOTTI.*', 'DOCENTE', escalafon)
        
        cupof = parsed_row[3].strip()
        
        # CUE dynamic extraction
        cue = None
        if cupof and '-' in cupof:
            cue_part = cupof.split('-')[0].strip()
            if cue_part.isdigit():
                cue = int(cue_part)
                
        cargo_horas = parsed_row[4].strip()
        
        # Extract hours cátedra
        horas_catedra = 0
        match_hs = re.search(r'(\d+)\s*Hs', cargo_horas, re.IGNORECASE)
        if match_hs:
            horas_catedra = int(match_hs.group(1))
        
        # Turno normalization
        col_temporal_turno = parsed_row[5].strip() # raw turno field
        col_plan_estudio = parsed_row[6].strip()   # NombrePlanDeEstudio_1
        
        # Start with matching Raw Turno exactly
        turno = None
        col_temp_upper = col_temporal_turno.upper()
        if col_temp_upper in expected_turns:
            turno = col_temp_upper
            
        # If Turno is empty/null, try to extract it from cargo_horas (TIPO_DE_CUPOF)
        if not turno:
            turno = find_matching_turn(cargo_horas)
            
        # If still empty, try to match within the Raw Turno itself
        if not turno and col_temporal_turno:
            turno = find_matching_turn(col_temporal_turno)
            
        # Second Pass: Combine Turno with Plan Estudio
        turno = combine_turns(turno, col_plan_estudio)
        
        # Clean up strings
        if turno:
            turno = turno.strip()
            if turno.upper() == 'NONE' or turno == '':
                turno = None
                
        plan_estudio = col_plan_estudio.replace('"', '').strip()
        
        # Agent Name
        nombre_agente = parsed_row[7].strip().replace('"', '')
        nombre_agente = re.sub(r'\s+', ' ', nombre_agente).upper()
        
        dni = parsed_row[8].strip()
        genero = parsed_row[9].strip().upper()
        legajo = parsed_row[10].strip()
        fecha_alta = parsed_row[11].strip()
        situacion_revista = parsed_row[12].strip().upper()
        norma_legal = parsed_row[13].strip()
        observaciones = parsed_row[14].strip()
        control_id = parsed_row[15].strip()
        
        insert_data.append((
            centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
            turno, plan_estudio, nombre_agente, dni, genero, legajo, 
            fecha_alta, situacion_revista, norma_legal, observaciones, control_id
        ))

    print(f"Step 4: Inserting {len(insert_data)} rows into designaciones database...")
    cursor.executemany("""
        INSERT INTO designaciones (
            centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
            turno, plan_estudio, nombre_agente, dni, genero, legajo, 
            fecha_alta, situacion_revista, norma_legal, observaciones, control_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, insert_data)
    
    print("Step 5: Creating database indexes for sub-millisecond querying...")
    cursor.execute("CREATE INDEX idx_designaciones_dni ON designaciones(dni)")
    cursor.execute("CREATE INDEX idx_designaciones_nombre ON designaciones(nombre_agente)")
    cursor.execute("CREATE INDEX idx_designaciones_cue ON designaciones(cue)")
    cursor.execute("CREATE INDEX idx_designaciones_establecimiento ON designaciones(establecimiento)")
    cursor.execute("CREATE INDEX idx_designaciones_revista ON designaciones(situacion_revista)")
    cursor.execute("CREATE INDEX idx_designaciones_escalafon ON designaciones(escalafon)")
    cursor.execute("CREATE INDEX idx_designaciones_horas ON designaciones(horas_catedra)")
    
    conn.commit()
    conn.close()
    print("Database creation and population completed successfully!")
    print(f"New separate database file created at: {db_path}")

except Exception as e:
    print(f"Database population process failed! Error: {e}")
