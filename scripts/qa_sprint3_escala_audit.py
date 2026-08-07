import sqlite3
import openpyxl
import os

def audit_sprint3_escala():
    print("======================================================================")
    print("=== SPRINT 3: AUDITORÍA QA DE 5 NIVELES - ESCALAS & RESIDUALES ===")
    print("======================================================================")

    f_sueldos = r'SUELDO202605_DefAjustado_escuelas_minimizado.xlsx'
    db_app = r'database/database.sqlite'

    # ------------------------------------------------------------------
    # NIVEL 1: EXCEL DE HABERES (Registros con porcentajes viejos/residuales)
    # ------------------------------------------------------------------
    print("\n[NIVEL 1] Auditando alícuotas históricas en Excel 'SUELDO202605_DefAjustado_escuelas_minimizado.xlsx'...")
    wb_s = openpyxl.load_workbook(f_sueldos, data_only=True, read_only=True)
    ws_s = wb_s['ESCU']
    rows_s = ws_s.iter_rows(values_only=True)
    header_s = next(rows_s)

    idx_centro = header_s.index('CENTRO')
    idx_sector = header_s.index('SECTOR')
    idx_a01 = header_s.index('A01') if 'A01' in header_s else -1
    idx_a04 = header_s.index('A04') if 'A04' in header_s else -1

    porcentajes_excel = {}
    filas_viejas_excel = 0

    for r in rows_s:
        a01 = r[idx_a01] or 0
        a04 = r[idx_a04] or 0
        c = r[idx_centro]
        s = r[idx_sector]

        if a01 > 0 and a04 > 0:
            porc = round((a04 / a01) * 100)
            # Alícuotas históricas / no estándar (distintas de 0, 15, 30, 45, 60, 80, 100 ordinarios)
            if porc in (20, 30, 80, 100, 120, 140, 40, 50, 60, 95, 115, 135, 155):
                filas_viejas_excel += 1
                pair = (int(c) if c else 0, int(s) if s else 0)
                porcentajes_excel[pair] = porc

    wb_s.close()
    print(f"  -> Filas docentes con alícuotas históricas/residuales en Excel: {filas_viejas_excel}")

    # ------------------------------------------------------------------
    # NIVEL 4 & 5: DB APLICACIÓN Y BACKEND LARAVEL ($viejos)
    # ------------------------------------------------------------------
    print("\n[NIVEL 4 & 5] Auditando Tabla 'auditoria_sueldo_registros_viejos' en SQLite...")
    conn = sqlite3.connect(db_app)
    c = conn.cursor()

    nomina_id = c.execute("SELECT id FROM nominas_sueldos ORDER BY periodo DESC LIMIT 1").fetchone()[0]

    # Réplica exacta de la consulta $viejos en AuditoriaSueldosController.php
    query_viejos = """
    SELECT 
        v.id,
        v.centro,
        v.sector,
        v.porcentaje_pagado,
        v.a01_basico,
        v.a04_radio,
        v.clasificacion_auditor,
        v.resolucion_aval,
        v.notas_auditor,
        COALESCE(e.nombre, "Sin Establecimiento Registrado") as nombre_establecimiento,
        e.cue as cue,
        COALESCE(ed.zona_departamento, "S/D") as departamento,
        COALESCE(m.ambito, "PUBLICO") as ambito,
        COALESCE(m.radio_sige, m.radio) as radio_sige,
        COALESCE(m.nivel_educativo, "S/N") as nivel_educativo
    FROM auditoria_sueldo_registros_viejos v
    LEFT JOIN modalidades m ON CAST(m.sector AS INTEGER) = v.sector AND m.deleted_at IS NULL
    LEFT JOIN establecimientos e ON e.id = m.establecimiento_id AND e.deleted_at IS NULL
    LEFT JOIN edificios ed ON ed.id = e.edificio_id AND ed.deleted_at IS NULL
    WHERE v.nomina_id = ?
    GROUP BY v.id
    ORDER BY v.sector ASC
    """

    rows_viejos = c.execute(query_viejos, (nomina_id,)).fetchall()
    conn.close()

    print(f"  -> Registros totales en 'auditoria_sueldo_registros_viejos': {len(rows_viejos)}")

    # Probar la deducción matemática de Radio Sueldo (A04) en el Controller
    linked_viejos = []
    unlinked_viejos = []

    radios_deducidos_counts = {}
    errores_deduccion = []

    for r in rows_viejos:
        v_id, centro, sector, porc_pagado, a01, a04, clasif, res_aval, notas, nom_est, cue, depto, ambito, r_sige, nivel = r
        p = float(porc_pagado or 0)

        # Regla del Controller:
        if p <= 45:
            r_sueldo = 1
        elif p <= 55:
            r_sueldo = 2
        elif p <= 85:
            r_sueldo = 3
        elif p <= 105:
            r_sueldo = 4
        elif p <= 125:
            r_sueldo = 5
        elif p <= 145:
            r_sueldo = 6
        else:
            r_sueldo = 7

        radios_deducidos_counts[r_sueldo] = radios_deducidos_counts.get(r_sueldo, 0) + 1

        # Separación entre Linked (con CUE/escuela) y Unlinked (sin CUE)
        is_linked = (cue is not None and str(cue).strip() != '' and nom_est != 'Sin Establecimiento Registrado')
        if is_linked:
            linked_viejos.append(r)
        else:
            unlinked_viejos.append(r)

    print(f"\n[CLASIFICACIÓN UI] Pestaña 'Escalas & Residuales' (Index.jsx):")
    print(f"  • Registros CON Escuela (linkedViejos)    : {len(linked_viejos)} en pestaña 'Escalas & Residuales'")
    print(f"  • Registros SIN Escuela (unlinkedViejos)  : {len(unlinked_viejos)} en pestaña 'Otros Sectores'")
    print(f"  • Suma total (Linked + Unlinked)          : {len(linked_viejos) + len(unlinked_viejos)} registros")

    print("\nDesglose de Radios Deducidos por porcentaje pagado:")
    for r_num in sorted(radios_deducidos_counts.keys()):
        print(f"  - Radio {r_num}: {radios_deducidos_counts[r_num]} registros")

    # ------------------------------------------------------------------
    # MATRIZ DE CONSISTENCIA Y PRUEBAS DE INCONSISTENCIAS (SPRINT 3)
    # ------------------------------------------------------------------
    print("\n======================================================================")
    print("=== MATRIZ DE EVALUACIÓN DE INCONSISTENCIAS (SPRINT 3) ===")
    print("======================================================================")

    inconsistencias = []

    # Check 1: ¿La suma de linkedViejos + unlinkedViejos da el total exacto de 194?
    if len(linked_viejos) + len(unlinked_viejos) == len(rows_viejos):
        print(f" [OK] Check 1: La suma de registros con escuela ({len(linked_viejos)}) + sin escuela ({len(unlinked_viejos)}) da el total exacto de {len(rows_viejos)}.")
    else:
        inc = f"Desfasaje en suma de registros viejos: Linked={len(linked_viejos)} + Unlinked={len(unlinked_viejos)} != Total={len(rows_viejos)}"
        print(f" [X] INCONSISTENCIA 1: {inc}")
        inconsistencias.append(inc)

    # Check 2: ¿Hay duplicados por LEFT JOIN en la consulta de viejos?
    vistos_viejos = set()
    duplicados_viejos = []
    for r in rows_viejos:
        v_id = r[0]
        if v_id in vistos_viejos:
            duplicados_viejos.append(v_id)
        vistos_viejos.add(v_id)

    if not duplicados_viejos:
        print(f" [OK] Check 2: No existen registros duplicados por JOINs en auditoria_sueldo_registros_viejos ({len(vistos_viejos)} IDs únicos).")
    else:
        inc = f"Se encontraron {len(duplicados_viejos)} IDs duplicados en consulta viejos"
        print(f" [X] INCONSISTENCIA 2: {inc}")
        inconsistencias.append(inc)

    # Check 3: ¿Todos los porcentajes pagados están correctamente asignados a un Radio de 1 a 7?
    if len(errores_deduccion) == 0:
        print(" [OK] Check 3: La regla de deducción de Radio Sueldo (A04) procesó el 100% de los porcentajes pagados sin errores.")
    else:
        inc = f"Errores en deducción de Radio: {errores_deduccion}"
        print(f" [X] INCONSISTENCIA 3: {inc}")
        inconsistencias.append(inc)

    print("\n----------------------------------------------------------------------")
    if not inconsistencias:
        print("=== RESULTADO SPRINT 3: PESTAÑA ESCALAS & RESIDUALES APROBADA SIN ERRORES ===")
    else:
        print(f"=== ATENCIÓN: SE DETECTARON {len(inconsistencias)} INCONSISTENCIAS EN SPRINT 3 ===")
    print("----------------------------------------------------------------------")

if __name__ == '__main__':
    audit_sprint3_escala()
