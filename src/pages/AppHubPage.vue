<template>
  <q-page class="q-pa-lg">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-overline text-primary">VITI APPHUB</div>
        <div class="text-h4 text-weight-bold">Centro de Aplicaciones e Integraciones</div>
        <div class="text-subtitle1 text-grey-5">Personaliza, clona, integra usuarios y entrega aplicaciones sin tocar las demás.</div>
      </div>
      <q-btn color="primary" icon="add" label="Nueva aplicación" @click="showNew = true" />
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="stat in stats" :key="stat.label" class="col-12 col-sm-4">
        <q-card flat bordered class="bg-dark"><q-card-section>
          <div class="text-caption text-grey-5">{{ stat.label }}</div>
          <div class="text-h4 text-weight-bold">{{ stat.value }}</div>
        </q-card-section></q-card>
      </div>
    </div>

    <q-card flat bordered class="bg-dark">
      <q-card-section class="row items-center q-gutter-sm">
        <q-input v-model="search" dense outlined class="col" placeholder="Buscar aplicación o plantilla..." clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-select v-model="filter" dense outlined emit-value map-options :options="filters" style="min-width: 180px" />
      </q-card-section>
      <q-separator dark />
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div v-for="app in filteredApps" :key="app.id" class="col-12 col-md-6 col-xl-4">
            <q-card flat bordered class="app-card full-height">
              <q-card-section class="row no-wrap items-start">
                <q-avatar size="52px" color="primary" text-color="white" class="q-mr-md">
                  <img v-if="isImageIcon(app.icon)" :src="app.icon" alt="" @error="onIconError" />
                  <q-icon v-else :name="app.icon || 'apps'" />
                </q-avatar>
                <div class="col">
                  <div class="text-h6">{{ app.name }}</div>
                  <div class="text-caption text-grey-5">{{ app.description || 'Sin descripción' }}</div>
                  <div class="text-caption text-grey-6 q-mt-xs">{{ app.company_name || 'Sin empresa' }}</div>
                  <div class="q-mt-sm">
                    <q-badge :color="app.is_active ? 'positive' : 'grey'">{{ app.is_active ? 'Activa' : 'Inactiva' }}</q-badge>
                    <q-badge outline color="primary" class="q-ml-sm">{{ app.type === 'template' ? 'Plantilla' : 'Aplicación' }}</q-badge>
                  </div>
                </div>
              </q-card-section>
              <q-separator dark />
              <q-card-actions align="right">
                <q-btn flat color="primary" label="Editar" icon="edit" @click="editApp(app)" />
                <q-btn flat color="secondary" label="Usuarios" icon="group_add" @click="openUsers(app)" />
                <q-btn flat color="accent" label="Clonar" icon="content_copy" @click="cloneApp(app)" />
              </q-card-actions>
            </q-card>
          </div>
          <div v-if="!filteredApps.length" class="col-12 text-center q-pa-xl text-grey-5">No hay aplicaciones para mostrar.</div>
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="showEdit">
      <q-card style="width: 800px; max-width: 95vw" class="bg-dark">
        <q-card-section><div class="text-h6">Personalizar aplicación</div></q-card-section>
        <q-card-section v-if="selected">
          <div class="row q-col-gutter-md">
            <q-input v-model="selected.name" outlined label="Nombre del sistema" class="col-12 col-md-6" />
            <q-input v-model="selected.icon" outlined label="URL del ícono/logo" hint="También puedes subir una imagen debajo." class="col-12 col-md-6" />
            <div class="col-12 col-md-6">
              <q-file v-model="selected.icon_file" outlined accept="image/png,image/jpeg,image/webp,image/svg+xml" label="Subir foto o logo" clearable @update:model-value="prepareIconFile">
                <template #prepend><q-icon name="upload" /></template>
              </q-file>
              <div v-if="selected.icon_file" class="text-caption text-grey-5 q-mt-xs">{{ selected.icon_file.name }}</div>
            </div>
            <div class="col-12 col-md-6 flex items-center">
              <q-avatar size="64px" color="primary" text-color="white">
                <img v-if="isImageIcon(selected.icon)" :src="selected.icon" alt="" />
                <q-icon v-else :name="selected.icon || 'apps'" />
              </q-avatar>
              <div class="q-ml-md text-caption text-grey-5">Vista previa del ícono</div>
            </div>
            <q-input v-model="selected.description" outlined label="Descripción" class="col-12" />
            <q-input v-model="selected.primary_color" outlined label="Color principal" class="col-12 col-md-6" />
            <q-input v-model="selected.secondary_color" outlined label="Color secundario" class="col-12 col-md-6" />
            <q-toggle v-model="selected.is_active" label="Aplicación habilitada" class="col-12 col-md-6" />
            <q-toggle v-model="selected.is_template" label="Usar como plantilla base" class="col-12 col-md-6" />
          </div>
          <div class="text-subtitle1 q-mt-lg q-mb-sm">Módulos habilitados</div>
          <div class="row q-col-gutter-sm">
            <div v-for="module in modules" :key="module.key" class="col-12 col-sm-6">
              <q-toggle v-model="selected.modules" :val="module.key" :label="module.name" />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /><q-btn color="primary" label="Guardar cambios" @click="saveApp" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showUsers">
      <q-card style="width: 800px; max-width: 95vw" class="bg-dark">
        <q-card-section>
          <div class="text-h6">Integrar usuarios VITI — {{ selected?.name }}</div>
          <div class="text-caption text-grey-5">Busca aquí a los usuarios que ya existen en VITI y después intégralos a esta aplicación.</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="userSearch" outlined dense clearable placeholder="Buscar por nombre, usuario, correo o teléfono..." class="q-mb-md">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
          <q-list bordered separator>
            <q-item v-for="user in filteredUsers" :key="user.id">
              <q-item-section avatar><q-avatar color="primary" text-color="white"><q-icon name="person" /></q-avatar></q-item-section>
              <q-item-section>
                <q-item-label>{{ user.name }}</q-item-label>
                <q-item-label caption>{{ user.email || user.username || user.phone || 'Usuario VITI' }}</q-item-label>
                <q-item-label v-if="user.company_name" caption class="text-primary">{{ user.company_name }}</q-item-label>
              </q-item-section>
              <q-item-section side><q-select v-model="user.role" dense outlined :options="roles" /></q-item-section>
              <q-item-section side>
                <q-btn flat :color="user.integrated ? 'positive' : 'primary'" :icon="user.integrated ? 'check' : 'add_link'" :label="user.integrated ? 'Integrado' : 'Integrar'" :disable="user.integrated" @click="integrateUser(user)" />
              </q-item-section>
            </q-item>
            <q-item v-if="!filteredUsers.length"><q-item-section class="text-center text-grey-5 q-pa-lg">No se encontró ningún usuario de VITI con esa búsqueda.</q-item-section></q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right"><q-btn flat label="Cerrar" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showNew">
      <q-card style="width: 650px; max-width: 95vw" class="bg-dark">
        <q-card-section><div class="text-h6">Nueva aplicación</div></q-card-section>
        <q-card-section>
          <q-select v-model="newApp.company_id" outlined label="Empresa" :options="companies" option-label="name" option-value="id" emit-value map-options class="q-mb-md" />
          <q-input v-model="newApp.name" outlined label="Nombre" class="q-mb-md" />
          <q-input v-model="newApp.description" outlined label="Descripción" class="q-mb-md" />
          <q-select v-model="newApp.source" outlined label="Origen" :options="sourceOptions" class="q-mb-md" />
          <q-select v-if="newApp.source === 'Desde plantilla'" v-model="newApp.template_id" outlined label="Plantilla base" :options="templates" option-label="name" option-value="id" emit-value map-options />
        </q-card-section>
        <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /><q-btn color="primary" label="Crear aplicación" :disable="!canCreateApp" @click="createApp" /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from 'src/boot/axios'
