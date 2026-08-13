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

check_step(){
  local step="$1"; shift
  local file="${RUNNER_TEMP:-/tmp}/viti-flow-step-${step}.html"
  "$CHROME_BIN" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --virtual-time-budget=9000 --dump-dom "$BASE/solicitar/e2e-token-viti?paso=$step" >"$file"
  for text in "$@"; do grep -Fq "$text" "$file"; done
  if grep -Fq '<div id="q-app"></div>' "$file"; then echo "Vue no renderizó el paso $step"; exit 1; fi
}

check_step 1 "Solicitud VITI" "VITI Inicial" "Continuar" "Registro completado"
check_step 2 "Configuración de VITI Inicial" "Saltar configuración" "¿Cuántas personas usarán el sistema?"
check_step 3 "Forma de pago de la implementación" "Enviar a revisión" "Suscripción"

echo "Flow E2E OK: Plan, Configuración y Acuerdo renderizan en Chrome headless."
