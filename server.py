import http.server
import socketserver
import json
import sqlite3
import urllib.parse
import os
import re
import datetime

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Single unified database file
DB_PATH = os.path.join(BASE_DIR, "database.db")
PUBLIC_DIR = os.path.join(BASE_DIR, "dist")

# Ensure public dir exists
if not os.path.exists(PUBLIC_DIR):
    os.makedirs(PUBLIC_DIR)

class DatabaseAPIHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path_only = path.split('?')[0]
        if path_only == "/":
            path_only = "/index.html"
        file_path = os.path.join(PUBLIC_DIR, path_only.lstrip("/"))
        
        # SPA Fallback: Si el archivo no existe, devolver index.html para que React Router maneje la ruta
        if not os.path.exists(file_path):
            file_path = os.path.join(PUBLIC_DIR, "index.html")
            
        return file_path

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # Route API requests
        if path == "/favicon.ico":
            self.send_response(200)
            self.send_header("Content-Type", "image/x-icon")
            self.end_headers()
        elif path.startswith("/api/stats"):
            self.handle_api_stats()
        elif path.startswith("/api/licencias/search"):
            self.handle_api_licencias_search(query_params)
        elif path.startswith("/api/designaciones/search"):
            self.handle_api_designaciones_search(query_params)
        elif path.startswith("/api/analytics/advanced"):
            self.handle_api_analytics_advanced()
        elif path.startswith("/api/traslados/audit"):
            self.handle_api_traslados_audit()
        elif path.startswith("/api/agentes"):
            self.handle_api_agentes(query_params)
        elif path.startswith("/api/agente/") or path.startswith("/api/agent/"):
            dni = path.replace("/api/agente/", "").replace("/api/agent/", "").strip()
            self.handle_api_agente_detail(dni)
        elif path.startswith("/api/auditoria") or path.startswith("/api/auditorias"):
            self.handle_api_auditorias()
        else:
            super().do_GET()

    def send_json_response(self, data, status=200):
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
        except Exception as e:
            print(f"Error sending JSON response: {e}")

    # Single Database connection helper
    def get_db_conn(self):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def handle_api_stats(self):
        try:
            stats = {}
            conn = self.get_db_conn()
            cursor = conn.cursor()

            # 1. Agentes Stats
            cursor.execute("SELECT COUNT(DISTINCT dni) as total_agentes, COUNT(*) as total_roles FROM agentes")
            row = cursor.fetchone()
            stats['total_agentes'] = row['total_agentes']
            stats['total_roles'] = row['total_roles']

            cursor.execute("SELECT genero, COUNT(*) as count FROM agentes GROUP BY genero")
            stats['genero'] = {r['genero'] if r['genero'] else 'DESCONOCIDO': r['count'] for r in cursor.fetchall()}

            cursor.execute("SELECT situacion_revista, COUNT(*) as count FROM agentes GROUP BY situacion_revista")
            stats['situacion_revista'] = {r['situacion_revista'] if r['situacion_revista'] else 'SIN ESPECIFICAR': r['count'] for r in cursor.fetchall()}

            cursor.execute("SELECT escalafon, COUNT(*) as count FROM agentes GROUP BY escalafon ORDER BY count DESC LIMIT 8")
            stats['escalafon'] = {r['escalafon']: r['count'] for r in cursor.fetchall()}

            cursor.execute("""
                SELECT cue, establecimiento, COUNT(*) as count, COUNT(DISTINCT dni) as agentes_unicos 
                FROM agentes 
                WHERE cue IS NOT NULL AND establecimiento != ''
                GROUP BY cue, establecimiento 
                ORDER BY count DESC 
                LIMIT 10
            """)
            stats['top_establecimientos'] = [
                {
                    'cue': r['cue'],
                    'establecimiento': r['establecimiento'],
                    'roles_count': r['count'],
                    'agentes_unicos': r['agentes_unicos']
                } for r in cursor.fetchall()
            ]

            # Latest Alta extraction
            cursor.execute("SELECT DISTINCT fecha_alta FROM agentes WHERE fecha_alta != ''")
            dates = [r[0] for r in cursor.fetchall()]
            latest_alta = "N/A"
            parsed_dates = []
            for d in dates:
                try:
                    if "/" in d:
                        parts = d.split("/")
                        if len(parts) == 3:
                            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                            if year < 100: year += 2000
                            parsed_dates.append(datetime.date(year, month, day))
                except:
                    pass
            if parsed_dates:
                latest_alta = max(parsed_dates).strftime("%d/%m/%Y")
            stats['registro_mas_reciente'] = latest_alta

            # 2. Designaciones Stats (same db!)
            cursor.execute("SELECT COUNT(*) as total FROM designaciones")
            stats['total_designaciones'] = cursor.fetchone()['total']

            # 3. Licencias Stats (same db!)
            cursor.execute("SELECT COUNT(*) as total FROM licencias")
            stats['total_licencias'] = cursor.fetchone()['total']
            
            cursor.execute("SELECT tipo_licencia, COUNT(*) as count FROM licencias GROUP BY tipo_licencia ORDER BY count DESC LIMIT 5")
            stats['top_licencias'] = {r['tipo_licencia']: r['count'] for r in cursor.fetchall()}

            # 4. Establecimientos Stats (same db!)
            cursor.execute("SELECT COUNT(*) as total FROM establecimientos")
            stats['total_escuelas_fisicas'] = cursor.fetchone()['total']
            
            cursor.execute("SELECT nivel_educativo, COUNT(*) as count FROM modalidades WHERE nivel_educativo IS NOT NULL GROUP BY nivel_educativo ORDER BY count DESC LIMIT 5")
            stats['top_niveles'] = {r['nivel_educativo']: r['count'] for r in cursor.fetchall()}

            # 5. Advanced Demographic & Cross-Aggregations by Departments and Levels
            # A. Departamentos / Agentes
            cursor.execute("""
                SELECT ed.zona_departamento as departamento, COUNT(DISTINCT a.dni) as count
                FROM agentes a
                JOIN establecimientos e ON a.cue = e.cue
                JOIN edificios ed ON e.edificio_id = ed.id
                WHERE ed.zona_departamento IS NOT NULL AND ed.zona_departamento != ''
                GROUP BY ed.zona_departamento
                ORDER BY count DESC
            """)
            stats['departamentos_agentes'] = [dict(r) for r in cursor.fetchall()]

            # B. Departamentos / Género
            cursor.execute("""
                SELECT ed.zona_departamento as departamento, a.genero, COUNT(DISTINCT a.dni) as count
                FROM agentes a
                JOIN establecimientos e ON a.cue = e.cue
                JOIN edificios ed ON e.edificio_id = ed.id
                WHERE ed.zona_departamento IS NOT NULL AND ed.zona_departamento != '' AND a.genero IS NOT NULL AND a.genero != ''
                GROUP BY ed.zona_departamento, a.genero
            """)
            stats['departamentos_genero'] = [dict(r) for r in cursor.fetchall()]

            # C. Departamentos / Licencias
            cursor.execute("""
                SELECT ed.zona_departamento as departamento, COUNT(l.id) as count
                FROM licencias l
                JOIN agentes a ON l.dni = a.dni
                JOIN establecimientos e ON a.cue = e.cue
                JOIN edificios ed ON e.edificio_id = ed.id
                WHERE ed.zona_departamento IS NOT NULL AND ed.zona_departamento != ''
                GROUP BY ed.zona_departamento
                ORDER BY count DESC
            """)
            stats['departamentos_licencias'] = [dict(r) for r in cursor.fetchall()]

            # D. Departamentos / Traslados (Agentes multicargo por departamento de su edificio)
            cursor.execute("""
                SELECT ed.zona_departamento as departamento, COUNT(DISTINCT a.dni) as count
                FROM agentes a
                JOIN establecimientos e ON a.cue = e.cue
                JOIN edificios ed ON e.edificio_id = ed.id
                WHERE a.dni IN (
                    SELECT dni FROM agentes WHERE cue IS NOT NULL GROUP BY dni HAVING COUNT(DISTINCT cue) > 1
                ) AND ed.zona_departamento IS NOT NULL AND ed.zona_departamento != ''
                GROUP BY ed.zona_departamento
                ORDER BY count DESC
            """)
            stats['departamentos_traslados'] = [dict(r) for r in cursor.fetchall()]

            # E. Niveles / Género
            cursor.execute("""
                SELECT m.nivel_educativo, a.genero, COUNT(DISTINCT a.dni) as count
                FROM agentes a
                JOIN establecimientos e ON a.cue = e.cue
                JOIN modalidades m ON m.establecimiento_id = e.id
                WHERE m.nivel_educativo IS NOT NULL AND m.nivel_educativo != '' AND a.genero IS NOT NULL AND a.genero != ''
                GROUP BY m.nivel_educativo, a.genero
            """)
            stats['niveles_genero'] = [dict(r) for r in cursor.fetchall()]

            # F. Niveles / Traslados (Agentes multicargo por nivel educativo)
            cursor.execute("""
                SELECT m.nivel_educativo, COUNT(DISTINCT a.dni) as count
                FROM agentes a
                JOIN establecimientos e ON a.cue = e.cue
                JOIN modalidades m ON m.establecimiento_id = e.id
                WHERE a.dni IN (
                    SELECT dni FROM agentes WHERE cue IS NOT NULL GROUP BY dni HAVING COUNT(DISTINCT cue) > 1
                ) AND m.nivel_educativo IS NOT NULL AND m.nivel_educativo != ''
                GROUP BY m.nivel_educativo
                ORDER BY count DESC
            """)
            stats['niveles_traslados'] = [dict(r) for r in cursor.fetchall()]

            # File dates
            db_date = "N/A"
            if os.path.exists(DB_PATH):
                db_mtime = os.path.getmtime(DB_PATH)
                db_date = datetime.datetime.fromtimestamp(db_mtime).strftime("%d/%m/%Y %H:%M")
            stats['db_actualizado'] = db_date

            conn.close()
            self.send_json_response(stats)

        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_api_agentes(self, query_params):
        try:
            search = query_params.get('search', [''])[0].strip()
            revista = query_params.get('revista', [''])[0].strip().upper()
            escalafon = query_params.get('escalafon', [''])[0].strip().upper()
            turno = query_params.get('turno', [''])[0].strip().upper()
            cue = query_params.get('cue', [''])[0].strip()
            norma_legal = query_params.get('norma_legal', [''])[0].strip()
            
            page = int(query_params.get('page', ['1'])[0])
            limit = int(query_params.get('limit', ['20'])[0])
            
            if page < 1: page = 1
            if limit < 1 or limit > 100: limit = 20
            offset = (page - 1) * limit

            conn = self.get_db_conn()
            cursor = conn.cursor()

            base_query = "FROM agentes WHERE 1=1"
            params = []

            if search:
                base_query += " AND (dni LIKE ? OR nombre_agente LIKE ? OR legajo LIKE ?)"
                search_like = f"%{search}%"
                params.extend([search_like, search_like, search_like])

            if revista:
                base_query += " AND situacion_revista = ?"
                params.append(revista)

            if escalafon:
                base_query += " AND escalafon = ?"
                params.append(escalafon)

            if turno:
                base_query += " AND turno = ?"
                params.append(turno)

            if cue:
                if cue.isdigit():
                    base_query += " AND cue = ?"
                    params.append(int(cue))

            if norma_legal:
                base_query += " AND norma_legal LIKE ?"
                params.append(f"%{norma_legal}%")

            count_grouped_query = f"SELECT COUNT(DISTINCT dni) as total_unicos {base_query}"
            cursor.execute(count_grouped_query, params)
            total_unicos = cursor.fetchone()['total_unicos']

            data_query = f"""
                SELECT 
                    dni, 
                    nombre_agente, 
                    genero, 
                    legajo, 
                    COUNT(*) as cargos_activos,
                    SUM(horas_catedra) as total_horas_catedra,
                    GROUP_CONCAT(DISTINCT establecimiento) as escuelas
                {base_query} 
                GROUP BY dni, nombre_agente, genero, legajo
                ORDER BY nombre_agente ASC 
                LIMIT ? OFFSET ?
            """
            
            query_params_limit = params + [limit, offset]
            cursor.execute(data_query, query_params_limit)
            rows = cursor.fetchall()

            result = {
                "data": [
                    {
                        "dni": r["dni"],
                        "nombre_agente": r["nombre_agente"],
                        "genero": r["genero"],
                        "legajo": r["legajo"],
                        "cargos_activos": r["cargos_activos"],
                        "total_horas_catedra": r["total_horas_catedra"],
                        "escuelas": r["escuelas"]
                    } for r in rows
                ],
                "total": total_unicos,
                "page": page,
                "limit": limit,
                "total_pages": (total_unicos + limit - 1) // limit
            }

            conn.close()
            self.send_json_response(result)

        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_api_licencias_search(self, query_params):
        try:
            search = query_params.get('search', [''])[0].strip()
            tipo = query_params.get('tipo', [''])[0].strip()
            dias_min = query_params.get('dias_min', [''])[0].strip()
            dias_max = query_params.get('dias_max', [''])[0].strip()
            
            page = int(query_params.get('page', ['1'])[0])
            limit = int(query_params.get('limit', ['20'])[0])
            
            if page < 1: page = 1
            if limit < 1 or limit > 100: limit = 20
            offset = (page - 1) * limit

            conn = self.get_db_conn()
            cursor = conn.cursor()

            base_query = "FROM licencias WHERE 1=1"
            params = []

            if search:
                base_query += " AND (dni LIKE ? OR nombre_agente LIKE ? OR documento_respaldo LIKE ?)"
                search_like = f"%{search}%"
                params.extend([search_like, search_like, search_like])

            if tipo:
                base_query += " AND tipo_licencia = ?"
                params.append(tipo)

            if dias_min and dias_min.isdigit():
                base_query += " AND dias >= ?"
                params.append(int(dias_min))

            if dias_max and dias_max.isdigit():
                base_query += " AND dias <= ?"
                params.append(int(dias_max))

            cursor.execute(f"SELECT COUNT(*) as total {base_query}", params)
            total = cursor.fetchone()['total']

            cursor.execute(f"SELECT * {base_query} ORDER BY id DESC LIMIT ? OFFSET ?", params + [limit, offset])
            rows = cursor.fetchall()

            result = {
                "data": [dict(r) for r in rows],
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            conn.close()
            self.send_json_response(result)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_api_designaciones_search(self, query_params):
        try:
            search = query_params.get('search', [''])[0].strip()
            cue = query_params.get('cue', [''])[0].strip()
            turno = query_params.get('turno', [''])[0].strip().upper()
            revista = query_params.get('revista', [''])[0].strip().upper()
            
            page = int(query_params.get('page', ['1'])[0])
            limit = int(query_params.get('limit', ['20'])[0])
            
            if page < 1: page = 1
            if limit < 1 or limit > 100: limit = 20
            offset = (page - 1) * limit

            conn = self.get_db_conn()
            cursor = conn.cursor()

            base_query = "FROM designaciones WHERE 1=1"
            params = []

            if search:
                base_query += " AND (dni LIKE ? OR nombre_agente LIKE ? OR legajo LIKE ?)"
                search_like = f"%{search}%"
                params.extend([search_like, search_like, search_like])

            if cue:
                base_query += " AND cue = ?"
                params.append(cue)

            if turno:
                base_query += " AND turno = ?"
                params.append(turno)

            if revista:
                base_query += " AND situacion_revista = ?"
                params.append(revista)

            cursor.execute(f"SELECT COUNT(*) as total {base_query}", params)
            total = cursor.fetchone()['total']

            cursor.execute(f"SELECT * {base_query} ORDER BY nombre_agente ASC LIMIT ? OFFSET ?", params + [limit, offset])
            rows = cursor.fetchall()

            result = {
                "data": [dict(r) for r in rows],
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
            conn.close()
            self.send_json_response(result)
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_api_analytics_advanced(self):
        try:
            conn = self.get_db_conn()
            cursor = conn.cursor()

            # 1. Escuelas con mayores licencias (cruce licencias -> agentes)
            cursor.execute("""
                SELECT a.cue, a.establecimiento, COUNT(l.id) as count, COUNT(DISTINCT l.dni) as docentes,
                       ed.cui, ed.localidad, ed.letra_zona as zona, ed.zona_departamento as departamento,
                       GROUP_CONCAT(DISTINCT m.nivel_educativo) as nivel_educativo
                FROM licencias l
                JOIN agentes a ON l.dni = a.dni
                LEFT JOIN establecimientos e ON a.cue = e.cue
                LEFT JOIN edificios ed ON e.edificio_id = ed.id
                LEFT JOIN modalidades m ON m.establecimiento_id = e.id
                WHERE a.cue IS NOT NULL AND a.establecimiento != ''
                GROUP BY a.cue, a.establecimiento
                ORDER BY count DESC
                LIMIT 30
            """)
            escuelas_licencias = [dict(r) for r in cursor.fetchall()]

            # 2. Licencias incongruentes por duración o fechas corruptas
            cursor.execute("""
                SELECT id_tramite, nombre_agente, dni, tipo_licencia, fecha_inicio, fecha_fin, dias
                FROM licencias
                WHERE dias > 365 OR fecha_inicio LIKE '%2060%' OR fecha_fin LIKE '%2060%' OR fecha_inicio LIKE '%2099%' OR fecha_fin LIKE '%2099%'
                ORDER BY dias DESC
                LIMIT 10
            """)
            licencias_incongruentes = [dict(r) for r in cursor.fetchall()]

            # 3. Solapamientos de licencias
            cursor.execute("""
                SELECT l1.dni, l1.nombre_agente, l1.tipo_licencia as lic1, l1.fecha_inicio as ini1, l1.fecha_fin as fin1,
                       l2.tipo_licencia as lic2, l2.fecha_inicio as ini2, l2.fecha_fin as fin2
                FROM licencias l1
                JOIN licencias l2 ON l1.dni = l2.dni AND l1.id < l2.id
                WHERE (l1.fecha_inicio <= l2.fecha_fin AND l1.fecha_fin >= l2.fecha_inicio)
                LIMIT 10
            """)
            solapamientos = [dict(r) for r in cursor.fetchall()]

            # 4. Licencias médicas vigentes sin suplente designado (Cruce complejo!)
            cursor.execute("""
                SELECT DISTINCT dni, nombre_agente, tipo_licencia, fecha_inicio, fecha_fin 
                FROM licencias 
                ORDER BY id DESC 
                LIMIT 100
            """)
            recent_lics = cursor.fetchall()
            
            no_suplente_alerts = []
            for lic in recent_lics:
                dni = lic['dni']
                nombre = lic['nombre_agente']
                tipo = lic['tipo_licencia']
                ini = lic['fecha_inicio']
                fin = lic['fecha_fin']
                
                # Get agent's CUE and Turno from their active agentes roles
                cursor.execute("SELECT DISTINCT cue, establecimiento, turno FROM agentes WHERE dni = ? AND cue IS NOT NULL", (dni,))
                roles = cursor.fetchall()
                for r in roles:
                    cue = r['cue']
                    est = r['establecimiento']
                    turno = r['turno']
                    if not cue or not turno: continue
                    
                    # Check if there is a suplente designated in that CUE and Turno
                    cursor.execute("""
                        SELECT nombre_agente FROM designaciones 
                        WHERE cue = ? AND turno = ? AND situacion_revista IN ('SUPLENTE', 'REEMPLAZANTE')
                        LIMIT 1
                    """, (cue, turno))
                    suplente = cursor.fetchone()
                    if not suplente:
                        no_suplente_alerts.append({
                            "dni": dni,
                            "nombre_agente": nombre,
                            "tipo_licencia": tipo,
                            "fecha_inicio": ini,
                            "fecha_fin": fin,
                            "cue": cue,
                            "establecimiento": est,
                            "turno": turno
                        })
                        if len(no_suplente_alerts) >= 10:
                            break
                if len(no_suplente_alerts) >= 10:
                    break

            # 5. Top escuelas por volumen de designaciones
            cursor.execute("""
                SELECT cue, establecimiento, COUNT(*) as count, COUNT(DISTINCT dni) as docentes_unicos
                FROM designaciones
                WHERE cue IS NOT NULL AND establecimiento != ''
                GROUP BY cue, establecimiento
                ORDER BY count DESC
                LIMIT 6
            """)
            escuelas_designaciones = [dict(r) for r in cursor.fetchall()]

            conn.close()

            self.send_json_response({
                "escuelas_licencias": escuelas_licencias,
                "licencias_incongruentes": licencias_incongruentes,
                "solapamientos": solapamientos,
                "sin_suplente": no_suplente_alerts,
                "escuelas_designaciones": escuelas_designaciones
            })
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_api_traslados_audit(self):
        try:
            conn = self.get_db_conn()
            cursor = conn.cursor()

            # Find agents with multiple CUEs in agentes
            cursor.execute("""
                SELECT dni, nombre_agente, COUNT(DISTINCT cue) as school_count
                FROM agentes
                WHERE cue IS NOT NULL
                GROUP BY dni, nombre_agente
                HAVING school_count > 1
                LIMIT 150
            """)
            multi_school_agents = cursor.fetchall()
            
            audit_results = []
            import math
            def haversine(lat1, lon1, lat2, lon2):
                if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
                    return None
                try:
                    lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
                except ValueError:
                    return None
                
                R = 6371.0 # Earth radius in km
                dlat = math.radians(lat2 - lat1)
                dlon = math.radians(lon2 - lon1)
                a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                return R * c

            for agent in multi_school_agents:
                dni = agent['dni']
                nombre = agent['nombre_agente']
                
                # Fetch their schools with lat/lon from database
                cursor.execute("""
                    SELECT a.cue, a.establecimiento, a.turno, ed.latitud, ed.longitud, ed.calle, ed.numero_puerta, ed.localidad
                    FROM agentes a
                    LEFT JOIN establecimientos e ON a.cue = e.cue
                    LEFT JOIN edificios ed ON e.edificio_id = ed.id
                    WHERE a.dni = ? AND a.cue IS NOT NULL
                """, (dni,))
                cargos = cursor.fetchall()
                
                # Group roles by school CUE
                cargos_by_school = {}
                for c in cargos:
                    cue = c['cue']
                    if cue not in cargos_by_school:
                        cargos_by_school[cue] = {
                            "cue": cue,
                            "establecimiento": c['establecimiento'],
                            "lat": c['latitud'],
                            "lon": c['longitud'],
                            "direccion": f"{c['calle'] or ''} {c['numero_puerta'] or ''}, {c['localidad'] or ''}".strip(),
                            "turnos": []
                        }
                    if c['turno'] and c['turno'] not in cargos_by_school[cue]['turnos']:
                        cargos_by_school[cue]['turnos'].append(c['turno'])
                        
                school_keys = list(cargos_by_school.keys())
                if len(school_keys) < 2:
                    continue
                    
                # Compare pairs of schools
                for i in range(len(school_keys)):
                    for j in range(i + 1, len(school_keys)):
                        s1 = cargos_by_school[school_keys[i]]
                        s2 = cargos_by_school[school_keys[j]]
                        
                        dist = haversine(s1['lat'], s1['lon'], s2['lat'], s2['lon'])
                        if dist is None:
                            continue
                            
                        t1_list = s1['turnos']
                        t2_list = s2['turnos']
                        
                        has_conflict = False
                        conflict_type = "Ninguno"
                        for t1 in t1_list:
                            for t2 in t2_list:
                                if t1 == t2:
                                    has_conflict = True
                                    conflict_type = "Mismo Turno (Doble Carga)"
                                elif (t1 == "MAÑANA" and t2 == "TARDE") or (t1 == "TARDE" and t2 == "MAÑANA"):
                                    has_conflict = True
                                    conflict_type = "Turnos Contiguos (M/T)"
                                elif (t1 == "TARDE" and t2 in ("VESPERTINO", "NOCHE")) or (t2 == "TARDE" and t1 in ("VESPERTINO", "NOCHE")):
                                    has_conflict = True
                                    conflict_type = "Turnos Contiguos (T/V)"
                                    
                        severity = "verde"
                        if dist > 15.0:
                            severity = "rojo"
                        elif dist > 5.0:
                            severity = "amarillo"
                            
                        audit_results.append({
                            "dni": dni,
                            "nombre_agente": nombre,
                            "escuela1": s1['establecimiento'],
                            "cue1": s1['cue'],
                            "lat1": s1['lat'],
                            "lon1": s1['lon'],
                            "turnos1": s1['turnos'],
                            "direccion1": s1['direccion'],
                            "escuela2": s2['establecimiento'],
                            "cue2": s2['cue'],
                            "lat2": s2['lat'],
                            "lon2": s2['lon'],
                            "turnos2": s2['turnos'],
                            "direccion2": s2['direccion'],
                            "distancia_km": round(dist, 2),
                            "conflictivo": has_conflict,
                            "tipo_conflicto": conflict_type,
                            "semaforo": severity
                        })
                        
            # Sort by distance descending
            audit_results.sort(key=lambda x: x['distancia_km'], reverse=True)
            
            total_auditados = len(audit_results)
            rojos = sum(1 for x in audit_results if x['semaforo'] == 'rojo')
            amarillos = sum(1 for x in audit_results if x['semaforo'] == 'amarillo')
            verdes = sum(1 for x in audit_results if x['semaforo'] == 'verde')
            
            top_disperso = audit_results[0] if audit_results else None
            
            # Count the most critical pairs
            from collections import Counter
            pair_counter = Counter()
            for x in audit_results:
                pair_key = tuple(sorted([x['cue1'], x['cue2']]))
                pair_counter[pair_key] += 1
                
            most_common_pairs = []
            for p_key, count in pair_counter.most_common(3):
                cueA, cueB = p_key
                nameA = next((x['escuela1'] if x['cue1'] == cueA else x['escuela2'] for x in audit_results if x['cue1'] == cueA or x['cue2'] == cueA), str(cueA))
                nameB = next((x['escuela1'] if x['cue1'] == cueB else x['escuela2'] for x in audit_results if x['cue1'] == cueB or x['cue2'] == cueB), str(cueB))
                most_common_pairs.append({
                     "cueA": cueA,
                     "nombreA": nameA,
                     "cueB": cueB,
                     "nombreB": nameB,
                     "count": count
                })
                
            conn.close()

            self.send_json_response({
                "data": audit_results[:30],
                "stats": {
                    "total_auditados": total_auditados,
                    "rojos": rojos,
                    "amarillos": amarillos,
                    "verdes": verdes,
                    "top_disperso": top_disperso,
                    "pares_criticos": most_common_pairs
                }
            })
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_api_agente_detail(self, dni):
        try:
            if not dni:
                self.send_json_response({"error": "DNI is required"}, 400)
                return

            conn = self.get_db_conn()
            cursor = conn.cursor()

            # 1. Fetch from agentes
            cursor.execute("""
                SELECT id, centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                       turno, plan_estudio, nombre_agente, dni, genero, legajo, 
                       fecha_alta, situacion_revista, norma_legal, observaciones, control_id 
                FROM agentes 
                WHERE dni = ?
                ORDER BY fecha_alta DESC
            """, (dni,))
            rows_agentes = cursor.fetchall()
            
            if not rows_agentes:
                self.send_json_response({"error": "Agent not found in unified database"}, 404)
                conn.close()
                return

            first_row = rows_agentes[0]
            profile = {
                "dni": first_row["dni"],
                "nombre_agente": first_row["nombre_agente"],
                "genero": first_row["genero"],
                "legajo": first_row["legajo"],
                "cargos_count": len(rows_agentes),
                "total_horas_catedra": sum(r["horas_catedra"] for r in rows_agentes if r["horas_catedra"] is not None),
                "cargos": [dict(r) for r in rows_agentes]
            }

            # 2. Fetch official designaciones (same db!)
            cursor.execute("""
                SELECT id, centro, establecimiento, escalafon, cupof, cue, cargo_horas, horas_catedra,
                       turno, plan_estudio, nombre_agente, dni, genero, legajo, 
                       fecha_alta, situacion_revista, norma_legal, observaciones, control_id 
                FROM designaciones 
                WHERE dni = ?
                ORDER BY fecha_alta DESC
            """, (dni,))
            rows_desig = cursor.fetchall()
            profile["designaciones"] = [dict(r) for r in rows_desig]

            # Collect all CUEs
            cues = set(r["cue"] for r in rows_agentes if r["cue"] is not None)
            for r in rows_desig:
                if r["cue"]: cues.add(r["cue"])

            # 3. Fetch licencias (same db!)
            cursor.execute("""
                SELECT id, id_tramite, fecha_carga, nombre_agente, dni, genero,
                       tipo_licencia, documento_respaldo, fecha_inicio, fecha_fin, dias, referencia_interna
                FROM licencias 
                WHERE dni = ?
                ORDER BY fecha_inicio DESC
            """, (dni,))
            rows_lic = cursor.fetchall()
            profile["licencias"] = [dict(r) for r in rows_lic]

            # 4. Fetch escuelas info (same db!)
            profile["escuelas_fisicas"] = {}
            if cues:
                placeholders = ",".join("?" for _ in cues)
                query = f"""
                    SELECT e.cue, e.nombre as nombre_establecimiento,
                           ed.calle, ed.numero_puerta, ed.codigo_postal, ed.localidad,
                           ed.latitud, ed.longitud, ed.te_voip, ed.zona_departamento as departamento,
                           m.nivel_educativo, m.direccion_area, m.zona, m.sector
                    FROM establecimientos e
                    LEFT JOIN edificios ed ON e.edificio_id = ed.id
                    LEFT JOIN modalidades m ON m.establecimiento_id = e.id
                    WHERE e.cue IN ({placeholders})
                """
                cursor.execute(query, list(cues))
                rows_est = cursor.fetchall()
                for r in rows_est:
                    profile["escuelas_fisicas"][r["cue"]] = dict(r)

            # 5. Automated Audit
            active_lics = []
            today = datetime.date.today()
            for lic in profile["licencias"]:
                try:
                    start_str = lic["fecha_inicio"]
                    end_str = lic["fecha_fin"]
                    
                    def parse_date(date_str):
                        if "/" in date_str:
                            p = [int(x) for x in date_str.split("/")]
                            if p[2] < 100: p[2] += 2000
                            return datetime.date(p[2], p[1], p[0])
                        elif "-" in date_str:
                            p = [int(x) for x in date_str.split("-")]
                            if p[0] < 100: p[0] += 2000
                            return datetime.date(p[0], p[1], p[2])
                        return None
                    
                    start_date = parse_date(start_str)
                    end_date = parse_date(end_str)
                    if start_date and end_date and start_date <= today <= end_date:
                        active_lics.append(lic)
                except:
                    pass

            profile["auditoria"] = {
                "alerta_incompatibilidad_horas": profile["total_horas_catedra"] > 50,
                "alerta_multi_cargo": profile["cargos_count"] > 1,
                "licencias_activas": active_lics,
                "tiene_licencia_activa": len(active_lics) > 0,
                "coincide_en_designaciones": len(profile["designaciones"]) > 0,
                "requiere_auditoria_af": (profile["total_horas_catedra"] > 50) or (profile["cargos_count"] > 1) or (len(active_lics) > 0)
            }

            conn.close()
            self.send_json_response(profile)

        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

    def handle_api_auditorias(self):
        try:
            conn = self.get_db_conn()
            cursor = conn.cursor()
            
            # 1. Buscar agentes con exceso de horas cátedra (> 50 Hs)
            cursor.execute("""
                SELECT dni, nombre_agente, legajo, COUNT(*) as cargos_activos, SUM(horas_catedra) as total_horas
                FROM agentes
                GROUP BY dni, nombre_agente, legajo
                HAVING total_horas > 50
                ORDER BY total_horas DESC
                LIMIT 15
            """)
            exceso_horas = [dict(r) for r in cursor.fetchall()]
            
            # 2. Buscar agentes con cargos múltiples de planta
            cursor.execute("""
                SELECT dni, nombre_agente, legajo, COUNT(*) as cargos_activos, SUM(horas_catedra) as total_horas
                FROM agentes
                GROUP BY dni, nombre_agente, legajo
                HAVING cargos_activos >= 3 AND total_horas = 0
                ORDER BY cargos_activos DESC
                LIMIT 15
            """)
            multi_cargos = [dict(r) for r in cursor.fetchall()]

            # 3. Buscar agentes con trámites de licencias recientes
            cursor.execute("""
                SELECT DISTINCT dni, nombre_agente, tipo_licencia, fecha_inicio, fecha_fin, dias
                FROM licencias
                ORDER BY id DESC
                LIMIT 15
            """)
            licencias_recientes = [dict(r) for r in cursor.fetchall()]
            
            conn.close()

            result = {
                "exceso_horas": exceso_horas,
                "multi_cargos_fijos": multi_cargos,
                "licencias_recientes": licencias_recientes
            }
            self.send_json_response(result)

        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)

def run_server():
    handler = DatabaseAPIHandler
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), handler) as httpd:
        print(f"API Local Server running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server...")
            httpd.shutdown()

if __name__ == "__main__":
    run_server()
