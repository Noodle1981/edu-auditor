#@title CARGAR ORIGINAL

import pandas as pd
import io
import csv

# Reload the CSV file, skipping the first row (the malformed header).
# Use comma as the separator, as suggested by the internal structure of the single column previously.
# encoding='latin1' for correct character handling.
# header=None ensures numerical column names are assigned.
# on_bad_lines='skip' to ignore malformed lines and allow the DataFrame to load, to further inspect.
df = pd.read_csv('/content/drive/MyDrive/Equipo Tester/docentes_cupof/reporte_agentes.csv', sep=',', encoding='latin1', skiprows=1, header=None, on_bad_lines='skip', low_memory=False)

# Display the first few rows and information about the DataFrame
print("DataFrame head:")
print(df.head())

print("\nDataFrame info:")
df.info()


#### CELDA 2

#@title Normalizar acentos y otros
# Step 1: Read the raw CSV file line by line, skipping the first row (the original problematic header).
# Use Python's built-in file reading to get raw strings.
# Changed encoding to 'utf-8' to correctly handle special characters like accents and 'ñ'.
with open('/content/drive/MyDrive/Equipo Tester/docentes_cupof/reporte_agentes.csv', 'r', encoding='utf-8') as f:
    raw_lines = f.readlines()

# Skip the first row as requested (original malformed header)
raw_lines = raw_lines[1:]

# Step 2 & 3: Process raw lines to combine multi-line records into single logical records.
processed_records = [] # This will store a list of lists, where each inner list is a row's fields
active_record_fields = [] # Stores the fields of the current logical record being built

for line in raw_lines:
    stripped_line = line.strip()
    if not stripped_line:
        continue # Skip empty lines

    # Each relevant line is expected to be a single string, possibly wrapped in quotes.
    # We need to remove the outermost quotes to get the actual comma-separated content.
    content_within_quotes = stripped_line.strip('"')

    # Use csv.reader on a StringIO to correctly parse fields within the unquoted content,
    # handling commas and quotes that are part of the data itself.
    try:
        line_fields = list(csv.reader(io.StringIO(content_within_quotes), delimiter=','))[0]
    except Exception as e:
        # Handle lines that might be malformed even after stripping outer quotes
        # For now, treat such lines as a single field and try to append as continuation
        line_fields = [content_within_quotes] # Treat the whole unquoted content as one field

    # Check if this physical line starts a new logical record
    is_new_logical_record_start = False
    if line_fields and line_fields[0].strip(): # Ensure first field is not empty
        try:
            # Check if the first field, after stripping whitespace, can be converted to an integer
            int(line_fields[0].strip())
            is_new_logical_record_start = True
        except ValueError:
            pass # Not a number, so not a new record start

    if is_new_logical_record_start:
        if active_record_fields: # If a previous record was being built, finalize it
            processed_records.append(active_record_fields)
        active_record_fields = line_fields # Start a new logical record with these fields
    elif active_record_fields: # This line is a continuation of the active record
        # Concatenate all fields from this continuation line into a single string
        # then append that string to the last field of the active record.
        continuation_string = " ".join(field.strip() for field in line_fields if field.strip())
        if continuation_string: # Only append if there's content to append
            active_record_fields[-1] += " " + continuation_string
    # If active_record_fields is empty and it's not a new record start, it's an orphaned continuation; ignore.

# Add the very last logical record if it exists
if active_record_fields:
    processed_records.append(active_record_fields)

# Find the maximum number of columns across all processed records
max_cols = max(len(record) for record in processed_records) if processed_records else 0

# Pad shorter records with empty strings to ensure uniform column count
# This is necessary for creating a DataFrame directly from a list of lists.
processed_records_padded = [record + [''] * (max_cols - len(record)) for record in processed_records]

# Create the DataFrame
df_cleaned = pd.DataFrame(processed_records_padded)

# Display the first few rows and information about the DataFrame
print("DataFrame head (after custom cleaning and parsing):")
print(df_cleaned.head())

