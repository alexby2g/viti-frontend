<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const loading = ref(true)
const error = ref('')
const monitor = ref(null)
const summary = ref({})
const lastChecked = ref(null)
let timer = null

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-BO')
}

function statusColor(status) {
  return status === 'healthy' ? 'positive' : status === 'attention' ? 'warning' : 'negative'
}

function statusLabel(status) {
  return status === 'healthy' ? 'OPERATIVO' : status === 'attention' ? 'ATENCIÓN' : 'CRÍTICO'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [healthResponse, dashboardResponse] = await Promise.all([
      api.get('/monitor/health'),
      api.get('/dashboard'),
    ])
    monitor.value = healthResponse.data?.monitor || healthResponse.data
    summary.value = dashboardResponse.data?.resumen || {}
    lastChecked.value = new Date().toISOString()
  } catch (e) {
    error.value = e?.response?.data?.message || 'No se pudo completar el monitoreo.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  timer = window.setInterval(load, 60000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <q-page class="viti-page">
    <q-inner-loading :showing="loading" />

    <PageHeader
      eyebrow="Operaciones"
      title="Centro de Monitoreo"
      subtitle="Salud del núcleo VITI y señales operativas del sistema."
    >
      <q-btn
        color="primary"
        unelevated
        no-caps
        icon="refresh"
        label="Actualizar"
        :loading="loading"
        @click="load"
      />
    </PageHeader>

    <q-banner v-if="error" rounded class="bg-red-1 text-red-9 q-mb-lg">
      <template #avatar><q-icon name="warning" /></template>
      {{ error }}
    </q-banner>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-lg-8">
        <q-card flat class="viti-card">
          <q-card-section>
            <div class="row items-center no-wrap">
              <div>
                <div class="text-overline">Estado general</div>
                <div class="text-h4 text-weight-bold">
                  {{ statusLabel(monitor?.status || 'attention') }}
                </div>
              </div>
              <q-space />
              <q-badge
                rounded
                :color="statusColor(monitor?.status || 'attention')"
                :label="statusLabel(monitor?.status || 'attention')"
                class="q-pa-sm"
              />
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="row q-col-gutter-md">
              <div
                v-for="check in (monitor?.checks || [])"
                :key="check.key"
                class="col-12 col-sm-6"
              >
                <q-card flat bordered class="check-card">
                  <q-card-section>
                    <div class="row items-center no-wrap">
                      <q-avatar
                        size="42px"
                        :color="check.ok ? 'positive' : 'negative'"
                        text-color="white"
                        :icon="check.ok ? 'check' : 'close'"
                      />
                      <div class="q-ml-md">
                        <div class="text-subtitle1 text-weight-bold">{{ check.name }}</div>
                        <div class="text-caption text-grey-6">{{ check.message }}</div>
                      </div>
                      <q-space />
                      <div v-if="check.latency_ms != null" class="text-caption text-grey-7">
                        {{ check.latency_ms }} ms
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-4">
        <q-card flat class="viti-card full-height">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Actividad operativa</div>
            <div class="text-caption text-grey-6">Conteos actuales del panel VITI.</div>
          </q-card-section>
          <q-separator />
          <q-list>
            <q-item><q-item-section>Proyectos activos</q-item-section><q-item-section side><strong>{{ summary.proyectos_activos || 0 }}</strong></q-item-section></q-item>
            <q-item><q-item-section>Aplicaciones activas</q-item-section><q-item-section side><strong>{{ summary.aplicaciones_activas || 0 }}</strong></q-item-section></q-item>
            <q-item><q-item-section>Soportes abiertos</q-item-section><q-item-section side><strong>{{ summary.mantenimientos_abiertos || 0 }}</strong></q-item-section></q-item>
            <q-item><q-item-section>Solicitudes activas</q-item-section><q-item-section side><strong>{{ summary.solicitudes_activas || 0 }}</strong></q-item-section></q-item>
          </q-list>
        </q-card>
      </div>
    </div>

    <q-card flat class="viti-card q-mt-lg">
      <q-card-section class="row items-center">
        <div>
          <div class="text-h6 text-weight-bold">Control de plataforma</div>
          <div class="text-caption text-grey-6">El monitor se actualiza automáticamente cada minuto mientras esta pantalla está abierta.</div>
        </div>
        <q-space />
        <div class="text-caption text-grey-7">Último chequeo: {{ formatDate(lastChecked) }}</div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-6">API</div>
                <div class="text-subtitle1 text-weight-bold">VITI Core</div>
                <q-badge color="positive" outline label="Protegida" class="q-mt-sm" />
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-md-4">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-6">Autenticación</div>
                <div class="text-subtitle1 text-weight-bold">Sanctum</div>
                <q-badge color="positive" outline label="Activa" class="q-mt-sm" />
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-md-4">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-6">Acceso</div>
                <div class="text-subtitle1 text-weight-bold">Administrador</div>
                <q-badge color="primary" outline label="Restringido" class="q-mt-sm" />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.check-card { height: 100%; }
</style>
