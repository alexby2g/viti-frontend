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
    <q-card-section v-if="loading" class="row items-center q-gutter-sm"><q-spinner color="primary" /><span>AGR está evaluando el estado de VITI…</span></q-card-section>
    <q-card-section v-else-if="error" class="text-negative">{{ error }}</q-card-section>
    <template v-else>
      <q-card-section class="row q-col-gutter-md">
        <div v-for="metric in metrics" :key="metric.key" class="col-6 col-sm-3"><div class="metric-card"><div class="text-caption text-grey-7">{{ metric.label }}</div><div class="text-h5 text-weight-bold">{{ metric.value }}</div></div></div>
      </q-card-section>

      <q-card-section class="system-health-card">
        <div class="row items-center q-col-gutter-md">
          <div class="col-auto"><q-avatar :color="systemHealthColor" text-color="white" :icon="systemHealthIcon" /></div>
          <div class="col"><div class="text-subtitle1 text-weight-medium">Salud técnica del sistema</div><div class="text-caption text-grey-7">{{ systemHealthMessage }}</div></div>
          <div class="col-auto"><q-badge outline :color="systemHealthColor" :label="systemHealthLabel" /></div>
        </div>
        <q-list v-if="anomalies.length" separator class="q-mt-sm">
          <q-item v-for="item in anomalies" :key="item.key">
            <q-item-section avatar><q-icon :name="item.severity === 'critical' ? 'error' : 'warning'" :color="item.severity === 'critical' ? 'negative' : 'warning'" /></q-item-section>
            <q-item-section><q-item-label>{{ item.message }}</q-item-label></q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-if="recommendations.length">
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Siguientes pasos detectados</div>
        <q-list separator>
          <q-item v-for="item in recommendations" :key="item.key">
            <q-item-section avatar><q-icon name="auto_awesome" :color="item.severity === 'high' ? 'negative' : 'warning'" /></q-item-section>
            <q-item-section><q-item-label>{{ item.title }}</q-item-label><q-item-label caption>{{ item.message }}</q-item-label></q-item-section>
            <q-item-section side><q-btn flat dense label="Revisar" @click="$router.push(item.route)" /></q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-if="priorities.length">
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Prioridades detectadas</div>
        <q-list separator>
          <q-item v-for="item in priorities" :key="item.key">
            <q-item-section avatar><q-icon :name="item.severity === 'high' ? 'priority_high' : 'visibility'" :color="item.severity === 'high' ? 'negative' : 'warning'" /></q-item-section>
            <q-item-section><q-item-label>{{ item.title }}</q-item-label><q-item-label caption>{{ item.message }}</q-item-label></q-item-section>
            <q-item-section side><q-btn flat dense label="Revisar" @click="$router.push(item.route)" /></q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-if="activity.length">
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Actividad reciente</div>
        <q-list separator>
          <q-item v-for="item in activity" :key="item.id">
            <q-item-section avatar><q-avatar size="32px" :color="activityColor(item.type)" text-color="white" :icon="activityIcon(item.type)" /></q-item-section>
            <q-item-section><q-item-label>{{ item.title }}</q-item-label><q-item-label caption>{{ item.message }}</q-item-label></q-item-section>
            <q-item-section side><span class="text-caption text-grey-6">{{ formatDate(item.at) }}</span></q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-if="!priorities.length && !recommendations.length && !anomalies.length" class="text-grey-7">AGR no detectó incidencias, procesos detenidos ni anomalías técnicas con la información disponible.</q-card-section>
      <q-card-actions align="between"><div class="text-caption text-grey-6">{{ message }}</div><q-btn outline color="primary" icon="refresh" label="Revisar ahora" :loading="refreshing" @click="refresh" /></q-card-actions>
    </template>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { api } from '../boot/axios'

const props = defineProps({ dashboardData: { type: Object, default: () => ({}) } })
const loading = ref(false)
const refreshing = ref(false)
const error = ref('')
const agrSnapshot = ref(props.dashboardData?.agr_autopilot || null)
const activity = ref(props.dashboardData?.agr_activity || [])

const snapshot = computed(() => agrSnapshot.value || {})
const data = computed(() => snapshot.value.metrics || {})
const systemHealth = computed(() => snapshot.value.system_health || {})
const anomalies = computed(() => systemHealth.value.anomalies || [])
const metrics = computed(() => [
  { key: 'clients', label: 'Clientes', value: data.value.clients ?? 0 },
  { key: 'companies', label: 'Empresas activas', value: data.value.companies ?? 0 },
  { key: 'requests', label: 'Solicitudes', value: data.value.requests_pending ?? 0 },
  { key: 'support', label: 'Soportes abiertos', value: data.value.support_open ?? 0 }
])
const priorities = computed(() => snapshot.value.priorities || [])
const recommendations = computed(() => snapshot.value.workflow_recommendations || [])
const health = computed(() => snapshot.value.health || 'stable')
const healthLabel = computed(() => ({ stable: 'Estable', watch: 'Vigilar', attention: 'Atención' }[health.value] || 'Estable'))
const healthColor = computed(() => ({ stable: 'positive', watch: 'warning', attention: 'negative' }[health.value] || 'positive'))
const systemHealthLabel = computed(() => ({ healthy: 'Salud OK', warning: 'Requiere revisión', critical: 'Crítico' }[systemHealth.value.status] || 'Sin datos'))
const systemHealthColor = computed(() => ({ healthy: 'positive', warning: 'warning', critical: 'negative' }[systemHealth.value.status] || 'grey-7'))
const systemHealthIcon = computed(() => ({ healthy: 'check_circle', warning: 'warning', critical: 'error' }[systemHealth.value.status] || 'help'))
const systemHealthMessage = computed(() => {
  const checks = systemHealth.value.checks || []
  return checks.length ? checks.map(check => check.message).join(' ') : 'AGR todavía no tiene una revisión técnica disponible.'
})
const message = computed(() => snapshot.value.message || 'AGR mantiene el sistema bajo observación local.')

function activityIcon(type) { return ({ autopilot_review: 'auto_awesome', priority_detected: 'priority_high', workflow_recommendation: 'route' }[type] || 'history') }
function activityColor(type) { return ({ autopilot_review: 'primary', priority_detected: 'negative', workflow_recommendation: 'warning' }[type] || 'grey-7') }
function formatDate(value) { try { return new Date(value).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) } catch { return value || '' } }

async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  error.value = ''
  try {
    const response = await api.get('/dashboard', { params: { agr_autopilot: true } })
    agrSnapshot.value = response.data?.agr_autopilot || null
    activity.value = response.data?.agr_activity || []
  } catch (err) {
    error.value = err?.response?.data?.message || 'AGR no pudo actualizar su análisis.'
  } finally {
    refreshing.value = false
  }
}
</script>

<style scoped>
.agr-autopilot-panel { border-radius: 20px; }
.metric-card { min-height: 74px; padding: 12px; border-radius: 14px; background: rgba(0, 0, 0, .03); }
.system-health-card { border-radius: 16px; background: rgba(25, 118, 210, .04); }
</style>
