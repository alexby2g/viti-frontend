#!/usr/bin/env bash
set -euo pipefail

PORT="${VITI_FLOW_SMOKE_PORT:-4174}"
BASE="http://127.0.0.1:${PORT}"
CHROME_BIN="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$CHROME_BIN" ]]; then echo "No se encontró Chrome/Chromium."; exit 1; fi

VITI_FLOW_SMOKE_PORT="$PORT" python3 scripts/flow-smoke-server.py >"${RUNNER_TEMP:-/tmp}/viti-flow-smoke.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 30); do
  if curl --fail --silent "$BASE/api/health" >/dev/null; then break; fi
  sleep 0.5
done
curl --fail --silent "$BASE/api/health" >/dev/null

check_page(){
  local name="$1"; shift
  local url="$1"; shift
  local file="${RUNNER_TEMP:-/tmp}/viti-flow-${name}.html"
  "$CHROME_BIN" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --virtual-time-budget=11000 --dump-dom "$url" >"$file"
  for text in "$@"; do grep -Fq "$text" "$file"; done
  if grep -Fq '<div id="q-app"></div>' "$file"; then echo "Vue no renderizó $name"; exit 1; fi
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

echo "Flow E2E OK: formulario público y ruta administrativa autenticada renderizan en Chrome headless."
