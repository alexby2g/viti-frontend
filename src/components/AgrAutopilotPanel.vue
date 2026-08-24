<template>
  <q-card flat bordered class="agr-autopilot-panel">
    <q-card-section class="row items-center justify-between">
      <div>
        <div class="text-overline">AGR CORE</div>
        <div class="text-h6">Autopilot</div>
        <div class="text-caption text-grey-7">Supervisión local segura de VITI</div>
      </div>
      <q-chip :color="healthColor" text-color="white" dense>
        {{ healthLabel }}
      </q-chip>
    </q-card-section>

    <q-separator />

    <q-card-section v-if="loading" class="row items-center q-gutter-sm">
      <q-spinner color="primary" />
      <span>AGR está revisando VITI…</span>
    </q-card-section>

    <q-card-section v-else-if="error" class="text-negative">
      {{ error }}
    </q-card-section>

    <template v-else-if="snapshot">
      <q-card-section class="row q-col-gutter-md">
        <div v-for="metric in metricCards" :key="metric.key" class="col-6 col-sm-3">
          <div class="metric-card">
            <div class="text-caption text-grey-7">{{ metric.label }}</div>
            <div class="text-h5 text-weight-bold">{{ metric.value }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section v-if="snapshot.priorities?.length">
        <div class="text-subtitle1 text-weight-medium q-mb-sm">AGR recomienda revisar</div>
        <q-list separator>
          <q-item v-for="item in snapshot.priorities" :key="item.key">
            <q-item-section avatar>
              <q-icon :name="item.severity === 'high' ? 'priority_high' : 'visibility'" :color="item.severity === 'high' ? 'negative' : 'warning'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ item.title }}</q-item-label>
              <q-item-label caption>{{ item.message }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat dense label="Revisar" @click="openRoute(item.route)" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-else class="text-grey-7">
        AGR no detectó incidencias prioritarias en su última revisión.
      </q-card-section>

      <q-card-actions align="between">
        <div class="text-caption text-grey-6">
          Última revisión: {{ formattedAt }} · Modo {{ snapshot.mode }}
        </div>
        <q-btn outline color="primary" icon="refresh" label="Revisar ahora" :loading="refreshing" @click="runNow" />
      </q-card-actions>
    </template>

    <q-card-section v-else class="text-grey-7">
      AGR todavía no tiene una revisión registrada.
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from 'src/boot/axios'

const router = useRouter()
const snapshot = ref(null)
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')

const healthLabel = computed(() => {
  if (!snapshot.value) return 'Sin datos'
  return ({ stable: 'Estable', watch: 'Vigilar', attention: 'Atención' })[snapshot.value.health] || 'En observación'
})

const healthColor = computed(() => {
  if (!snapshot.value) return 'grey'
  return ({ stable: 'positive', watch: 'warning', attention: 'negative' })[snapshot.value.health] || 'info'
})

const metricCards = computed(() => {
  const m = snapshot.value?.metrics || {}
  return [
    { key: 'clients', label: 'Clientes', value: m.clients ?? 0 },
    { key: 'projects', label: 'Proyectos activos', value: m.projects_active ?? 0 },
    { key: 'requests', label: 'Solicitudes', value: m.requests_pending ?? 0 },
    { key: 'support', label: 'Soportes abiertos', value: m.support_open ?? 0 },
  ]
})

const formattedAt = computed(() => {
  if (!snapshot.value?.generated_at) return '—'
  return new Date(snapshot.value.generated_at).toLocaleString()
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await api.get('/v1/agr/autopilot')
    snapshot.value = response.data?.data || null
  } catch (err) {
    error.value = err?.response?.data?.message || 'No se pudo consultar AGR Autopilot.'
  } finally {
    loading.value = false
  }
}

async function runNow() {
  refreshing.value = true
  error.value = ''
  try {
    const response = await api.post('/v1/agr/autopilot/run')
    snapshot.value = response.data?.data || null
  } catch (err) {
    error.value = err?.response?.data?.message || 'AGR no pudo completar la revisión.'
  } finally {
    refreshing.value = false
  }
}

function openRoute(route) {
  if (route) router.push(route)
}

onMounted(load)
</script>

<style scoped>
.agr-autopilot-panel {
  border-radius: 20px;
}

.metric-card {
  min-height: 74px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.03);
}
</style>