print("\nDataFrame info (after custom cleaning and parsing):")
df_cleaned.info()

# Assign the final cleaned DataFrame to 'df'
df = df_cleaned.copy()

### CELDA 3

#@title Definir nuevo nombres de columnas y borrar las que no se necesito
new_column_names = {
    0: 'CENTRO',
    1: 'ESTABLECIMIENTO',
    2: 'AGENTE',
    3: 'CUPOF',
    4: 'TIPO_DE_CUPOF',
    5: 'COL_TEMPORAL',
    6: 'COL_SINIMPORTANCIA',
    7: 'APELLIDO',
    8: 'NOMBRE',
    9: 'DNI',
    10: 'GENERO',
    11: 'PADRON',
    12: 'FECHA',
    13: 'SIT_REVISTA',
    14: 'INSTR_LEGAL',
    15: 'ACTA',
    16: 'COL_ELEMINAR1',
    17: 'COL_ELEMINAR2',
    18: 'COL_ELEMINAR3',
    19: 'COL_ELEMINAR4',
    20: 'COL_ELEMINAR5',
    21: 'COL_ELEMINAR6',
}

# Rename the columns
df.rename(columns=new_column_names, inplace=True)

columns_to_drop = [
    'COL_ELEMINAR1',
    'COL_ELEMINAR2',
    'COL_ELEMINAR3',
    'COL_ELEMINAR4',
    'COL_ELEMINAR5',
    'COL_ELEMINAR6'
]

df.drop(columns=columns_to_drop, inplace=True, errors='ignore')

print("Columns renamed and dropped successfully. Displaying DataFrame info:")

# Display the DataFrame head with the new column names
print("DataFrame head with new column names:")
print(df.head())

### CELDA 4

#@title Normalizacion columna Agente
import numpy as np

# Step 1: Convert to string, clean leading/trailing whitespace, and remove redundant internal spaces.
# Also remove any literal `"` characters that might be part of the string from parsing issues.
df['AGENTE'] = df['AGENTE'].astype(str).str.strip()
df['AGENTE'] = df['AGENTE'].str.replace(r'"', '', regex=True) # Remove all double quotes
df['AGENTE'] = df['AGENTE'].str.replace(r'\s+', ' ', regex=True).str.strip() # Normalize spaces and strip again

# Step 2: Convert to uppercase for case-insensitive matching.
df['AGENTE'] = df['AGENTE'].str.upper()

# Step 3: Replace the specified values with 'DOCENTE'.
# Use str.replace with regex=True for robustness.
# For 'ARTE Y DISEÑO', since it's now cleaned and uppercase, a direct regex match is fine.
df['AGENTE'] = df['AGENTE'].str.replace(r'ARTE Y DISEÑO', 'DOCENTE', regex=True)

# For 'PROFESORA IOLE LEBE PALMOLELLI DE MASCOTTI', use the prefix regex as before.
df['AGENTE'] = df['AGENTE'].str.replace(r'^PROFESORA IOLE LEBE PALMOLELLI DE MASCOTTI.*', 'DOCENTE', regex=True)

print("Values in 'AGENTE' column replaced successfully.")
print(df['AGENTE'].value_counts().head(10))
print("\nDataFrame head with updated 'AGENTE' column:")
print(df[['AGENTE']].head())

### CELDA 5

#@title Primera pasada de Turnos

import numpy as np

# 1. Define expected turn values
expected_turns_raw_str = "VESPERTINO, MAÑANA, MAÑANA Y TARDE, VESPERTINO / NOCHE, TARDE, MAÑANA / VESPERTINO, TARDE/VESPERTINO, NOCHE ,MAÑANA/TARDE/VESPERTINO/NOCHE, TARDE / VESPERTINO / NOCHE, INTERTURNO, INTERMEDIO , JORNADA COMPLETA, UNICO, ROTATIVO: MAÑANA-TARDE-NOCHE, MAÑANA Y TARDE EMER , MAÑANA Y TARDE CON ROTACIÓN, MAÑANA CON JORNADA EXTENDIDA, TARDE/NOCHE , INTERTURNO / TARDE Y DIURNO"

