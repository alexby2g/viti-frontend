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
  echo "ERROR Browser Smoke: $message" >&2
  echo "--- Últimas líneas del servidor E2E ---" >&2
  tail -n 80 "$SERVER_LOG" >&2 || true
  return 1
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
  "$CHROME_BIN" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --virtual-time-budget=11000 --dump-dom "$url" >"$file" || fail_smoke "Chrome no pudo abrir $name ($url)"
  for text in "$@"; do
    if ! grep -Fq "$text" "$file"; then
      echo "--- DOM final de $name ---" >&2
      tail -n 120 "$file" >&2 || true
      fail_smoke "$name no contiene el texto esperado: $text"
    fi
  done
  if grep -Fq '<div id="q-app"></div>' "$file"; then fail_smoke "Vue no renderizó $name"; fi
}

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

echo "Flow E2E OK: formulario público, panel administrativo y cliente multiempresa renderizan con contexto explícito en Chrome headless."
