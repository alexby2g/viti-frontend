<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const data = ref({ resumen: {}, solicitudes_recientes: [], proyectos_recientes: [], requieren_atencion: [] })
const loading = ref(true)
const agrMessage = ref('')
const agrLoading = ref(false)
const agrResponse = ref(null)
const agrCreateLoading = ref(false)
const agrClientForm = ref({ nombre: '', telefono: '', whatsapp: '', correo: '', ciudad: '', direccion: '', observaciones: '' })

const cards = [
  { key: 'negocios_activos', label: 'Negocios activos', icon: 'business', color: 'blue', to: '/clientes' },
  { key: 'aplicaciones_activas', label: 'Apps activas', icon: 'apps', color: 'teal', to: '/saas' },
  { key: 'suscripciones_activas', label: 'Suscripciones activas', icon: 'autorenew', color: 'green', to: '/pagos' },
  { key: 'pagos_vencidos', label: 'Pagos con atención', icon: 'schedule', color: 'orange', to: '/pagos' }
]

function pretty(v) { return String(v || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) }

async function askAgr(message = agrMessage.value) {
  const text = String(message || '').trim()
  if (!text || agrLoading.value) return
  agrLoading.value = true
  agrResponse.value = null
  try {
    const response = (await api.get('/dashboard', { params: { agr: text } })).data
    agrResponse.value = response
    if (response?.intent === 'create_client') {
      agrClientForm.value = { nombre: '', telefono: '', whatsapp: '', correo: '', ciudad: '', direccion: '', observaciones: '' }
    }
  } catch (error) {
    agrResponse.value = { intent: 'error', message: error?.response?.data?.message || 'No pude comunicarme con AGR Assistant.' }
  } finally { agrLoading.value = false }
}

async function confirmCreateClient() {
  if (!agrClientForm.value.nombre.trim() || agrCreateLoading.value) return
  agrCreateLoading.value = true
  try {
    const response = (await api.post('/agr/acciones/crear-cliente', agrClientForm.value)).data
    agrResponse.value = { intent: 'create_client_success', message: response.message, data: { client: response.data?.client } }
    agrMessage.value = ''
    data.value = (await api.get('/dashboard')).data
  } catch (error) {
    agrResponse.value = { intent: 'error', message: error?.response?.data?.message || 'No pude registrar el cliente.' }
  } finally { agrCreateLoading.value = false }
}