# Clean and normalize the expected turn values
# Replace '/' with ' / ' for consistency, strip spaces, convert to uppercase, and remove duplicates
expected_turns = []
for turn_phrase in expected_turns_raw_str.split(','):
    normalized_phrase = turn_phrase.replace('/', ' / ').strip().upper()
    if normalized_phrase:
        expected_turns.append(normalized_phrase)

# Sort by length in reverse order to prioritize matching longer phrases first
# e.g., "MAÑANA Y TARDE" should be matched before "MAÑANA" or "TARDE"
expected_turns = sorted(list(set(expected_turns)), key=len, reverse=True)

# Helper function to find the first matching turn in a string
def find_matching_turn(text, turn_list):
    if not isinstance(text, str):
        return None
    text_upper = text.upper()
    for turn in turn_list:
        if turn in text_upper:
            return turn
    return None

# Initialize the new 'TURNO' column with None
df['TURNO'] = None

# Create a temporary column for uppercase 'COL_TEMPORAL' for easier comparison
df['TEMP_COL_TEMPORAL_UPPER'] = df['COL_TEMPORAL'].astype(str).str.upper()

# 1. Handle rows where 'COL_TEMPORAL' is already a correct expected value (exact match)
exact_match_mask = df['TEMP_COL_TEMPORAL_UPPER'].isin(expected_turns)
df.loc[exact_match_mask, 'TURNO'] = df.loc[exact_match_mask, 'TEMP_COL_TEMPORAL_UPPER']

# 2. Case 1: 'COL_TEMPORAL' is null/empty AND 'TURNO' has not been set yet
null_or_empty_col_temporal_mask = df['COL_TEMPORAL'].isna() | (df['COL_TEMPORAL'].astype(str).str.strip() == '')
mask_case1 = null_or_empty_col_temporal_mask & df['TURNO'].isna()

# For these rows, search for a turn in 'TIPO DE CUPOF'
df.loc[mask_case1, 'TURNO'] = df.loc[mask_case1, 'TIPO_DE_CUPOF'].apply(
    lambda x: find_matching_turn(x, expected_turns)
)

# 3. Case 2: 'COL_TEMPORAL' is not null/empty, not an exact match, AND 'TURNO' has not been set yet
mask_case2 = (~null_or_empty_col_temporal_mask) & (~exact_match_mask) & df['TURNO'].isna()

# For these rows, search for a turn within 'COL_TEMPORAL' itself
df.loc[mask_case2, 'TURNO'] = df.loc[mask_case2, 'COL_TEMPORAL'].apply(
    lambda x: find_matching_turn(x, expected_turns)
)

# Drop the temporary column
df.drop(columns=['TEMP_COL_TEMPORAL_UPPER'], inplace=True)

# Ensure the new 'TURNO' column is placed after 'COL_TEMPORAL'
cols = df.columns.tolist()
col_temporal_idx = cols.index('COL_TEMPORAL')

# Remove 'TURNO' if it's already in the list to prevent duplicates or incorrect placement on re-run
if 'TURNO' in cols:
    cols.remove('TURNO')
# Insert 'TURNO' after 'COL_TEMPORAL'
cols.insert(col_temporal_idx + 1, 'TURNO')
df = df[cols]

# Display relevant columns to verify the changes
print("DataFrame head with updated 'COL_TEMPORAL' and new 'TURNO' column:")
print(df[['TIPO_DE_CUPOF', 'COL_TEMPORAL', 'TURNO']].head(20))

### CELDA 6

#@title Segunda pasada de turnos

import numpy as np

