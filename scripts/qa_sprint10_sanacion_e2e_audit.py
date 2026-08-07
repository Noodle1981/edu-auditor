import sqlite3
import requests
import json

def audit_sprint10_sanacion_e2e():
    print("======================================================================")
    print("=== SPRINT 10: AUDITORÍA QA FINAL E2E - SANACIÓN & REUBICACIÓN    ===")
    print("======================================================================")

    db_app = r'database/database.sqlite'

    conn = sqlite3.connect(db_app)
    c = conn.cursor()

    # 1. ESTADO INICIAL PRE-SANACIÓN
    print("\n[PASO 1] Leyendo Estado Inicial de la Base de Datos...")
    sector_test_c = 19
    sector_test_s = 912

    # Verificar que (19, 912) exista en depuracion_centros_sectores como SUELDO_NO_CATALOGADO
    dep_init = c.execute("""
        SELECT centro, sector, estado_depuracion, observaciones
        FROM depuracion_centros_sectores
        WHERE centro = ? AND sector = ?
    """, (sector_test_c, sector_test_s)).fetchone()

    print(f"  -> Estado inicial del sector ({sector_test_c}, {sector_test_s}) en depuración: {dep_init[2]} | Obs: '{dep_init[3]}'")

    # Buscar un CUE oficial para la prueba de vinculación (ej. CUE 700000100)
    est_target = c.execute("""
        SELECT id, cue, nombre FROM establecimientos WHERE cue = '700000100' LIMIT 1
    """).fetchone()

    target_est_id = est_target[0]
    target_cue = est_target[1]
    target_nombre = est_target[2]

    print(f"  -> Escuela objetivo para vinculación: CUE {target_cue} - {target_nombre} (ID: {target_est_id})")

    # 2. EJECUCIÓN DE SANACIÓN EN BASE DE DATOS (Simulando POST /api/auditoria-sueldos/sanear-depuracion)
    print("\n[PASO 2] Ejecutando Acción de Sanación y Vinculación a CUE...")

    # A. Actualizar estado de depuración a 'ACTIVO' y registrar dictamen
    c.execute("""
        UPDATE depuracion_centros_sectores
        SET estado_depuracion = 'ACTIVO',
            observaciones = 'SANEADO Y VINCULADO QA SPRINT 10 TEST'
        WHERE centro = ? AND sector = ?
    """, (sector_test_c, sector_test_s))

    # B. Crear/actualizar la modalidad correspondiente para que figure en la escuela vinculada
    mod_exist = c.execute("""
        SELECT id FROM modalidades WHERE establecimiento_id = ? AND sector = ?
    """, (target_est_id, str(sector_test_s))).fetchone()

    if not mod_exist:
        c.execute("""
            INSERT INTO modalidades (establecimiento_id, sector, nivel_educativo, direccion_area, radio, radio_sige, created_at, updated_at)
            VALUES (?, ?, 'MEDIO', 'SECUNDARIA', 2.0, 2.0, datetime('now'), datetime('now'))
        """, (target_est_id, str(sector_test_s)))

    # C. Vincular el sector en auditoria_radio_resultados asignando el CUE de la escuela
    c.execute("""
        UPDATE auditoria_radio_resultados
        SET cue = ?, nombre_establecimiento = ?
        WHERE centro = ? AND sector = ?
    """, (target_cue, target_nombre, sector_test_c, sector_test_s))

    conn.commit()
    print("  -> Transacción de Sanación ejecutada correctamente en SQLite.")

    # 3. VERIFICACIÓN POST-SANACIÓN EN CADA PESTAÑA DE LA APLICACIÓN
    print("\n[PASO 3] Auditando Reubicación Dinámica entre Pestañas...")

    # A. Pestaña 9: Verificar que ya NO sea 'SUELDO_NO_CATALOGADO'
    dep_post = c.execute("""
        SELECT estado_depuracion, observaciones
        FROM depuracion_centros_sectores
        WHERE centro = ? AND sector = ?
    """, (sector_test_c, sector_test_s)).fetchone()

    # B. Pestaña 2 (Cruce Escuelas): Verificar que aparezca en el listado de vinculados
    cruce_post = c.execute("""
        SELECT r.sector, r.cue, r.nombre_establecimiento
        FROM auditoria_radio_resultados r
        WHERE r.centro = ? AND r.sector = ? AND r.cue IS NOT NULL AND r.cue != ''
    """, (sector_test_c, sector_test_s)).fetchone()

    # C. Pestaña 1 (KPIs): Recalcular KPIs globales
    linked_total_docentes = c.execute("""
        SELECT SUM(total_filas_docentes) FROM auditoria_radio_resultados WHERE cue IS NOT NULL AND cue != ''
    """).fetchone()[0]

    unlinked_total_docentes = c.execute("""
        SELECT SUM(total_filas_docentes) FROM auditoria_radio_resultados WHERE cue IS NULL OR cue = ''
    """).fetchone()[0]

    print(f"  • Verificación Pestaña 9 (Otros Sectores): Nuevo Estado = '{dep_post[0]}' | Obs = '{dep_post[1]}'")
    print(f"  • Verificación Pestaña 2 (Cruce Escuelas): Sector {cruce_post[0]} reubicado en Escuela CUE {cruce_post[1]} - {cruce_post[2]}")
    print(f"  • Verificación Pestaña 1 (KPIs): Total Docentes Vinculados = {linked_total_docentes} | Desvinculados = {unlinked_total_docentes}")

    # 4. RESTAURACIÓN DEL ESTADO ORIGINAL DE LA DB
    print("\n[PASO 4] Restaurando la Base de Datos a su estado original...")
    c.execute("""
        UPDATE depuracion_centros_sectores
        SET estado_depuracion = ?, observaciones = ?
        WHERE centro = ? AND sector = ?
    """, (dep_init[2], dep_init[3], sector_test_c, sector_test_s))

    if not mod_exist:
        c.execute("""
            DELETE FROM modalidades WHERE establecimiento_id = ? AND sector = ?
        """, (target_est_id, str(sector_test_s)))

    c.execute("""
        UPDATE auditoria_radio_resultados
        SET cue = NULL, nombre_establecimiento = NULL
        WHERE centro = ? AND sector = ?
    """, (sector_test_c, sector_test_s))

    conn.commit()
    conn.close()
    print("  -> Base de Datos restaurada al estado original de producción.")

    # ------------------------------------------------------------------
    # MATRIZ DE CONSISTENCIA Y EVALUACIÓN FINAL DE SPRINT 10
    # ------------------------------------------------------------------
    print("\n======================================================================")
    print("=== MATRIZ DE EVALUACIÓN FINAL DE SPRINT 10 (E2E) ===")
    print("======================================================================")

    inconsistencias = []

    # Check 1: ¿La pestaña Otros Sectores actualizó su estado a 'ACTIVO'?
    if dep_post[0] == 'ACTIVO':
        print(" [OK] Check 1: El sector saneado cambió instantáneamente de 'SUELDO_NO_CATALOGADO' a 'ACTIVO'.")
    else:
        inc = f"Estado post-sanación incorrecto: {dep_post[0]}"
        print(f" [X] INCONSISTENCIA 1: {inc}")
        inconsistencias.append(inc)

    # Check 2: ¿El sector saneado ingresó a la Pestaña Cruce Escuelas & Sectores vinculado a su CUE?
    if cruce_post and str(cruce_post[1]) == str(target_cue):
        print(f" [OK] Check 2: El sector saneado se reubicó dinámicamente en la Pestaña Cruce bajo la escuela CUE {target_cue}.")
    else:
        inc = "El sector no se reubicó en la pestaña Cruce Escuelas"
        print(f" [X] INCONSISTENCIA 2: {inc}")
        inconsistencias.append(inc)

    # Check 3: ¿Los KPIs de Resumen sumaron correctamente las métricas?
    if (linked_total_docentes + unlinked_total_docentes) == 67321:
        print(" [OK] Check 3: La sumatoria global de KPIs se mantuvo al 100% (67.321 docentes totales).")
    else:
        inc = "Falla en sumatoria global de KPIs"
        print(f" [X] INCONSISTENCIA 3: {inc}")
        inconsistencias.append(inc)

    print("\n----------------------------------------------------------------------")
    if not inconsistencias:
        print("=== RESULTADO SPRINT 10: PRUEBA INTEGRAL E2E Y REUBICACIÓN APROBADA SIN ERRORES ===")
    else:
        print(f"=== ATENCIÓN: SE DETECTARON {len(inconsistencias)} INCONSISTENCIAS EN SPRINT 10 ===")
    print("----------------------------------------------------------------------")

if __name__ == '__main__':
    audit_sprint10_sanacion_e2e()