import { Notify } from 'quasar'

const apps = ref([])
const companies = ref([])
const users = ref([])
const search = ref('')
const userSearch = ref('')
const filter = ref('all')
const selected = ref(null)
const showEdit = ref(false)
const showUsers = ref(false)
const showNew = ref(false)
const newApp = ref({ company_id: null, name: '', description: '', source: 'Aplicación nueva', template_id: null })
const roles = ['Administrador', 'Operador', 'Soporte', 'Consulta']
const filters = [{ label: 'Todas', value: 'all' }, { label: 'Aplicaciones', value: 'application' }, { label: 'Plantillas', value: 'template' }]
const sourceOptions = computed(() => templates.value.length ? ['Desde plantilla', 'Aplicación nueva'] : ['Aplicación nueva'])
const modules = [
  { key: 'dashboard', name: 'Dashboard' }, { key: 'clientes', name: 'Clientes' },
  { key: 'usuarios', name: 'Usuarios' }, { key: 'servicios', name: 'Servicios' },
  { key: 'inventario', name: 'Inventario' }, { key: 'reportes', name: 'Reportes' },
  { key: 'pagos', name: 'Pagos' }
]

const filteredApps = computed(() => apps.value.filter(a =>
  (filter.value === 'all' || a.type === filter.value) &&
  `${a.name} ${a.description || ''} ${a.company_name || ''}`.toLowerCase().includes(search.value.toLowerCase())
))
const templates = computed(() => apps.value.filter(a => a.type === 'template'))
const filteredUsers = computed(() => users.value.filter(u => {
  const q = userSearch.value.toLowerCase().trim()
  if (!q) return true
  return `${u.name} ${u.email || ''} ${u.username || ''} ${u.phone || ''} ${u.company_name || ''}`.toLowerCase().includes(q)
}))
const stats = computed(() => [
  { label: 'Aplicaciones', value: apps.value.filter(a => a.type !== 'template').length },
  { label: 'Plantillas', value: apps.value.filter(a => a.type === 'template').length },
  { label: 'Activas', value: apps.value.filter(a => a.is_active).length }
])
const canCreateApp = computed(() => {
  if (!newApp.value.company_id || !newApp.value.name.trim()) return false
  if (newApp.value.source === 'Desde plantilla' && !newApp.value.template_id) return false
  return true
})

