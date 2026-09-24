<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'
import { formatDateTime } from '../utils/date'

const router = useRouter()
const loading = ref(true)
const data = ref({ resumen: {}, solicitudes_recientes: [], proyectos_recientes: [], requieren_atencion: [] })

const metrics = computed(() => [
  { key: 'solicitudes_activas', label: 'Solicitudes activas', icon: 'fact_check', to: '/solicitudes' },
  { key: 'proyectos_activos', label: 'Proyectos activos', icon: 'account_tree', to: '/proyectos' },
  { key: 'aplicaciones_activas', label: 'Sistemas activos', icon: 'grid_view', to: '/aplicaciones' },
  { key: 'pagos_vencidos', label: 'Cobros con atención', icon: 'payments', to: '/pagos' },
])

const flow = computed(() => [
  { number: '01', title: 'Solicitud', text: 'Recibe la necesidad del cliente y define el alcance.', icon: 'description', to: '/solicitudes', active: (data.value.resumen.solicitudes_activas || 0) > 0 },
  { number: '02', title: 'Aprobación', text: 'Decide si la solicitud continúa y habilita el acceso del cliente.', icon: 'verified', to: '/solicitudes', active: (data.value.resumen.solicitudes_activas || 0) > 0 },
  { number: '03', title: 'Proyecto', text: 'Registra avances, fechas y una beta cuando esté lista para revisar.', icon: 'account_tree', to: '/proyectos', active: (data.value.resumen.proyectos_activos || 0) > 0 },
  { number: '04', title: 'Entrega', text: 'Publica el sistema, sus accesos y la APK cuando realmente esté listo.', icon: 'rocket_launch', to: '/aplicaciones', active: (data.value.resumen.aplicaciones_activas || 0) > 0 },
])

const workspaceEmpty = computed(() =>
  !data.value.resumen.solicitudes_activas &&
  !data.value.resumen.proyectos_activos &&
  !data.value.resumen.aplicaciones_activas &&
  !data.value.resumen.negocios_activos
)

function go(to) { router.push(to) }

onMounted(async () => {
  try { data.value = (await api.get('/dashboard')).data }
  finally { loading.value = false }
})
</script>

