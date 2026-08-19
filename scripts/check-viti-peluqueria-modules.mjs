import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  PELUQUERIA_MENU_ITEMS,
  PELUQUERIA_SUPPORTED_MODULES,
  filterPeluqueriaMenu,
  peluqueriaModuleForPath,
} from '../src/utils/peluqueriaModules.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const backendRoot = resolve(root, '..', 'backend')
const layout = readFileSync(resolve(root, 'src/layouts/PeluqueriaClientLayout.vue'), 'utf8')
const workspace = readFileSync(resolve(root, 'src/pages/ClientPeluqueriaWorkspacePage.vue'), 'utf8')
const controller = readFileSync(resolve(backendRoot, 'app/Http/Controllers/PeluqueriaController.php'), 'utf8')
const extras = readFileSync(resolve(backendRoot, 'app/Http/Controllers/PeluqueriaExtrasController.php'), 'utf8')

const currentKeys = new Set(['inicio','agenda','ordenes','clientes','equipos','tecnicos','inventario','pagos','garantias','historial','buzon'])
assert.equal(PELUQUERIA_MENU_ITEMS.every(item => currentKeys.has(item.module)), true, 'El menú no puede inventar claves de módulo.')
assert.equal(PELUQUERIA_SUPPORTED_MODULES.every(module => currentKeys.has(module)), true, 'Peluquería debe usar solo claves canónicas actuales.')
assert.equal(PELUQUERIA_SUPPORTED_MODULES.includes('servicios'), false)
assert.equal(PELUQUERIA_SUPPORTED_MODULES.includes('reportes'), false)

const effective = new Set(['inicio','agenda','ordenes','clientes','historial'])
const menu = filterPeluqueriaMenu(module => effective.has(module))
const labels = menu.map(item => item.label)
assert.deepEqual(labels, ['Inicio','Agenda','Clientes','Servicios','Atenciones','Historial','Reportes'])
assert.equal(labels.includes('Productos'), false)
assert.equal(labels.includes('Personal'), false)
assert.equal(labels.includes('Caja'), false)

assert.equal(peluqueriaModuleForPath('/mi-apps/peluqueria/servicios'), 'ordenes')
assert.equal(peluqueriaModuleForPath('/mi-apps/peluqueria/atenciones'), 'ordenes')
assert.equal(peluqueriaModuleForPath('/mi-apps/peluqueria/reportes'), 'historial')
assert.equal(peluqueriaModuleForPath('/mi-apps/peluqueria/productos'), 'inventario')
assert.equal(peluqueriaModuleForPath('/mi-apps/peluqueria/personal'), 'tecnicos')

assert.match(layout, /tenant\.hasModule\(module\)/, 'El layout debe filtrar por módulos efectivos del tenant.')
assert.match(layout, /ensureAllowedRoute/, 'El layout debe evitar navegación directa a una sección no habilitada.')
assert.match(workspace, /if\(hasModule\('clientes'\)\).*clientes/s, 'Workspace no debe pedir Clientes si el módulo no es efectivo.')
assert.match(workspace, /if\(hasModule\('ordenes'\)\).*servicios.*atenciones/s, 'Workspace debe condicionar Servicios y Atenciones a ordenes.')
assert.match(workspace, /hasModule\('pagos'\).*openPayment/s, 'Las acciones de cobro deben respetar Pagos.')
assert.match(controller, /assertModule\(\$empresa, \$module\)/)
assert.match(controller, /assertCanUse\(\$request->user\(\), \$empresa, \$module\)/)
assert.match(extras, /assertModule\(\$empresa, \$module\)/)
assert.match(extras, /assertCanUse\(\$request->user\(\), \$empresa, \$module\)/)

console.log('VITI Peluquería module authorization smoke: PASS')
console.log('- Menú usa módulos efectivos')
console.log('- No se crean claves servicios/reportes')
console.log('- Servicios/Atenciones -> ordenes')
console.log('- Reportes -> historial')
console.log('- Backend usa TenantContext + assertModule + assertCanUse')
