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

      <q-card-section class="watchdog-card">
        <div class="row items-center q-col-gutter-md">
          <div class="col-auto"><q-avatar :color="watchdogColor" text-color="white" :icon="watchdogIcon" /></div>
          <div class="col"><div class="text-subtitle1 text-weight-medium">AGR Watchdog</div><div class="text-caption text-grey-7">{{ watchdogMessage }}</div></div>
          <div class="col-auto"><q-badge outline :color="watchdogColor" :label="watchdogLabel" /></div>
        </div>
        <div class="row q-gutter-sm q-mt-sm text-caption text-grey-7">
          <span>Último heartbeat: {{ formatDate(watchdog.last_heartbeat) }}</span>
          <span>Intervalo: {{ watchdog.expected_interval_minutes ?? '—' }} min</span>
        </div>
      </q-card-section>

      <q-card-section class="system-health-card">
        <div class="row items-center q-col-gutter-md">
          <div class="col-auto"><q-avatar :color="systemHealthColor" text-color="white" :icon="systemHealthIcon" /></div>
          <div class="col"><div class="text-subtitle1 text-weight-medium">Salud técnica del sistema</div><div class="text-caption text-grey-7">{{ systemHealthMessage }}</div></div>
          <div class="col-auto"><q-badge outline :color="systemHealthColor" :label="systemHealthLabel" /></div>
        </div>
        <div class="row items-center q-mt-sm q-gutter-sm">
          <q-badge outline color="primary" :label="`Puntuación ${systemHealth.score ?? '—'}/100`" />
          <q-badge outline color="grey-7" :label="`${anomalies.length} anomalía(s)`" />
          <q-badge outline color="orange" :label="`${warnings.length} advertencia(s)`" />
        </div>
        <q-list v-if="anomalies.length" separator class="q-mt-sm">
          <q-item v-for="item in anomalies" :key="item.key"><q-item-section avatar><q-icon :name="item.severity === 'critical' ? 'error' : 'warning'" :color="item.severity === 'critical' ? 'negative' : 'warning'" /></q-item-section><q-item-section><q-item-label>{{ item.title }}</q-item-label><q-item-label caption>{{ item.message }}</q-item-label></q-item-section></q-item>
        </q-list>
        <q-list v-if="warnings.length" separator class="q-mt-sm">
          <q-item v-for="item in warnings" :key="item.key"><q-item-section avatar><q-icon name="visibility" color="warning" /></q-item-section><q-item-section><q-item-label>{{ item.title }}</q-item-label><q-item-label caption>{{ item.message }}</q-item-label></q-item-section></q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-if="incidents.length" class="incidents-card">
        <div class="row items-center q-mb-sm"><div><div class="text-subtitle1 text-weight-medium">Incidentes activos</div><div class="text-caption text-grey-7">AGR agrupa señales relacionadas y propone recuperaciones seguras.</div></div><q-space /><q-badge color="negative" :label="`${incidents.length}`" /></div>
        <q-list separator>
          <q-item v-for="incident in incidents" :key="incident.id" class="q-py-md">
            <q-item-section avatar><q-avatar :color="incident.severity === 'critical' ? 'negative' : 'orange'" text-color="white" icon="warning" /></q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ incident.id }} · {{ incident.title }}</q-item-label>
              <q-item-label caption>{{ incident.summary }}</q-item-label>
              <q-item-label caption class="q-mt-xs"><strong>Causa probable:</strong> {{ incident.probable_cause }}</q-item-label>
              <div class="row q-gutter-xs q-mt-sm" v-if="recoveryFor(incident.id).length">
                <q-btn v-for="plan in recoveryFor(incident.id)" :key="plan.action" dense flat no-caps color="primary" icon="build" :label="plan.label" :loading="recoveryLoading === `${incident.id}:${plan.action}`" @click="executeRecovery(incident, plan)" />
              </div>
            </q-item-section>
            <q-item-section side><q-badge outline :color="incident.severity === 'critical' ? 'negative' : 'warning'" :label="prettySeverity(incident.severity)" /></q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-if="recommendations.length">
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Siguientes pasos detectados</div>
        <q-list separator><q-item v-for="item in recommendations" :key="item.key"><q-item-section avatar><q-icon name="auto_awesome" :color="item.severity === 'high' ? 'negative' : 'warning'" /></q-item-section><q-item-section><q-item-label>{{ item.title }}</q-item-label><q-item-label caption>{{ item.message }}</q-item-label></q-item-section><q-item-section side><q-btn flat dense label="Revisar" @click="$router.push(item.route)" /></q-item-section></q-item></q-list>
      </q-card-section>

      <q-card-section v-if="priorities.length">
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Prioridades detectadas</div>
        <q-list separator><q-item v-for="item in priorities" :key="item.key"><q-item-section avatar><q-icon :name="item.severity === 'high' ? 'priority_high' : 'visibility'" :color="item.severity === 'high' ? 'negative' : 'warning'" /></q-item-section><q-item-section><q-item-label>{{ item.title }}</q-item-label><q-item-label caption>{{ item.message }}</q-item-label></q-item-section><q-item-section side><q-btn flat dense label="Revisar" @click="$router.push(item.route)" /></q-item-section></q-item></q-list>
      </q-card-section>

      <q-card-section v-if="activity.length">
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Actividad reciente</div>
        <q-list separator><q-item v-for="item in activity" :key="item.id"><q-item-section avatar><q-avatar size="32px" :color="activityColor(item.type)" text-color="white" :icon="activityIcon(item.type)" /></q-item-section><q-item-section><q-item-label>{{ item.title }}</q-item-label><q-item-label caption>{{ item.message }}</q-item-label></q-item-section><q-item-section side><span class="text-caption text-grey-6">{{ formatDate(item.at) }}</span></q-item-section></q-item></q-list>
      </q-card-section>

      <q-card-section v-if="!priorities.length && !recommendations.length && !incidents.length && !anomalies.length && !warnings.length" class="text-grey-7">AGR no detectó incidencias, procesos detenidos ni anomalías técnicas con la información disponible.</q-card-section>
      <q-card-actions align="between"><div class="text-caption text-grey-6">{{ message }}</div><div class="row q-gutter-sm"><q-btn flat color="primary" icon="health_and_safety" label="Ronda completa" :loading="guardLoading" @click="runGuard" /><q-btn outline color="primary" icon="refresh" label="Revisar ahora" :loading="refreshing" @click="refresh" /></div></q-card-actions>
    </template>
  </q-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { api } from '../boot/axios'

