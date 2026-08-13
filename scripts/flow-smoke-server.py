#!/usr/bin/env python3
import json, os, pathlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT=pathlib.Path.cwd()/"dist"/"spa"
PORT=int(os.environ.get("VITI_FLOW_SMOKE_PORT","4174"))
TOKEN="e2e-token-viti"
PLAN={"id":1,"codigo":"basico-1800","nombre":"VITI Inicial","descripcion":"Plan E2E","precio_proyecto":1800,"precio_mensual":89,"precio_anual":890,"dias_prueba":14,"modulos":[],"max_usuarios":3,"max_aplicaciones":1}
DATA={"data":{"id":999,"codigo":"SOL-E2E","estado":"borrador","draft_revision":0,"titulo":"Sistema demo VITI","resumen":"Prueba E2E","plan_viti_id":1,"forma_pago_preferida":"50_50","frecuencia_suscripcion_preferida":"mensual","declaracion_aceptada":False,"declaracion_nombre":"Cliente E2E","declaracion_fecha":"2026-08-13","acuerdo_comercial_requerido":True,"acuerdo_comercial_aceptado":False,"acuerdo_comercial_nombre":"Cliente E2E","acuerdo_comercial_fecha":"2026-08-13","cliente":{"id":1,"nombre":"Cliente E2E","telefono":"70000000","whatsapp":"70000000","ciudad":"Santa Cruz","direccion":"Zona E2E"},"empresa":{"id":1,"nombre_comercial":"Empresa E2E","actividad":"Servicios técnicos","telefono":"70000000","whatsapp":"70000000","ciudad":"Santa Cruz","direccion":"Zona E2E"},"cuestionario":{"id":1,"secciones":[{"id":1,"nombre":"Configuración","preguntas":[{"id":12,"numero":12,"pregunta":"¿Cuántas personas usarán el sistema?","tipo":"numero","ayuda":None,"opciones":[]},{"id":17,"numero":17,"pregunta":"¿Qué funciones necesitas?","tipo":"seleccion_multiple","ayuda":None,"opciones":["Registro de clientes","Órdenes de trabajo","Agenda o calendario","Otro"]}]}]},"respuestas":[],"plan_viti":PLAN,"planes_disponibles":[PLAN]}}

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def send_json(self,payload):
        body=json.dumps(payload).encode(); self.send_response(200); self.send_header("Content-Type","application/json"); self.send_header("Content-Length",str(len(body))); self.end_headers(); self.wfile.write(body)
    def send_file(self,path,ctype):
        body=path.read_bytes(); self.send_response(200); self.send_header("Content-Type",ctype); self.send_header("Content-Length",str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        path=self.path.split("?",1)[0]
        if path==f"/api/v1/publico/solicitudes/{TOKEN}": return self.send_json(DATA)
        if path in ("/api/health","/api/health/"): return self.send_json({"status":"ok"})
        if path.startswith("/assets/"):
            file=ROOT/path.lstrip("/")
            if file.is_file(): return self.send_file(file,"text/javascript" if file.suffix==".js" else "text/css")
        if path=="/sw.js" and (ROOT/"sw.js").is_file(): return self.send_file(ROOT/"sw.js","text/javascript")
        return self.send_file(ROOT/"index.html","text/html; charset=utf-8")

ThreadingHTTPServer(("127.0.0.1",PORT),Handler).serve_forever()
