#!/usr/bin/env bash
set -euo pipefail

PORT="${VITI_AUTH_SMOKE_PORT:-4175}"
BASE="http://127.0.0.1:${PORT}"
CHROME_BIN="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$CHROME_BIN" ]]; then echo "No se encontró Chrome/Chromium."; exit 1; fi

VITI_AUTH_SMOKE_PORT="$PORT" python3 scripts/auth-smoke-server.py >"${RUNNER_TEMP:-/tmp}/viti-auth-smoke.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 30); do
  if curl --fail --silent "$BASE/api/health" >/dev/null; then break; fi
  sleep 0.5
done
curl --fail --silent "$BASE/api/health" >/dev/null

check_page(){
  local path="$1"; shift
  local slug
  slug="$(echo "$path" | tr '/?' '__')"
  local file="${RUNNER_TEMP:-/tmp}/viti-auth-${slug}.html"
  "$CHROME_BIN" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --virtual-time-budget=11000 --dump-dom "$BASE$path" >"$file"
  echo "Comprobando pantalla autenticada: $path"
  for text in "$@"; do
    if ! grep -Fq "$text" "$file"; then
      echo "::error title=Auth Browser Smoke::Falta texto esperado en $path: $text" >&2
      echo "Fragmento del DOM para diagnóstico:" >&2
      grep -o -m 1 -E 'Mis sistemas|Electrofrío E2E|Clientes y atención|Taller E2E|Próximos sistemas' "$file" >&2 || true
      exit 1
    fi
  done
  if grep -Fq '<div id="q-app"></div>' "$file"; then echo "Vue no renderizó $path"; exit 1; fi
  if grep -Fq 'Acceso a la plataforma' "$file"; then echo "La ruta autenticada $path terminó indebidamente en Login."; exit 1; fi
}

check_page "/mi-negocio" "Mi negocio" "Taller E2E" "VITI Inicial" "2 de 3 usados" "1 de 1 usados" "Equipo del negocio"
check_page "/mi-aplicaciones" "Mis sistemas" "Electrofrío E2E" "Próximos sistemas" "100% del trabajo"
check_page "/mi-apps/electrofrio/clientes" "Clientes y atención" "Flujo rápido:" "Cliente E2E Aires"

echo "Auth E2E OK: sesión, empresa activa, Feature Gate, aplicaciones y Clientes del sistema de aires renderizan en Chrome headless."