<template>
  <q-page class="viti-page dashboard-page">
    <q-inner-loading :showing="loading" />

    <PageHeader
      eyebrow="Centro VITI"
      title="Tu operación, en orden."
      subtitle="Recibe solicitudes, aprueba proyectos, registra avances y entrega sistemas desde un solo lugar."
    >
      <q-btn class="viti-btn viti-btn--ghost" outline no-caps icon="language" label="Vista pública" to="/viti" />
      <q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="dns" label="Dominios y acceso" to="/accesos" />
    </PageHeader>

    <section class="metrics-grid">
      <button v-for="item in metrics" :key="item.key" class="metric-card" type="button" @click="go(item.to)">
        <span class="metric-icon"><q-icon :name="item.icon" /></span>
        <span class="metric-copy"><b>{{ data.resumen[item.key] || 0 }}</b><small>{{ item.label }}</small></span>
        <q-icon name="north_east" class="metric-arrow" />
      </button>
    </section>

    <section v-if="workspaceEmpty && !loading" class="empty-workspace q-mt-lg">
      <div class="empty-orbit"><q-icon name="hub" /></div>
      <div class="empty-copy">
        <div class="section-label">Espacio limpio</div>
        <h2>VITI está listo para tu primer proyecto.</h2>
        <p>No hay clientes, solicitudes, proyectos ni sistemas de demostración. Empieza una prueba real y VITI irá habilitando cada etapa cuando corresponda.</p>
      </div>
      <div class="empty-actions">
        <q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="open_in_new" label="Probar como cliente" to="/solicitud" />
        <q-btn class="viti-btn viti-btn--ghost" outline no-caps icon="fact_check" label="Ver solicitudes" to="/solicitudes" />
      </div>
    </section>

    <section class="flow-section q-mt-lg">
      <div class="section-top">
        <div>
          <div class="section-label">Flujo principal</div>
          <h2>De la idea a la entrega</h2>
        </div>
        <span class="flow-hint">Cada etapa abre la siguiente</span>
      </div>
      <div class="flow-grid">
        <button v-for="step in flow" :key="step.number" class="flow-card" :class="{ 'is-active': step.active }" type="button" @click="go(step.to)">
          <span class="flow-number">{{ step.number }}</span>
          <span class="flow-icon"><q-icon :name="step.icon" /></span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.text }}</p>
          <span class="flow-link">Abrir <q-icon name="arrow_forward" /></span>
        </button>
      </div>
    </section>

    <section class="dashboard-columns q-mt-lg">
      <article class="viti-panel">
        <div class="panel-head">
          <div><div class="section-label">Entrada</div><h3>Solicitudes recientes</h3></div>
          <q-btn flat round icon="arrow_forward" class="panel-link" to="/solicitudes"><q-tooltip>Ver solicitudes</q-tooltip></q-btn>
        </div>
        <div v-if="data.solicitudes_recientes?.length" class="activity-list">
          <button v-for="item in data.solicitudes_recientes" :key="item.id" type="button" class="activity-row" @click="go(`/solicitudes/${item.id}`)">
            <span class="activity-icon"><q-icon name="description" /></span>
            <span class="activity-copy"><b>{{ item.titulo || item.codigo }}</b><small>{{ item.empresa?.nombre_comercial || item.cliente?.nombre || 'Sin empresa asignada' }}</small></span>
            <span class="activity-date">{{ formatDateTime(item.created_at) }}</span>
          </button>
        </div>
        <div v-else class="panel-empty"><q-icon name="inbox" /><b>Sin solicitudes todavía</b><span>Las nuevas solicitudes aparecerán aquí.</span></div>
      </article>

      <article class="viti-panel">
        <div class="panel-head">
          <div><div class="section-label">Producción</div><h3>Proyectos recientes</h3></div>
          <q-btn flat round icon="arrow_forward" class="panel-link" to="/proyectos"><q-tooltip>Ver proyectos</q-tooltip></q-btn>
        </div>
        <div v-if="data.proyectos_recientes?.length" class="activity-list">
          <button v-for="item in data.proyectos_recientes" :key="item.id" type="button" class="activity-row" @click="go(`/proyectos/${item.id}`)">
            <span class="activity-icon"><q-icon name="account_tree" /></span>
            <span class="activity-copy"><b>{{ item.nombre || item.codigo }}</b><small>{{ item.empresa?.nombre_comercial || item.cliente?.nombre || 'Sin empresa asignada' }}</small></span>
            <span class="progress-pill">{{ item.progreso || 0 }}%</span>
          </button>
        </div>
        <div v-else class="panel-empty"><q-icon name="conversion_path" /><b>Sin proyectos activos</b><span>Convierte una solicitud aprobada para iniciar.</span></div>
      </article>
    </section>
  </q-page>
</template>

