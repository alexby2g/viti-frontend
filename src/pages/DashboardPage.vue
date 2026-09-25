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
  { key: 'solicitudes_por_revisar', fallback: 'solicitudes_activas', label: 'Solicitudes por revisar', hint: 'Entrada comercial', icon: 'inbox', to: '/solicitudes' },
  { key: 'proyectos_activos', label: 'Trabajos activos', hint: 'Producción en curso', icon: 'account_tree', to: '/trabajos' },
  { key: 'sistemas_entregados', fallback: 'aplicaciones_activas', label: 'Sistemas entregados', hint: 'Operación externa', icon: 'language', to: '/sistemas' },
  { key: 'clientes_registrados', fallback: 'negocios_activos', label: 'Clientes registrados', hint: 'Relación comercial', icon: 'groups', to: '/clientes' },
])

const workflow = [
  { number: '01', title: 'Solicitud', text: 'El cliente explica qué necesita y deja sus datos.', icon: 'description', to: '/solicitudes' },
  { number: '02', title: 'Decisión', text: 'VITI revisa, rechaza o acepta el trabajo.', icon: 'fact_check', to: '/solicitudes' },
  { number: '03', title: 'Trabajo', text: 'El desarrollo se planifica, produce, prueba y entrega.', icon: 'account_tree', to: '/trabajos' },
  { number: '04', title: 'Sistema', text: 'VITI conserva URLs, hosting, repositorios y soporte.', icon: 'open_in_new', to: '/sistemas' },
]

const attentionCount = computed(() => data.value.requieren_atencion?.length || 0)
const metricValue = item => data.value.resumen?.[item.key] ?? data.value.resumen?.[item.fallback] ?? 0
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
      title="Controla el trabajo, no el negocio del cliente."
      subtitle="VITI recibe solicitudes, organiza el desarrollo y mantiene centralizada la información de los sistemas que entregas."
    >
      <q-btn class="viti-btn viti-btn--ghost" outline no-caps icon="open_in_new" label="Formulario público" to="/solicitud" />
      <q-btn class="viti-btn viti-btn--primary" unelevated no-caps icon="inbox" label="Revisar solicitudes" to="/solicitudes" />
    </PageHeader>

    <section class="metrics-grid">
      <button v-for="item in metrics" :key="item.key" class="metric-card" type="button" @click="go(item.to)">
        <span class="metric-icon"><q-icon :name="item.icon" /></span>
        <span class="metric-copy"><small>{{ item.label }}</small><b>{{ metricValue(item) }}</b><em>{{ item.hint }}</em></span>
        <q-icon name="arrow_forward" class="metric-arrow" />
      </button>
    </section>

    <section class="command-grid q-mt-lg">
      <article class="workflow-panel">
        <div class="panel-heading">
          <div><div class="section-label">Modelo operativo</div><h2>Solicitud → Trabajo → Sistema</h2></div>
          <span>VITI coordina el ciclo completo</span>
        </div>
        <div class="workflow-grid">
          <button v-for="step in workflow" :key="step.number" type="button" class="workflow-step" @click="go(step.to)">
            <span class="step-number">{{ step.number }}</span>
            <span class="step-icon"><q-icon :name="step.icon" /></span>
            <strong>{{ step.title }}</strong>
            <p>{{ step.text }}</p>
          </button>
        </div>
      </article>

      <article class="attention-panel">
        <div class="section-label">Atención</div>
        <div class="attention-value">{{ attentionCount }}</div>
        <h3>{{ attentionCount ? 'Elementos requieren revisión' : 'Todo bajo control' }}</h3>
        <p>{{ attentionCount ? 'Hay sistemas, cobros o entregas que necesitan seguimiento.' : 'No hay alertas operativas pendientes en este momento.' }}</p>
        <q-btn flat no-caps icon-right="arrow_forward" label="Abrir soporte" to="/soporte" />
      </article>
    </section>

    <section class="dashboard-columns q-mt-lg">
      <article class="viti-panel">
        <div class="panel-head">
          <div><div class="section-label">Entrada</div><h3>Solicitudes recientes</h3></div>
          <q-btn flat round icon="arrow_forward" to="/solicitudes"><q-tooltip>Ver solicitudes</q-tooltip></q-btn>
        </div>
        <div v-if="data.solicitudes_recientes?.length" class="activity-list">
          <button v-for="item in data.solicitudes_recientes" :key="item.id" type="button" class="activity-row" @click="go(`/solicitudes/${item.id}`)">
            <span class="activity-icon"><q-icon name="description" /></span>
            <span class="activity-copy"><b>{{ item.titulo || item.codigo }}</b><small>{{ item.empresa?.nombre_comercial || item.cliente?.nombre || 'Sin cliente' }}</small></span>
            <span class="activity-date">{{ formatDateTime(item.created_at) }}</span>
          </button>
        </div>
        <div v-else class="panel-empty"><q-icon name="inbox" /><b>Sin solicitudes recientes</b><span>Las nuevas solicitudes aparecerán aquí.</span></div>
      </article>

      <article class="viti-panel">
        <div class="panel-head">
          <div><div class="section-label">Producción</div><h3>Trabajos recientes</h3></div>
          <q-btn flat round icon="arrow_forward" to="/trabajos"><q-tooltip>Ver trabajos</q-tooltip></q-btn>
        </div>
        <div v-if="data.proyectos_recientes?.length" class="activity-list">
          <button v-for="item in data.proyectos_recientes" :key="item.id" type="button" class="activity-row" @click="go(`/trabajos/${item.id}`)">
            <span class="activity-icon"><q-icon name="account_tree" /></span>
            <span class="activity-copy"><b>{{ item.nombre || item.codigo }}</b><small>{{ item.empresa?.nombre_comercial || item.cliente?.nombre || 'Sin cliente' }}</small></span>
            <span class="progress-pill">{{ item.progreso || 0 }}%</span>
          </button>
        </div>
        <div v-else class="panel-empty"><q-icon name="conversion_path" /><b>Sin trabajos activos</b><span>Un trabajo nace cuando aceptas una solicitud.</span></div>
      </article>
    </section>
  </q-page>
