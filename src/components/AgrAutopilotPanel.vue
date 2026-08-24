<template>
  <q-card flat bordered class="agr-autopilot-panel">
    <q-card-section class="row items-center justify-between">
      <div>
        <div class="text-overline">AGR CORE</div>
        <div class="text-h6">Autopilot</div>
        <div class="text-caption text-grey-7">Supervisión inteligente local de VITI</div>
      </div>
      <q-chip :color="healthColor" text-color="white" dense>{{ healthLabel }}</q-chip>
    </q-card-section>
    <q-separator />

    <q-card-section v-if="loading" class="row items-center q-gutter-sm">
      <q-spinner color="primary" />
      <span>AGR está evaluando el estado de VITI…</span>
    </q-card-section>

    <q-card-section v-else-if="error" class="text-negative">{{ error }}</q-card-section>

    <template v-else>
      <q-card-section class="row q-col-gutter-md">
        <div v-for="metric in metrics" :key="metric.key" class="col-6 col-sm-3">
          <div class="metric-card">
            <div class="text-caption text-grey-7">{{ metric.label }}</div>
            <div class="text-h5 text-weight-bold">{{ metric.value }}</div>
          </div>
        </div>
      </q-card-section>

      <q-card-section v-if="priorities.length">
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Prioridades detectadas</div>
        <q-list separator>
          <q-item v-for="item in priorities" :key="item.key">
            <q-item-section avatar>
              <q-icon :name="item.severity === 'high' ? 'priority_high' : 'visibility'" :color="item.severity === 'high' ? 'negative' : 'warning'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ item.title }}</q-item-label>
              <q-item-label caption>{{ item.message }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat dense label="Revisar" @click="$router.push(item.route)" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-else class="text-grey-7">
        AGR no detectó una prioridad crítica con la información disponible.
      </q-card-section>

      <q-card-actions align="between">
        <div class="text-caption text-grey-6">{{ message }}</div>
        <q-btn outline color="primary" icon="refresh" label="Revisar ahora" :loading="refreshing" @click="refresh" />
      </q-card-actions>
    </template>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { api } from '../boot/axios'

autoExpose ?? undefined

const props = defineProps({
  dashboardData: { type: Object, default: () => ({}) }
})

const loading = ref(false)
const refreshing = ref(false)
const error = ref('')
const agrSnapshot = ref(null)

const merged = computed(() => agrSnapshot.value?.data || props.dashboardData?.resumen || {})

const metrics = computed(() => [
  { key: 'clients', label: 'Clientes', value: agrSnapshot.value?.data?.clients ?? 0 },
  { key: 'companies', label: 'Empresas activas', value: agrSnapshot.value?.data?.companies ?? 0 },
  { key: 'requests', label: 'Solicitudes', value: agrSnapshot.value?.data?.requests ?? merged.value.solicitudes_activas ?? 0 },
  { key: 'support', label: 'Soportes abiertos', value: agrSnapshot.value?.data?.support ?? merged.value.mantenimientos_abiertos ?? 0 }
])

const priorities = computed(() => {
  const m = agrSnapshot.value?.data || {}
  const result = []
  if ((m.requests ?? merged.value.solicitudes_activas ?? 0) > 0) result.push({ key: 'requests', severity: (m.requests ?? 0) >= 5 ? 'high' : 'medium', title: 'Solicitudes pendientes', message: `${m.requests ?? merged.value.solicitudes_activas} solicitud(es) requieren revisión.`, route: '/solicitudes' })
  if ((m.payments ?? merged.value.pagos_vencidos ?? 0) > 0) result.push({ key: 'payments', severity: 'high', title: 'Situaciones de pago', message: `${m.payments ?? merged.value.pagos_vencidos} cuenta(s) requieren atención.`, route: '/pagos' })
  if ((m.support ?? merged.value.mantenimientos_abiertos ?? 0) > 0) result.push({ key: 'support', severity: (m.support ?? 0) >= 5 ? 'high' : 'medium', title: 'Soporte abierto', message: `${m.support ?? merged.value.mantenimientos_abiertos} atención(es) técnica(s) siguen abiertas.`, route: '/mantenimientos' })
  return result
})

const health = computed(() => priorities.value.some(item => item.severity === 'high') ? 'attention' : priorities.value.length ? 'watch' : 'stable')
const healthLabel = computed(() => ({ stable: 'Estable', watch: 'Vigilar', attention: 'Atención' }[health.value]))
const healthColor = computed(() => ({ stable: 'positive', watch: 'warning', attention: 'negative' }[health.value]))
const message = computed(() => health.value === 'stable' ? 'AGR mantiene el sistema bajo observación local.' : `AGR encontró ${priorities.value.length} punto(s) que conviene revisar.`)

async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  error.value = ''
  try {
    const response = await api.get('/dashboard', { params: { agr: 'resumen' } })
    agrSnapshot.value = response.data
  } catch (err) {
    error.value = err?.response?.data?.message || 'AGR no pudo actualizar su análisis.'
  } finally {
    refreshing.value = false
  }
}

refresh()
</script>

<style scoped>
.agr-autopilot-panel { border-radius: 20px; }
.metric-card { min-height: 74px; padding: 12px; border-radius: 14px; background: rgba(0, 0, 0, .03); }
</style>