const props = defineProps({ dashboardData: { type: Object, default: () => ({}) } })
const loading = ref(false)
const refreshing = ref(false)
const guardLoading = ref(false)
const recoveryLoading = ref('')
const error = ref('')
const agrSnapshot = ref(props.dashboardData?.agr_autopilot || null)
const activity = ref(props.dashboardData?.agr_activity || [])
const guardSnapshot = ref(agrSnapshot.value?.system_guard || null)
const watchdog = ref(props.dashboardData?.agr_watchdog || agrSnapshot.value?.watchdog || {})

const snapshot = computed(() => agrSnapshot.value || {})
const data = computed(() => snapshot.value.metrics || {})
const systemHealth = computed(() => guardSnapshot.value || {})
const anomalies = computed(() => systemHealth.value.anomalies || [])
const warnings = computed(() => systemHealth.value.warnings || [])
const incidents = computed(() => snapshot.value.incidents || [])
const recoveryPlans = computed(() => snapshot.value.incident_recovery || [])
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
const watchdogLabel = computed(() => ({ healthy: 'Activo', warning: 'Retrasado', critical: 'Crítico', unknown: 'Sin heartbeat' }[watchdog.value.status] || 'Sin datos'))
const watchdogColor = computed(() => ({ healthy: 'positive', warning: 'warning', critical: 'negative', unknown: 'grey-7' }[watchdog.value.status] || 'grey-7'))
const watchdogIcon = computed(() => ({ healthy: 'favorite', warning: 'schedule', critical: 'heart_broken', unknown: 'help' }[watchdog.value.status] || 'help'))
const watchdogMessage = computed(() => watchdog.value.message || 'AGR todavía no tiene heartbeat registrado.')
const systemHealthLabel = computed(() => ({ healthy: 'Salud OK', attention: 'Requiere revisión', critical: 'Crítico' }[systemHealth.value.status] || 'Sin datos'))
const systemHealthColor = computed(() => ({ healthy: 'positive', attention: 'warning', critical: 'negative' }[systemHealth.value.status] || 'grey-7'))
const systemHealthIcon = computed(() => ({ healthy: 'check_circle', attention: 'warning', critical: 'error' }[systemHealth.value.status] || 'help'))
const systemHealthMessage = computed(() => systemHealth.value.summary || 'AGR todavía no tiene una ronda técnica disponible.')
const message = computed(() => snapshot.value.message || 'AGR mantiene el sistema bajo observación local.')

