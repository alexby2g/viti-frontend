<script setup>
import { computed } from 'vue'

const props = defineProps({
  dashboardData: { type: Object, default: () => ({}) },
})

const data = computed(() => props.dashboardData || {})
const summary = computed(() => data.value.resumen || {})
const snapshot = computed(() => data.value.agr_autopilot || {})
const guard = computed(() => snapshot.value.system_guard || {})

const priorities = computed(() => (snapshot.value.priorities || []).slice(0, 4))
const recommendations = computed(() => (snapshot.value.workflow_recommendations || []).slice(0, 3))
const attention = computed(() => (data.value.requieren_atencion || []).slice(0, 4))

const health = computed(() => snapshot.value.health || (summary.value.pagos_vencidos > 0 ? 'attention' : 'stable'))
const healthLabel = computed(() => ({
  stable: 'Operación estable',
  watch: 'Requiere vigilancia',
  attention: 'Requiere atención',
}[health.value] || 'Estado operativo'))
const healthColor = computed(() => ({
  stable: 'positive',
  watch: 'warning',
  attention: 'negative',
}[health.value] || 'primary'))

const priorityCount = computed(() => priorities.value.length + recommendations.value.length)

const primaryAttention = computed(() => {
  if (priorities.value[0]) {
    return {
      title: priorities.value[0].title,
      message: priorities.value[0].message,
      route: priorities.value[0].route || '/dashboard',
      icon: priorities.value[0].severity === 'high' || priorities.value[0].severity === 'critical' ? 'priority_high' : 'visibility',
      badge: priorities.value[0].severity === 'critical' ? 'Crítica' : priorities.value[0].severity === 'high' ? 'Alta' : 'Revisar',
    }
  }
  if (summary.value.pagos_vencidos > 0) {
    return { title: 'Pagos con atención', message: `${summary.value.pagos_vencidos} suscripción(es) requieren revisión.`, route: '/pagos', icon: 'schedule', badge: 'Pago' }
  }
  if (summary.value.solicitudes_activas > 0) {
    return { title: 'Solicitudes activas', message: `${summary.value.solicitudes_activas} solicitud(es) siguen en operación.`, route: '/solicitudes', icon: 'assignment', badge: 'Operación' }
  }
  return { title: 'Todo bajo control', message: 'No hay una prioridad crítica visible en este momento.', route: '/monitor', icon: 'check_circle', badge: 'OK' }
})

const quickLinks = [
  { label: 'Solicitudes', icon: 'assignment', to: '/solicitudes' },
  { label: 'Proyectos', icon: 'account_tree', to: '/proyectos' },
  { label: 'Empresas', icon: 'business', to: '/empresas' },
  { label: 'Soporte', icon: 'support_agent', to: '/mantenimientos' },
]

function prettyStatus(status) {
  return ({ lista_entrega: 'Lista para entrega', gracia: 'En gracia', suspendida: 'Suspendida' }[status] || status || 'Revisar')
}
</script>

