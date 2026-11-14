import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const detail = readFileSync(new URL('../src/pages/ProyectoDetallePage.vue', import.meta.url), 'utf8')
const board = readFileSync(new URL('../src/components/trabajos/ProyectoTaskBoard.vue', import.meta.url), 'utf8')

assert.match(detail, /<ProyectoTaskBoard :proyecto="item"/, 'El tablero debe estar dentro de los trabajos existentes.')
assert.match(board, /api\.get\('\/proyectos\/' \+ props\.proyecto\.id \+ '\/tareas'\)/, 'Carga tareas del trabajo concreto.')
assert.match(board, /api\.post\(base, payload\)/, 'Permite crear tareas.')
assert.match(board, /api\.patch\(base \+ '\/' \+ editingId\.value, payload\)/, 'Permite editar tareas.')
assert.match(board, /api\.patch\('\/proyectos\/' \+ props\.proyecto\.id \+ '\/tareas\/' \+ task\.id/, 'Permite mover tareas.')
assert.match(board, /criterios_aceptacion/, 'La UI incluye criterios de aceptación.')
assert.match(board, /props\.proyecto\?\.miembros/, 'Solo ofrece miembros del equipo existente.')
assert.match(board, /cancelado.*finalizado/, 'Respeta proyectos cerrados.')
assert.match(board, /statuses = \[/, 'Kanban contiene columnas definidas.')
for (const state of ['pendiente', 'en_desarrollo', 'en_revision', 'bloqueada', 'completada']) {
  assert.ok(board.includes("value: '" + state + "'"), 'Falta estado: ' + state)
}
assert.doesNotMatch(board, /api\.(put|patch)\(['"]\/proyectos\/['"]\s*[,)]/, 'El tablero no modifica directamente el estado del proyecto.')
assert.doesNotMatch(board, /v-html|innerHTML|localStorage\.setItem/, 'Las tareas no inyectan HTML ni guardan información en el navegador.')
console.log('Tablero VITI: endpoints, seguridad, estados y aislamiento básico verificados.')
