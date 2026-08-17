#!/usr/bin/env bash
set -euo pipefail

PORT="${VITI_FLOW_SMOKE_PORT:-4174}"
BASE="http://127.0.0.1:${PORT}"
TMP="${RUNNER_TEMP:-/tmp}"
SERVER_LOG="$TMP/viti-flow-smoke.log"
CHROME_BIN="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$CHROME_BIN" ]]; then echo "No se encontró Chrome/Chromium."; exit 1; fi

VITI_FLOW_SMOKE_PORT="$PORT" python3 scripts/flow-smoke-server.py >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT

fail_smoke(){
  local message="$1"
  echo "::error title=Browser Smoke::$message" >&2
  echo "ERROR Browser Smoke: $message" >&2
  echo "--- Últimas líneas del servidor E2E ---" >&2
  tail -n 80 "$SERVER_LOG" >&2 || true
  return 1
}

page_summary(){
  local file="$1"
  python3 - "$file" <<'PY'
import html, re, sys
text=open(sys.argv[1], encoding='utf-8', errors='ignore').read()
title=re.search(r'<title[^>]*>(.*?)</title>', text, re.I|re.S)
body=re.search(r'<body[^>]*>(.*?)</body>', text, re.I|re.S)
body_text=re.sub(r'<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>', ' ', body.group(1) if body else '', flags=re.I|re.S)
body_text=re.sub(r'<[^>]+>', ' ', body_text)
body_text=html.unescape(re.sub(r'\s+', ' ', body_text)).strip()
print(f"titulo={html.unescape(title.group(1)).strip() if title else 'sin-titulo'}; contenido={body_text[:260] or 'sin-contenido-visible'}")
PY
}

console_summary(){
  local file="$1"
  python3 - "$file" <<'PY'
import re, sys
text=open(sys.argv[1], encoding='utf-8', errors='ignore').read()
lines=[]
for raw in text.splitlines():
    line=re.sub(r'\s+', ' ', raw).strip()
    low=line.lower()
    if any(token in low for token in ('error','uncaught','failed','exception','referenceerror','typeerror','qpage')):
        lines.append(line)
print(' | '.join(lines[-6:])[:900] or 'sin-error-de-consola-capturado')
PY
}

for _ in $(seq 1 30); do
  if curl --fail --silent "$BASE/api/health" >/dev/null; then break; fi
  sleep 0.5
done
curl --fail --silent "$BASE/api/health" >/dev/null || fail_smoke "el servidor E2E no respondió en $BASE/api/health"

check_page(){
  local name="$1"; shift
  local url="$1"; shift
  local file="$TMP/viti-flow-${name}.html"
  local console="$TMP/viti-flow-${name}-chrome.log"
  echo "Comprobando $name → $url"
  "$CHROME_BIN" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --enable-logging=stderr --v=1 --virtual-time-budget=11000 --dump-dom "$url" >"$file" 2>"$console" || fail_smoke "Chrome no pudo abrir $name ($url) | $(console_summary "$console")"
  for text in "$@"; do
    if ! grep -Fq "$text" "$file"; then
      local summary chrome_summary
      summary="$(page_summary "$file")"
      chrome_summary="$(console_summary "$console")"
      echo "--- DOM final de $name ---" >&2
      tail -n 120 "$file" >&2 || true
      echo "--- Consola Chrome de $name ---" >&2
      tail -n 80 "$console" >&2 || true
      fail_smoke "$name no contiene: $text | $summary | consola=$chrome_summary"
    fi
  done
  if grep -Fq '<div id="q-app"></div>' "$file"; then fail_smoke "Vue no renderizó $name | $(page_summary "$file") | consola=$(console_summary "$console")"; fi
  if grep -Eiq 'QPage needs to be a deep child of QLayout|Uncaught.*(TypeError|ReferenceError)|Failed to fetch' "$console"; then
    fail_smoke "$name reportó un error crítico de renderizado o red | $(console_summary "$console")"
  fi
}

check_page viti-landing "$BASE/viti" \
  "La información de tus servicios, organizada en un solo lugar." \
  "¿De qué se encarga VITI?" \
  "Cómo funciona" \
  "Guía rápida" \
  "Ingresar a VITI"

check_page viti-plans "$BASE/viti/planes" \
  "Planes VITI" \
  "VITI Inicial" \
  "VITI Profesional" \
  "VITI Empresa" \
  "Cotización personalizada" \
  "Solicitar este plan"

check_page viti-access "$BASE/viti/acceso" \
  "¿Es tu primera vez en VITI?" \
  "Tengo un código" \
  "Necesito acceso" \
  "Ya tengo una cuenta"

check_page public-1 "$BASE/solicitar/e2e-token-viti?paso=1" "Solicitud VITI" "VITI Inicial" "Continuar" "Registro completado"
check_page public-2 "$BASE/solicitar/e2e-token-viti?paso=2" "Configuración de VITI Inicial" "Saltar configuración" "¿Cuántas personas usarán el sistema?"
check_page public-3 "$BASE/solicitar/e2e-token-viti?paso=3" "Forma de pago de la implementación" "Enviar a revisión" "Suscripción"

check_page admin-request "$BASE/solicitudes/501" \
  "Solicitud VITI" \
  "SOL-AUTH-E2E" \
  "Solicitud autenticada E2E" \
  "Empresa Auth E2E" \
  "Cliente Admin E2E" \
  "Convertir en proyecto" \
  "Empresas" \
  "Salud del sistema"

check_page client-apps "$BASE/mi-aplicaciones" \
  "Mis aplicaciones" \
  "Negocio Auth A" \
  "Electrofrío" \
  "Mi negocio" \
  "Nueva solicitud"

echo "Flow E2E OK: presentación VITI, planes, primer acceso, formulario público, panel administrativo y cliente multiempresa renderizan con contexto explícito en Chrome headless."
