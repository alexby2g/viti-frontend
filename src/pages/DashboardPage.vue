<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'
import PageHeader from '../components/PageHeader.vue'
import { formatDateTime } from '../utils/date'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const updating = ref(false)
const error = ref('')
const data = ref({ resumen: {}, solicitudes_recientes: [], proyectos_recientes: [] })
const billing = ref(null)
const isSuperAdmin = computed(() => auth.user?.rol === 'superadmin')
const value = (key, fallback) => data.value.resumen?.[key] ?? data.value.resumen?.[fallback] ?? 0
const cards = computed(() => [
  {
    key: 'solicitudes', icon: 'inbox', title: 'Solicitudes',
    value: value('solicitudes_por_revisar', 'solicitudes_activas'), suffix: 'por revisar',
    description: 'Recibe pedidos, revisa requisitos y aprueba proyectos.',
    action: 'Revisar solicitudes', to: '/solicitudes',
  },
  ...(isSuperAdmin.value ? [{
    key: 'pagos', icon: 'qr_code_2', title: 'Pagos',
    value: billing.value?.resumen?.comprobantes_pendientes ?? '—', suffix: 'comprobantes por verificar',
    description: 'Comprueba el abono en tu banco y confirma o rechaza el comprobante.',
    action: 'Verificar pagos', to: '/pagos',
  }] : []),
  {
    key: 'trabajos', icon: 'account_tree', title: 'Trabajos',
    value: value('proyectos_activos'), suffix: 'en desarrollo',
    description: 'Organiza tareas, registra avances y adjunta entregables.',
    action: 'Abrir trabajos', to: '/trabajos',
  },
  {
    key: 'sistemas', icon: 'devices', title: 'Sistemas',
    value: value('sistemas_entregados', 'aplicaciones_activas'), suffix: 'registrados / entregados',
    description: 'Conserva los enlaces, versiones y accesos de los sistemas.',
    action: 'Ver sistemas', to: '/sistemas',
  },
])
const actions = computed(() => {
  const queue = []
  if (Number(value('solicitudes_por_revisar', 'solicitudes_activas')) > 0) {
    queue.push({ icon:'inbox', title:'Solicitudes pendientes', caption:'Revisa las necesidades y responde al cliente.', to:'/solicitudes' })
  }
  if (isSuperAdmin.value && Number(billing.value?.resumen?.comprobantes_pendientes || 0) > 0) {
    queue.push({ icon:'receipt_long', title:'Comprobantes por verificar', caption:'Confirma el pago solamente después de comprobarlo en el banco.', to:'/pagos' })
  }
  if (Number(value('proyectos_activos')) > 0) {
    queue.push({ icon:'construction', title:'Trabajos en curso', caption:'Revisa las tareas y registra los avances.', to:'/trabajos' })
  }
  return queue
})
function go(path) { router.push(path) }
async function load() {
  updating.value = true
  error.value = ''
  try {
    const [dashboard, payments] = await Promise.allSettled([
      api.get('/dashboard'),
      isSuperAdmin.value ? api.get('/pagos') : Promise.resolve(null),
    ])
    if (dashboard.status === 'fulfilled') data.value = dashboard.value.data
    else error.value = 'No se pudo actualizar el resumen. Los accesos a módulos siguen disponibles.'
    if (payments.status === 'fulfilled') billing.value = payments.value?.data?.data ?? null
    else billing.value = null
  } finally {
    updating.value = false
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <q-page class="viti-page unified-home">
    <q-inner-loading :showing="loading" />
    <PageHeader
      eyebrow="AGR Studio · Centro de operaciones"
      title="Tu plataforma de gestión digital"
      subtitle="Organiza solicitudes, trabajos, pagos y sistemas desde un mismo lugar. Todo claro, sin pasos innecesarios."
    >
      <q-btn outline no-caps color="primary" icon="refresh" label="Actualizar" :loading="updating" @click="load" />
      <q-btn color="primary" unelevated no-caps icon="inbox" label="Ver solicitudes" to="/solicitudes" />
    </PageHeader>

    <q-banner v-if="error" rounded class="bg-orange-10 text-white q-mb-md">{{ error }}</q-banner>

    <section aria-label="Acciones principales">
      <div class="unified-section-line">
        <div>
          <div class="section-label">CENTRO DE OPERACIONES</div>
          <h2>Tu actividad en VITI</h2>
        </div>
        <span>Una ruta de trabajo, sin módulos duplicados</span>
      </div>
      <div class="unified-action-grid">
        <button v-for="card in cards" :key="card.key" type="button" class="unified-card" @click="go(card.to)">
          <div class="unified-card-top">
            <span class="unified-icon"><q-icon :name="card.icon" size="25px"/></span>
            <q-icon name="arrow_outward" size="19px" class="unified-arrow" />
          </div>
          <div class="unified-count"><strong>{{ card.value }}</strong><span>{{ card.suffix }}</span></div>
          <h3>{{ card.title }}</h3>
          <p>{{ card.description }}</p>
          <span class="unified-card-link">{{ card.action }} <q-icon name="arrow_forward"/></span>
        </button>
      </div>
    </section>

    <section class="unified-bottom-grid q-mt-lg">
      <article class="unified-panel">
        <div class="unified-panel-head">
          <div><div class="section-label">SIGUIENTE PASO</div><h2>Por atender</h2></div>
          <q-icon name="task_alt" size="27px" color="primary"/>
        </div>
        <div v-if="actions.length" class="unified-queue">
          <button v-for="action in actions" :key="action.to" type="button" class="unified-queue-row" @click="go(action.to)">
            <q-icon :name="action.icon" size="24px" color="primary"/>
            <span><b>{{ action.title }}</b><small>{{ action.caption }}</small></span>
            <q-icon name="chevron_right"/>
          </button>
        </div>
        <div v-else class="unified-empty">
          <q-icon name="verified" size="30px" color="positive"/>
          No hay solicitudes ni comprobantes pendientes detectados.
        </div>
      </article>
      <article class="unified-panel">
        <div class="unified-panel-head">
          <div><div class="section-label">SIN COMPLICACIONES</div><h2>De la idea a la entrega</h2></div>
        </div>
        <div class="unified-steps">
          <div><span>01</span><p><b>Solicitud</b><small>El cliente explica qué necesita.</small></p></div>
          <div><span>02</span><p><b>Acuerdo</b><small>Revisas alcance, precio y anticipo.</small></p></div>
          <div><span>03</span><p><b>Pago verificado</b><small>El cliente adjunta su comprobante QR; tú lo compruebas.</small></p></div>
          <div><span>04</span><p><b>Trabajo y entrega</b><small>Registras avances, archivos y accesos al sistema.</small></p></div>
        </div>
      </article>
    </section>

    <section class="unified-recent q-mt-lg" aria-label="Actividad reciente">
      <div class="unified-section-line">
        <div><div class="section-label">ACTIVIDAD</div><h2>Lo que se está moviendo</h2></div>
        <q-btn flat no-caps icon="folder_shared" label="Archivos y entregables" to="/archivos"/>
      </div>
      <div class="unified-bottom-grid">
        <article class="unified-panel">
          <div class="unified-panel-head"><h3>Solicitudes recientes</h3><q-btn flat round dense icon="arrow_forward" to="/solicitudes" aria-label="Todas las solicitudes"/></div>
          <div v-if="data.solicitudes_recientes?.length" class="unified-queue">
            <button v-for="row in data.solicitudes_recientes.slice(0,4)" :key="row.id" class="unified-queue-row" type="button" @click="go('/solicitudes/' + row.id)">
              <q-icon name="description" color="primary" size="22px"/>
              <span><b>{{ row.titulo || row.codigo }}</b><small>{{ row.empresa?.nombre_comercial || row.cliente?.nombre || row.codigo }} · {{ formatDateTime(row.created_at) }}</small></span>
              <q-icon name="chevron_right"/>
            </button>
          </div>
          <div v-else class="unified-empty">Todavía no hay solicitudes recientes.</div>
        </article>
        <article class="unified-panel">
          <div class="unified-panel-head"><h3>Trabajos recientes</h3><q-btn flat round dense icon="arrow_forward" to="/trabajos" aria-label="Todos los trabajos"/></div>
          <div v-if="data.proyectos_recientes?.length" class="unified-queue">
            <button v-for="row in data.proyectos_recientes.slice(0,4)" :key="row.id" class="unified-queue-row" type="button" @click="go('/trabajos/' + row.id)">
              <q-icon name="work_outline" color="primary" size="22px"/>
              <span><b>{{ row.nombre || row.codigo }}</b><small>{{ row.empresa?.nombre_comercial || row.codigo }} · {{ row.progreso ?? 0 }}% de avance</small></span>
              <q-icon name="chevron_right"/>
            </button>
          </div>
          <div v-else class="unified-empty">Todavía no hay trabajos recientes.</div>
        </article>
      </div>
    </section>
  </q-page>
</template>

<style scoped>
.unified-home{padding-top:34px;padding-bottom:44px}
.unified-section-line{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:32px 0 18px}
.unified-section-line h2,.unified-panel h2{margin:5px 0 0;font-size:23px;font-weight:780;letter-spacing:-.035em}
.unified-section-line span{color:#aaa79e;font-size:12px}
.unified-action-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.unified-card{text-align:left;font:inherit;cursor:pointer;color:#f6f3eb;min-width:0;display:flex;flex-direction:column;min-height:216px;border:1px solid #3e3b34;border-radius:18px;padding:22px;background:linear-gradient(145deg,#242420,#1a1b19);transition:border-color .2s,transform .2s,background .2s}
.unified-card:first-child{background:linear-gradient(135deg,#49402e,#292720);border-color:#77643e}
.unified-card:hover,.unified-card:focus-visible{border-color:#c7a466;transform:translateY(-2px);outline:2px solid transparent}
.unified-card-top{display:flex;justify-content:space-between;align-items:start}
.unified-icon{height:43px;width:43px;display:grid;place-items:center;background:rgba(222,188,116,.12);color:#dfbd7a;border-radius:12px}
.unified-arrow{color:#b7ae9c}
.unified-count{display:flex;align-items:baseline;gap:8px;margin-top:15px}
.unified-count strong{font-size:29px;line-height:1.1;font-variant-numeric:tabular-nums}
.unified-count span{font-size:11px;color:#c6c1b4}
.unified-card h3{font-size:18px;font-weight:800;margin:10px 0 5px}
.unified-card p{font-size:12px;color:#b9b6ac;line-height:1.6;margin:0 0 15px;flex:1}
.unified-card-link{font-size:12px;color:#e1c17e;font-weight:750;display:flex;align-items:center;gap:7px}
.unified-bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.unified-panel{border:1px solid #3c3b35;border-radius:19px;background:#1b1c1a;overflow:hidden;color:#f4f1eb}
.unified-panel-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:20px 20px 15px;border-bottom:1px solid #3a3933}
.unified-panel h3{font-size:16px;margin:0;font-weight:800}
.unified-queue-row{display:flex;align-items:center;text-align:left;gap:12px;width:100%;border:0;border-bottom:1px solid #35352e;background:none;color:inherit;cursor:pointer;padding:15px 20px;font:inherit}
.unified-queue-row:hover{background:rgba(211,175,105,.07)}
.unified-queue-row span{flex:1;min-width:0;display:grid;gap:4px}
.unified-queue-row b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.unified-queue-row small{font-size:11px;color:#b3afa4;line-height:1.4}
.unified-queue-row:last-child{border-bottom:0}
.unified-empty{padding:30px 20px;min-height:90px;color:#b8b5ac;display:flex;align-items:center;gap:10px}
.unified-steps{padding:14px 20px;display:grid;gap:15px}
.unified-steps>div{display:flex;gap:12px}
.unified-steps>div>span{font-weight:800;font-size:11px;color:#e5c581;background:rgba(211,175,105,.12);border-radius:9px;display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px}
.unified-steps p{margin:0;display:grid;gap:3px}
.unified-steps b{font-size:13px}
.unified-steps small{font-size:11px;color:#aaa79e}
@media(max-width:1350px){.unified-action-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.unified-action-grid,.unified-bottom-grid{grid-template-columns:1fr}.unified-section-line{align-items:start;flex-direction:column}.unified-card{min-height:180px}.unified-count{margin-top:10px}}
@media(prefers-reduced-motion:reduce){.unified-card{transition:none}.unified-card:hover{transform:none}}
</style>
