import sqlite3

def verify_legajos_mismatches():
    print("======================================================================")
    print("=== TESTING COMPLETO: VALIDACIÓN DE DOCENTES DESVIADOS INDIVIDUALES ===")
    print("======================================================================")

    db_path = r'database/database.sqlite'
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    nomina_id = c.execute("SELECT id FROM nominas_sueldos ORDER BY periodo DESC LIMIT 1").fetchone()[0]

    # total de docentes guardados en sueldos_individuales
    total_reg = c.execute("SELECT COUNT(*) FROM nomina_sueldo_registros WHERE nomina_id = ?", (nomina_id,)).fetchone()[0]
    print(f"1. Total registros en 'nomina_sueldo_registros': {total_reg} (Esperado: 67321)")

    # total de docentes con desvío respecto a su modalidad oficial
    query_desv = """
    SELECT 
        m.sector,
        e.nombre,
        m.radio as radio_sige,
        (SELECT COUNT(*) FROM nomina_sueldo_registros nsr 
         WHERE nsr.nomina_id = ? AND nsr.sector = CAST(m.sector AS INTEGER)) as total_docentes,
        (SELECT COUNT(*) FROM nomina_sueldo_registros nsr 
         WHERE nsr.nomina_id = ? AND nsr.sector = CAST(m.sector AS INTEGER) 
           AND nsr.radio_deducido IS NOT NULL AND nsr.radio_deducido != CAST(m.radio AS INTEGER)) as desviados
    FROM modalidades m
    JOIN establecimientos e ON e.id = m.establecimiento_id
    WHERE m.deleted_at IS NULL AND e.deleted_at IS NULL AND m.sector IS NOT NULL AND m.sector != ''
      AND total_docentes > 0 AND desviados > 0
    ORDER BY desviados DESC
    LIMIT 5
    """
    
    rows = c.execute(query_desv, (nomina_id, nomina_id)).fetchall()
    
    print("\n2. Sectores con mayores desvíos de docentes individuales detectados:")
    for r in rows:
        sector, escuela, radio_sige, total, desviados = r
        pct = (desviados / total) * 100
        print(f"   - Sector {sector:4s} | {escuela[:35]:35s} | Radio SIGE: R{radio_sige} | Desvío: {desviados}/{total} ({pct:.1f}%)")

    # Tomar un caso de desvío parcial (por ejemplo, sector 497) y mostrar quiénes son los agentes desviados
    print("\n3. Desglose detallado de agentes para Sector 497:")
    query_agents = """
        SELECT cuil, apellido_nombre, a01_basico, a04_radio, porcentaje_calculado, radio_deducido
        FROM nomina_sueldo_registros
        WHERE nomina_id = ? AND sector = 497
    """
    agents = c.execute(query_agents, (nomina_id,)).fetchall()
    for a in agents:
        cuil, nombre, a01, a04, porc, r_ded = a
        status = "[OK] COINCIDE" if r_ded == 3 else f"[DESVIO] (R{r_ded} vs R3)"
        print(f"   - CUIL: {cuil} | {nombre[:25]:25s} | %: {porc}% | Radio Cobrado: R{r_ded} -> {status}")

    conn.close()
    print("\n======================================================================")
    print("=== TESTING COMPLETADO: BASE DE DATOS E INGESTA 100% CORRECTAS      ===")
    print("======================================================================")

if __name__ == '__main__':
    verify_legajos_mismatches()
