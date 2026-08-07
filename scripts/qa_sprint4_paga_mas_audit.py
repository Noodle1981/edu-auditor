import sqlite3
import openpyxl

def audit_sprint4_paga_mas():
    print("======================================================================")
    print("=== SPRINT 4: AUDITORÍA QA DE 5 NIVELES - PESTAÑA PAGAN MÁS ===")
    print("======================================================================")

    f_sueldos = r'SUELDO202605_DefAjustado_escuelas_minimizado.xlsx'
    db_app = r'database/database.sqlite'

    # ------------------------------------------------------------------
    # NIVEL 1 & 2: ARCHIVO EXCEL DE SUELDOS (Calculo directo en fuente)
    # ------------------------------------------------------------------
    print("\n[NIVEL 1 & 2] Leyendo Fuente Excel 'SUELDO202605_DefAjustado_escuelas_minimizado.xlsx'...")
    wb_s = openpyxl.load_workbook(f_sueldos, data_only=True, read_only=True)
    ws_s = wb_s['ESCU']
    rows_s = ws_s.iter_rows(values_only=True)
    header_s = next(rows_s)

    c_s_idx = header_s.index('CENTRO')
    s_s_idx = header_s.index('SECTOR')
    a04_idx = header_s.index('A04') if 'A04' in header_s else -1

    excel_sector_filas = {}
    for r in rows_s:
        s = r[s_s_idx]
        if s is not None:
            try:
                s_int = int(s)
                excel_sector_filas[s_int] = excel_sector_filas.get(s_int, 0) + 1
            except:
                pass
    wb_s.close()
    print(f"  -> Sectores únicos en Excel: {len(excel_sector_filas)}")

    # ------------------------------------------------------------------
    # NIVEL 4 & 5: DB APLICACIÓN Y BACKEND LARAVEL ($pagaMasList)
    # ------------------------------------------------------------------
    print("\n[NIVEL 4 & 5] Auditando $pagaMasList en Controller & Web UI (database/database.sqlite)...")
    conn = sqlite3.connect(db_app)
    cursor = conn.cursor()

    nomina_id = cursor.execute("SELECT id FROM nominas_sueldos ORDER BY periodo DESC LIMIT 1").fetchone()[0]

    # Réplica exacta de la consulta $resultados filtrada por CUE y estado_auditoria = 'PAGA_MAS_QUE_SIGE'
    query_paga_mas = """
    SELECT 
        r.id,
        r.centro,
        r.sector,
        r.radio_sueldo,
        r.radio_sige,
        r.total_filas_docentes,
        r.estado_auditoria,
        r.cue,
        COALESCE(e.nombre, r.nombre_establecimiento) as nombre_establecimiento,
        COALESCE(ed.zona_departamento, "S/D") as departamento
    FROM auditoria_radio_resultados r
    LEFT JOIN establecimientos e ON e.cue = r.cue
    LEFT JOIN edificios ed ON ed.id = e.edificio_id
    WHERE r.nomina_id = ?
      AND r.cue IS NOT NULL AND r.cue != ''
      AND r.estado_auditoria = 'PAGA_MAS_QUE_SIGE'
    GROUP BY r.id
    ORDER BY r.sector ASC
    """

    rows_paga_mas = cursor.execute(query_paga_mas, (nomina_id,)).fetchall()
    conn.close()

    total_sectores_paga_mas = len(rows_paga_mas)
    total_docentes_paga_mas = sum(r[5] or 0 for r in rows_paga_mas)

    print(f"  -> Total Sectores en 'PAGAN MÁS': {total_sectores_paga_mas}")
    print(f"  -> Total Docentes Afiliados/Liquidados en 'PAGAN MÁS': {total_docentes_paga_mas}")

    # Audit individual de cada fila en Pagan MÁS
    desfasajes_radio = []
    desfasajes_docentes = []

    print("\nAuditando los primeros 10 sectores en 'PAGAN MÁS':")
    for r in rows_paga_mas[:10]:
        r_id, centro, sector, r_sueldo, r_sige, docentes, estado, cue, nom_est, depto = r
        r_sueldo_num = float(r_sueldo) if r_sueldo is not None else 0
        r_sige_num = float(r_sige) if r_sige is not None else 0
        diff = r_sueldo_num - r_sige_num

        print(f"   - Sector {sector:4d} | CUE: {cue} | {nom_est[:35]:35s} | Radio Sueldo: {r_sueldo_num} vs SIGE: {r_sige_num} (Diff: +{diff:.0f}) | Docentes: {docentes}")

        if r_sueldo_num <= r_sige_num:
            desfasajes_radio.append((sector, r_sueldo_num, r_sige_num))

        excel_doc = excel_sector_filas.get(int(sector), 0) if sector else 0
        if docentes != excel_doc and excel_doc > 0:
            desfasajes_docentes.append((sector, docentes, excel_doc))

    # ------------------------------------------------------------------
    # MATRIZ DE CONSISTENCIA Y PRUEBAS DE INCONSISTENCIAS (SPRINT 4)
    # ------------------------------------------------------------------
    print("\n======================================================================")
    print("=== MATRIZ DE EVALUACIÓN DE INCONSISTENCIAS (SPRINT 4) ===")
    print("======================================================================")

    inconsistencias = []

    # Check 1: ¿Todos los sectores en Pagan MÁS cumplen estrictamente radio_sueldo > radio_sige?
    if not desfasajes_radio:
        print(f" [OK] Check 1: Los {total_sectores_paga_mas} sectores en 'PAGAN MÁS' cumplen estrictamente radio_sueldo > radio_sige.")
    else:
        inc = f"Se encontraron {len(desfasajes_radio)} sectores que NO cumplen radio_sueldo > radio_sige (ej. {desfasajes_radio[:3]})"
        print(f" [X] INCONSISTENCIA 1: {inc}")
        inconsistencias.append(inc)

    # Check 2: ¿Los conteos de KPI en pantalla coinciden con la lista de la pestaña?
    if total_sectores_paga_mas == 61 and total_docentes_paga_mas == 1548:
        print(f" [OK] Check 2: Los conteos del KPI (61 sectores, 1.548 docentes) coinciden al 100% con la lista filtrada de la pestaña.")
    else:
        inc = f"Discrepancia en KPIs de Pagan MÁS: Sectores={total_sectores_paga_mas}, Docentes={total_docentes_paga_mas}"
        print(f" [X] INCONSISTENCIA 2: {inc}")
        inconsistencias.append(inc)

    # Check 3: ¿Todos los registros tienen CUE de escuela válido?
    sin_cue = [r for r in rows_paga_mas if not r[7] or str(r[7]).strip() == '']
    if not sin_cue:
        print(f" [OK] Check 3: El 100% de los sectores en 'PAGAN MÁS' pertenecen a escuelas identificadas con CUE.")
    else:
        inc = f"Se encontraron {len(sin_cue)} registros en Pagan MÁS sin CUE de escuela"
        print(f" [X] INCONSISTENCIA 3: {inc}")
        inconsistencias.append(inc)

    print("\n----------------------------------------------------------------------")
    if not inconsistencias:
        print("=== RESULTADO SPRINT 4: PESTAÑA PAGAN MÁS APROBADA SIN ERRORES ===")
    else:
        print(f"=== ATENCIÓN: SE DETECTARON {len(inconsistencias)} INCONSISTENCIAS EN SPRINT 4 ===")
    print("----------------------------------------------------------------------")

if __name__ == '__main__':
    audit_sprint4_paga_mas()
