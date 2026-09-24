import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import vm from 'node:vm'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const has = (content, needle, label) => assert.ok(content.includes(needle), `${label}: falta ${needle}`)
const not = (content, needle, label) => assert.ok(!content.includes(needle), `${label}: no debe contener ${needle}`)

const routes = read('src/router/routes.js')
const router = read('src/router/index.js')
const landing = read('src/pages/VitiLandingPage.vue')
const request = read('src/pages/PublicSolicitudStartPage.vue')
const login = read('src/pages/LoginPage.vue')
const register = read('src/pages/ClientRegisterPage.vue')
const hubLayout = read('src/layouts/ClientHubLayout.vue')
const dashboard = read('src/pages/DashboardPage.vue')
const menu = read('src/navigation/mainMenu.js')
const access = read('src/pages/AccesosPage.vue')
const unavailable = read('src/pages/ServiceUnavailablePage.vue')
const axiosBoot = read('src/boot/axios.js')
const clientApps = read('src/pages/ClientAppsPage.vue')
const guard = read('public/viti-guard.js')

// 1. Presentación pública libre: qué es VITI, logros, módulos, pagos y suscripciones.
for (const term of ['Qué es VITI', 'Logros', 'Panel y módulos', 'Pagos', 'Suscripción mensual o anual', 'Días de gracia', 'Ver VITI, sus planes y la demo es libre']) has(landing, term, 'Landing')
has(router, "if (!auth.isAuthenticated) return { name:'viti-landing' }", 'Raíz pública')

// 2. Solicitar exige sesión de cliente y elegir plan + forma de pago.
has(routes, "path: '/solicitud', component: AuthLayout, meta: { requiresAuth:true, clientOnly:true }", 'Solicitud protegida')
has(request, "api.post('/mi/solicitud/enviar'", 'Envío autenticado')
not(request, "'/publico/solicitud/enviar'", 'Sin envío anónimo')
for (const term of ['Elige tu plan y cómo pagar', '¿Cómo pagarás la suscripción?', '¿Cómo pagarás la implementación?', "if (!form.forma_pago_preferida) return warn("]) has(request, term, 'Pago obligatorio')
has(login, "requested.startsWith('/solicitud')", 'Login vuelve a la solicitud')
has(login, 'Inicia sesión para enviar tu solicitud.', 'Aviso de sesión')
has(register, "requested.startsWith('/solicitud')", 'Registro vuelve a la solicitud')
has(hubLayout, "router.push('/solicitud')", 'Nueva solicitud usa el formulario oficial')
not(dashboard, 'Probar formulario', 'Admin sin formulario de prueba')

// 3. Administración de dominios, bloqueo por pago, mantenimiento y bloqueo manual.
has(routes, "path: 'accesos', name: 'accesos'", 'Ruta admin')
has(menu, "to: '/accesos'", 'Menú admin')
for (const call of ["api.get('/accesos'", '/dominios`', '/mantenimiento`', '/bloqueo`', '/politica-acceso`']) has(access, call, 'Panel de accesos')
has(access, 'Bloquear automáticamente si no paga', 'Control de pago por sistema')
has(access, 'viti-guard.js', 'Código de protección')

// 4. Los bloqueos llegan al usuario con su motivo.
has(axiosBoot, "viti:service-blocked", 'Evento de bloqueo')
has(axiosBoot, 'error.vitiServiceBlock', 'Bloqueo sin reintentos')
has(routes, "path: '/servicio-no-disponible'", 'Página pública de servicio no disponible')
for (const state of ['mantenimiento', 'bloqueado_pago', 'bloqueado_manual']) has(unavailable, `${state}:`, 'Estados de bloqueo')
has(clientApps, "app.estado_servicio==='mantenimiento'", 'Mis sistemas muestra mantenimiento')

// 5. El script de protección es válido, consulta el dominio y no rompe el sistema si VITI no responde.
new vm.Script(guard, { filename: 'viti-guard.js' })
has(guard, "'/publico/acceso?dominio='", 'Guard consulta el dominio')
has(guard, "credentials: 'omit'", 'Guard sin credenciales')
has(guard, 'no se interrumpe el sistema', 'Guard tolerante a fallos')

console.log('VITI access control smoke: PASS')
