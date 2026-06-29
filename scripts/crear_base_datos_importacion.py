import csv
import os
import sys
import re
import sqlite3
import argparse

# Add root folder to sys.path to import db_helper
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(base_dir)

import db_helper

# Define expected turn values for normalization
expected_turns_raw_str = (
    "VESPERTINO, MAÑANA, MAÑANA Y TARDE, VESPERTINO / NOCHE, TARDE, "
    "MAÑANA / VESPERTINO, TARDE/VESPERTINO, NOCHE, MAÑANA/TARDE/VESPERTINO/NOCHE, "
    "TARDE / VESPERTINO / NOCHE, INTERTURNO, INTERMEDIO, JORNADA COMPLETA, UNICO, "
    "ROTATIVO: MAÑANA-TARDE-NOCHE, MAÑANA Y TARDE EMER, MAÑANA Y TARDE CON ROTACIÓN, "
    "MAÑANA CON JORNADA EXTENDIDA, TARDE/NOCHE, INTERTURNO / TARDE Y DIURNO"
)

expected_turns = []
for turn_phrase in expected_turns_raw_str.split(','):
    normalized = turn_phrase.replace('/', ' / ').strip().upper()
    if normalized:
        expected_turns.append(normalized)
expected_turns = sorted(list(set(expected_turns)), key=len, reverse=True)

def find_matching_turn(text):
    if not text or not isinstance(text, str):
        return None
    text_upper = text.upper()
    for turn in expected_turns:
        if turn in text_upper:
            return turn
    return None

def combine_turns(current_turno, col_val):
    if not col_val or not isinstance(col_val, str):
        return current_turno
    
    col_upper = col_val.strip().upper()
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

def parse_csv_lines(file_path, import_type):
    lines = db_helper.safe_open_csv(file_path)
    raw_lines = [
        line.replace('PRODUCCIÓN: DIBUJO, PINTURA, ESCULTURA Y GRABADO', 'PRODUCCIÓN: DIBUJO - PINTURA - ESCULTURA Y GRABADO')
            .replace('PRODUCCIÓ: DIBUJO, PINTURA, ESCULTURA Y GRABADO', 'PRODUCCIÓ: DIBUJO - PINTURA - ESCULTURA Y GRABADO')
        for line in lines
    ]
    
    if import_type == 'licencias':
        # Find header index containing 'IdTramite' or 'txtAgente'
        header_idx = -1
        for idx, line in enumerate(raw_lines):
            line_lower = line.strip().lower()
            if "idtramite" in line_lower or "txtagente" in line_lower:
                header_idx = idx
                break
        if header_idx == -1:
            print("Error: Could not find header starting with 'IdTramite' or 'txtAgente'!")
            sys.exit(1)
            
        import io
        # Parse all raw lines starting from the header line using the standard csv.reader
        csv_content = "".join(raw_lines[header_idx + 1:])
        reader = csv.reader(io.StringIO(csv_content))
        parsed_rows = list(reader)
        # Filter out empty rows
        parsed_rows = [r for r in parsed_rows if any(cell.strip() for cell in r)]
        print(f"Parsed {len(parsed_rows)} logical records from CSV using standard csv reader.")
        return parsed_rows
        
    # Find real header index for agents/designations
    header_idx = 0
    for idx, line in enumerate(raw_lines):
        line_lower = line.strip().lower()
        if "numerodesector" in line_lower:
            header_idx = idx
            break

    header_line = raw_lines[header_idx].strip()
    data_lines = raw_lines[header_idx + 1:]
        
    logical_rows_str = []
    current_row_str = ""
    
    for line in data_lines:
        stripped = line.strip()
        if not stripped:
            continue
        
        # Determine logical row start based on import type
        is_start = False
        if import_type in ('agentes', 'agentes_designaciones'):
            is_start = bool(re.match(r'^"?\d+', line))
        elif import_type == 'designaciones':
            is_start = bool(re.match(r'^"?\d+,', line))
            
        if is_start:
            if current_row_str:
                logical_rows_str.append(current_row_str)
            current_row_str = line
        else:
            current_row_str += " " + line
            
    if current_row_str:
        logical_rows_str.append(current_row_str)
        
    print(f"Parsed {len(logical_rows_str)} logical records from CSV.")
    
    parsed_rows = []
    for row_str in logical_rows_str:
        cleaned_str = row_str.replace('\n', ' ').replace('\r', ' ').strip()
        reader = csv.reader([cleaned_str])
        try:
            parsed_rows.append(next(reader))
        except csv.Error:
            continue
            
    return parsed_rows