function recoveryFor(incidentId) { return recoveryPlans.value.find(item => item.incident_id === incidentId)?.plans || [] }
function prettySeverity(value) { return ({ critical: 'Crítico', high: 'Alto', medium: 'Medio' }[value] || value) }
function activityIcon(type) { return ({ autopilot_review: 'auto_awesome', priority_detected: 'priority_high', workflow_recommendation: 'route', system_guard_scan: 'health_and_safety', system_anomaly: 'bug_report', incident_detected: 'warning', recovery_action: 'build' }[type] || 'history') }
function activityColor(type) { return ({ autopilot_review: 'primary', priority_detected: 'negative', workflow_recommendation: 'warning', system_guard_scan: 'teal', system_anomaly: 'negative', incident_detected: 'deep-orange', recovery_action: 'positive' }[type] || 'grey-7') }
function formatDate(value) { if (!value) return '—'; try { return new Date(value).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) } catch { return value || '—' } }

async function executeRecovery(incident, plan) {
  const key = `${incident.id}:${plan.action}`
  if (recoveryLoading.value) return
  recoveryLoading.value = key
  error.value = ''
  try {
    const confirmed = window.confirm(`AGR propone: ${plan.label}.\n\n${plan.description}\n\n¿Quieres ejecutar esta recuperación segura?`)
    if (!confirmed) return
    const response = await api.get('/dashboard', { params: { agr_recovery_action: plan.action, incident_id: incident.id } })
    activity.value = response.data?.agr_activity || activity.value
    await refresh()
  } catch (err) {
    error.value = err?.response?.data?.message || 'AGR no pudo ejecutar la recuperación segura.'
  } finally { recoveryLoading.value = '' }
}

async function runGuard() {
  if (guardLoading.value) return
  guardLoading.value = true
  error.value = ''
  try {
    const response = await api.get('/dashboard', { params: { agr_guard: true } })
    guardSnapshot.value = response.data?.agr_guard || null
    activity.value = response.data?.agr_activity || []
    await refresh()
  } catch (err) {
    error.value = err?.response?.data?.message || 'AGR no pudo completar la ronda técnica.'
  } finally { guardLoading.value = false }
}

async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  error.value = ''
  try {
    const response = await api.get('/dashboard', { params: { agr_autopilot: true } })
    agrSnapshot.value = response.data?.agr_autopilot || null
    guardSnapshot.value = agrSnapshot.value?.system_guard || null
    watchdog.value = response.data?.agr_watchdog || agrSnapshot.value?.watchdog || {}
    activity.value = response.data?.agr_activity || []
  } catch (err) {
    error.value = err?.response?.data?.message || 'AGR no pudo actualizar su análisis.'
  } finally { refreshing.value = false }
}
</script>

<style scoped>
.agr-autopilot-panel { border-radius: 20px; }
.metric-card { min-height: 74px; padding: 12px; border-radius: 14px; background: rgba(0, 0, 0, .03); }
.system-health-card, .incidents-card, .watchdog-card { border-radius: 16px; background: rgba(25, 118, 210, .04); }
</style>
