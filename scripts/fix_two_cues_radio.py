import sqlite3

def fix_missing_radios():
    db_path = "database/database.sqlite"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. CUE 700051200 (Escuela Primaria Albergue Provincia De Entre Ríos - Edificio 134)
    # Distance to Plaza de Jachal is 54.3 km -> Radio 6 (or 7 for Albergue)
    cursor.execute("""
        UPDATE edificios
        SET punto_partida = 'PLAZA DE JACHAL',
            dist_circunf = 54.3,
            radio_circ = 6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 134;
    """)

    cursor.execute("""
        UPDATE modalidades
        SET radio_sige = 7,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 378;
    """)

    # 2. CUE 700070101 (Anexo Escuela Técnica Capacitación Laboral Aconcagua - Edificio 404)
    # Distance to Plaza de Jachal is 45.9 km -> Radio 6
    cursor.execute("""
        UPDATE edificios
        SET punto_partida = 'PLAZA DE JACHAL',
            dist_circunf = 45.9,
            radio_circ = 6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 404;
    """)

    cursor.execute("""
        UPDATE modalidades
        SET radio_sige = 6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1078;
    """)

    conn.commit()
    conn.close()
    print("[SUCCESS] Applied radio_sige and punto_partida for CUE 700051200 and CUE 700070101!")

if __name__ == "__main__":
    fix_missing_radios()