# Step 1: Rename the column that was originally column '6' and is now named 'COL_SINIMPORTANCIA' to 'COL_TEMPORAL2'
# This ensures that subsequent logic expecting 'COL_TEMPORAL2' will find it.
if 'COL_SINIMPORTANCIA' in df.columns:
    df.rename(columns={'COL_SINIMPORTANCIA': 'COL_TEMPORAL2'}, inplace=True)
    print("'COL_SINIMPORTANCIA' renamed to 'COL_TEMPORAL2'.")
elif 'COL_TEMPORAL2' not in df.columns:
    print("Neither 'COL_SINIMPORTANCIA' nor 'COL_TEMPORAL2' found. Check DataFrame structure.")
else:
    print("'COL_TEMPORAL2' column already exists.")

# Step 2: Clean 'COL_TEMPORAL2' by removing quotes and stripping whitespace
if 'COL_TEMPORAL2' in df.columns:
    df['COL_TEMPORAL2'] = df['COL_TEMPORAL2'].astype(str).str.replace('"', '').str.strip()
else:
    print("'COL_TEMPORAL2' not found for cleaning.")

# Step 3: Combine 'COL_TEMPORAL2' values with 'TURNO' based on conditions

# Define the values from COL_TEMPORAL2 that should trigger a combination with TURNO
values_to_trigger_combine = [
    "TARDE Y/O VESPERTINO",
    "TARDE Y VESPERTINO",
    "VESPERTINO",
    "TARDE Y MAÑANA",
    "NOCHE",
    "INTERTURNO Y TARDE",
    "MAÑANA",
    "TARDE",
    "INTERMEDIO Y TARDE"
]
# For robust comparison, we will use uppercased versions to ensure case-insensitivity in matching.
values_to_trigger_combine_upper = [v.upper() for v in values_to_trigger_combine]


# Ensure 'TURNO' column is string type for concatenation and handle NaN by converting to empty string
df['TURNO'] = df['TURNO'].astype(str).replace('nan', '').str.strip()

# Function to combine TURNO and COL_TEMPORAL2
def combine_turno_columns(row):
    current_turno = row['TURNO'] # This is already stripped and 'nan' handled
    col_temporal2_value = row['COL_TEMPORAL2'] # This is already stripped

    # Only proceed if col_temporal2_value is not empty and its uppercased version is in our trigger list
    if col_temporal2_value and col_temporal2_value.upper() in values_to_trigger_combine_upper:
        # Split current_turno into individual turn components for a more robust duplicate check
        current_turno_components = [t.strip() for t in current_turno.split(',') if t.strip()]

        # Check if the col_temporal2_value is already present as a distinct component
        if col_temporal2_value not in current_turno_components:
            if current_turno: # If TURNO has a value, append with comma
                return f"{current_turno}, {col_temporal2_value}"
            else: # If TURNO is empty, just use the COL_TEMPORAL2 value
                return col_temporal2_value
    return current_turno # If no condition met, return original TURNO

if 'TURNO' in df.columns and 'COL_TEMPORAL2' in df.columns:
    # Apply the function to the DataFrame rows
    df['TURNO'] = df.apply(combine_turno_columns, axis=1)
else:
    print("TURNO or COL_TEMPORAL2 column not found. Cannot combine.")

# After combining, convert empty strings back to NaN if that's the desired representation for 'no value'
df['TURNO'] = df['TURNO'].replace('', np.nan)


# Display the head of the relevant columns to verify changes
print("\nDataFrame head with updated 'TURNO' and new 'COL_TEMPORAL2' column:")
print(df[['TIPO_DE_CUPOF', 'COL_TEMPORAL', 'TURNO', 'COL_TEMPORAL2']].head(20))

### CELDA 7

#@title Tercera pasada de turno

import numpy as np
import pandas as pd

# Assuming 'expected_turns' and 'find_matching_turn' are already defined in previous cells
# (e.g., from cell C-0fD10B4fF9). If not, they should be redefined here.
# For safety and reproducibility, let's include their definitions if they are not strictly global.

