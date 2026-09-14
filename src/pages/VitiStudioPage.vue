<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const applications = ref([])
const projects = ref([])
const requests = ref([])
const selected = ref(null)
const controlDialog = ref(false)
const createDialog = ref(false)
const createSaving = ref(false)

const moduleCatalog = [
  'clientes', 'usuarios', 'ventas', 'pedidos', 'productos', 'inventario', 'caja', 'pagos',
  'agenda', 'servicios', 'ordenes', 'reportes', 'notificaciones', 'delivery', 'ubicacion', 'soporte'
]

const draft = reactive({ project_id: null, nombre: '', version: '0.1.0', tipo: 'web', repositorio_url: '', beta_url: '', modulos: [] })

const control = reactive({
  nombre: '', version: '1.0.0', tipo: 'web', repositorio_url: '', url: '', url_administracion: '', proveedor_hosting: '',
  modulos: [], apk_url: '', apk_version: '', beta_url: '', payment_required: true, module_control: true, notes: ''
})

const activeRequests = computed(() => requests.value.filter(item => !['rechazada', 'cerrada', 'convertida'].includes(item.estado)))
const activeProjects = computed(() => projects.value.filter(item => !['finalizado', 'cancelado', 'cerrado'].includes(item.estado)))
const betaApps = computed(() => applications.value.filter(item => item.entorno === 'beta' || item.estado === 'en_pruebas'))
const deliveredApps = computed(() => applications.value.filter(item => Boolean(item.acceso_cliente)))
const appProjectIds = computed(() => new Set(applications.value.map(app => Number(app.proyecto_id)).filter(Boolean)))
const projectOptions = computed(() => activeProjects.value
  .filter(project => !appProjectIds.value.has(Number(project.id)))
  .map(project => ({ label: `${project.codigo} · ${project.empresa?.nombre_comercial || 'Empresa'} · ${project.nombre}`, value: project.id })))

const stats = computed(() => [
  { label: 'Solicitudes por atender', value: activeRequests.value.length, icon: 'inbox', color: 'orange' },
  { label: 'Proyectos activos', value: activeProjects.value.length, icon: 'account_tree', color: 'primary' },
  { label: 'Betas / pruebas', value: betaApps.value.length, icon: 'science', color: 'purple' },
  { label: 'Sistemas entregados', value: deliveredApps.value.length, icon: 'verified', color: 'positive' },
])

function listFrom(response) {
  const body = response?.data
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body)) return body
  return []
}

