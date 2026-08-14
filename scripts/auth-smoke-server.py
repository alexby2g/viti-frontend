#!/usr/bin/env python3
import json, os, pathlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path.cwd()/"dist"/"spa"
PORT = int(os.environ.get("VITI_AUTH_SMOKE_PORT","4175"))
USER = {"id":77,"cliente_id":44,"nombre":"Cliente E2E","apellido":"VITI","usuario":"cliente_e2e","rol":"cliente","estado":"activo"}
FEATURES = {
    "plan":{"id":1,"codigo":"basico-1800","nombre":"VITI Inicial"},
    "modulos":["inicio","agenda","ordenes","clientes","pagos","buzon"],
    "catalogo_modulos":["inicio","agenda","ordenes","clientes","equipos","tecnicos","inventario","pagos","garantias","historial","buzon"],
    "usuarios":{"usados":2,"maximo":3,"restantes":1,"sin_limite":False,"alcanzado":False},
    "aplicaciones":{"usados":1,"maximo":1,"restantes":0,"sin_limite":False,"alcanzado":True},
    "rol":"propietario","puede_administrar":True,
    "modulos_efectivos":["inicio","agenda","ordenes","clientes","pagos","buzon"],
}
BUSINESS = {
    "id":10,"codigo":"EMP-E2E","nombre_comercial":"Taller E2E","razon_social":"Taller E2E SRL",
    "actividad":"Servicios técnicos","telefono":"70000000","whatsapp":"70000000","ciudad":"Santa Cruz",
    "direccion":"Zona E2E","moneda":"BOB","metodo_pago_preferido":"qr","zona_horaria":"America/La_Paz",
    "rol":"propietario","plan":{"id":1,"codigo":"basico-1800","nombre":"VITI Inicial","precio_proyecto":1800,"modulos":FEATURES["modulos"]},
    "features":FEATURES,
}
APP = {
    "id":101,"nombre":"Electrofrío E2E","version":"1.0.0","entorno":"produccion","estado":"activo",
    "estado_servicio":"activa","estado_mensaje":"Aplicación activa.","puede_usar":True,"acceso_cliente":True,
    "empresa":{"id":10,"nombre_comercial":"Taller E2E"},
    "catalogo":{"id":5,"clave":"electrofrio","nombre":"Electrofrío","icono":"ac_unit"},
    "proyecto":{"codigo":"PRO-E2E","nombre":"Electrofrío","fase":"finalizado","estado":"finalizado","progreso":100},
    "suscripcion":{"estado":"activa","monto":89,"frecuencia":"mensual","fecha_vencimiento":"2026-09-13"},
    "ruta":"/mi-apps/electrofrio/inicio","es_externa":False,"url_externa":None,
}

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def send_json(self,payload,status=200):
        body=json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(body)))
        self.send_header("X-VITI-Request-ID","VITI-E2E-AUTH")
        self.send_header("X-VITI-Duration-Ms","12.3")
        self.send_header("X-VITI-Backend-Version","e2e00000000")
        self.end_headers(); self.wfile.write(body)
    def send_file(self,path,ctype):
        body=path.read_bytes(); self.send_response(200); self.send_header("Content-Type",ctype); self.send_header("Content-Length",str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        path=self.path.split("?",1)[0]
        if path in ("/api/health","/api/health/"): return self.send_json({"status":"ok"})
        if path=="/api/v1/setup/status": return self.send_json({"requiere_configuracion":False})
        if path=="/api/v1/auth/status": return self.send_json({"autenticado":True,"usuario":USER})
        if path=="/api/v1/branding": return self.send_json({"data":{"studio_name":"AGR Studio","product_name":"VITI"}})
        if path=="/api/v1/mi/negocios": return self.send_json({"data":[BUSINESS]})
        if path=="/api/v1/mi/negocio": return self.send_json({"data":{"empresa":BUSINESS,"rol":"propietario","puede_administrar":True,"features":FEATURES}})
        if path=="/api/v1/mi/negocio/equipo": return self.send_json({"data":[{"id":77,"nombre":"Cliente E2E","apellido":"VITI","usuario":"cliente_e2e","documento":"12345678","estado":"activo","rol_negocio":"propietario","permisos":[],"activo":True}]})
        if path=="/api/v1/mi/aplicaciones": return self.send_json({"data":[APP],"negocio":{"id":10,"nombre_comercial":"Taller E2E"}})
        if path=="/api/v1/notificaciones/buzon": return self.send_json({"data":[],"no_leidas":0})
        if path.startswith("/assets/"):
            file=ROOT/path.lstrip("/")
            if file.is_file(): return self.send_file(file,"text/javascript" if file.suffix==".js" else "text/css")
        if path=="/sw.js" and (ROOT/"sw.js").is_file(): return self.send_file(ROOT/"sw.js","text/javascript")
        return self.send_file(ROOT/"index.html","text/html; charset=utf-8")

ThreadingHTTPServer(("127.0.0.1",PORT),Handler).serve_forever()