</template>

<style scoped>
.dashboard-page{padding-top:34px}.metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.metric-card,.workflow-step,.activity-row{font:inherit;color:inherit;text-align:left}.metric-card{border:1px solid var(--viti-border);background:linear-gradient(180deg,rgba(15,40,70,.72),rgba(8,27,48,.72));border-radius:19px;padding:18px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:.2s ease;min-height:112px}.metric-card:hover{transform:translateY(-2px);border-color:rgba(242,139,48,.5)}.metric-icon{width:46px;height:46px;border-radius:14px;background:rgba(242,139,48,.1);color:#ff9a3c;display:grid;place-items:center;font-size:23px}.metric-copy{display:grid;min-width:0}.metric-copy small{color:#a9bbcb;font-size:11px}.metric-copy b{font-size:30px;line-height:1.05;margin:3px 0}.metric-copy em{font-style:normal;color:#718ba2;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.metric-arrow{margin-left:auto;color:#6f89a4}.command-grid{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:14px}.workflow-panel,.attention-panel,.viti-panel{border:1px solid var(--viti-border);background:rgba(8,25,45,.62);border-radius:22px}.workflow-panel{padding:23px}.panel-heading,.panel-head{display:flex;align-items:center;justify-content:space-between;gap:20px}.panel-heading h2,.panel-head h3{margin:4px 0 0}.panel-heading h2{font-size:23px}.panel-heading>span{color:var(--viti-muted);font-size:11px}.workflow-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.workflow-step{border:1px solid rgba(99,129,160,.18);background:rgba(16,43,72,.48);border-radius:16px;padding:16px;cursor:pointer;transition:.18s}.workflow-step:hover{border-color:rgba(242,139,48,.4);background:rgba(20,53,88,.75)}.step-number{font-size:9px;font-weight:900;letter-spacing:.13em;color:#728ba3}.step-icon{display:grid;place-items:center;width:37px;height:37px;border-radius:11px;margin:12px 0;background:rgba(20,87,184,.17);color:#7db4ff;font-size:20px}.workflow-step strong{display:block;font-size:14px}.workflow-step p{margin:6px 0 0;color:#8ea5b9;font-size:10px;line-height:1.5}.attention-panel{padding:24px;background:linear-gradient(145deg,rgba(14,39,65,.82),rgba(17,52,84,.7))}.attention-value{font-size:46px;font-weight:900;line-height:1;margin:20px 0 6px;color:#f5f8fb}.attention-panel h3{font-size:17px;margin:0 0 7px}.attention-panel p{color:#93a9bb;font-size:11px;line-height:1.6;min-height:54px}.attention-panel .q-btn{color:#ff9b42;padding-left:0}.dashboard-columns{display:grid;grid-template-columns:1fr 1fr;gap:14px}.viti-panel{overflow:hidden}.panel-head{padding:20px 22px;border-bottom:1px solid rgba(88,118,148,.14)}.panel-head h3{font-size:18px}.activity-row{width:100%;border:0;border-bottom:1px solid rgba(88,118,148,.12);background:transparent;padding:14px 18px;display:flex;align-items:center;gap:12px;cursor:pointer}.activity-row:last-child{border-bottom:0}.activity-row:hover{background:rgba(255,255,255,.025)}.activity-icon{width:36px;height:36px;border-radius:10px;background:rgba(20,87,184,.15);color:#79b1ff;display:grid;place-items:center}.activity-copy{display:grid;min-width:0;flex:1}.activity-copy b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.activity-copy small{font-size:9px;color:#7f98ad;margin-top:3px}.activity-date{font-size:9px;color:#71899e}.progress-pill{font-size:10px;font-weight:800;color:#9fd0ff;border:1px solid rgba(80,145,216,.25);border-radius:999px;padding:4px 8px}.panel-empty{min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#768ea3}.panel-empty .q-icon{font-size:30px;color:#56738f}.panel-empty b{color:#cfdbe5;margin-top:9px}.panel-empty span{font-size:10px;margin-top:3px}.viti-btn{border-radius:12px;min-height:42px}.viti-btn--ghost{background:rgba(255,255,255,.025)!important}.viti-btn--primary{background:linear-gradient(135deg,#1457b8,#1a69cf)!important}
@media(max-width:1120px){.metrics-grid{grid-template-columns:repeat(2,1fr)}.command-grid{grid-template-columns:1fr}.workflow-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){.dashboard-page{padding-top:18px}.metrics-grid,.dashboard-columns{grid-template-columns:1fr}.workflow-grid{grid-template-columns:1fr 1fr}.panel-heading{align-items:flex-start;flex-direction:column}.activity-date{display:none}}
</style>