function labelState(value) {
  return String(value || 'pendiente').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function stateColor(value) {
  return ({
    en_revision: 'orange', aprobada: 'positive', convertida: 'blue-grey', rechazada: 'negative',
    desarrollo: 'blue', beta: 'purple', produccion: 'positive', en_pruebas: 'purple', activo: 'positive', pausado: 'orange', retirado: 'grey'
  })[value] || 'grey'
}

function lifecycle(app) {
  if (app.estado === 'retirado') return { label: 'Retirada', color: 'grey' }
  if (app.estado === 'pausado') return { label: 'Pausada', color: 'orange' }
  if (app.entorno === 'desarrollo') return { label: 'Desarrollo', color: 'blue' }
  if (app.entorno === 'beta' || app.estado === 'en_pruebas') return { label: 'Beta', color: 'purple' }
  if (app.entorno === 'produccion' && app.estado === 'activo' && !app.acceso_cliente) return { label: 'Lista para entregar', color: 'teal' }
  if (app.acceso_cliente) return { label: 'Entregada', color: 'positive' }
  return { label: labelState(app.estado), color: stateColor(app.estado) }
}

function configOf(app) {
  const cfg = app?.configuracion && typeof app.configuracion === 'object' ? app.configuracion : {}
  const delivery = cfg.delivery && typeof cfg.delivery === 'object' ? cfg.delivery : {}
  const license = cfg.license && typeof cfg.license === 'object' ? cfg.license : {}
  return { cfg, delivery, license }
}

function openCreate() {
  const first = projectOptions.value[0]
  Object.assign(draft, { project_id: first?.value || null, nombre: '', version: '0.1.0', tipo: 'web', repositorio_url: '', beta_url: '', modulos: [] })
  createDialog.value = true
}

async function saveNewSystem() {
  const project = projects.value.find(item => Number(item.id) === Number(draft.project_id))
  if (!project) return $q.notify({ type: 'warning', message: 'Selecciona un proyecto sin sistema registrado.' })
  if (!String(draft.nombre || '').trim()) return $q.notify({ type: 'warning', message: 'Escribe el nombre del sistema.' })
  createSaving.value = true
  try {
    await api.post('/aplicaciones', {
      empresa_id: project.empresa_id,
      proyecto_id: project.id,
      nombre: draft.nombre,
      version: draft.version || null,
      tipo: draft.tipo || 'web',
      entorno: 'desarrollo',
      estado: 'en_pruebas',
      repositorio_url: draft.repositorio_url || null,
      modulos: draft.modulos,
      configuracion: {
        studio_managed: true,
        delivery: { beta_url: draft.beta_url || null, apk_url: null, apk_version: null },
        license: { payment_required: true, module_control: true },
      },
      notas: 'Sistema registrado desde Centro VITI. El código y despliegue permanecen fuera de VITI.',
    })
    $q.notify({ type: 'positive', message: 'Sistema registrado. Ya puedes controlar su beta, módulos y entrega.' })
    createDialog.value = false
    await loadAll()
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No se pudo registrar el sistema.' })
  } finally { createSaving.value = false }
}

function openControl(app) {
  selected.value = app
  const { delivery, license } = configOf(app)
  Object.assign(control, {
    nombre: app.nombre || '', version: app.version || '1.0.0', tipo: app.tipo || 'web',
    repositorio_url: app.repositorio_url || '', url: app.url || '', url_administracion: app.url_administracion || '',
    proveedor_hosting: app.proveedor_hosting || '', modulos: Array.isArray(app.modulos) ? [...app.modulos] : [],
    apk_url: delivery.apk_url || '', apk_version: delivery.apk_version || '', beta_url: delivery.beta_url || '',
    payment_required: license.payment_required !== false, module_control: license.module_control !== false,
    notes: app.notas || ''
  })
  controlDialog.value = true
}

async function saveControl() {
  if (!selected.value) return
  saving.value = true
  try {
    const original = configOf(selected.value).cfg
    const configuracion = {
      ...original,
      delivery: {
        ...(original.delivery || {}),
        beta_url: control.beta_url || null,
        apk_url: control.apk_url || null,
        apk_version: control.apk_version || null,
      },
      license: {
        ...(original.license || {}),
        payment_required: Boolean(control.payment_required),
        module_control: Boolean(control.module_control),
      },
    }
    await api.put(`/aplicaciones/${selected.value.id}`, {
      empresa_id: selected.value.empresa_id,
      nombre: control.nombre,
      version: control.version || null,
      tipo: control.tipo || 'web',
      repositorio_url: control.repositorio_url || null,
      url: control.url || null,
      url_administracion: control.url_administracion || null,
      proveedor_hosting: control.proveedor_hosting || null,
      modulos: control.modulos,
      configuracion,
      notas: control.notes || null,
    })
    $q.notify({ type: 'positive', message: 'Control del sistema guardado.' })
    controlDialog.value = false
    await loadAll()
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No se pudo guardar el control del sistema.' })
  } finally { saving.value = false }
}

async function setCycle(app, environment, state) {
  try {
    await api.put(`/aplicaciones/${app.id}/ciclo`, { entorno: environment, estado: state })
    $q.notify({ type: 'positive', message: environment === 'beta' ? 'Sistema marcado como beta.' : 'Sistema marcado como producción activa.' })
    await loadAll()
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No se pudo cambiar la etapa.' })
  }
}

async function toggleDelivery(app) {
  try {
    const action = app.acceso_cliente ? 'revocar' : 'entregar'
    await api.post(`/aplicaciones/${app.id}/${action}`)
    $q.notify({ type: 'positive', message: app.acceso_cliente ? 'Acceso del cliente revocado.' : 'Sistema entregado al cliente.' })
    await loadAll()
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No se pudo cambiar la entrega.' })
  }
}

async function loadAll() {
  loading.value = true
  try {
    const [requestResponse, projectResponse, appResponse] = await Promise.all([
      api.get('/solicitudes', { params: { per_page: 100 } }),
      api.get('/proyectos', { params: { per_page: 100 } }),
      api.get('/aplicaciones', { params: { per_page: 100 } }),
    ])
    requests.value = listFrom(requestResponse)
    projects.value = listFrom(projectResponse)
    applications.value = listFrom(appResponse)
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No se pudo cargar el Centro VITI.' })
  } finally { loading.value = false }
}

onMounted(loadAll)
</script>

<template>
  <q-page class="viti-page studio-page">
    <q-inner-loading :showing="loading" />
    <PageHeader eyebrow="VITI STUDIO" title="Centro de desarrollo" subtitle="Recibe solicitudes, prepara proyectos y controla la entrega de cada sistema desde un solo lugar.">
      <q-btn outline color="primary" no-caps icon="fact_check" label="Ver solicitudes" to="/solicitudes" />
      <q-btn color="primary" unelevated no-caps icon="add" label="Registrar sistema" @click="openCreate" />
    </PageHeader>

    <template v-if="!loading">
      <q-banner rounded class="studio-banner q-mb-lg">
        <template #avatar><q-icon name="architecture" color="primary" size="32px" /></template>
        <div class="text-weight-bold">VITI administra el desarrollo; el sistema del cliente vive en su propio dominio, repositorio y APK.</div>
        <div class="text-body2 q-mt-xs">Aquí registras la empresa, enseñas el avance, guardas la beta, conectas la URL final y decides qué módulos y entrega quedan habilitados.</div>
      </q-banner>

      <div class="stats-grid q-mb-xl">
        <q-card v-for="stat in stats" :key="stat.label" flat class="viti-card stat-card">
          <q-card-section class="row items-center no-wrap q-gutter-md">
            <q-avatar :color="stat.color" text-color="white" :icon="stat.icon" />
            <div><div class="text-h4 text-weight-bold">{{ stat.value }}</div><div class="text-caption text-grey-6">{{ stat.label }}</div></div>
          </q-card-section>
        </q-card>
      </div>

      <div class="workflow-grid">
        <q-card flat class="viti-card workflow-card">
          <q-card-section class="row items-center"><div><div class="step-label">01 · ENTRADA</div><div class="text-h6 text-weight-bold">Solicitudes</div></div><q-space/><q-btn flat color="primary" no-caps label="Ver todas" to="/solicitudes" /></q-card-section>
          <q-separator />
          <q-list separator>
            <q-item v-for="item in activeRequests.slice(0, 6)" :key="item.id" clickable @click="router.push(`/solicitudes/${item.id}`)">
              <q-item-section><q-item-label class="text-weight-bold">{{ item.codigo }} · {{ item.empresa?.nombre_comercial || item.titulo }}</q-item-label><q-item-label caption>{{ item.titulo }}</q-item-label></q-item-section>
              <q-item-section side><q-badge :color="stateColor(item.estado)">{{ labelState(item.estado) }}</q-badge></q-item-section>
            </q-item>
            <q-item v-if="!activeRequests.length"><q-item-section class="empty-mini">No hay solicitudes pendientes.</q-item-section></q-item>
          </q-list>
        </q-card>

        <q-card flat class="viti-card workflow-card">
          <q-card-section class="row items-center"><div><div class="step-label">02 · PRODUCCIÓN</div><div class="text-h6 text-weight-bold">Proyectos</div></div><q-space/><q-btn flat color="primary" no-caps label="Ver todos" to="/proyectos" /></q-card-section>
          <q-separator />
          <q-list separator>
            <q-item v-for="item in activeProjects.slice(0, 6)" :key="item.id" clickable @click="router.push(`/proyectos/${item.id}`)">
              <q-item-section><q-item-label class="text-weight-bold">{{ item.codigo }} · {{ item.empresa?.nombre_comercial }}</q-item-label><q-item-label caption>{{ item.nombre }} · {{ labelState(item.fase) }}</q-item-label><q-linear-progress :value="Number(item.progreso || 0) / 100" rounded size="5px" color="primary" class="q-mt-sm" /></q-item-section>
              <q-item-section side><strong>{{ item.progreso || 0 }}%</strong></q-item-section>
            </q-item>
            <q-item v-if="!activeProjects.length"><q-item-section class="empty-mini">No hay proyectos activos.</q-item-section></q-item>
          </q-list>
        </q-card>
      </div>

      <q-card flat class="viti-card q-mt-xl">
        <q-card-section class="row items-center q-gutter-md">
          <div><div class="step-label">03 · CONTROL Y ENTREGA</div><div class="text-h6 text-weight-bold">Sistemas registrados</div><div class="text-caption text-grey-6">Repositorio, dominio, beta, APK, módulos y estado de entrega.</div></div>
          <q-space/><q-btn color="primary" outline no-caps icon="apps" label="Administrar aplicaciones" to="/aplicaciones" />
        </q-card-section>
        <q-separator />
        <div class="systems-grid q-pa-md">
          <q-card v-for="app in applications" :key="app.id" flat bordered class="system-card">
            <q-card-section>
              <div class="row items-start no-wrap q-gutter-md">
                <q-avatar color="blue-1" text-color="primary" icon="developer_mode" />
                <div class="col min-width-0">
                  <div class="row items-center q-gutter-sm"><div class="text-subtitle1 text-weight-bold ellipsis">{{ app.nombre }}</div><q-badge :color="lifecycle(app).color">{{ lifecycle(app).label }}</q-badge></div>
                  <div class="text-caption text-grey-6">{{ app.empresa?.nombre_comercial || 'Sin empresa' }} · v{{ app.version || '1.0.0' }}</div>
                </div>
              </div>
              <div class="system-meta q-mt-md">
                <div><q-icon name="language"/> {{ app.url ? 'Web registrada' : 'Sin URL web' }}</div>
                <div><q-icon name="code"/> {{ app.repositorio_url ? 'Repositorio registrado' : 'Sin repositorio' }}</div>
                <div><q-icon name="view_module"/> {{ Array.isArray(app.modulos) ? app.modulos.length : 0 }} módulos</div>
                <div><q-icon name="android"/> {{ configOf(app).delivery.apk_url ? `APK ${configOf(app).delivery.apk_version || ''}` : 'Sin APK' }}</div>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
              <q-btn flat color="primary" no-caps icon="tune" label="Controlar" @click="openControl(app)" />
              <q-btn v-if="app.entorno === 'desarrollo'" flat color="purple" no-caps label="Pasar a beta" @click="setCycle(app, 'beta', 'en_pruebas')" />
              <q-btn v-else-if="app.entorno === 'beta' || app.estado === 'en_pruebas'" flat color="positive" no-caps label="Preparar producción" @click="setCycle(app, 'produccion', 'activo')" />
              <q-btn v-if="app.entorno === 'produccion' && app.estado === 'activo'" :color="app.acceso_cliente ? 'orange' : 'positive'" flat no-caps :label="app.acceso_cliente ? 'Revocar' : 'Entregar'" @click="toggleDelivery(app)" />
            </q-card-actions>
          </q-card>
          <div v-if="!applications.length" class="empty-large">Todavía no hay sistemas registrados. Cuando conviertas una solicitud en proyecto, registra aquí la aplicación del cliente.</div>
        </div>
      </q-card>
    </template>

    <q-dialog v-model="createDialog">
      <q-card class="control-card">
        <q-card-section><div class="step-label">NUEVO SISTEMA</div><div class="text-h5 text-weight-bold">Registrar un desarrollo externo</div><div class="text-caption text-grey-6">Selecciona el proyecto y guarda únicamente las referencias iniciales. Luego podrás controlar beta, APK y módulos desde esta misma pantalla.</div></q-card-section>
        <q-separator />
        <q-card-section class="q-pa-lg">
          <q-select v-model="draft.project_id" outlined emit-value map-options :options="projectOptions" label="Proyecto *" :disable="!projectOptions.length" />
          <q-banner v-if="!projectOptions.length" rounded class="license-note q-mt-md"><template #avatar><q-icon name="info" color="primary" /></template>No hay proyectos activos sin sistema. Primero aprueba/convierte una solicitud o crea un proyecto.</q-banner>
          <div class="row q-col-gutter-md q-mt-sm">
            <div class="col-12 col-md-8"><q-input v-model="draft.nombre" outlined label="Nombre del sistema *" /></div>
            <div class="col-12 col-md-4"><q-input v-model="draft.version" outlined label="Versión inicial" /></div>
            <div class="col-12 col-md-4"><q-select v-model="draft.tipo" outlined :options="['web','movil','hibrido','api','escritorio','otro']" label="Tipo" /></div>
            <div class="col-12 col-md-8"><q-input v-model="draft.repositorio_url" outlined label="Repositorio" placeholder="https://..." /></div>
            <div class="col-12"><q-input v-model="draft.beta_url" outlined label="URL beta inicial (opcional)" placeholder="https://...vercel.app" /></div>
            <div class="col-12"><q-select v-model="draft.modulos" outlined multiple use-chips use-input new-value-mode="add-unique" :options="moduleCatalog" label="Módulos previstos" /></div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md"><q-btn flat no-caps label="Cancelar" v-close-popup /><q-btn color="primary" unelevated no-caps icon="save" label="Registrar sistema" :loading="createSaving" :disable="!projectOptions.length" @click="saveNewSystem" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="controlDialog">
      <q-card class="control-card">
        <q-card-section><div class="step-label">CONTROL DEL SISTEMA</div><div class="text-h5 text-weight-bold">{{ selected?.empresa?.nombre_comercial }}</div><div class="text-caption text-grey-6">Solo guardamos referencias y permisos; el código permanece en su repositorio propio.</div></q-card-section>
        <q-separator />
        <q-card-section class="q-pa-lg">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-8"><q-input v-model="control.nombre" outlined label="Nombre del sistema" /></div>
            <div class="col-12 col-md-4"><q-input v-model="control.version" outlined label="Versión" /></div>
            <div class="col-12"><q-input v-model="control.repositorio_url" outlined label="Repositorio (GitHub / GitLab)" placeholder="https://..." /></div>
            <div class="col-12 col-md-6"><q-input v-model="control.beta_url" outlined label="URL beta / pruebas" placeholder="https://...vercel.app" /></div>
            <div class="col-12 col-md-6"><q-input v-model="control.url" outlined label="Dominio / URL final" placeholder="https://sistema.com" /></div>
            <div class="col-12"><q-input v-model="control.url_administracion" outlined label="URL administrativa (opcional)" /></div>
            <div class="col-12 col-md-4"><q-select v-model="control.tipo" outlined :options="['web','movil','hibrido','api','escritorio','otro']" label="Tipo" /></div>
            <div class="col-12 col-md-8"><q-input v-model="control.proveedor_hosting" outlined label="Hosting / despliegue" placeholder="Vercel, Render, otro" /></div>
            <div class="col-12 col-md-8"><q-input v-model="control.apk_url" outlined label="Enlace de APK" placeholder="https://.../app.apk" /></div>
            <div class="col-12 col-md-4"><q-input v-model="control.apk_version" outlined label="Versión APK" /></div>
          </div>

          <div class="text-subtitle1 text-weight-bold q-mt-xl">Módulos habilitados para esta empresa</div>
          <div class="text-caption text-grey-6 q-mb-sm">La app puede consultar estos módulos mediante el endpoint de licencia de VITI.</div>
          <q-select v-model="control.modulos" outlined multiple use-chips use-input new-value-mode="add-unique" :options="moduleCatalog" label="Módulos" hint="Puedes escribir módulos propios además de los sugeridos." />

          <div class="row q-col-gutter-md q-mt-md">
            <div class="col-12 col-md-6"><q-toggle v-model="control.payment_required" color="primary" label="Controlar acceso según pago/suscripción" /></div>
            <div class="col-12 col-md-6"><q-toggle v-model="control.module_control" color="primary" label="La aplicación consultará módulos habilitados" /></div>
          </div>
          <q-banner rounded class="license-note q-mt-md"><template #avatar><q-icon name="key" color="primary" /></template>VITI puede devolver el estado de acceso y los módulos. Para que una APK bloquee o habilite funciones de verdad, esa APK debe consultar la licencia al iniciar sesión o al sincronizar.</q-banner>
          <q-input v-model="control.notes" outlined type="textarea" autogrow label="Notas técnicas" class="q-mt-md" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md"><q-btn flat no-caps label="Cancelar" v-close-popup /><q-btn color="primary" unelevated no-caps icon="save" label="Guardar control" :loading="saving" @click="saveControl" /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.studio-page{padding-bottom:48px}.studio-banner{background:linear-gradient(135deg,#e9f6f8,#f6fbfc);border:1px solid rgba(11,117,147,.16);color:#254b5b}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.stat-card{min-height:104px}.workflow-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.workflow-card{overflow:hidden}.step-label{font-size:11px;font-weight:900;letter-spacing:.12em;color:#0b7593}.empty-mini{padding:24px;color:#78909c;text-align:center}.systems-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.system-card{border-radius:16px}.system-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;color:#667f8d;font-size:12px}.system-meta>div{display:flex;align-items:center;gap:6px}.empty-large{grid-column:1/-1;text-align:center;padding:48px;color:#78909c}.control-card{width:860px;max-width:95vw}.license-note{background:#eef7fa;color:#3d6070}.min-width-0{min-width:0}@media(max-width:1050px){.stats-grid{grid-template-columns:repeat(2,1fr)}.systems-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:780px){.workflow-grid,.systems-grid{grid-template-columns:1fr}.stats-grid{grid-template-columns:1fr 1fr}.system-meta{grid-template-columns:1fr}}@media(max-width:480px){.stats-grid{grid-template-columns:1fr}}
</style>
