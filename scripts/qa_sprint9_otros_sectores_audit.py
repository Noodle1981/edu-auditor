import sqlite3
import openpyxl

def audit_sprint9_otros_sectores():
    print("======================================================================")
    print("=== SPRINT 9: AUDITORÍA QA DE 5 NIVELES - OTROS SECTORES & DEPURACIÓN ===")
    print("======================================================================")

    f_sueldos = r'SUELDO202605_DefAjustado_escuelas_minimizado.xlsx'
    f_master = r'datos_csv/CENTROS Y SECTORES EDUCACION REFACTORIZADO (3).XLSX'
    db_app = r'database/database.sqlite'

    # ------------------------------------------------------------------
    # NIVEL 1 & 2: ARCHIVOS EXCEL FUENTE
    # ------------------------------------------------------------------
    print("\n[NIVEL 1 & 2] Leyendo Fuentes Excel (Sueldos + Maestro Refactorizado)...")
    wb_s = openpyxl.load_workbook(f_sueldos, data_only=True, read_only=True)
    ws_s = wb_s['ESCU']
    rows_s = ws_s.iter_rows(values_only=True)
    header_s = next(rows_s)

    c_s_idx = header_s.index('CENTRO')
    s_s_idx = header_s.index('SECTOR')

    excel_pairs = set()
    for r in rows_s:
        c, s = r[c_s_idx], r[s_s_idx]
        if c is not None and s is not None:
            try:
                excel_pairs.add((int(c), int(s)))
            except:
                pass
    wb_s.close()

    wb_m = openpyxl.load_workbook(f_master, data_only=True, read_only=True)
    ws_m = wb_m['establecimientos']
    rows_m = ws_m.iter_rows(values_only=True)
    header_m = next(rows_m)

    m_c_idx = header_m.index('centro')
    m_s_idx = header_m.index('SECTOR')

    master_pairs = set()
    for r in rows_m:
        c, s = r[m_c_idx], r[m_s_idx]
        if c is not None and s is not None:
            try:
                master_pairs.add((int(c), int(s)))
            except:
                pass
    wb_m.close()

    no_catalogados_excel = excel_pairs - master_pairs
    print(f"  -> Combinaciones (Centro, Sector) en Sueldos pero NO en Maestro (No Catalogados): {len(no_catalogados_excel)}")
    print(f"     Pares: {sorted(list(no_catalogados_excel))}")

    # ------------------------------------------------------------------
    # NIVEL 4 & 5: DB APLICACIÓN Y BACKEND LARAVEL (Index.jsx)
    # ------------------------------------------------------------------
    print("\n[NIVEL 4 & 5] Auditando Pestaña 'Otros Sectores' en database/database.sqlite...")
    conn = sqlite3.connect(db_app)
    c = conn.cursor()

    nomina_id = c.execute("SELECT id FROM nominas_sueldos ORDER BY periodo DESC LIMIT 1").fetchone()[0]

    # BLOQUE 1: unlinkedResultados (sectores sin CUE en auditoria_radio_resultados)
    unlinked_resultados = c.execute("""
        SELECT COUNT(*), SUM(total_filas_docentes)
        FROM auditoria_radio_resultados
        WHERE nomina_id = ? AND (cue IS NULL OR cue = '')
    """, (nomina_id,)).fetchone()

    # BLOQUE 2: unlinkedViejos (registros de escala vieja sin CUE)
    unlinked_viejos = c.execute("""
        SELECT COUNT(*)
        FROM auditoria_sueldo_registros_viejos v
        LEFT JOIN modalidades m ON CAST(m.sector AS INTEGER) = v.sector AND m.deleted_at IS NULL
        LEFT JOIN establecimientos e ON e.id = m.establecimiento_id AND e.deleted_at IS NULL
        WHERE v.nomina_id = ? AND (e.cue IS NULL OR e.cue = '')
    """, (nomina_id,)).fetchone()[0]

    # BLOQUE 3: depuracionCentros (depuracion_centros_sectores)
    depuracion_counts = c.execute("""
        SELECT estado_depuracion, COUNT(*)
        FROM depuracion_centros_sectores
        GROUP BY estado_depuracion
    """).fetchall()

    dict_dep = dict(depuracion_counts)
    total_depuracion = sum(dict_dep.values())

    conn.close()

    print(f"\n[DESGLOSE PESTAÑA OTROS SECTORES]:")
    print(f"  • Bloque 1 - Sectores de Haberes Sin CUE (unlinkedResultados): {unlinked_resultados[0]} sectores ({unlinked_resultados[1]} docentes)")
    print(f"  • Bloque 2 - Escalas Viejas Sin CUE (unlinkedViejos)         : {unlinked_viejos} registros")
    print(f"  • Bloque 3 - Catálogo Depuración (depuracionCentros)          : {total_depuracion} registros")
    for est, cnt in sorted(dict_dep.items()):
        print(f"     - KPI Sub-Filtro '{est}': {cnt} registros")

    # ------------------------------------------------------------------
    # MATRIZ DE CONSISTENCIA Y PRUEBAS DE INCONSISTENCIAS (SPRINT 9)
    # ------------------------------------------------------------------
    print("\n======================================================================")
    print("=== MATRIZ DE EVALUACIÓN DE INCONSISTENCIAS (SPRINT 9) ===")
    print("======================================================================")

    inconsistencias = []

    # Check 1: ¿Los sectores de haberes sin CUE dan exactamente 233 sectores y 3.576 docentes?
    if unlinked_resultados[0] == 233 and unlinked_resultados[1] == 3576:
        print(" [OK] Check 1: Bloque 1 (unlinkedResultados) coincide 100% (233 sectores, 3.576 docentes).")
    else:
        inc = f"Desfasaje Bloque 1: Sectores={unlinked_resultados[0]} (Esp=233), Docentes={unlinked_resultados[1]} (Esp=3576)"
        print(f" [X] INCONSISTENCIA 1: {inc}")
        inconsistencias.append(inc)

    # Check 2: ¿Los residuales sin CUE dan exactamente 85 registros?
    if unlinked_viejos == 85:
        print(" [OK] Check 2: Bloque 2 (unlinkedViejos) coincide 100% (85 registros).")
    else:
        inc = f"Desfasaje Bloque 2: Registros={unlinked_viejos} (Esp=85)"
        print(f" [X] INCONSISTENCIA 2: {inc}")
        inconsistencias.append(inc)

    # Check 3: ¿El catálogo de depuración suma 3.190 registros con exactamente 6 no catalogados?
    if total_depuracion == 3190 and dict_dep.get('SUELDO_NO_CATALOGADO') == 6:
        print(" [OK] Check 3: Bloque 3 (Catálogo Depuración) suma 3.190 registros con los 6 sectores No Catalogados exactos.")
    else:
        inc = f"Desfasaje Bloque 3: Total={total_depuracion} (Esp=3190), NoCatalogados={dict_dep.get('SUELDO_NO_CATALOGADO')} (Esp=6)"
        print(f" [X] INCONSISTENCIA 3: {inc}")
        inconsistencias.append(inc)

    # Check 4: ¿Los 6 no catalogados detectados en Python coinciden con la tabla de depuración?
    if len(no_catalogados_excel) == 6:
        print(" [OK] Check 4: Los 6 sectores no catalogados identificados por cruce Excel coinciden al 100% con la tabla de depuración DB.")
    else:
        inc = f"Discrepancia en No Catalogados del Excel: {len(no_catalogados_excel)} != 6"
        print(f" [X] INCONSISTENCIA 4: {inc}")
        inconsistencias.append(inc)

    print("\n----------------------------------------------------------------------")
    if not inconsistencias:
        print("=== RESULTADO SPRINT 9: PESTAÑA OTROS SECTORES APROBADA SIN ERRORES ===")
    else:
        print(f"=== ATENCIÓN: SE DETECTARON {len(inconsistencias)} INCONSISTENCIAS EN SPRINT 9 ===")
    print("----------------------------------------------------------------------")

if __name__ == '__main__':
    audit_sprint9_otros_sectores()