function notifyError (error, fallback = 'No se pudo completar la operación.') {
  const status = error?.response?.status
  const message = error?.response?.data?.message || error?.response?.data?.error
  if (status === 422 && message) {
    Notify.create({ type: 'negative', timeout: 7000, message: `No se pudo completar: ${message}` })
    return
  }
  Notify.create({ type: 'negative', timeout: 6000, message: message || fallback })
}

function isImageIcon (icon) {
  return typeof icon === 'string' && /^(https?:\/\/|data:image\/|blob:)/i.test(icon)
}

function onIconError (event) {
  event.target.style.display = 'none'
}

function prepareIconFile (file) {
  if (!file || !selected.value) return
  if (file.size > 1024 * 1024) {
    Notify.create({ type: 'warning', message: 'El logo debe pesar como máximo 1 MB.' })
    selected.value.icon_file = null
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    selected.value.icon = String(reader.result || '')
  }
  reader.onerror = () => Notify.create({ type: 'negative', message: 'No se pudo leer la imagen seleccionada.' })
  reader.readAsDataURL(file)
}

function normalizeApp (row) {
  return {
    ...row,
    name: row.nombre,
    description: row.descripcion || row.notas || '',
    icon: row.icono || row.catalogo?.icono || null,
    primary_color: row.color_primario || '',
    secondary_color: row.color_secundario || '',
    modules: Array.isArray(row.modulos) ? row.modulos : [],
    is_active: row.configuracion?.habilitada !== false && row.estado !== 'retirado',
    is_template: Boolean(row.es_plantilla),
    type: row.es_plantilla ? 'template' : 'application',
    company_name: row.empresa?.nombre_comercial || ''
  }
}

async function loadApps () {
  try {
    const { data } = await api.get('/aplicaciones')
    const rows = data.data ?? data
    apps.value = Array.isArray(rows) ? rows.map(normalizeApp) : []
  } catch (e) { console.error(e); apps.value = [] }
}

async function loadCompanies () {
  try {
    const { data } = await api.get('/empresas')
    const rows = data.data ?? data
    companies.value = Array.isArray(rows) ? rows.map(c => ({ id: c.id, name: c.nombre_comercial })) : []
  } catch (e) { console.error(e); companies.value = [] }
}

