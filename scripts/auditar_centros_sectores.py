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
    neto_idx = header_s.index('NETO') if 'NETO' in header_s else -1
    a01_idx = header_s.index('A01') if 'A01' in header_s else -1
    a04_idx = header_s.index('A04') if 'A04' in header_s else -1
    asig_idx = header_s.index('TOTAL DE ASIG CON APORTES') if 'TOTAL DE ASIG CON APORTES' in header_s else -1

    sueldo_stats = {} # (c, s) -> {'total': 0, 'con_cobro': 0, 'sin_cobro': 0}
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

            a01 = float(r[a01_idx] or 0) if a01_idx >= 0 else 0.0
            a04 = float(r[a04_idx] or 0) if a04_idx >= 0 else 0.0

            # Cobro efectivo de cargo docente / radio: Básico (A01) > 0 o Adicional de Radio (A04) > 0
            con_cobro = (a01 > 0 or a04 > 0)

            if pair not in sueldo_stats:
                sueldo_stats[pair] = {'total': 0, 'con_cobro': 0, 'sin_cobro': 0}
            
            sueldo_stats[pair]['total'] += 1
            if con_cobro:
                sueldo_stats[pair]['con_cobro'] += 1
            else:
                sueldo_stats[pair]['sin_cobro'] += 1

        except (ValueError, TypeError):
            continue

    wb_s.close()
    print(f"   -> Procesados {total_sueldos_rows} registros de sueldo.")
    print(f"   -> Encontradas {len(sueldo_stats)} combinaciones (Centro, Sector) con liquidación ({len(sueldo_centros)} centros únicos).")

    # 3. Clasificación de Depuración
    print("\n[3/5] Ejecutando algoritmo de taxonomía y depuración...")
    
    # Cargar saneamientos existentes desde la base de datos para preservarlos
    existing_saneamientos = {}
    if os.path.exists(f_db):
        try:
            conn = sqlite3.connect(f_db)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(depuracion_centros_sectores)")
            cols = [r[1] for r in cursor.fetchall()]
            if 'establecimiento_id' in cols:
                has_mod = 'modalidad_id' in cols
                select_query = "SELECT centro, sector, estado_depuracion, observaciones, establecimiento_id" + (", modalidad_id" if has_mod else ", NULL as modalidad_id") + " FROM depuracion_centros_sectores WHERE establecimiento_id IS NOT NULL"
                cursor.execute(select_query)
                for row in cursor.fetchall():
                    c, s, est, obs, est_id, mod_id = row[0], row[1], row[2], row[3], row[4], row[5]
                    existing_saneamientos[(c, s)] = {
                        'estado_depuracion': est,
                        'observaciones': obs,
                        'establecimiento_id': est_id,
                        'modalidad_id': mod_id
                    }
            conn.close()
            if existing_saneamientos:
                print(f"   -> Cargados {len(existing_saneamientos)} saneamientos previos para preservar.")
        except Exception as e:
            print(f"   -> No se pudieron cargar saneamientos anteriores ({e})")

    registros_depuracion = []
    ahora = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # A. Procesar todas las combinaciones del maestro
    for (c, s), m_info in master_dict.items():
        st = sueldo_stats.get((c, s), {'total': 0, 'con_cobro': 0, 'sin_cobro': 0})
        total_liq = st['total']
        con_cobro = st['con_cobro']
        sin_cobro = st['sin_cobro']

        ext_saneamiento = existing_saneamientos.get((c, s))
        est_id = ext_saneamiento['establecimiento_id'] if ext_saneamiento else None
        mod_id = ext_saneamiento.get('modalidad_id') if ext_saneamiento else None

        if c not in sueldo_centros:
            estado = 'CENTRO_SIN_USO'
            obs = f"El Centro {c} ({m_info['nom_centro']}) no registra liquidaciones de sueldo en el período."
        elif total_liq == 0:
            estado = 'SECTOR_SIN_USO'
            obs = f"El Sector {s} ({m_info['nom_sector']}) en Centro {c} no tuvo liquidaciones en el período."
        elif con_cobro == 0:
            estado = 'INACTIVO'
            obs = f"Inactivo / Sin Cobro: {total_liq} agentes registrados pero ninguno percibe Básico ni Radio ($0)."
        else:
            estado = 'ACTIVO'
            if sin_cobro > 0:
                obs = f"Uso normal: {con_cobro} agente(s) con cobro activo ({sin_cobro} sin pago en el mes)."
            else:
                obs = f"Uso normal: {con_cobro} agente(s) con cobro en el mes."

        registros_depuracion.append({
            'centro': c,
            'sector': s,
            'nom_centro': m_info['nom_centro'],
            'nom_sector': m_info['nom_sector'],
            'nivel': m_info['nivel'],
            'gestion': m_info['gestion'],
            'cantidad_liquidaciones': con_cobro,
            'cantidad_con_cobro': con_cobro,
            'cantidad_sin_cobro': sin_cobro,
            'estado_depuracion': estado,
            'observaciones': obs,
            'establecimiento_id': est_id,
            'modalidad_id': mod_id,
            'created_at': ahora,
            'updated_at': ahora
        })

    # B. Procesar combinaciones de sueldos NO catalogadas en el maestro
    sueldo_no_catalogados = 0
    for (c, s), st in sueldo_stats.items():
        if (c, s) not in master_dict:
            sueldo_no_catalogados += 1
            total_liq = st['total']
            con_cobro = st['con_cobro']
            sin_cobro = st['sin_cobro']

            ext_saneamiento = existing_saneamientos.get((c, s))
            est_id = ext_saneamiento['establecimiento_id'] if ext_saneamiento else None
            mod_id = ext_saneamiento.get('modalidad_id') if ext_saneamiento else None

            if con_cobro == 0:
                estado = 'INACTIVO'
                obs = f"ATENCIÓN: Combinación no catalogada (Centro {c}, Sector {s}) con {total_liq} agentes sin cobro ($0)."
            else:
                estado = 'SUELDO_NO_CATALOGADO'
                obs = f"ATENCIÓN: Se registraron {con_cobro} haberes con cobro pero la combinación (Centro {c}, Sector {s}) NO existe en el catálogo maestro."
            
            registros_depuracion.append({
                'centro': c,
                'sector': s,
                'nom_centro': f"CENTRO {c} (NO CATALOGADO)",
                'nom_sector': f"SECTOR {s} (NO CATALOGADO)",
                'nivel': 'DESCONOCIDO',
                'gestion': 'DESCONOCIDO',
                'cantidad_liquidaciones': con_cobro,
                'cantidad_con_cobro': con_cobro,
                'cantidad_sin_cobro': sin_cobro,
                'estado_depuracion': estado,
                'observaciones': obs,
                'establecimiento_id': est_id,
                'modalidad_id': mod_id,
                'created_at': ahora,
                'updated_at': ahora
            })

    # Conteo por estado
    df_result = pd.DataFrame(registros_depuracion)
    conteo_estados = df_result['estado_depuracion'].value_counts()
    print("\n=== RESUMEN DE CLASIFICACIÓN DE DEPURACIÓN ===")
    for est, cnt in conteo_estados.items():
        print(f" - {est:22s}: {cnt:5d} combinaciones")

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
        cantidad_con_cobro INTEGER DEFAULT 0,
        cantidad_sin_cobro INTEGER DEFAULT 0,
        estado_depuracion TEXT NOT NULL,
        observaciones TEXT,
        establecimiento_id INTEGER,
        modalidad_id INTEGER,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
    )
    """)

    cursor.execute("DELETE FROM depuracion_centros_sectores")

    cursor.executemany("""
    INSERT INTO depuracion_centros_sectores (
        centro, sector, nom_centro, nom_sector, nivel, gestion,
        cantidad_liquidaciones, cantidad_con_cobro, cantidad_sin_cobro,
        estado_depuracion, observaciones, establecimiento_id, modalidad_id, created_at, updated_at
    ) VALUES (
        :centro, :sector, :nom_centro, :nom_sector, :nivel, :gestion,
        :cantidad_liquidaciones, :cantidad_con_cobro, :cantidad_sin_cobro,
        :estado_depuracion, :observaciones, :establecimiento_id, :modalidad_id, :created_at, :updated_at
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
            df_result[df_result['estado_depuracion'] == 'ACTIVO'].to_excel(writer, sheet_name='Activos con Cobro', index=False)
            df_result[df_result['estado_depuracion'] == 'INACTIVO'].to_excel(writer, sheet_name='Inactivos Sin Cobro', index=False)
            df_result[df_result['estado_depuracion'] == 'CENTRO_SIN_USO'].to_excel(writer, sheet_name='Centros Sin Uso', index=False)
            df_result[df_result['estado_depuracion'] == 'SECTOR_SIN_USO'].to_excel(writer, sheet_name='Sectores Sin Uso', index=False)
            df_result[df_result['estado_depuracion'] == 'SUELDO_NO_CATALOGADO'].to_excel(writer, sheet_name='Sueldos No Catalogados', index=False)
        print(f"   -> Reporte Excel generado exitosamente.")
    except Exception as e:
        print(f"   -> AVISO: No se pudo sobrescribir el Excel ({e}). Si está abierto en Excel, ciérrelo para actualizarlo.")

    print("======================================================================")
    print("=== AUDITORÍA Y DEPURACIÓN COMPLETADA EXITOSAMENTE ===")
    print("======================================================================")

if __name__ == '__main__':
    ejecutar_auditoria()