def read_excel_lines(file_path, import_type):
    import pandas as pd
    print("Reading Excel file using Pandas...")
    df = pd.read_excel(file_path, header=None)
    df = df.fillna('')
    for col in df.columns:
        df[col] = df[col].astype(str).str.strip()
    rows = df.values.tolist()
    
    # Filter header rows for licencias if it's there
    if import_type == 'licencias':
        header_idx = -1
        for idx, r in enumerate(rows):
            if r and str(r[0]).strip().lower().startswith('idtramite'):
                header_idx = idx
                break
        if header_idx != -1:
            rows = rows[header_idx + 1:]
    else:
        # For agents/designations, if first row has headers (like 'Centro', 'Establecimiento'), skip it
        if rows and ('centro' in str(rows[0][0]).lower() or 'establecimiento' in str(rows[0][1]).lower()):
            rows = rows[1:]
            
    return rows

def import_agentes(rows, year, conn):
    cursor = conn.cursor()
    print(f"Process Agentes: Deleting existing cargos for year {year}...")
    cursor.execute("DELETE FROM agente_cargos WHERE anio = ?", (year,))
    
    insert_agentes = []
    insert_cargos = []
    inserted_dnis = set()
    
    for idx, row in enumerate(rows):
        if len(row) < 16:
            row += [''] * (16 - len(row))
            
        centro = int(row[0].strip()) if row[0].strip().isdigit() else None
        establecimiento = row[1].strip()
        
        escalafon = row[2].strip().replace('"', '')
        escalafon = re.sub(r'\s+', ' ', escalafon).upper()
        escalafon = re.sub(r'ARTE Y DISEÑO', 'DOCENTE', escalafon)
        escalafon = re.sub(r'^PROFESORA IOLE LEBE PALMOLELLI DE MASCOTTI.*', 'DOCENTE', escalafon)
        
        cupof = row[3].strip()
        
        cue = None
        if cupof and '-' in cupof:
            cue_part = cupof.split('-')[0].strip()
            if cue_part.isdigit():
                cue = int(cue_part)
                
        # Handle shifted columns using right-to-left mapping
        if len(row) > 16:
            nombre_agente = row[-9].strip().replace('"', '')
            dni = row[-8].strip()
            genero = row[-7].strip().upper()
            legajo = row[-6].strip()
            fecha_alta = db_helper.normalize_date(row[-5].strip())
            situacion_revista = row[-4].strip().upper()
            norma_legal = row[-3].strip()
            observaciones = row[-2].strip()
            control_id = row[-1].strip()
            
            intermediate = row[4:-9]
            turno_idx = -1
            for i, val in enumerate(intermediate):
                if val.strip().upper() in expected_turns:
                    turno_idx = i
                    break
            
            if turno_idx >= 0:
                cargo_horas = ", ".join(intermediate[:turno_idx]).strip()
                col_temporal_turno = intermediate[turno_idx].strip()
                col_plan_estudio = ", ".join(intermediate[turno_idx+1:]).strip()
            else:
                cargo_horas = ", ".join(intermediate[:-1]).strip()
                col_temporal_turno = ""
                col_plan_estudio = intermediate[-1].strip()
        else:
            cargo_horas = row[4].strip()
            col_temporal_turno = row[5].strip()
            col_plan_estudio = row[6].strip()
            nombre_agente = row[7].strip().replace('"', '')
            dni = row[8].strip()
            genero = row[9].strip().upper()
            legajo = row[10].strip()
            fecha_alta = db_helper.normalize_date(row[11].strip())
            situacion_revista = row[12].strip().upper()
            norma_legal = row[13].strip()
            observaciones = row[14].strip()
            control_id = row[15].strip()

        if not dni or "textbox" in dni.lower() or "numerodesector" in nombre_agente.lower() or "[todas]" in nombre_agente.lower():
            continue
            
        horas_catedra = 0
        match_hs = re.search(r'(\d+)\s*Hs', cargo_horas, re.IGNORECASE)
        if match_hs:
            horas_catedra = int(match_hs.group(1))
        
        turno = None
        col_temp_upper = col_temporal_turno.upper()
        if col_temp_upper in expected_turns:
            turno = col_temp_upper
            
        if not turno:
            turno = find_matching_turn(cargo_horas)
            
        if not turno and col_temporal_turno:
            turno = find_matching_turn(col_temporal_turno)
            
        turno = combine_turns(turno, col_plan_estudio)
        
        if turno:
            turno = turno.strip()
            if turno.upper() == 'NONE' or turno == '':
                turno = None
                
        plan_estudio = col_plan_estudio.replace('"', '').strip()

        if dni and dni not in inserted_dnis:
            insert_agentes.append((dni, nombre_agente, genero, legajo, fecha_alta))
            inserted_dnis.add(dni)
            
        insert_cargos.append((
            dni, centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
            turno, plan_estudio, situacion_revista, norma_legal, observaciones, control_id, year
        ))

    print(f"Inserting/Updating {len(insert_agentes)} unique agents...")
    cursor.executemany("""
        INSERT OR IGNORE INTO agentes (
            dni, nombre_agente, genero, legajo, fecha_alta
        ) VALUES (?, ?, ?, ?, ?)
    """, insert_agentes)

    print(f"Inserting {len(insert_cargos)} cargos for year {year}...")
    cursor.executemany("""
        INSERT INTO agente_cargos (
            dni, centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
            turno, plan_estudio, situacion_revista, norma_legal, observaciones, control_id, anio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, insert_cargos)

def import_designaciones(rows, year, conn):
    cursor = conn.cursor()
    print(f"Process Designaciones: Deleting existing designaciones for year {year}...")
    cursor.execute("DELETE FROM designaciones WHERE anio = ?", (year,))
    
    insert_agentes = []
    insert_data = []
    inserted_dnis = set()
    
    for row in rows:
        if len(row) < 16:
            row += [''] * (16 - len(row))
            
        centro = int(row[0].strip()) if row[0].strip().isdigit() else None
        establecimiento = row[1].strip()
        
        escalafon = row[2].strip().replace('"', '')
        escalafon = re.sub(r'\s+', ' ', escalafon).upper()
        escalafon = re.sub(r'ARTE Y DISEÑO', 'DOCENTE', escalafon)
        escalafon = re.sub(r'^PROFESORA IOLE LEBE PALMOLELLI DE MASCOTTI.*', 'DOCENTE', escalafon)
        
        cupof = row[3].strip()
        
        cue = None
        if cupof and '-' in cupof:
            cue_part = cupof.split('-')[0].strip()
            if cue_part.isdigit():
                cue = int(cue_part)
                
        # Handle shifted columns using right-to-left mapping
        if len(row) > 16:
            nombre_agente = row[-9].strip().replace('"', '')
            dni = row[-8].strip()
            genero = row[-7].strip().upper()
            legajo = row[-6].strip()
            fecha_alta = db_helper.normalize_date(row[-5].strip())
            situacion_revista = row[-4].strip().upper()
            norma_legal = row[-3].strip()
            observaciones = row[-2].strip()
            control_id = row[-1].strip()
            
            intermediate = row[4:-9]
            turno_idx = -1
            for i, val in enumerate(intermediate):
                if val.strip().upper() in expected_turns:
                    turno_idx = i
                    break
            
            if turno_idx >= 0:
                cargo_horas = ", ".join(intermediate[:turno_idx]).strip()
                col_temporal_turno = intermediate[turno_idx].strip()
                col_plan_estudio = ", ".join(intermediate[turno_idx+1:]).strip()
            else:
                cargo_horas = ", ".join(intermediate[:-1]).strip()
                col_temporal_turno = ""
                col_plan_estudio = intermediate[-1].strip()
        else:
            cargo_horas = row[4].strip()
            col_temporal_turno = row[5].strip()
            col_plan_estudio = row[6].strip()
            nombre_agente = row[7].strip().replace('"', '')
            dni = row[8].strip()
            genero = row[9].strip().upper()
            legajo = row[10].strip()
            fecha_alta = db_helper.normalize_date(row[11].strip())
            situacion_revista = row[12].strip().upper()
            norma_legal = row[13].strip()
            observaciones = row[14].strip()
            control_id = row[15].strip()

        if not dni or "textbox" in dni.lower() or "numerodesector" in nombre_agente.lower() or "[todas]" in nombre_agente.lower():
            continue
            
        horas_catedra = 0
        match_hs = re.search(r'(\d+)\s*Hs', cargo_horas, re.IGNORECASE)
        if match_hs:
            horas_catedra = int(match_hs.group(1))
        
        turno = None
        col_temp_upper = col_temporal_turno.upper()
        if col_temp_upper in expected_turns:
            turno = col_temp_upper
            
        if not turno:
            turno = find_matching_turn(cargo_horas)
            
        if not turno and col_temporal_turno:
            turno = find_matching_turn(col_temporal_turno)
            
        turno = combine_turns(turno, col_plan_estudio)
        
        if turno:
            turno = turno.strip()
            if turno.upper() == 'NONE' or turno == '':
                turno = None
                
        plan_estudio = col_plan_estudio.replace('"', '').strip()

        if dni and dni not in inserted_dnis:
            insert_agentes.append((dni, nombre_agente, genero, legajo, fecha_alta))
            inserted_dnis.add(dni)
        
        insert_data.append((
            centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
            turno, plan_estudio, nombre_agente, dni, genero, legajo, 
            fecha_alta, situacion_revista, norma_legal, observaciones, control_id, year
        ))

    print(f"Inserting/Updating {len(insert_agentes)} unique agents from designaciones...")
    cursor.executemany("""
        INSERT OR IGNORE INTO agentes (
            dni, nombre_agente, genero, legajo, fecha_alta
        ) VALUES (?, ?, ?, ?, ?)
    """, insert_agentes)

    print(f"Inserting {len(insert_data)} designaciones for year {year}...")
    cursor.executemany("""
        INSERT INTO designaciones (
            centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
            turno, plan_estudio, nombre_agente, dni, genero, legajo, 
            fecha_alta, situacion_revista, norma_legal, observaciones, control_id, anio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, insert_data)

def import_licencias(rows, year, conn):
    # Detect format based on first row of data
    is_format_b = False
    if rows:
        first_row = rows[0]
        if len(first_row) > 0:
            val = first_row[0].strip()
            # If the first column is not a digit, it must be the agent's name (Format B)
            if not val.isdigit():
                is_format_b = True

    # Column mappings
    if is_format_b:
        col_id_tramite = -1
        col_fecha_carga = -1
        col_nombre_agente = 0
        col_dni = 1
        col_genero = 2
        col_tipo_licencia = 3
        col_dias = 4
        col_fecha_inicio = 5
        col_fecha_fin = 6
        col_documento_respaldo = 8
        col_cupof_licencia = 9  # "CUPOF: XXXXXXX, Descripcion, Padron N°..."
        col_referencia_interna = -1
    else:
        col_id_tramite = 0
        col_fecha_carga = 1
        col_nombre_agente = 2
        col_dni = 3
        col_genero = 4
        col_tipo_licencia = 5
        col_documento_respaldo = 6
        col_fecha_inicio = 7
        col_fecha_fin = 8
        col_dias = 9
        col_referencia_interna = 10
        col_cupof_licencia = -1

    # Validar que el año seleccionado coincida con las fechas reales del archivo
    overlap_count = 0
    total_valid_rows = 0
    
    for row in rows[:100]:
        # Ensure the row has enough columns
        max_col_needed = max(col_fecha_inicio, col_fecha_fin, col_documento_respaldo)
        if len(row) <= max_col_needed:
            continue
            
        start_str = row[col_fecha_inicio].strip()
        end_str = row[col_fecha_fin].strip()
        if not start_str or not end_str:
            continue
            
        total_valid_rows += 1
        try:
            # Parse year from date string (supports YYYY-MM-DD and DD/MM/YYYY with optional timestamps)
            start_year = int(start_str.split('-')[0]) if '-' in start_str else int(start_str.split('/')[-1].split()[0])
            end_year = int(end_str.split('-')[0]) if '-' in end_str else int(end_str.split('/')[-1].split()[0])
            if start_year < 100: start_year += 2000
            if end_year < 100: end_year += 2000
            
            # Check if license period overlaps with the selected academic year
            if start_year <= year and end_year >= year:
                overlap_count += 1
        except Exception:
            pass

    if total_valid_rows > 0 and (overlap_count / total_valid_rows) < 0.1:
        sys.exit(f"Error de Validación: El archivo de Licencias subido contiene fechas que no corresponden al año lectivo {year} seleccionado (la mayoría corresponden a otros años). Por favor, verifique el año seleccionado en el formulario.")

    cursor = conn.cursor()
    print(f"Process Licencias: Deleting existing licencias for year {year}...")
    cursor.execute("DELETE FROM licencias WHERE anio = ?", (year,))
    
    insert_agentes = []
    insert_data = []
    inserted_dnis = set()
    
    for row in rows:
        # Ensure row has enough elements for all columns
        max_len_needed = max(
            col_id_tramite, col_fecha_carga, col_nombre_agente, col_dni, col_genero,
            col_tipo_licencia, col_documento_respaldo, col_fecha_inicio, col_fecha_fin,
            col_dias, col_referencia_interna
        ) + 1
        if len(row) < max_len_needed:
            row += [''] * (max_len_needed - len(row))
            
        id_tramite = 0
        if col_id_tramite >= 0:
            val = row[col_id_tramite].strip()
            id_tramite = int(val) if val.isdigit() else 0
            
        fecha_carga = None
        if col_fecha_carga >= 0:
            fecha_carga = db_helper.normalize_datetime(row[col_fecha_carga].strip())
        
        nombre_agente = row[col_nombre_agente].strip().replace('"', '')
        nombre_agente = re.sub(r'\s+', ' ', nombre_agente).upper()
        
        dni = row[col_dni].strip()
        genero = row[col_genero].strip().upper()
        tipo_licencia = row[col_tipo_licencia].strip()
        
        documento_respaldo = ""
        if col_documento_respaldo >= 0:
            documento_respaldo = row[col_documento_respaldo].strip()

        # Extraer CUPOF del campo de referencia (col 9 en Format B)
        # Formato: "CUPOF: 700046200-HC2-17072512005135, Horas de Cátedra Secundario, ..."
        cupof_licencia = None
        if col_cupof_licencia >= 0 and len(row) > col_cupof_licencia:
            cupof_raw = row[col_cupof_licencia].strip()
            m = re.search(r'CUPOF:\s*([^,\s]+)', cupof_raw, re.IGNORECASE)
            if m:
                cupof_licencia = m.group(1).strip()

        fecha_inicio = db_helper.normalize_date(row[col_fecha_inicio].strip())
        fecha_fin = db_helper.normalize_date(row[col_fecha_fin].strip())
        
        dias = 0
        if col_dias >= 0:
            val = row[col_dias].strip()
            dias = int(val) if val.isdigit() else 0
            
        referencia_interna = 0
        if col_referencia_interna >= 0:
            val = row[col_referencia_interna].strip()
            referencia_interna = int(val) if val.isdigit() else 0
        
        if dni and dni not in inserted_dnis:
            insert_agentes.append((dni, nombre_agente, genero, None, None))
            inserted_dnis.add(dni)
        
        insert_data.append((
            id_tramite, fecha_carga, nombre_agente, dni, genero, tipo_licencia,
            documento_respaldo, cupof_licencia, fecha_inicio, fecha_fin, dias, referencia_interna, year
        ))

    print(f"Inserting/Updating {len(insert_agentes)} unique agents from licencias...")
    cursor.executemany("""
        INSERT OR IGNORE INTO agentes (
            dni, nombre_agente, genero, legajo, fecha_alta
        ) VALUES (?, ?, ?, ?, ?)
    """, insert_agentes)

    print(f"Inserting {len(insert_data)} licencias for year {year}...")
    cursor.executemany("""
        INSERT INTO licencias (
            id_tramite, fecha_carga, nombre_agente, dni, genero, tipo_licencia,
            documento_respaldo, cupof_licencia, fecha_inicio, fecha_fin, dias, referencia_interna, anio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, insert_data)

def detect_and_validate_file_type(file_path, import_type):
    # Determine if Excel or CSV
    is_excel = file_path.endswith('.xlsx') or file_path.endswith('.xls')
    
    content_sample = ""
    if is_excel:
        try:
            import pandas as pd
            # Read only the first 5 rows to be fast
            df = pd.read_excel(file_path, nrows=5, header=None)
            df = df.fillna('')
            content_sample = " ".join(df.astype(str).values.flatten()).lower()
        except Exception as e:
            sys.exit(f"Error: No se pudo leer el archivo Excel para validación de estructura: {e}")
    else:
        try:
            # Read first 15 lines of CSV
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = [f.readline() for _ in range(15)]
                content_sample = " ".join(lines).lower()
        except Exception as e:
            sys.exit(f"Error: No se pudo leer el archivo CSV para validación de estructura: {e}")

    # Detect features
    has_licencia_keywords = any(kw in content_sample for kw in ["idtramite", "tipo_licencia", "tipolicencia", "fechacarga", "fecha_carga", "documentorespaldo", "documento_respaldo", "txtnombretipodelicencia", "txtfechainiciolicencia", "txtfechafinlicencia", "txtagente"])
    has_cargo_keywords = any(kw in content_sample for kw in ["cupof", "situacion_revista", "situacionrevista", "escalafon", "horas_catedra", "horascatedra"])

    # Validate against expected import_type
    if import_type == "licencias":
        if not has_licencia_keywords:
            sys.exit("Error de Validación: El archivo no coincide con la estructura de Licencias (falta la columna IdTramite, txtNombreTipoDeLicencia o similares).")
    elif import_type in ("agentes", "designaciones", "agentes_designaciones"):
        if has_licencia_keywords:
            sys.exit("Error de Validación: El archivo subido contiene columnas de Licencias (como IdTramite, txtNombreTipoDeLicencia, etc.), pero seleccionó la opción de importar Cargos y Designaciones.")
        elif not has_cargo_keywords:
            sys.exit("Error de Validación: El archivo no coincide con la estructura de Cargos/Designaciones (falta la columna Cupof, Centro o similares).")

def main():
    parser = argparse.ArgumentParser(description="Unified Excel/CSV Import Script for EDU-Auditor")
    parser.add_argument("--type", required=True, choices=["agentes", "designaciones", "licencias", "agentes_designaciones"], help="Type of data to import")
    parser.add_argument("--file", required=True, help="Path to input CSV or Excel file")
    parser.add_argument("--year", type=int, required=True, help="Academic year (anio_lectivo)")
    parser.add_argument("--db", help="Optional custom SQLite database path")
    
    args = parser.parse_args()
    
    db_path = args.db if args.db else os.path.join(base_dir, "database", "database.sqlite")
    print(f"Connecting to SQLite database at: {db_path}")
    
    if not os.path.exists(args.file):
        print(f"Error: Input file not found at {args.file}!")
        sys.exit(1)
        
    # Automatically validate format structure based on headers before processing
    detect_and_validate_file_type(args.file, args.type)
        
    is_excel = args.file.endswith('.xlsx') or args.file.endswith('.xls')
    
    # Read rows
    if is_excel:
        rows = read_excel_lines(args.file, args.type)
    else:
        rows = parse_csv_lines(args.file, args.type)
        
    print(f"Loaded {len(rows)} data rows to process.")
    
    conn = None
    try:
        conn = db_helper.get_db_connection(db_path)
        
        if args.type == "agentes":
            import_agentes(rows, args.year, conn)
        elif args.type == "designaciones":
            import_designaciones(rows, args.year, conn)
        elif args.type == "agentes_designaciones":
            import_agentes(rows, args.year, conn)
            import_designaciones(rows, args.year, conn)
        elif args.type == "licencias":
            import_licencias(rows, args.year, conn)
            
        db_helper.safe_db_close(conn, success=True)
        print("Import completed successfully!")
        
    except Exception as e:
        if conn:
            db_helper.safe_db_close(conn, success=False)
        print(f"Import process failed! Error: {e}")
        raise e

if __name__ == "__main__":
    main()