<style scoped>
.dashboard-page{padding-top:34px}.metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.metric-card,.flow-card,.activity-row{font:inherit;color:inherit;text-align:left}.metric-card{border:1px solid var(--viti-border);background:rgba(15,40,70,.55);border-radius:18px;padding:18px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:.2s ease;min-height:96px}.metric-card:hover{transform:translateY(-2px);border-color:rgba(242,139,48,.55);background:rgba(20,52,88,.76)}.metric-icon{width:44px;height:44px;border-radius:13px;background:rgba(242,139,48,.11);color:#ff9a3c;display:grid;place-items:center;font-size:23px}.metric-copy{display:grid;gap:2px}.metric-copy b{font-size:27px;line-height:1}.metric-copy small{color:var(--viti-muted);font-size:12px}.metric-arrow{margin-left:auto;color:#6f89a4}.empty-workspace{border:1px solid rgba(242,139,48,.24);background:linear-gradient(135deg,rgba(11,31,52,.88),rgba(18,47,78,.7));border-radius:22px;padding:28px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:22px}.empty-orbit{width:70px;height:70px;border:1px solid rgba(242,139,48,.38);border-radius:50%;display:grid;place-items:center;color:#ff9a3c;font-size:30px;box-shadow:inset 0 0 24px rgba(242,139,48,.08)}.empty-copy h2{margin:4px 0 6px;font-size:26px}.empty-copy p{margin:0;color:var(--viti-muted);max-width:680px;line-height:1.55}.empty-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.flow-section,.viti-panel{border:1px solid var(--viti-border);background:rgba(8,25,45,.62);border-radius:22px}.flow-section{padding:24px}.section-top,.panel-head{display:flex;align-items:center;justify-content:space-between;gap:20px}.section-top h2,.panel-head h3{margin:4px 0 0}.section-top h2{font-size:24px}.flow-hint{font-size:12px;color:var(--viti-muted)}.flow-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:20px}.flow-card{position:relative;border:1px solid rgba(99,129,160,.2);background:rgba(16,43,72,.52);border-radius:17px;padding:18px;cursor:pointer;transition:.2s ease;overflow:hidden}.flow-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:transparent}.flow-card:hover,.flow-card.is-active{border-color:rgba(242,139,48,.42);background:rgba(20,53,88,.82)}.flow-card.is-active:before{background:#f28b30}.flow-number{font-size:10px;letter-spacing:.12em;color:#7d96af;font-weight:800}.flow-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;margin:14px 0;background:rgba(20,87,184,.18);color:#77adff;font-size:21px}.flow-card strong{font-size:17px}.flow-card p{color:var(--viti-muted);font-size:12px;line-height:1.55;min-height:58px}.flow-link{font-size:11px;color:#ff9a3c;display:inline-flex;align-items:center;gap:4px;font-weight:700}.dashboard-columns{display:grid;grid-template-columns:1fr 1fr;gap:14px}.viti-panel{overflow:hidden}.panel-head{padding:20px 22px;border-bottom:1px solid rgba(99,129,160,.18)}.panel-head h3{font-size:18px}.panel-link{color:#ff9a3c}.activity-list{display:grid}.activity-row{border:0;border-bottom:1px solid rgba(99,129,160,.13);background:transparent;padding:15px 20px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:.18s ease}.activity-row:last-child{border-bottom:0}.activity-row:hover{background:rgba(20,87,184,.08)}.activity-icon{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.04);color:#8ba8c4}.activity-copy{display:grid;gap:2px;min-width:0}.activity-copy b{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.activity-copy small,.activity-date{color:var(--viti-muted);font-size:11px}.activity-date{margin-left:auto;white-space:nowrap}.progress-pill{margin-left:auto;padding:5px 9px;border-radius:999px;background:rgba(242,139,48,.12);color:#ffad62;font-size:11px;font-weight:800}.panel-empty{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--viti-muted);gap:5px;padding:22px}.panel-empty .q-icon{font-size:34px;color:#66819d}.panel-empty b{color:var(--viti-text);font-size:14px}.panel-empty span{font-size:12px}.viti-btn{border-radius:12px;min-height:42px}.viti-btn--ghost{background:rgba(255,255,255,.025)!important;border-color:rgba(158,180,201,.28)!important}.viti-btn--primary{background:linear-gradient(135deg,#1457b8,#1a69cf)!important;box-shadow:0 10px 28px rgba(20,87,184,.18)!important}
@media(max-width:1100px){.metrics-grid,.flow-grid{grid-template-columns:repeat(2,1fr)}.dashboard-columns{grid-template-columns:1fr}.empty-workspace{grid-template-columns:auto 1fr}.empty-actions{grid-column:1/-1;justify-content:flex-start}}
@media(max-width:600px){.dashboard-page{padding-top:18px}.metrics-grid,.flow-grid{grid-template-columns:1fr}.empty-workspace{grid-template-columns:1fr}.empty-orbit{width:58px;height:58px}.flow-section{padding:17px}.activity-date{display:none}}
</style>