function useExample(text) { agrMessage.value = text; askAgr(text) }
function executeAgrAction() {
  const action = agrResponse.value?.data?.action
  if (!action || action.type !== 'navigate' || !action.to) return
  window.history.pushState({}, '', action.to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

onMounted(async () => { try { data.value = (await api.get('/dashboard')).data } finally { loading.value = false } })
</script>

<template>
  <q-page class="viti-page">
    <q-inner-loading :showing="loading" />
    <PageHeader eyebrow="SaaS" title="Panel VITI" subtitle="La plataforma en una mirada: negocios, aplicaciones, suscripciones y lo que requiere atención.">
      <q-btn color="primary" unelevated icon="person_add" label="Registrar cliente" no-caps to="/clientes?new=1" />
    </PageHeader>

    <div class="row q-col-gutter-md">
      <div v-for="card in cards" :key="card.key" class="col-12 col-sm-6 col-xl-3">
        <q-card flat class="viti-card action-card cursor-pointer" @click="$router.push(card.to)">
          <q-card-section><div class="row items-center no-wrap"><q-avatar :color="`${card.color}-1`" :text-color="`${card.color}-8`" :icon="card.icon" size="50px" /><q-space /><q-icon name="arrow_forward" color="grey-5" /></div><div class="stat-value q-mt-md">{{ data.resumen[card.key] || 0 }}</div><div class="stat-label">{{ card.label }}</div></q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat class="viti-card q-mt-lg agr-card">
      <q-card-section><div class="row items-center q-col-gutter-md"><div class="col-auto"><q-avatar color="primary" text-color="white" icon="auto_awesome" size="52px" /></div><div class="col"><div class="text-h6 text-weight-bold">AGR Assistant</div><div class="text-caption text-grey-6">Asistente local de VITI. Funciona con reglas y datos reales del sistema, sin API externa.</div></div><div class="col-12 col-md-auto"><q-badge color="positive" outline label="LOCAL · SIN API" /></div></div></q-card-section>
      <q-separator />
      <q-card-section>
        <q-input v-model="agrMessage" outlined rounded dense placeholder="Escribe una orden para AGR..." @keyup.enter="askAgr()"><template #prepend><q-icon name="chat" /></template><template #append><q-btn round flat dense icon="send" color="primary" :loading="agrLoading" @click="askAgr()" /></template></q-input>
        <div class="row q-gutter-sm q-mt-md"><q-btn outline no-caps size="sm" label="Resumen" @click="useExample('resumen')" /><q-btn outline no-caps size="sm" label="Abrir clientes" @click="useExample('abrir clientes')" /><q-btn outline no-caps size="sm" label="Crear cliente" @click="useExample('crear cliente')" /><q-btn outline no-caps size="sm" label="Crear solicitud" @click="useExample('crear solicitud')" /><q-btn outline no-caps size="sm" label="Pagos vencidos" @click="useExample('pagos vencidos')" /><q-btn outline no-caps size="sm" label="Soportes abiertos" @click="useExample('soportes abiertos')" /></div>
      </q-card-section>

      <q-card-section v-if="agrResponse" class="q-pt-none"><div class="agr-response"><div class="text-caption text-grey-6 q-mb-xs">AGR · {{ pretty(agrResponse.intent) }}</div><div class="text-body1">{{ agrResponse.message }}</div>
        <q-form v-if="agrResponse.intent === 'create_client'" class="q-mt-md" @submit.prevent="confirmCreateClient">
          <div class="text-subtitle2 text-weight-bold q-mb-md">Completa los datos del cliente</div>
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-md-6"><q-input v-model="agrClientForm.nombre" outlined dense label="Nombre completo *" /></div>
            <div class="col-12 col-md-3"><q-input v-model="agrClientForm.telefono" outlined dense label="Teléfono" /></div>
            <div class="col-12 col-md-3"><q-input v-model="agrClientForm.whatsapp" outlined dense label="WhatsApp" /></div>
            <div class="col-12 col-md-6"><q-input v-model="agrClientForm.correo" outlined dense type="email" label="Correo" /></div>
            <div class="col-12 col-md-3"><q-input v-model="agrClientForm.ciudad" outlined dense label="Ciudad" /></div>
            <div class="col-12 col-md-3"><q-input v-model="agrClientForm.direccion" outlined dense label="Dirección" /></div>
            <div class="col-12"><q-input v-model="agrClientForm.observaciones" outlined dense type="textarea" autogrow label="Observaciones" /></div>
          </div>
          <div class="row items-center q-gutter-sm q-mt-md"><q-badge color="orange" outline label="CONFIRMACIÓN REQUERIDA" /><q-space /><q-btn flat no-caps label="Cancelar" @click="agrResponse = null" /><q-btn color="primary" unelevated no-caps icon="person_add" label="Confirmar registro" type="submit" :loading="agrCreateLoading" :disable="!agrClientForm.nombre.trim()" /></div>
        </q-form>

        <div v-if="agrResponse.intent === 'create_client_success' && agrResponse.data?.client" class="q-mt-md"><q-card flat bordered><q-card-section><div class="text-subtitle2 text-weight-bold">Cliente creado correctamente</div><div class="q-mt-sm">{{ agrResponse.data.client.nombre }}</div><div class="text-caption text-grey-6">ID #{{ agrResponse.data.client.id }} · {{ agrResponse.data.client.telefono || 'Sin teléfono' }}</div></q-card-section></q-card></div>

        <div v-if="agrResponse.data?.clients !== undefined" class="row q-col-gutter-sm q-mt-md"><div v-for="item in [{key:'clients',label:'Clientes'},{key:'companies',label:'Empresas'},{key:'requests',label:'Solicitudes'},{key:'projects',label:'Proyectos'},{key:'payments',label:'Pagos'},{key:'support',label:'Soportes'}]" :key="item.key" class="col-6 col-sm-4 col-md-2"><q-card flat bordered class="summary-chip"><q-card-section class="text-center q-pa-sm"><div class="text-h6 text-weight-bold">{{ agrResponse.data[item.key] ?? 0 }}</div><div class="text-caption text-grey-6">{{ item.label }}</div></q-card-section></q-card></div></div>
        <q-list v-if="agrResponse.intent === 'search_client' && agrResponse.data?.results?.length" separator class="q-mt-md rounded-borders"><q-item v-for="client in agrResponse.data.results" :key="client.id"><q-item-section><q-item-label class="text-weight-bold">{{ client.nombre }}</q-item-label><q-item-label caption>{{ client.telefono || 'Sin teléfono' }} · {{ client.correo || 'Sin correo' }}</q-item-label></q-item-section><q-item-section side><q-badge :label="client.estado || 'sin estado'" /></q-item-section></q-item></q-list>
        <q-list v-if="agrResponse.intent === 'search_company' && agrResponse.data?.results?.length" separator class="q-mt-md rounded-borders"><q-item v-for="company in agrResponse.data.results" :key="company.id"><q-item-section avatar><q-avatar color="primary" text-color="white" icon="business" /></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{ company.nombre_comercial }}</q-item-label><q-item-label caption>{{ company.codigo || 'Sin código' }} · {{ company.ciudad || 'Sin ciudad' }} · {{ company.telefono || 'Sin teléfono' }}</q-item-label></q-item-section><q-item-section side><q-badge :label="company.estado || 'sin estado'" /></q-item-section></q-item></q-list>
        <div v-if="agrResponse.data?.action?.type === 'navigate'" class="q-mt-md"><q-btn color="primary" unelevated no-caps icon="open_in_new" :label="agrResponse.data.action.label || 'Abrir'" @click="executeAgrAction" /></div>
        <div v-if="agrResponse.data?.commands?.length" class="q-mt-md"><div class="text-caption text-grey-6 q-mb-sm">Comandos disponibles</div><div class="row q-gutter-xs"><q-chip v-for="command in agrResponse.data.commands" :key="command" dense>{{ command }}</q-chip></div></div>
      </div></q-card-section>
    </q-card>

    <div class="row q-col-gutter-lg q-mt-sm"><div class="col-12 col-lg-6"><q-card flat class="viti-card full-height"><q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Necesitan atención</div><div class="text-caption text-grey-6">Entregas, vencimientos y suspensiones detectadas por VITI.</div></div><q-space /><q-btn flat dense no-caps color="primary" label="Centro SaaS" to="/saas" /></q-card-section><q-separator /><q-list v-if="data.requieren_atencion?.length" separator><q-item v-for="row in data.requieren_atencion" :key="row.app.id" clickable to="/saas"><q-item-section avatar><q-avatar color="orange-1" text-color="orange-9" :icon="row.ciclo.estado === 'lista_entrega' ? 'key' : row.ciclo.estado === 'suspendida' ? 'block' : 'schedule'" /></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{ row.app.nombre }}</q-item-label><q-item-label caption>{{ row.app.empresa?.nombre_comercial }} · {{ row.ciclo.mensaje }}</q-item-label></q-item-section><q-item-section side><q-badge :color="row.ciclo.estado === 'suspendida' ? 'negative' : 'orange'">{{ pretty(row.ciclo.estado) }}</q-badge></q-item-section></q-item></q-list><div v-else class="empty-state"><q-icon name="task_alt" size="46px" /><div class="q-mt-sm">No hay incidencias SaaS pendientes.</div></div></q-card></div>
      <div class="col-12 col-lg-6"><q-card flat class="viti-card"><q-card-section><div class="text-h6 text-weight-bold">Operación de hoy</div><div class="text-caption text-grey-6">Lo que todavía requiere trabajo humano, ese componente que insiste en seguir siendo necesario.</div></q-card-section><q-separator /><q-list><q-item clickable to="/solicitudes"><q-item-section avatar><q-avatar color="orange-1" text-color="orange-8" icon="assignment" /></q-item-section><q-item-section>Solicitudes activas</q-item-section><q-item-section side><strong>{{ data.resumen.solicitudes_activas || 0 }}</strong></q-item-section></q-item><q-item clickable to="/proyectos"><q-item-section avatar><q-avatar color="purple-1" text-color="purple-8" icon="account_tree" /></q-item-section><q-item-section>Proyectos activos</q-item-section><q-item-section side><strong>{{ data.resumen.proyectos_activos || 0 }}</strong></q-item-section></q-item><q-item clickable to="/mantenimientos"><q-item-section avatar><q-avatar color="red-1" text-color="red-8" icon="support_agent" /></q-item-section><q-item-section>Soportes abiertos</q-item-section><q-item-section side><strong>{{ data.resumen.mantenimientos_abiertos || 0 }}</strong></q-item-section></q-item><q-item clickable to="/aplicaciones"><q-item-section avatar><q-avatar color="teal-1" text-color="teal-8" icon="key" /></q-item-section><q-item-section>Pendientes de entrega</q-item-section><q-item-section side><strong>{{ data.resumen.aplicaciones_pendientes_entrega || 0 }}</strong></q-item-section></q-item></q-list></q-card></div></div>
  </q-page>
</template>

<style scoped>
.action-card{height:100%;transition:transform .15s ease,box-shadow .15s ease}.action-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(12,35,64,.08)}
.agr-card{overflow:hidden}.agr-response{border-radius:16px;background:rgba(25,118,210,.05);padding:16px}.summary-chip{height:100%}
</style>
