#!/usr/bin/env bash
set -euo pipefail

PORT="${VITI_SMOKE_PORT:-4173}"
BASE_URL="http://127.0.0.1:${PORT}"
DOM_FILE="${RUNNER_TEMP:-/tmp}/viti-browser-smoke.html"
HTTP_LOG="${RUNNER_TEMP:-/tmp}/viti-browser-smoke-http.log"

CHROME_BIN="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$CHROME_BIN" ]]; then
  echo "No se encontró Chrome/Chromium en el runner."
  exit 1
fi

python3 -m http.server "$PORT" --directory dist/spa >"$HTTP_LOG" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 30); do
  if curl --fail --silent --show-error "$BASE_URL/" >/dev/null; then
    break
  fi
  sleep 0.5
done

curl --fail --silent --show-error "$BASE_URL/" >/dev/null

"$CHROME_BIN" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --virtual-time-budget=7000 \
  --dump-dom "$BASE_URL/" >"$DOM_FILE"

# Verificar textos visibles del formulario actual. El código de seguridad solo
# aparece después de comprobar las credenciales y no debe exigirse al cargar.
grep -Fq "Acceso a la plataforma" "$DOM_FILE"
grep -Fq "Bienvenido a VITI" "$DOM_FILE"
grep -Fq "Continuar con Google" "$DOM_FILE"
grep -Fq "Celular o usuario" "$DOM_FILE"
grep -Fq "Entrar a VITI" "$DOM_FILE"
grep -Fq "Crear cuenta gratis" "$DOM_FILE"
grep -Fq "Plataforma de sistemas y proyectos" "$DOM_FILE"

if grep -Fq '<div id="q-app"></div>' "$DOM_FILE"; then
  echo "La aplicación no llegó a renderizar contenido dentro de #q-app."
  exit 1
fi

echo "Smoke E2E OK: VITI compiló, abrió en Chrome headless y renderizó la pantalla de acceso actual."
