import sqlite3

def audit_sprint7_zonas():
    print("======================================================================")
    print("=== SPRINT 7: AUDITORÍA QA DE 5 NIVELES - INCONSISTENCIAS ZONA ===")
    print("======================================================================")

    db_app = r'database/database.sqlite'

    # ------------------------------------------------------------------
    # NIVEL 3, 4 & 5: BASE DE DATOS Y BACKEND LARAVEL ($inconsistenciasZonaList)
    # ------------------------------------------------------------------
    print("\n[NIVEL 3, 4 & 5] Auditando $inconsistenciasZonaList en Controller & Web UI...")
    conn = sqlite3.connect(db_app)
    c = conn.cursor()

    nomina_id = c.execute("SELECT id FROM nominas_sueldos ORDER BY periodo DESC LIMIT 1").fetchone()[0]

    # Réplica exacta de la consulta $inconsistenciasZonaList en AuditoriaSueldosController.php
    query_zonas = """
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
        COALESCE(ed.zona_departamento, "S/D") as departamento,
        COALESCE(ed.localidad, "S/L") as localidad
    FROM auditoria_radio_resultados r
    LEFT JOIN establecimientos e ON e.cue = r.cue
    LEFT JOIN edificios ed ON ed.id = e.edificio_id
    WHERE r.nomina_id = ?
      AND r.cue IS NOT NULL AND r.cue != ''
      AND (r.estado_auditoria = 'PAGA_MAS_QUE_SIGE' OR r.estado_auditoria = 'PAGA_MENOS_QUE_SIGE')
    GROUP BY r.id
    ORDER BY r.sector ASC
    """

    rows_zonas = c.execute(query_zonas, (nomina_id,)).fetchall()
    conn.close()

    total_zonas = len(rows_zonas)
    total_docentes_zonas = sum(r[5] or 0 for r in rows_zonas)

    cnt_paga_mas = len([r for r in rows_zonas if r[6] == 'PAGA_MAS_QUE_SIGE'])
    cnt_paga_menos = len([r for r in rows_zonas if r[6] == 'PAGA_MENOS_QUE_SIGE'])

    print(f"  -> Total Sectores con Inconsistencias de Zona: {total_zonas}")
    print(f"  -> Total Docentes afectados en Inconsistencias de Zona: {total_docentes_zonas}")
    print(f"     • Con Radio en Exceso (Pagan MÁS)  : {cnt_paga_mas} sectores")
    print(f"     • Con Radio Deficiente (Pagan MENOS): {cnt_paga_menos} sectores")

    print("\nAuditando muestra de Inconsistencias de Zona Geográfica:")
    for r in rows_zonas[:10]:
        r_id, centro, sector, r_sueldo, r_sige, docentes, estado, cue, nom_est, depto, loc = r
        diff = float(r_sueldo or 0) - float(r_sige or 0)
        signo = f"+{diff:.0f}" if diff > 0 else f"{diff:.0f}"
        print(f"   - Sector {sector:4d} | CUE: {cue} | Depto: {depto:15s} | Radio Liquidador: {r_sueldo} vs SIGE: {r_sige} ({signo}) | {nom_est[:30]}")

    # ------------------------------------------------------------------
    # MATRIZ DE CONSISTENCIA Y PRUEBAS DE INCONSISTENCIAS (SPRINT 7)
    # ------------------------------------------------------------------
    print("\n======================================================================")
    print("=== MATRIZ DE EVALUACIÓN DE INCONSISTENCIAS (SPRINT 7) ===")
    print("======================================================================")

    inconsistencias = []

    # Check 1: ¿La suma de Pagan MÁS (61) + Pagan MENOS (34) coincide exactamente con Inconsistencias Zona (95)?
    if cnt_paga_mas == 61 and cnt_paga_menos == 34 and total_zonas == 95:
        print(f" [OK] Check 1: La suma de Pagan MÁS (61) + Pagan MENOS (34) da la suma exacta de {total_zonas} sectores en Inconsistencias de Zona.")
    else:
        inc = f"Desfasaje en Inconsistencias de Zona: MÁS={cnt_paga_mas} + MENOS={cnt_paga_menos} != Total={total_zonas}"
        print(f" [X] INCONSISTENCIA 1: {inc}")
        inconsistencias.append(inc)

    # Check 2: ¿La suma de docentes afectados coincide al 100% con Sprint 4 (1.548) + Sprint 5 (675) = 2.223 docentes?
    if total_docentes_zonas == (1548 + 675):
        print(f" [OK] Check 2: El total de docentes afectados ({total_docentes_zonas}) coincide al 100% con la suma de Pagan MÁS (1.548) + Pagan MENOS (675).")
    else:
        inc = f"Desfasaje de docentes en Inconsistencias Zona: Total={total_docentes_zonas} != Esperado={1548 + 675}"
        print(f" [X] INCONSISTENCIA 2: {inc}")
        inconsistencias.append(inc)

    # Check 3: ¿Todos los registros poseen información de Departamento/Localidad?
    sin_depto = [r for r in rows_zonas if not r[9] or r[9] == 'S/D']
    if not sin_depto:
        print(f" [OK] Check 3: El 100% de las inconsistencias de zona cuenta con su departamento o zona geográfica identificada.")
    else:
        print(f" [!] NOTA: {len(sin_depto)} registros tienen departamento 'S/D' (Sin Departamento asignado en edificio).")

    print("\n----------------------------------------------------------------------")
    if not inconsistencias:
        print("=== RESULTADO SPRINT 7: PESTAÑA INCONSISTENCIAS ZONA APROBADA SIN ERRORES ===")
    else:
        print(f"=== ATENCIÓN: SE DETECTARON {len(inconsistencias)} INCONSISTENCIAS EN SPRINT 7 ===")
    print("----------------------------------------------------------------------")

if __name__ == '__main__':
    audit_sprint7_zonas()
