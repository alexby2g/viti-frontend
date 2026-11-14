import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildMainMenu } from '../src/navigation/mainMenu.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const dashboard = read('src/pages/DashboardPage.vue')
const client = read('src/pages/ClientPortalPage.vue')
const work = read('src/pages/ProyectoDetallePage.vue')
const files = read('src/pages/ArchivosPage.vue')
const routes = read('src/router/routes.js')

const menu = buildMainMenu({ isClient: false, isSuperAdmin: true, unreadCount: 3 })
const flatten = (rows) => rows.flatMap((row) => row.children ? flatten(row.children) : row.to ? [row] : [])
const links = flatten(menu)
assert.equal(links.filter((i) => i.to === '/pagos').length, 1, 'Un solo acceso visible a pagos.')
for (const to of ['/solicitudes', '/trabajos', '/pagos', '/sistemas', '/clientes', '/archivos']) {
  assert.ok(links.some((l) => l.to === to), 'Falta ruta existente ' + to)
}
assert.ok(links.some((l) => l.label === 'Archivos y entregables'), 'Archivos queda visible en Herramientas.')
assert.ok(links.some((l) => l.to === '/reportes'), 'Los reportes no deben eliminarse.')
const admin = buildMainMenu({ isClient: false, isSuperAdmin: false })
assert.ok(!flatten(admin).some((row) => row.to === '/pagos'), 'Solo el superadministrador puede entrar a cobros.')

const user = buildMainMenu({ isClient: true, hasClientProfile: true, hasBusiness: true, isManager: true })
const userLinks = flatten(user)
assert.ok(userLinks.some((row) => row.to === '/mi-pagos'), 'El cliente encuentra sus comprobantes.')
assert.ok(userLinks.some((row) => row.to === '/mi-proyecto'), 'El cliente encuentra su proyecto.')
assert.ok(userLinks.some((row) => row.to === '/mi-aplicaciones'), 'El cliente encuentra sus sistemas.')
assert.ok(!userLinks.some((row) => row.to === '/pagos'), 'El cliente no recibe enlaces administrativos.')

assert.match(dashboard, /api\.get\('\/dashboard'\)/, 'No reemplazar el resumen actual por números inventados.')
assert.match(dashboard, /isSuperAdmin\.value \? api\.get\('\/pagos'\)/, 'Pago solo para superadministrador.')
for (const label of ['Solicitudes', 'Pagos', 'Trabajos', 'Sistemas', 'comprobantes por verificar']) {
  assert.ok(dashboard.includes(label), 'Falta tarjeta principal: ' + label)
}
assert.match(client, /to="\/mi-pagos"/, 'El cliente puede subir comprobantes desde su espacio.')
assert.match(client, /Tu pago solo se confirma/, 'El QR no se confirma al subir la imagen.')
assert.ok(work.includes('archivos?proyecto='), 'Entrega con contexto de proyecto.')
assert.match(work, /auth\.user\?\.rol === 'superadmin'/, 'No mostrar pagos administrativos a otros roles.')
assert.match(work, /100 %/, 'Se avisa si el trabajo muestra 100 % sin estar cerrado.')
assert.match(files, /catalogs\.value\.proyecto\.some/, 'Nunca autoseleccionar un proyecto que no esté disponible.')
assert.match(files, /category\.value = 'entrega'/, 'Los adjuntos se clasifican como entregables.')
assert.ok(routes.includes("path: 'mi-pagos'") || routes.includes("path:'mi-pagos'"), 'Mantener ruta de pagos de clientes.')
assert.ok(routes.includes("path: 'trabajos/:id'"), 'Mantener enlace de trabajo.')
assert.doesNotMatch(dashboard, /v-html|innerHTML|localStorage\.setItem/, 'El panel no debe inyectar contenido ni almacenar datos privados.')
console.log('VITI simplificado: rutas, permisos, QR manual, entregables y menús sin duplicados verificados.')