async function editApp (app) {
  selected.value = { ...app, modules: [...(app.modules || [])], configuracion: { ...(app.configuracion || {}) }, icon_file: null }
  showEdit.value = true
}

async function saveApp () {
  try {
    await api.put(`/aplicaciones/${selected.value.id}`, {
      empresa_id: selected.value.empresa_id,
      nombre: selected.value.name,
      descripcion: selected.value.description,
      icono: selected.value.icon,
      color_primario: selected.value.primary_color,
      color_secundario: selected.value.secondary_color,
      modulos: selected.value.modules,
      es_plantilla: selected.value.is_template,
      configuracion: { ...selected.value.configuracion, habilitada: selected.value.is_active }
    })
    await loadApps(); showEdit.value = false
    Notify.create({ type: 'positive', message: 'Aplicación actualizada correctamente.' })
  } catch (e) { console.error(e); notifyError(e) }
}

async function openUsers (app) {
  selected.value = app
  userSearch.value = ''
  try {
    const detailResponse = await api.get(`/aplicaciones/${app.id}`)
    const integrated = detailResponse.data?.data?.usuarios ?? []
    const integratedMap = new Map(integrated.map(u => [u.id, u]))

    // /usuarios ya representa a los usuarios registrados en VITI. No filtramos por
    // `negocios` porque ese campo no viene garantizado por este endpoint y hacía
    // desaparecer usuarios válidos del buscador.
    const usersResponse = await api.get('/usuarios', { params: { per_page: 100 } })
    const payload = usersResponse.data?.data ?? usersResponse.data ?? []
    const all = Array.isArray(payload) ? payload : []

    users.value = all.map(u => {
      const current = integratedMap.get(u.id)
      const company = u.empresa?.nombre_comercial || u.empresa?.nombre || u.empresa_nombre || ''
      return {
        id: u.id,
        name: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.usuario || u.username || 'Usuario VITI',
        email: u.correo || u.email,
        username: u.usuario || u.username,
        phone: u.telefono || u.celular,
        company_name: company,
        role: current?.pivot?.rol || 'Consulta',
        integrated: Boolean(current)
      }
    })
  } catch (e) { console.error(e); users.value = []; notifyError(e, 'No se pudieron cargar los usuarios de VITI.') }
  showUsers.value = true
}

async function integrateUser (user) {
  try {
    await api.put(`/aplicaciones/${selected.value.id}`, { integrar_usuario: true, user_id: user.id, role: user.role.toLowerCase() })
    user.integrated = true
    Notify.create({ type: 'positive', message: 'Usuario integrado correctamente.' })
  } catch (e) { console.error(e); notifyError(e, 'No se pudo integrar el usuario.') }
}

async function cloneApp (app) {
  try {
    await api.post('/aplicaciones', {
      empresa_id: app.empresa_id,
      nombre: `${app.name} — copia`,
      descripcion: app.description,
      clone_from_id: app.id
    })
    await loadApps()
    Notify.create({ type: 'positive', message: 'Aplicación clonada correctamente.' })
  } catch (e) { console.error(e); notifyError(e, 'No se pudo clonar la aplicación.') }
}

async function createApp () {
  if (!canCreateApp.value) return
  try {
    const payload = {
      empresa_id: newApp.value.company_id,
      nombre: newApp.value.name,
      descripcion: newApp.value.description
    }
    if (newApp.value.source === 'Desde plantilla') payload.clone_from_id = newApp.value.template_id
    await api.post('/aplicaciones', payload)
    newApp.value = { company_id: null, name: '', description: '', source: templates.value.length ? 'Desde plantilla' : 'Aplicación nueva', template_id: null }
    showNew.value = false
    await loadApps()
    Notify.create({ type: 'positive', message: 'Aplicación creada correctamente.' })
  } catch (e) { console.error(e); notifyError(e, 'No se pudo crear la aplicación.') }
}

onMounted(async () => { await Promise.all([loadApps(), loadCompanies()]) })
</script>

<style scoped>
.app-card { transition: transform .15s ease, border-color .15s ease; }
.app-card:hover { transform: translateY(-2px); border-color: rgba(126, 87, 255, .7); }
</style>
