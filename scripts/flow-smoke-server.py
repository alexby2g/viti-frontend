#!/usr/bin/env python3
import json, os, pathlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT=pathlib.Path.cwd()/"dist"/"spa"
PORT=int(os.environ.get("VITI_FLOW_SMOKE_PORT","4174"))
TOKEN="e2e-token-viti"
PLAN={"id":1,"codigo":"basico-1800","nombre":"VITI Inicial","descripcion":"Plan E2E","precio_proyecto":1800,"precio_mensual":89,"precio_anual":890,"dias_prueba":14,"modulos":[],"max_usuarios":3,"max_aplicaciones":1}
PUBLIC_DATA={"data":{"id":999,"codigo":"SOL-E2E","estado":"borrador","draft_revision":0,"titulo":"Sistema demo VITI","resumen":"Prueba E2E","plan_viti_id":1,"forma_pago_preferida":"50_50","frecuencia_suscripcion_preferida":"mensual","declaracion_aceptada":False,"declaracion_nombre":"Cliente E2E","declaracion_fecha":"2026-08-13","acuerdo_comercial_requerido":True,"acuerdo_comercial_aceptado":False,"acuerdo_comercial_nombre":"Cliente E2E","acuerdo_comercial_fecha":"2026-08-13","cliente":{"id":1,"nombre":"Cliente E2E","telefono":"70000000","whatsapp":"70000000","ciudad":"Santa Cruz","direccion":"Zona E2E"},"empresa":{"id":1,"nombre_comercial":"Empresa E2E","actividad":"Servicios técnicos","telefono":"70000000","whatsapp":"70000000","ciudad":"Santa Cruz","direccion":"Zona E2E"},"cuestionario":{"id":1,"secciones":[{"id":1,"nombre":"Configuración","preguntas":[{"id":12,"numero":12,"pregunta":"¿Cuántas personas usarán el sistema?","tipo":"numero","ayuda":None,"opciones":[]},{"id":17,"numero":17,"pregunta":"¿Qué funciones necesitas?","tipo":"seleccion_multiple","ayuda":None,"opciones":["Registro de clientes","Órdenes de trabajo","Agenda o calendario","Otro"]}]}]},"respuestas":[],"plan_viti":PLAN,"planes_disponibles":[PLAN]}}
ADMIN_USER={"id":77,"nombre":"Super","apellido":"Admin","usuario":"superadmin_e2e","rol":"superadmin","estado":"activo","cliente_id":None,"foto_url":None}
ADMIN_REQUEST={"data":{"id":501,"codigo":"SOL-AUTH-E2E","empresa_id":101,"cliente_id":201,"cuestionario_id":1,"plan_viti_id":1,"titulo":"Solicitud autenticada E2E","resumen":"Prueba del panel administrativo","estado":"en_revision","prioridad":"alta","created_at":"2026-08-13T20:00:00-04:00","forma_pago_preferida":"50_50","frecuencia_suscripcion_preferida":"mensual","acuerdo_comercial_aceptado":True,"acuerdo_comercial_nombre":"Cliente Admin E2E","acuerdo_comercial_fecha":"2026-08-13","declaracion_aceptada":True,"declaracion_nombre":"Cliente Admin E2E","declaracion_fecha":"2026-08-13","workflow":{"actual":"en_revision","permitidos":["aprobada","rechazada","cerrada"],"catalogo":["borrador","en_revision","aprobada","rechazada","convertida","cerrada"]},"empresa":{"id":101,"nombre_comercial":"Empresa Auth E2E","actividad":"Servicios técnicos"},"cliente":{"id":201,"nombre":"Cliente Admin E2E","telefono":"71111111"},"plan_viti":PLAN,"cuestionario":{"id":1,"secciones":[]},"respuestas":[],"proyecto":None,"conversacion":None,"archivos":[]}}
BRANDING={"data":{"studio_name":"AGR Studio","product_name":"VITI","product_meaning":"Visión Integral, Tecnología e Innovación","tagline":"Plataforma de proyectos y soluciones digitales","primary_color":"#1565C0","secondary_color":"#43A047","accent_color":"#FB8C00","dark_color":"#071C3B","drawer_color":"#092B55","guide_enabled":True,"guide_position":"right-center"}}

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def send_json(self,payload,status=200):
        body=json.dumps(payload).encode(); self.send_response(status); self.send_header("Content-Type","application/json"); self.send_header("Content-Length",str(len(body))); self.end_headers(); self.wfile.write(body)
    def send_file(self,path,ctype):
        body=path.read_bytes(); self.send_response(200); self.send_header("Content-Type",ctype); self.send_header("Content-Length",str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        path=self.path.split("?",1)[0]
        if path==f"/api/v1/publico/solicitudes/{TOKEN}": return self.send_json(PUBLIC_DATA)
        if path in ("/api/health","/api/health/"): return self.send_json({"status":"ok"})
        if path=="/api/v1/setup/status": return self.send_json({"requiere_configuracion":False})
        if path=="/api/v1/auth/status": return self.send_json({"autenticado":True,"usuario":ADMIN_USER})
        if path=="/api/v1/auth/me": return self.send_json({"usuario":ADMIN_USER})
        if path=="/api/v1/branding": return self.send_json(BRANDING)
        if path=="/api/v1/notificaciones/centro": return self.send_json({"data":{"no_leidos":0,"items":[]}})
        if path=="/api/v1/solicitudes/501": return self.send_json(ADMIN_REQUEST)
        if path.startswith("/assets/"):
            file=ROOT/path.lstrip("/")
            if file.is_file(): return self.send_file(file,"text/javascript" if file.suffix==".js" else "text/css")
        if path=="/sw.js" and (ROOT/"sw.js").is_file(): return self.send_file(ROOT/"sw.js","text/javascript")
        return self.send_file(ROOT/"index.html","text/html; charset=utf-8")

ThreadingHTTPServer(("127.0.0.1",PORT),Handler).serve_forever()