<template>
  <q-card flat class="viti-card command-center-panel">
    <q-card-section class="command-hero">
      <div class="row items-start q-col-gutter-lg">
        <div class="col-12 col-lg-7">
          <div class="section-label">CENTRO DE CONTROL</div>
          <div class="text-h4 text-weight-bold q-mt-xs">VITI Command Center</div>
          <div class="text-body1 command-copy q-mt-sm">
            Una vista operativa para saber qué está pasando, qué requiere decisión y dónde actuar primero.
          </div>
          <div class="row items-center q-gutter-sm q-mt-md">
            <q-chip dense :color="healthColor" text-color="white" icon="monitor_heart">{{ healthLabel }}</q-chip>
            <q-chip dense outline color="grey-7" icon="smart_toy">AGR conectado</q-chip>
            <q-chip dense outline color="grey-7" icon="shield">Guard {{ guard.score ?? '—' }}/100</q-chip>
          </div>
        </div>

        <div class="col-12 col-lg-5">
          <div class="focus-card">
            <div class="row items-center no-wrap">
              <q-avatar :color="healthColor" text-color="white" :icon="primaryAttention.icon" size="46px" />
              <div class="col q-ml-md">
                <div class="text-overline">PRIORIDAD</div>
                <div class="text-subtitle1 text-weight-bold ellipsis">{{ primaryAttention.title }}</div>
                <div class="text-caption command-muted">{{ primaryAttention.message }}</div>
              </div>
              <q-badge outline :color="healthColor" :label="primaryAttention.badge" />
            </div>
            <q-btn class="q-mt-md" flat color="primary" no-caps icon="arrow_forward" label="Abrir prioridad" :to="primaryAttention.route" />
          </div>
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div class="row q-col-gutter-md">
        <div class="col-6 col-md-3">
          <div class="command-metric"><div class="text-caption command-muted">Negocios</div><div class="metric-number">{{ summary.negocios_activos || 0 }}</div><div class="text-caption">Activos</div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="command-metric"><div class="text-caption command-muted">Solicitudes</div><div class="metric-number">{{ summary.solicitudes_activas || 0 }}</div><div class="text-caption">En operación</div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="command-metric"><div class="text-caption command-muted">Proyectos</div><div class="metric-number">{{ summary.proyectos_activos || 0 }}</div><div class="text-caption">Activos</div></div>
        </div>
        <div class="col-6 col-md-3">
          <div class="command-metric"><div class="text-caption command-muted">Alertas</div><div class="metric-number" :class="priorityCount ? 'text-negative' : ''">{{ priorityCount }}</div><div class="text-caption">Para revisar</div></div>
        </div>
      </div>
    </q-card-section>

    <q-card-section>
      <div class="row items-center q-mb-sm">
        <div>
          <div class="text-subtitle1 text-weight-bold">Acceso operativo</div>
          <div class="text-caption command-muted">Entradas rápidas a los lugares donde normalmente hay trabajo pendiente.</div>
        </div>
        <q-space />
        <q-btn flat dense no-caps color="primary" icon="open_in_new" label="Monitor" to="/monitor" />
      </div>
      <div class="row q-col-gutter-sm">
        <div v-for="link in quickLinks" :key="link.to" class="col-6 col-md-3">
          <q-btn outline no-caps class="full-width quick-link" :icon="link.icon" :label="link.label" :to="link.to" />
        </div>
      </div>
    </q-card-section>

    <q-card-section v-if="priorities.length || recommendations.length">
      <div class="row q-col-gutter-lg">
        <div v-if="priorities.length" class="col-12 col-lg-6">
          <div class="text-subtitle1 text-weight-bold">Lo que requiere atención</div>
          <div class="text-caption command-muted q-mb-sm">AGR ya detectó estos puntos usando la información real de VITI.</div>
          <q-list separator>
            <q-item v-for="item in priorities" :key="item.key" clickable @click="$router.push(item.route || '/dashboard')">
              <q-item-section avatar><q-icon :name="item.severity === 'critical' || item.severity === 'high' ? 'priority_high' : 'visibility'" :color="item.severity === 'critical' || item.severity === 'high' ? 'negative' : 'warning'" /></q-item-section>
              <q-item-section><q-item-label class="text-weight-medium">{{ item.title }}</q-item-label><q-item-label caption>{{ item.message }}</q-item-label></q-item-section>
              <q-item-section side><q-icon name="chevron_right" color="grey-5" /></q-item-section>
            </q-item>
          </q-list>
        </div>

        <div v-if="recommendations.length" class="col-12 col-lg-6">
          <div class="text-subtitle1 text-weight-bold">Siguientes pasos</div>
          <div class="text-caption command-muted q-mb-sm">Recomendaciones que pueden convertirse en trabajo concreto.</div>
          <q-list separator>
            <q-item v-for="item in recommendations" :key="item.key" clickable @click="$router.push(item.route || '/dashboard')">
              <q-item-section avatar><q-icon name="auto_awesome" :color="item.severity === 'high' ? 'negative' : 'warning'" /></q-item-section>
              <q-item-section><q-item-label class="text-weight-medium">{{ item.title }}</q-item-label><q-item-label caption>{{ item.message }}</q-item-label></q-item-section>
              <q-item-section side><q-icon name="arrow_forward" color="primary" /></q-item-section>
            </q-item>
          </q-list>
        </div>
      </div>
    </q-card-section>

    <q-card-section v-if="attention.length">
      <div class="text-subtitle1 text-weight-bold">Ciclo SaaS que merece revisión</div>
      <div class="text-caption command-muted q-mb-sm">Entregas, periodos de gracia y suspensiones visibles desde el panel.</div>
      <div class="row q-col-gutter-sm">
        <div v-for="row in attention" :key="row.app?.id" class="col-12 col-md-6">
          <q-card flat bordered class="attention-card">
            <q-card-section class="row items-center no-wrap">
              <q-avatar color="orange-1" text-color="orange-9" :icon="row.ciclo?.estado === 'suspendida' ? 'block' : row.ciclo?.estado === 'lista_entrega' ? 'key' : 'schedule'" />
              <div class="col q-ml-md min-width-0">
                <div class="text-weight-bold ellipsis">{{ row.app?.nombre || 'Aplicación' }}</div>
                <div class="text-caption command-muted ellipsis">{{ row.app?.empresa?.nombre_comercial || 'Empresa' }}</div>
                <div class="text-caption q-mt-xs">{{ row.ciclo?.mensaje || prettyStatus(row.ciclo?.estado) }}</div>
              </div>
              <q-badge color="orange" outline :label="prettyStatus(row.ciclo?.estado)" />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </q-card-section>

    <q-card-section class="command-footer">
      <div class="row items-center q-gutter-sm">
        <q-icon name="lightbulb" color="primary" />
        <div class="text-caption command-muted col">El centro de control no reemplaza tus módulos: los conecta alrededor de la operación real.</div>
        <q-btn flat dense no-caps color="primary" icon="auto_awesome" label="Abrir AGR" @click="$router.push('/monitor')" />
      </div>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.command-center-panel{overflow:hidden}
.command-hero{background:linear-gradient(135deg,rgba(9,43,85,.07),rgba(25,118,210,.025))}
.command-copy{max-width:720px;color:var(--viti-muted)}
.command-muted{color:var(--viti-muted)!important}
.focus-card{border:1px solid var(--viti-border);background:var(--viti-card);border-radius:16px;padding:16px;box-shadow:0 10px 28px rgba(9,43,85,.06)}
.command-metric{border:1px solid var(--viti-border);background:color-mix(in srgb,var(--viti-card) 94%,var(--viti-bg));border-radius:14px;padding:14px;height:100%}
.metric-number{font-size:28px;font-weight:800;color:var(--viti-text);margin-top:2px}
.quick-link{min-height:44px}
.attention-card{height:100%;border-radius:14px}
.command-footer{background:color-mix(in srgb,var(--viti-bg) 78%,var(--viti-card))}
@media(max-width:600px){.command-hero{padding:18px 16px}.metric-number{font-size:24px}.focus-card{padding:14px}.quick-link{min-height:46px}}
</style>