# Re-define expected_turns and find_matching_turn for clarity and potential re-use within this cell
expected_turns_raw_str = "VESPERTINO, MAÑANA, MAÑANA Y TARDE, VESPERTINO / NOCHE, TARDE, MAÑANA / VESPERTINO, TARDE/VESPERTINO, NOCHE ,MAÑANA/TARDE/VESPERTINO/NOCHE, TARDE / VESPERTINO / NOCHE, INTERTURNO, INTERMEDIO , JORNADA COMPLETA, UNICO, ROTATIVO: MAÑANA-TARDE-NOCHE, MAÑANA Y TARDE EMER , MAÑANA Y TARDE CON ROTACIÓN, MAÑANA CON JORNADA EXTENDIDA, TARDE/NOCHE , INTERTURNO / TARDE Y DIURNO"
expected_turns = []
for turn_phrase in expected_turns_raw_str.split(','):
    normalized_phrase = turn_phrase.replace('/', ' / ').strip().upper()
    if normalized_phrase:
        expected_turns.append(normalized_phrase)
expected_turns = sorted(list(set(expected_turns)), key=len, reverse=True)

def find_matching_turn(text, turn_list):
    if not isinstance(text, str):
        return None
    text_upper = text.upper()
    for turn in turn_list:
        if turn in text_upper:
            return turn
    return None

# Step 1: Normalize 'TURNO' and 'APELLIDO' columns
# Convert TURNO to string and handle actual NaN values, replacing them with the string 'None'
df['TURNO'] = df['TURNO'].astype(str).str.strip()
df['TURNO'] = df['TURNO'].replace({'nan': 'None', '': 'None'}) # Replace np.nan string and empty strings with 'None'
df['APELLIDO'] = df['APELLIDO'].astype(str).str.strip()

# --- Part 2: Handle TURNO == 'None' (string literal) ---
# This applies when the 'TURNO' column is explicitly the string 'None'
mask_turno_is_exact_none = (df['TURNO'] == 'None')

# For these identified rows, attempt to find a turn in the 'APELLIDO' column.
# First, clean the 'APELLIDO' column by removing any literal double quotes.
df.loc[mask_turno_is_exact_none, 'APELLIDO'] = df.loc[mask_turno_is_exact_none, 'APELLIDO'].str.replace(r'""', '', regex=False).str.strip()
extracted_from_apellido = df.loc[mask_turno_is_exact_none, 'APELLIDO'].apply(
    lambda x: find_matching_turn(x, expected_turns)
)

# Update 'TURNO' only if a valid turn was found in 'APELLIDO' for these specific rows.
# This matches the condition: "si en la columna apellido, no tiene los valores de los datos almacenado en la variable expected_turns_raw_str, no hacer nada"
df.loc[mask_turno_is_exact_none & extracted_from_apellido.notna(), 'TURNO'] = extracted_from_apellido


# --- Part 3: Handle TURNO containing 'None,' (e.g., 'None, MAÑANA', 'None, TARDE') ---
# This applies to values where a valid turn follows 'None,'
mask_turno_starts_with_none_comma = df['TURNO'].str.contains(r'^None,', na=False, regex=True)

# For these rows, extract the part after 'None,' and then validate it as a turn.
def extract_and_validate_turn_after_none(turno_val, turn_list):
    if pd.isna(turno_val) or not isinstance(turno_val, str):
        return turno_val # Keep NaN or non-string as is

    if turno_val.strip().startswith('None,'):
        # Remove 'None,' prefix and strip any surrounding whitespace
        potential_turn_str = turno_val.replace('None,', '', 1).strip()
        # Find if the remaining string contains any valid expected turn
        matched_turn = find_matching_turn(potential_turn_str, turn_list)
        # --- MODIFICATION: Preserve the string if no matching turn is found ---
        return matched_turn if matched_turn else potential_turn_str

    return turno_val # If it doesn't start with 'None,', return original value

df.loc[mask_turno_starts_with_none_comma, 'TURNO'] = df.loc[mask_turno_starts_with_none_comma, 'TURNO'].apply(
    lambda x: extract_and_validate_turn_after_none(x, expected_turns)
)

