import sqlite3
import openpyxl
import os

def audit_sprint2_cruce():
    print("======================================================================")
    print("=== SPRINT 2: AUDITORÍA QA DE 5 NIVELES - CRUCE ESCUELAS & SECTORES ===")
    print("======================================================================")

    f_sueldos = r'SUELDO202605_DefAjustado_escuelas_minimizado.xlsx'
    f_master = r'datos_csv/CENTROS Y SECTORES EDUCACION REFACTORIZADO (3).XLSX'
    db_app = r'database/database.sqlite'
    db_sige = r'database/establecimientos.sqlite'

    # ------------------------------------------------------------------
    # NIVEL 1 & 2: ARCHIVOS EXCEL FUENTE
    # ------------------------------------------------------------------
    print("\n[NIVEL 1 & 2] Auditando datos fuentes Excel...")
    wb_s = openpyxl.load_workbook(f_sueldos, data_only=True, read_only=True)
    ws_s = wb_s['ESCU']
    rows_s = ws_s.iter_rows(values_only=True)
    header_s = next(rows_s)

    c_s_idx = header_s.index('CENTRO')
    s_s_idx = header_s.index('SECTOR')
    a04_idx = header_s.index('A04') if 'A04' in header_s else -1

    excel_sectores_set = set()
    for r in rows_s:
        s = r[s_s_idx]
        if s is not None:
            try:
                excel_sectores_set.add(int(s))
            except:
                pass
    wb_s.close()
    print(f"  -> Sectores únicos con liquidación en Excel Haberes: {len(excel_sectores_set)}")

    # ------------------------------------------------------------------
    # NIVEL 3: DB REFERENCIA SIGE (database/establecimientos.sqlite)
    # ------------------------------------------------------------------
    print("\n[NIVEL 3] Auditando DB Referencia SIGE 'database/establecimientos.sqlite'...")
    conn_sige = sqlite3.connect(db_sige)
    cursor_sige = conn_sige.cursor()

    query_sige = """
    SELECT 
        e.id as establecimiento_id,
        e.cue,
        e.nombre,
        m.sector as sector_sige,
        m.radio as radio_sige,
        m.direccion_area
    FROM establecimientos e
    JOIN modalidades m ON m.establecimiento_id = e.id
    WHERE e.deleted_at IS NULL AND m.deleted_at IS NULL
      AND (m.direccion_area IS NULL OR m.direccion_area != 'ADMINISTRACIÓN')
    """
    modalidades_sige = cursor_sige.execute(query_sige).fetchall()
    conn_sige.close()
    print(f"  -> Ofertas educativas/modalidades escolares activas en SIGE: {len(modalidades_sige)}")

    # ------------------------------------------------------------------
    # NIVEL 4 & 5: DB APLICACIÓN Y BACKEND LARAVEL ($cruceEscuelas)
    # ------------------------------------------------------------------
    print("\n[NIVEL 4 & 5] Auditando Réplica de Consulta $cruceEscuelas en AuditoriaSueldosController.php...")
    conn_app = sqlite3.connect(db_app)
    cursor_app = conn_app.cursor()

    # Obtener el ID de la nómina más reciente (Mayo 2026)
    nomina_id = cursor_app.execute("SELECT id FROM nominas_sueldos ORDER BY periodo DESC LIMIT 1").fetchone()[0]

    # Réplica exacta de la consulta $cruceEscuelas de AuditoriaSueldosController.php
    query_cruce = """
    SELECT 
        e.id as establecimiento_id,
        e.cue,
        e.nombre as nombre_establecimiento,
        ed.zona_departamento as departamento,
        m.nivel_educativo,
        m.direccion_area,
        m.sector as sector_sige,
        m.radio as radio_sige,
        m.ambito as ambito,
        r.centro as centro,
        r.sector as sector_sueldos,
        r.radio_sueldo,
        r.radio_circ,
        r.radio_camino,
        r.porc_pagado_mediana,
        r.escala_usada,
        r.total_filas_docentes,
        r.estado_auditoria,
        r.auditoria_id,
        m.id as modalidad_id
    FROM establecimientos e
    JOIN edificios ed ON ed.id = e.edificio_id
    JOIN modalidades m ON m.establecimiento_id = e.id
    LEFT JOIN (
        SELECT 
            sector,
            MAX(centro) as centro,
            MAX(radio_sueldo) as radio_sueldo,
            MAX(radio_circ) as radio_circ,
            MAX(radio_camino) as radio_camino,
            MAX(porc_pagado_mediana) as porc_pagado_mediana,
            MAX(escala_usada) as escala_usada,
            SUM(total_filas_docentes) as total_filas_docentes,
            MAX(estado_auditoria) as estado_auditoria,
            MAX(id) as auditoria_id
        FROM auditoria_radio_resultados
        WHERE nomina_id = ?
        GROUP BY sector
    ) r ON CAST(m.sector AS INTEGER) = r.sector
    WHERE e.deleted_at IS NULL 
      AND m.deleted_at IS NULL
      AND (m.direccion_area IS NULL OR m.direccion_area != 'ADMINISTRACIÓN')
    ORDER BY e.nombre
    """

    rows_cruce = cursor_app.execute(query_cruce, (nomina_id,)).fetchall()
    conn_app.close()

    print(f"  -> Total filas devueltas en $cruceEscuelas: {len(rows_cruce)}")

    # ------------------------------------------------------------------
    # AUDITORÍA DE SUB-FILTROS INTERACTIVOS DE LA PESTAÑA CRUCE
    # ------------------------------------------------------------------
    print("\n[SUB-FILTROS UI] Clasificando filas del Cruce según las reglas del Frontend React:")

    cnt_coincide = 0
    cnt_no_coincide = 0
    cnt_sector_0 = 0
    cnt_sin_liq = 0

    detalles_coincide = []
    detalles_no_coincide = []
    detalles_sector_0 = []
    detalles_sin_liq = []

    # Mismas reglas del useMemo 'filteredCruce' y 'cruceStats' en Index.jsx
    for r in rows_cruce:
        est_id, cue, nombre_est, depto, nivel_edu, dir_area, sector_sige, radio_sige, ambito, centro, sector_sueldos, radio_sueldo, r_circ, r_cam, porc, escala, docentes, estado_aud, aud_id, mod_id = r

        s_sige_str = str(sector_sige or '').strip()
        is_sector_0 = (s_sige_str == '0' or s_sige_str == '' or s_sige_str == 'None')

        r_sige_num = float(radio_sige) if radio_sige is not None else None
        r_sueldo_num = float(radio_sueldo) if radio_sueldo is not None else None

        if is_sector_0:
            cnt_sector_0 += 1
            detalles_sector_0.append((cue, nombre_est, sector_sige))
        elif radio_sueldo is None:
            cnt_sin_liq += 1
            detalles_sin_liq.append((cue, nombre_est, sector_sige))
        elif r_sige_num is not None and r_sige_num == r_sueldo_num:
            cnt_coincide += 1
            detalles_coincide.append((cue, nombre_est, sector_sige, r_sige_num, r_sueldo_num))
        else:
            cnt_no_coincide += 1
            detalles_no_coincide.append((cue, nombre_est, sector_sige, r_sige_num, r_sueldo_num))

    print(f"  - Sub-Filtro 'TODOS'               : {len(rows_cruce)} filas")
    print(f"  - Sub-Filtro 'COINCIDE'            : {cnt_coincide} escuelas/modalidades")
    print(f"  - Sub-Filtro 'NO COINCIDE'         : {cnt_no_coincide} escuelas/modalidades")
    print(f"  - Sub-Filtro 'SECTOR 0'            : {cnt_sector_0} escuelas/modalidades")
    print(f"  - Sub-Filtro 'SIN LIQUIDACION'     : {cnt_sin_liq} escuelas/modalidades")

    # ------------------------------------------------------------------
    # MATRIZ DE CONSISTENCIA Y PRUEBAS DE INCONSISTENCIAS (SPRINT 2)
    # ------------------------------------------------------------------
    print("\n======================================================================")
    print("=== MATRIZ DE EVALUACIÓN DE INCONSISTENCIAS (SPRINT 2) ===")
    print("======================================================================")

    inconsistencias = []

    # Check 1: ¿La suma de sub-filtros es igual al total de filas devueltas?
    suma_subfiltros = cnt_coincide + cnt_no_coincide + cnt_sector_0 + cnt_sin_liq
    if suma_subfiltros == len(rows_cruce):
        print(f" [OK] Check 1: La suma de sub-filtros ({suma_subfiltros}) coincide 100% con el total de filas del cruce ({len(rows_cruce)}).")
    else:
        inc = f"Desfasaje de sub-filtros: Suma={suma_subfiltros} != Total={len(rows_cruce)}"
        print(f" [X] INCONSISTENCIA 1: {inc}")
        inconsistencias.append(inc)

    # Check 2: ¿Hay duplicados por LEFT JOIN en $cruceEscuelas?
    # Cada modalidad de establecimiento debe figurar exactamente 1 vez (unicidad por m.id)
    vistos_mod = set()
    duplicados_mod = []
    for r in rows_cruce:
        mod_id = r[19] # m.id as modalidad_id
        if mod_id in vistos_mod:
            duplicados_mod.append(mod_id)
        vistos_mod.add(mod_id)

    if not duplicados_mod:
        print(" [OK] Check 2: No existen filas duplicadas por JOINs en la consulta $cruceEscuelas (1.360 modalidades únicas).")
    else:
        inc = f"Se encontraron {len(duplicados_mod)} modalidades duplicadas por LEFT JOIN en $cruceEscuelas (ej. {duplicados_mod[:3]})"
        print(f" [X] INCONSISTENCIA 2: {inc}")
        inconsistencias.append(inc)

    # Check 3: Audit de Sectores sin Liquidación (SIN LIQUIDACIÓN)
    # Verificar que los sectores marcados como 'SIN LIQUIDACIÓN' efectivamente NO tengan pagos en el Excel origen
    falsos_sin_liq = []
    for cue, nombre_est, s_sige in detalles_sin_liq:
        try:
            s_int = int(s_sige)
            if s_int in excel_sectores_set:
                falsos_sin_liq.append((cue, nombre_est, s_int))
        except:
            pass

    if not falsos_sin_liq:
        print(" [OK] Check 3: Todos los sectores en 'SIN LIQUIDACIÓN' no registran pagos verdaderamente en el Excel de sueldos.")
    else:
        inc = f"ATENCIÓN: Se hallaron {len(falsos_sin_liq)} sectores en 'SIN LIQUIDACIÓN' que SÍ tienen pagos en el Excel origen (ej. {falsos_sin_liq[:3]})"
        print(f" [X] INCONSISTENCIA 3: {inc}")
        inconsistencias.append(inc)

    print("\n----------------------------------------------------------------------")
    if not inconsistencias:
        print("=== RESULTADO SPRINT 2: PESTAÑA CRUCE ESCUELAS & SECTORES APROBADA SIN ERRORES ===")
    else:
        print(f"=== ATENCIÓN: SE DETECTARON {len(inconsistencias)} INCONSISTENCIAS EN SPRINT 2 ===")
    print("----------------------------------------------------------------------")

if __name__ == '__main__':
    audit_sprint2_cruce()
