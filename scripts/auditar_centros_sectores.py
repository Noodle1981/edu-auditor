import os
import sqlite3
import datetime
import openpyxl
import pandas as pd

def ejecutar_auditoria():
    print("======================================================================")
    print("=== INICIANDO SPRINT 1: AUDITORÍA Y DEPURACIÓN DE CENTROS Y SECTORES ===")
    print("======================================================================")

    f_master = r'datos_csv/CENTROS Y SECTORES EDUCACION REFACTORIZADO (3).XLSX'
    f_sueldos = r'SUELDO202605_DefAjustado_escuelas_minimizado.xlsx'
    f_db = r'database/database.sqlite'
    f_report_dir = r'storage/app/reports'
    f_report_excel = os.path.join(f_report_dir, 'depuracion_centros_sectores.xlsx')

    if not os.path.exists(f_master):
        print(f"ERROR: No se encuentra el archivo maestro en: {f_master}")
        return
    if not os.path.exists(f_sueldos):
        print(f"ERROR: No se encuentra el archivo de sueldos en: {f_sueldos}")
        return

    # 1. Cargar Maestro
    print(f"\n[1/5] Cargando diccionario maestro desde '{f_master}'...")
    wb_m = openpyxl.load_workbook(f_master, data_only=True, read_only=True)
    ws_m = wb_m['establecimientos']
    rows_m = ws_m.iter_rows(values_only=True)
    header_m = next(rows_m)

    idx_centro = header_m.index('centro')
    idx_sector = header_m.index('SECTOR')
    idx_nivel = header_m.index('NIVEL') if 'NIVEL' in header_m else -1
    idx_gestion = header_m.index('GESTION') if 'GESTION' in header_m else -1
    idx_nomsector = header_m.index('NOMSECTOR') if 'NOMSECTOR' in header_m else -1
    idx_nomcentro = header_m.index('NOMCENTRO') if 'NOMCENTRO' in header_m else -1

    master_dict = {}
    master_centros = set()

    for r in rows_m:
        c_raw = r[idx_centro]
        s_raw = r[idx_sector]
        if c_raw is None or s_raw is None:
            continue
        try:
            c = int(c_raw)
            s = int(s_raw)
            master_centros.add(c)
            
            nivel = str(r[idx_nivel] or '').strip() if idx_nivel >= 0 else ''
            gestion = str(r[idx_gestion] or '').strip() if idx_gestion >= 0 else ''
            nom_sector = str(r[idx_nomsector] or '').strip() if idx_nomsector >= 0 else ''
            nom_centro = str(r[idx_nomcentro] or '').strip() if idx_nomcentro >= 0 else ''

            master_dict[(c, s)] = {
                'centro': c,
                'sector': s,
                'nivel': nivel,
                'gestion': gestion,
                'nom_sector': nom_sector,
                'nom_centro': nom_centro,
            }
        except (ValueError, TypeError):
            continue

    wb_m.close()
    print(f"   -> Cargas {len(master_dict)} combinaciones (Centro, Sector) en el maestro ({len(master_centros)} centros únicos).")

    # 2. Cargar Sueldos
    print(f"\n[2/5] Procesando liquidación de sueldos desde '{f_sueldos}'...")
    wb_s = openpyxl.load_workbook(f_sueldos, data_only=True, read_only=True)
    ws_s = wb_s['ESCU']
    rows_s = ws_s.iter_rows(values_only=True)
    header_s = next(rows_s)

    c_s_idx = header_s.index('CENTRO')
    s_s_idx = header_s.index('SECTOR')

    sueldo_counts = {}
    sueldo_centros = set()
    total_sueldos_rows = 0

    for r in rows_s:
        total_sueldos_rows += 1
        c_raw = r[c_s_idx]
        s_raw = r[s_s_idx]
        if c_raw is None or s_raw is None:
            continue
        try:
            c = int(c_raw)
            s = int(s_raw)
            pair = (c, s)
            sueldo_centros.add(c)
            sueldo_counts[pair] = sueldo_counts.get(pair, 0) + 1
        except (ValueError, TypeError):
            continue

    wb_s.close()
    print(f"   -> Procesados {total_sueldos_rows} registros de sueldo.")
    print(f"   -> Encontradas {len(sueldo_counts)} combinaciones (Centro, Sector) con liquidación ({len(sueldo_centros)} centros únicos).")

    # 3. Clasificación de Depuración
    print("\n[3/5] Ejecutando algoritmo de taxonomía y depuración...")
    registros_depuracion = []
    ahora = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # A. Procesar todas las combinaciones del maestro
    for (c, s), m_info in master_dict.items():
        liq = sueldo_counts.get((c, s), 0)

        if c not in sueldo_centros:
            estado = 'CENTRO_SIN_USO'
            obs = f"El Centro {c} ({m_info['nom_centro']}) no registra liquidaciones de sueldo en el período."
        elif liq == 0:
            estado = 'SECTOR_SIN_USO'
            obs = f"El Sector {s} ({m_info['nom_sector']}) en Centro {c} no tuvo liquidaciones en el período."
        elif 1 <= liq <= 3:
            estado = 'BAJA_VOLUMETRÍA'
            obs = f"Actividad anómala / muy baja: sólo {liq} liquidación(es) en el mes."
        else:
            estado = 'ACTIVO'
            obs = f"Uso normal: {liq} liquidaciones en el mes."

        registros_depuracion.append({
            'centro': c,
            'sector': s,
            'nom_centro': m_info['nom_centro'],
            'nom_sector': m_info['nom_sector'],
            'nivel': m_info['nivel'],
            'gestion': m_info['gestion'],
            'cantidad_liquidaciones': liq,
            'estado_depuracion': estado,
            'observaciones': obs,
            'created_at': ahora,
            'updated_at': ahora
        })

    # B. Procesar combinaciones de sueldos NO catalogadas en el maestro
    sueldo_no_catalogados = 0
    for (c, s), liq in sueldo_counts.items():
        if (c, s) not in master_dict:
            sueldo_no_catalogados += 1
            estado = 'SUELDO_NO_CATALOGADO'
            obs = f"ATENCIÓN: Se registraron {liq} haberes pero la combinación (Centro {c}, Sector {s}) NO existe en el catálogo maestro."
            registros_depuracion.append({
                'centro': c,
                'sector': s,
                'nom_centro': f"CENTRO {c} (NO CATALOGADO)",
                'nom_sector': f"SECTOR {s} (NO CATALOGADO)",
                'nivel': 'DESCONOCIDO',
                'gestion': 'DESCONOCIDO',
                'cantidad_liquidaciones': liq,
                'estado_depuracion': estado,
                'observaciones': obs,
                'created_at': ahora,
                'updated_at': ahora
            })

    # Conteo por estado
    df_result = pd.DataFrame(registros_depuracion)
    conteo_estados = df_result['estado_depuracion'].value_counts()
    print("\n=== RESUMEN DE CLASIFICACIÓN DE DEPURACIÓN ===")
    for est, cnt in conteo_estados.items():
        print(f" - {est:20s}: {cnt:5d} combinaciones")

    # 4. Guardar en SQLite database/database.sqlite
    print(f"\n[4/5] Guardando resultados en la base de datos SQLite '{f_db}'...")
    os.makedirs(os.path.dirname(f_db), exist_ok=True)
    conn = sqlite3.connect(f_db)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS depuracion_centros_sectores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        centro INTEGER NOT NULL,
        sector INTEGER NOT NULL,
        nom_centro TEXT,
        nom_sector TEXT,
        nivel TEXT,
        gestion TEXT,
        cantidad_liquidaciones INTEGER DEFAULT 0,
        estado_depuracion TEXT NOT NULL,
        observaciones TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
    )
    """)

    cursor.execute("DELETE FROM depuracion_centros_sectores")

    cursor.executemany("""
    INSERT INTO depuracion_centros_sectores (
        centro, sector, nom_centro, nom_sector, nivel, gestion,
        cantidad_liquidaciones, estado_depuracion, observaciones, created_at, updated_at
    ) VALUES (
        :centro, :sector, :nom_centro, :nom_sector, :nivel, :gestion,
        :cantidad_liquidaciones, :estado_depuracion, :observaciones, :created_at, :updated_at
    )
    """, registros_depuracion)

    conn.commit()
    conn.close()
    print(f"   -> Insertados {len(registros_depuracion)} registros en la tabla 'depuracion_centros_sectores'.")

    # 5. Exportar Reporte Excel
    print(f"\n[5/5] Exportando reporte Excel a '{f_report_excel}'...")
    os.makedirs(f_report_dir, exist_ok=True)
    try:
        with pd.ExcelWriter(f_report_excel, engine='openpyxl') as writer:
            df_result.to_excel(writer, sheet_name='Depuración Completa', index=False)
            
            # Hojas resumidas
            df_result[df_result['estado_depuracion'] == 'CENTRO_SIN_USO'].to_excel(writer, sheet_name='Centros Sin Uso', index=False)
            df_result[df_result['estado_depuracion'] == 'SUELDO_NO_CATALOGADO'].to_excel(writer, sheet_name='Sueldos No Catalogados', index=False)
            df_result[df_result['estado_depuracion'] == 'SECTOR_SIN_USO'].to_excel(writer, sheet_name='Sectores Sin Uso', index=False)
            df_result[df_result['estado_depuracion'] == 'BAJA_VOLUMETRÍA'].to_excel(writer, sheet_name='Baja Volumetría', index=False)
        print(f"   -> Reporte Excel generado exitosamente.")
    except Exception as e:
        print(f"   -> AVISO: No se pudo sobrescribir el Excel ({e}). Si está abierto en Excel, ciérrelo para actualizarlo.")

    print("======================================================================")
    print("=== SPRINT 1 COMPLETADO EXITOSAMENTE ===")
    print("======================================================================")

if __name__ == '__main__':
    ejecutar_auditoria()