# --- Part 4: Final Cleanup and Normalization of 'TURNO' column ---
# Convert only the exact string 'None' (which results from initial NaNs not being resolved by APELLIDO)
# and empty strings to np.nan. Other unrecognized strings should be preserved.
df['TURNO'] = df['TURNO'].replace({'None': np.nan, '': np.nan})

# --- REMOVED: Previous line that aggressively converted non-expected turns to np.nan ---
# The user explicitly requested to not modify values that do not correspond to expected_turns_raw_str.
# df['TURNO'] = df['TURNO'].apply(lambda x: x if pd.isna(x) or x in expected_turns else np.nan)

print("TURNO column processed for 'None' values and cross-referenced with APELLIDO where applicable. Unrecognized values are now preserved.")

# Display sample rows where 'TURNO' was initially 'None' or contained 'None,' (difficult to show without initial state)
# Instead, let's display rows where 'TURNO' is NaN after processing, and some random rows.
print("\nSample of rows where 'TURNO' is now NaN:")
print(df[df['TURNO'].isna()][['APELLIDO', 'TURNO']].head(10))
print("\nSample of 'APELLIDO' and 'TURNO' columns after correction (random 10 rows):")
print(df[['APELLIDO', 'TURNO']].sample(10))
print("\nValue counts for TURNO after final processing (including preserved unrecognized values):")
print(df['TURNO'].value_counts(dropna=False).head(15))

### CELDA 8

#@title Borrar Columnas temporales para armar la columna principal de turno

columns_to_drop = [
    'COL_TEMPORAL',
    'COL_TEMPORAL2',
    ]

df.drop(columns=columns_to_drop, inplace=True, errors='ignore')

print("Columns dropped successfully. Displaying DataFrame info:")

### DESPUES  

Actúa como un experto en Python y Data Science. Tengo un DataFrame en Pandas con un problema grave de desalineamiento (corrimiento) de datos en la columna llamada "GENERO" (la cual es de tipo alfanumérica). 

Existen tres escenarios en esa columna y necesito un código que los maneje correctamente:
1. Filas correctas: Tienen los valores 'F' o 'M'. No se deben tocar.
2. Filas con valores nulos (null/NaN): Se deben ignorar por completo, dejándolas intactas para corregirlas a mano más tarde. No se deben perder ni modificar.
3. Filas con corrimientos: Se dividen en dos casos específicos (Caso 1 y Caso 2) y deben corregirse usando una copia temporal del DataFrame para no pisar los datos originales durante las asignaciones.

Necesito el código en Python para resolver estos dos casos de corrimiento:

==========================================
CASO 1: Corrimiento por DNI (Valores Numéricos)
==========================================
Condición: Si la columna GENERO no es nula, es un valor puramente numérico (ej: '24244053') y NO es ni 'F' ni 'M'.
Movimientos a realizar en estas filas:
- El valor de GENERO pasa a la columna DNI.
- El valor original de DNI pasa a la columna NOMBRE.
- El valor original de NOMBRE pasa a la columna APELLIDO.
- El valor original de PADRON pasa a la columna GENERO.
- El valor original de FECHA pasa a la columna PADRON.
- El valor original de SIT_REVISTA pasa a la columna FECHA.
- El valor original de ACTA pasa a la columna INSTRU_LEGAL.

==========================================
CASO 2: Corrimiento por APELLIDO (Valores de Texto)
==========================================
Condición: Si la columna GENERO no es nula, contiene texto/letras (un apellido o nombre) y NO es ni 'F' ni 'M'.
Movimientos a realizar en estas filas:
[REEMPLAZA ESTA LÍNEA: Explicá acá detalladamente qué columna pasa a qué columna para el caso de los apellidos, tal como lo hicimos en el Caso 1].

Por favor, generá el código de Pandas optimizado utilizando `.loc` y las máscaras booleanas condicionales, asegurando el manejo correcto de los valores nulos (`.notna()`) para que no rompan las conversiones de tipo de texto.


