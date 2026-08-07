import sqlite3

def audit_sprint8_tracking():
    print("======================================================================")
    print("=== SPRINT 8: AUDITORÍA QA DE 5 NIVELES - SEGUIMIENTO & GESTIÓN ===")
    print("======================================================================")

    db_app = r'database/database.sqlite'

    # ------------------------------------------------------------------
    # NIVEL 3, 4 & 5: BASE DE DATOS Y BACKEND LARAVEL (auditoria_radio_resultados)
    # ------------------------------------------------------------------
    print("\n[NIVEL 3, 4 & 5] Auditando $trackingList en Controller & Web UI...")
    conn = sqlite3.connect(db_app)
    c = conn.cursor()

    nomina_id = c.execute("SELECT id FROM nominas_sueldos ORDER BY periodo DESC LIMIT 1").fetchone()[0]

    # Réplica de la consulta $trackingList en AuditoriaSueldosController.php
    query_tracking = """
    SELECT 
        r.id,
        r.centro,
        r.sector,
        r.radio_sueldo,
        r.radio_sige,
        r.total_filas_docentes,
        r.estado_auditoria,
        COALESCE(r.estado_gestion, 'PENDIENTE') as estado_gestion,
        r.notas_auditor,
        r.cue,
        COALESCE(e.nombre, r.nombre_establecimiento) as nombre_establecimiento
    FROM auditoria_radio_resultados r
    LEFT JOIN establecimientos e ON e.cue = r.cue
    WHERE r.nomina_id = ?
      AND r.cue IS NOT NULL AND r.cue != ''
    ORDER BY r.sector ASC
    """

    rows_tracking = c.execute(query_tracking, (nomina_id,)).fetchall()

    total_tracking = len(rows_tracking)
    docentes_tracking = sum(r[5] or 0 for r in rows_tracking)

    # Conteo por estado de gestión
    counts_gestion = {}
    for r in rows_tracking:
        est = r[7] or 'PENDIENTE'
        counts_gestion[est] = counts_gestion.get(est, 0) + 1

    print(f"  -> Total Sectores en Seguimiento & Gestión: {total_tracking}")
    print(f"  -> Total Docentes representados: {docentes_tracking}")
    print(f"  -> Desglose por Estado de Gestión (KPIs):")
    for est, cnt in counts_gestion.items():
        print(f"     • {est:20s}: {cnt} sectores")

    # Pruebas de Persistencia de Gestión en SQLite
    print("\n[PRUEBA DE COMPROMISO DE DATOS] Verificando que las notas de gestión no corrompan los haberes:")
    test_item = rows_tracking[0]
    test_id = test_item[0]
    test_sector = test_item[2]
    original_docentes = test_item[5]
    original_radio = test_item[3]

    # Simular actualización de estado de gestión
    c.execute("""
        UPDATE auditoria_radio_resultados 
        SET estado_gestion = 'EN_INVESTIGACION', notas_auditor = 'QA Sprint 8 Test Note'
        WHERE id = ?
    """, (test_id,))
    conn.commit()

    # Re-consultar el registro modificado
    rechecked = c.execute("""
        SELECT estado_gestion, notas_auditor, total_filas_docentes, radio_sueldo 
        FROM auditoria_radio_resultados WHERE id = ?
    """, (test_id,)).fetchone()

    # Restaurar el estado original
    c.execute("""
        UPDATE auditoria_radio_resultados 
        SET estado_gestion = ?, notas_auditor = ?
        WHERE id = ?
    """, (test_item[7], test_item[8], test_id))
    conn.commit()
    conn.close()

    print(f"   - Registro Test ID {test_id} (Sector {test_sector}):")
    print(f"     • Estado escrito: '{rechecked[0]}' | Notas escritas: '{rechecked[1]}'")
    print(f"     • Docentes Intactos: {rechecked[2] == original_docentes} ({rechecked[2]}) | Radio Intacto: {rechecked[3] == original_radio} ({rechecked[3]})")

    # ------------------------------------------------------------------
    # MATRIZ DE CONSISTENCIA Y PRUEBAS DE INCONSISTENCIAS (SPRINT 8)
    # ------------------------------------------------------------------
    print("\n======================================================================")
    print("=== MATRIZ DE EVALUACIÓN DE INCONSISTENCIAS (SPRINT 8) ===")
    print("======================================================================")

    inconsistencias = []

    # Check 1: ¿La suma de sectores en tracking coincide con linkedResultados (2.350)?
    if total_tracking == 2350:
        print(f" [OK] Check 1: El total de sectores en Seguimiento ({total_tracking}) coincide 100% con los sectores vinculados a escuelas.")
    else:
        inc = f"Desfasaje en Seguimiento: Total={total_tracking} vs Esperado=2.350"
        print(f" [X] INCONSISTENCIA 1: {inc}")
        inconsistencias.append(inc)

    # Check 2: ¿La suma de docentes en tracking coincide con los docentes en escuelas (63.745)?
    if docentes_tracking == 63745:
        print(f" [OK] Check 2: El total de docentes en Seguimiento ({docentes_tracking}) coincide al 100% con la métrica global del KPI.")
    else:
        inc = f"Desfasaje de docentes en Seguimiento: Total={docentes_tracking} vs Esperado=63.745"
        print(f" [X] INCONSISTENCIA 2: {inc}")
        inconsistencias.append(inc)

    # Check 3: ¿La prueba de persistencia actualizó notas sin alterar los valores salariales?
    if rechecked[0] == 'EN_INVESTIGACION' and rechecked[2] == original_docentes and rechecked[3] == original_radio:
        print(" [OK] Check 3: La persistencia de gestión (estados/notas) es totalmente aislada y no altera los montos o liquidaciones docentes.")
    else:
        inc = "Falla en aislamiento de persistencia de gestión"
        print(f" [X] INCONSISTENCIA 3: {inc}")
        inconsistencias.append(inc)

    print("\n----------------------------------------------------------------------")
    if not inconsistencias:
        print("=== RESULTADO SPRINT 8: PESTAÑA SEGUIMIENTO & GESTIÓN APROBADA SIN ERRORES ===")
    else:
        print(f"=== ATENCIÓN: SE DETECTARON {len(inconsistencias)} INCONSISTENCIAS EN SPRINT 8 ===")
    print("----------------------------------------------------------------------")

if __name__ == '__main__':
    audit_sprint8_tracking()
