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
const layout = readFileSync(resolve(root, 'src/layouts/PeluqueriaClientLayout.vue'), 'utf8')

const canonical = new Set(['inicio','agenda','ordenes','clientes','tecnicos','inventario','pagos','historial'])
assert.equal(PELUQUERIA_MENU_ITEMS.every(item => canonical.has(item.module)), true)
assert.deepEqual([...PELUQUERIA_SUPPORTED_MODULES], [...canonical])

const effective = new Set(['inicio','agenda','clientes','historial'])
const menu = filterPeluqueriaMenu(module => effective.has(module))
assert.deepEqual(menu.map(item => item.label), ['Inicio','Agenda','Clientes','Historial','Reportes'])
assert.equal(peluqueriaModuleForPath('/mi-apps/peluqueria/servicios'), 'ordenes')
assert.equal(peluqueriaModuleForPath('/mi-apps/peluqueria/reportes'), 'historial')
assert.match(layout, /tenant\.hasModule\(module\)/)
assert.match(layout, /ensureAllowedRoute/)
assert.match(layout, /router\.replace\(target\)/)

console.log('VITI Peluquería module navigation smoke: PASS')
console.log('- Menú usa claves canónicas')
console.log('- Menú respeta módulos efectivos del tenant')
console.log('- Ruta bloqueada redirige a una sección permitida')
