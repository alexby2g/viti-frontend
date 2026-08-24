<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const data = ref({ resumen: {}, solicitudes_recientes: [], proyectos_recientes: [], requieren_atencion: [] })
const loading = ref(true)
const agrMessage = ref('')
const agrLoading = ref(false)
const agrResponse = ref(null)

const cards = [
  { key: 'negocios_activos', label: 'Negocios activos', icon: 'business', color: 'blue', to: '/clientes' },
  { key: 'aplicaciones_activas', label: 'Apps activas', icon: 'apps', color: 'teal', to: '/saas' },
  { key: 'suscripciones_activas', label: 'Suscripciones activas', icon: 'autorenew', color: 'green', to: '/pagos' },
  { key: 'pagos_vencidos', label: 'Pagos con atención', icon: 'schedule', color: 'orange', to: '/pagos' }
]

function pretty(v) {
  return String(v || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function askAgr(message = agrMessage.value) {
  const text = String(message || '').trim()
  if (!text || agrLoading.value) return

  agrLoading.value = true
  agrResponse.value = null

  try {
    agrResponse.value = (await api.get('/dashboard', { params: { agr: text } })).data
  } catch (error) {
    agrResponse.value = {
      intent: 'error',
      message: error?.response?.data?.message || 'No pude comunicarme con AGR Assistant.'
    }
  } finally {
    agrLoading.value = false
  }
}

function useExample(text) {
  agrMessage.value = text
  askAgr(text)
}

onMounted(async () => {
  try {
    data.value = (await api.get('/dashboard')).data
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <q-page class="viti-page">
    <q-inner-loading :showing="loading" />

    <PageHeader
      eyebrow="SaaS"
      title="Panel VITI"
      subtitle="La plataforma en una mirada: negocios, aplicaciones, suscripciones y lo que requiere atención."
    >
      <q-btn color="primary" unelevated icon="person_add" label="Registrar cliente" no-caps to="/clientes?new=1" />
    </PageHeader>

    <div class="row q-col-gutter-md">
      <div v-for="card in cards" :key="card.key" class="col-12 col-sm-6 col-xl-3">
        <q-card flat class="viti-card action-card cursor-pointer" @click="$router.push(card.to)">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-avatar :color="`${card.color}-1`" :text-color="`${card.color}-8`" :icon="card.icon" size="50px" />
              <q-space />
              <q-icon name="arrow_forward" color="grey-5" />
            </div>
            <div class="stat-value q-mt-md">{{ data.resumen[card.key] || 0 }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat class="viti-card q-mt-lg agr-card">
      <q-card-section>
        <div class="row items-center q-col-gutter-md">
          <div class="col-auto">
            <q-avatar color="primary" text-color="white" icon="auto_awesome" size="52px" />
          </div>
          <div class="col">
            <div class="text-h6 text-weight-bold">AGR Assistant</div>
            <div class="text-caption text-grey-6">
              Asistente local de VITI. Esta primera versión funciona con reglas y datos reales del sistema, sin API externa.
            </div>
          </div>
          <div class="col-12 col-md-auto">
            <q-badge color="positive" outline label="LOCAL · SIN API" />
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-input
          v-model="agrMessage"
          outlined
          rounded
          dense
          placeholder="Escribe una orden para AGR..."
          @keyup.enter="askAgr()"
        >
          <template #prepend>
            <q-icon name="chat" />
          </template>
          <template #append>
            <q-btn
              round
              flat
              dense
              icon="send"
              color="primary"
              :loading="agrLoading"
              @click="askAgr()"
            />
          </template>
        </q-input>

        <div class="row q-gutter-sm q-mt-md">
          <q-btn outline no-caps size="sm" label="¿Cuántos clientes tengo?" @click="useExample('cuántos clientes tengo')" />
          <q-btn outline no-caps size="sm" label="Solicitudes pendientes" @click="useExample('solicitudes pendientes')" />
          <q-btn outline no-caps size="sm" label="Buscar cliente" @click="agrMessage = 'buscar cliente '" />
        </div>
      </q-card-section>

      <q-card-section v-if="agrResponse" class="q-pt-none">
        <div class="agr-response">
          <div class="text-caption text-grey-6 q-mb-xs">AGR</div>
          <div class="text-body1">{{ agrResponse.message }}</div>

          <q-list v-if="agrResponse.data?.results?.length" separator class="q-mt-md rounded-borders">
            <q-item v-for="client in agrResponse.data.results" :key="client.id">
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ client.nombre }}</q-item-label>
                <q-item-label caption>{{ client.telefono || 'Sin teléfono' }} · {{ client.correo || 'Sin correo' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :label="client.estado || 'sin estado'" />
              </q-item-section>
            </q-item>
          </q-list>

          <div v-if="agrResponse.data?.commands?.length" class="q-mt-md">
            <div class="text-caption text-grey-6 q-mb-sm">Comandos disponibles</div>
            <div class="row q-gutter-xs">
              <q-chip v-for="command in agrResponse.data.commands" :key="command" dense>{{ command }}</q-chip>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-lg q-mt-sm">
      <div class="col-12 col-lg-6">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center">
            <div>
              <div class="text-h6 text-weight-bold">Necesitan atención</div>
              <div class="text-caption text-grey-6">Entregas, vencimientos y suspensiones detectadas por VITI.</div>
            </div>
            <q-space />
            <q-btn flat dense no-caps color="primary" label="Centro SaaS" to="/saas" />
          </q-card-section>
          <q-separator />
          <q-list v-if="data.requieren_atencion?.length" separator>
            <q-item v-for="row in data.requieren_atencion" :key="row.app.id" clickable to="/saas">
              <q-item-section avatar>
                <q-avatar color="orange-1" text-color="orange-9" :icon="row.ciclo.estado === 'lista_entrega' ? 'key' : row.ciclo.estado === 'suspendida' ? 'block' : 'schedule'" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ row.app.nombre }}</q-item-label>
                <q-item-label caption>{{ row.app.empresa?.nombre_comercial }} · {{ row.ciclo.mensaje }}</q-item-label>
              </q-item-section>
              <q-item-section side><q-badge :color="row.ciclo.estado === 'suspendida' ? 'negative' : 'orange'">{{ pretty(row.ciclo.estado) }}</q-badge></q-item-section>
            </q-item>
          </q-list>
          <div v-else class="empty-state"><q-icon name="task_alt" size="46px" /><div class="q-mt-sm">No hay incidencias SaaS pendientes.</div></div>
        </q-card>
      </div>

      <div class="col-12 col-lg-6">
        <q-card flat class="viti-card">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Operación de hoy</div>
            <div class="text-caption text-grey-6">Lo que todavía requiere trabajo humano, ese componente que insiste en seguir siendo necesario.</div>
          </q-card-section>
          <q-separator />
          <q-list>
            <q-item clickable to="/solicitudes"><q-item-section avatar><q-avatar color="orange-1" text-color="orange-8" icon="assignment" /></q-item-section><q-item-section>Solicitudes activas</q-item-section><q-item-section side><strong>{{ data.resumen.solicitudes_activas || 0 }}</strong></q-item-section></q-item>
            <q-item clickable to="/proyectos"><q-item-section avatar><q-avatar color="purple-1" text-color="purple-8" icon="account_tree" /></q-item-section><q-item-section>Proyectos activos</q-item-section><q-item-section side><strong>{{ data.resumen.proyectos_activos || 0 }}</strong></q-item-section></q-item>
            <q-item clickable to="/mantenimientos"><q-item-section avatar><q-avatar color="red-1" text-color="red-8" icon="support_agent" /></q-item-section><q-item-section>Soportes abiertos</q-item-section><q-item-section side><strong>{{ data.resumen.mantenimientos_abiertos || 0 }}</strong></q-item-section></q-item>
            <q-item clickable to="/aplicaciones"><q-item-section avatar><q-avatar color="teal-1" text-color="teal-8" icon="key" /></q-item-section><q-item-section>Pendientes de entrega</q-item-section><q-item-section side><strong>{{ data.resumen.aplicaciones_pendientes_entrega || 0 }}</strong></q-item-section></q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.action-card{height:100%;transition:transform .15s ease,box-shadow .15s ease}
.action-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(12,35,64,.08)}
.agr-card{overflow:hidden}
.agr-response{border-radius:16px;background:rgba(25,118,210,.05);padding:16px}
</style>
