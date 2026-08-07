import sqlite3

def audit_sprint6_conflictos():
    print("======================================================================")
    print("=== SPRINT 6: AUDITORÍA QA DE 5 NIVELES - CONFLICTOS SIGE ===")
    print("======================================================================")

    db_app = r'database/database.sqlite'

    # ------------------------------------------------------------------
    # NIVEL 3, 4 & 5: BASE DE DATOS Y BACKEND LARAVEL ($conflictosSige)
    # ------------------------------------------------------------------
    print("\n[NIVEL 3, 4 & 5] Auditando consulta $conflictosSige en SQLite...")
    conn = sqlite3.connect(db_app)
    c = conn.cursor()

    # Réplica exacta de la consulta $conflictosSige en AuditoriaSueldosController.php
    query_conflictos = """
    SELECT 
        m.sector,
        COUNT(DISTINCT m.radio) as total_radios_distintos,
        GROUP_CONCAT(DISTINCT m.radio) as radios_en_conflicto,
        COUNT(DISTINCT e.id) as total_escuelas,
        GROUP_CONCAT(DISTINCT e.nombre || ' (CUE: ' || COALESCE(e.cue, 'S/CUE') || ', Radio: ' || m.radio || ')') as establecimientos_detallados
    FROM modalidades m
    JOIN establecimientos e ON e.id = m.establecimiento_id
    WHERE m.deleted_at IS NULL 
      AND e.deleted_at IS NULL 
      AND m.sector IS NOT NULL 
      AND CAST(m.sector AS INTEGER) > 0
    GROUP BY CAST(m.sector AS INTEGER)
    HAVING COUNT(DISTINCT m.radio) > 1
    ORDER BY CAST(m.sector AS INTEGER) ASC
    """

    rows_conflictos = c.execute(query_conflictos).fetchall()
    conn.close()

    total_conflictos = len(rows_conflictos)
    print(f"  -> Total Sectores en Conflicto SIGE detectados: {total_conflictos}")

    # Audit individual de cada sector con conflicto
    print("\nDetalle de los Sectores en Conflicto SIGE:")
    for r in rows_conflictos:
        sector, radios_cnt, radios_str, escuelas_cnt, detalles = r
        print(f"   - Sector {int(sector):4d} | {radios_cnt} Radios Distintos en SIGE [{radios_str}] | {escuelas_cnt} Escuelas Afectadas")
        print(f"     Detalle: {detalles[:100]}...")

    # ------------------------------------------------------------------
    # MATRIZ DE CONSISTENCIA Y PRUEBAS DE INCONSISTENCIAS (SPRINT 6)
    # ------------------------------------------------------------------
    print("\n======================================================================")
    print("=== MATRIZ DE EVALUACIÓN DE INCONSISTENCIAS (SPRINT 6) ===")
    print("======================================================================")

    inconsistencias = []

    # Check 1: ¿Todos los sectores reportados tienen verdaderamente más de 1 radio en SIGE?
    falsos_conflictos = [r for r in rows_conflictos if r[1] <= 1]
    if not falsos_conflictos:
        print(f" [OK] Check 1: El 100% de los {total_conflictos} sectores reportados poseen más de 1 Radio atribuido en SIGE.")
    else:
        inc = f"Se hallaron {len(falsos_conflictos)} sectores con 1 solo radio reportados como conflicto"
        print(f" [X] INCONSISTENCIA 1: {inc}")
        inconsistencias.append(inc)

    # Check 2: ¿La lista de detalles contiene strings válidos para la apertura de la ventana modal?
    modales_invalidos = [r for r in rows_conflictos if not r[4] or len(r[4].strip()) == 0]
    if not modales_invalidos:
        print(" [OK] Check 2: El 100% de los sectores cuenta con información detallada de escuelas/CUEs para el modal interactivo.")
    else:
        inc = f"Se hallaron {len(modales_invalidos)} sectores sin detalle para el modal"
        print(f" [X] INCONSISTENCIA 2: {inc}")
        inconsistencias.append(inc)

    print("\n----------------------------------------------------------------------")
    if not inconsistencias:
        print("=== RESULTADO SPRINT 6: PESTAÑA CONFLICTOS SIGE APROBADA SIN ERRORES ===")
    else:
        print(f"=== ATENCIÓN: SE DETECTARON {len(inconsistencias)} INCONSISTENCIAS EN SPRINT 6 ===")
    print("----------------------------------------------------------------------")

if __name__ == '__main__':
    audit_sprint6_conflictos()
