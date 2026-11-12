import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const routes = read('src/router/routes.js')
const menu = read('src/navigation/mainMenu.js')
const ui = read('src/pages/IrenetDevicesPage.vue')

assert.match(
  routes,
  /path: 'irenet\/dispositivos'.*superAdminOnly:true/,
  'La página IRENET debe ser exclusiva de superadministradores',
)
assert.match(
  menu,
  /label: 'Dispositivos IRENET'.*to: '\/irenet\/dispositivos'/,
  'Debe existir un enlace a la gestión de dispositivos',
)
assert.match(ui, /api\.get\('\/irenet\/dispositivos'\)/)
assert.match(ui, /api\.post\('\/irenet\/dispositivos', \{ nombre \}\)/)
assert.match(ui, /api\.delete\('\/irenet\/dispositivos\/' \+ id\)/)
assert.match(ui, /@hide="clearSecret"/)
assert.match(ui, /onBeforeUnmount\(clearSecret\)/)
assert.doesNotMatch(ui, /localStorage\.setItem\([^)]*secret/i)
assert.doesNotMatch(ui, /sessionStorage\.setItem\([^)]*secret/i)
assert.doesNotMatch(ui, /console\.log\([^)]*secret/i)

console.log('IRENET: gestión superadmin y token de un solo uso verificados.')
