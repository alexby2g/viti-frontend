<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'
import PageHeader from '../components/PageHeader.vue'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const mode = ref('cliente')
const requests = ref([])
const project = ref(null)
const dashboard = ref({ resumen:{} })

const isClient = computed(() => auth.user?.rol === 'cliente')
const isAdmin = computed(() => ['superadmin','administrador'].includes(auth.user?.rol))

const clientSteps = [
  { key:'cuenta', icon:'person_add', title:'Crear tu cuenta', text:'Tu perfil identifica quién solicita el trabajo y conserva tus datos de contacto.', action:'Mi cuenta', to:'/mi-cuenta' },
  { key:'solicitud', icon:'assignment_add', title:'Crear una solicitud', text:'Cada nueva idea genera una SOL independiente. Las solicitudes anteriores quedan en tu historial.', action:'Mis solicitudes', to:'/mi-cuenta' },
  { key:'formulario', icon:'fact_check', title:'Completar el formulario', text:'Responde lo esencial: problema, funciones, usuarios, prioridad, presupuesto y necesidades.', action:'Continuar', to:'/mi-cuenta' },
  { key:'revision', icon:'manage_search', title:'Revisión de AGR Studio', text:'AGR Studio analiza la viabilidad, organiza el alcance y puede contactarte por el buzón.', action:'Mi buzón', to:'/mi-buzon' },
  { key:'proyecto', icon:'account_tree', title:'Proyecto y desarrollo', text:'Al aprobarse la solicitud nace el proyecto. Verás progreso, fechas, avances y archivos.', action:'Mi proyecto', to:'/mi-proyecto' },
  { key:'beta', icon:'science', title:'Beta y pruebas', text:'AGR Studio habilita la versión de prueba cuando esté lista para validarse sin confundir beta con entrega.', action:'Aplicaciones', to:'/mi-aplicaciones' },
  { key:'entrega', icon:'verified', title:'Entrega y soporte', text:'La aplicación queda habilitada para tu empresa y registrada en VITI para soporte y mantenimiento.', action:'Mis aplicaciones', to:'/mi-aplicaciones' },
]

const adminSteps = [
  { key:'entrada', icon:'move_to_inbox', title:'Recibir solicitud', text:'Revisa datos del cliente, empresa, cuestionario y archivos recibidos.', action:'Solicitudes', to:'/solicitudes' },
  { key:'analisis', icon:'manage_search', title:'Evaluar viabilidad', text:'Define el problema, alcance, módulos, complejidad, tiempo y riesgos.', action:'Solicitudes', to:'/solicitudes' },
  { key:'propuesta', icon:'request_quote', title:'Definir propuesta', text:'Establece plan, precio, condiciones de pago y fechas antes de convertir la solicitud.', action:'Solicitudes', to:'/solicitudes' },
  { key:'proyecto', icon:'account_tree', title:'Convertir en proyecto', text:'Crea el proyecto formal y registra responsables, calendario y avance.', action:'Proyectos', to:'/proyectos' },
  { key:'desarrollo', icon:'terminal', title:'Desarrollar y publicar avances', text:'Actualiza progreso, módulos terminados, decisiones y archivos visibles para la empresa.', action:'Proyectos', to:'/proyectos' },
  { key:'beta', icon:'science', title:'Habilitar beta', text:'La beta se activa manualmente cuando está lista. El calendario no cambia por sí solo el estado técnico.', action:'Aplicaciones', to:'/aplicaciones' },
  { key:'pago', icon:'payments', title:'Controlar pagos', text:'Revisa comprobantes dentro de VITI, confirma o rechaza y conserva la trazabilidad.', action:'Pagos', to:'/pagos' },
  { key:'entrega', icon:'verified_user', title:'Entregar y dar soporte', text:'Habilita el acceso cuando corresponda y conserva mantenimiento, mensajes e historial.', action:'Aplicaciones', to:'/aplicaciones' },
]

const statusGuide = [
  {label:'Borrador',text:'El formulario todavía se está completando.',icon:'edit_note',bg:'grey-3',fg:'grey-9'},
  {label:'En revisión',text:'AGR Studio está evaluando la solicitud.',icon:'manage_search',bg:'orange-2',fg:'orange-10'},
  {label:'Aprobada',text:'La solicitud es viable y puede convertirse en proyecto.',icon:'task_alt',bg:'green-2',fg:'green-9'},
  {label:'Convertida',text:'La solicitud ya tiene un proyecto asociado.',icon:'account_tree',bg:'purple-2',fg:'purple-9'},
  {label:'Beta',text:'Existe una versión de prueba, pero todavía no implica entrega.',icon:'science',bg:'indigo-2',fg:'indigo-9'},
  {label:'Finalizada',text:'El desarrollo técnico terminó.',icon:'done_all',bg:'teal-2',fg:'teal-9'},
  {label:'Entregada',text:'La empresa ya tiene el acceso habilitado.',icon:'verified_user',bg:'green-2',fg:'green-9'},
]

const latestRequest = computed(() => requests.value[0] || null)
const clientActiveIndex = computed(() => {
  const req = latestRequest.value
  if (!req) return 1
  if (req.estado === 'borrador') return 2
  if (req.estado === 'en_revision') return 3
  if (req.estado === 'aprobada') return 4
  if (req.estado === 'convertida') {
    if (!project.value) return 4
    if (project.value?.aplicacion?.acceso_cliente) return 6
    const entorno = String(project.value?.aplicacion?.entorno || '').toLowerCase()
    if (entorno === 'beta' || Number(project.value?.progreso || 0) >= 80) return 5
    return 4
  }
  return 1
})
const adminFocus = computed(() => {
  const r = dashboard.value?.resumen || {}
  if (Number(r.aplicaciones_pendientes_entrega || 0) > 0) return 7
  if (Number(r.proyectos_activos || 0) > 0) return 4
  if (Number(r.solicitudes_activas || 0) > 0) return 1
  return 0
})
const visibleSteps = computed(() => mode.value === 'administrador' ? adminSteps : clientSteps)
const activeIndex = computed(() => mode.value === 'administrador' ? adminFocus.value : clientActiveIndex.value)

function stateFor(index) {
  if (mode.value === 'administrador') return index === activeIndex.value ? 'active' : 'guide'
  if (index < activeIndex.value) return 'done'
  if (index === activeIndex.value) return 'active'
  return 'pending'
}
function stateIcon(index, step) { return stateFor(index) === 'done' ? 'check' : step.icon }
function go(path) { if (path) router.push(path) }

async function load() {
  loading.value = true
  try {
    if (isClient.value) {
      mode.value = 'cliente'
      const [reqResult, projectResult] = await Promise.allSettled([api.get('/mi/solicitudes'),api.get('/mi/proyecto')])
      if (reqResult.status === 'fulfilled') requests.value = reqResult.value.data.data || []
      if (projectResult.status === 'fulfilled') project.value = projectResult.value.data.data || null
    } else if (isAdmin.value) {
      mode.value = 'administrador'
      try { dashboard.value = (await api.get('/dashboard')).data || { resumen:{} } } catch { dashboard.value = { resumen:{} } }
    } else {
      router.replace('/soporte')
    }
  } finally { loading.value = false }
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page guide-page">
    <q-inner-loading :showing="loading" />
    <PageHeader eyebrow="AGR Studio · VITI" title="Guía de uso" subtitle="Un mapa claro del proceso para saber qué hacer, qué sigue y quién debe actuar.">
      <q-btn-toggle v-if="isAdmin" v-model="mode" no-caps unelevated rounded toggle-color="primary" color="grey-9" text-color="grey-5" :options="[{label:'Administrador',value:'administrador',icon:'admin_panel_settings'},{label:'Empresa',value:'cliente',icon:'business'}]" />
    </PageHeader>

    <q-banner rounded class="guide-status q-mb-lg">
      <template #avatar><q-icon :name="mode==='administrador'?'route':'explore'" color="primary" size="30px" /></template>
      <div class="text-weight-bold">{{mode==='administrador'?'Flujo de control AGR Studio':'Así avanza tu trabajo dentro de VITI'}}</div>
      <div class="text-body2 text-grey-6">{{mode==='administrador'?'Cada proyecto puede estar en una etapa diferente. El paso resaltado señala el foco operativo actual de VITI.':'El paso resaltado representa la etapa más cercana al estado actual de tu solicitud o proyecto.'}}</div>
    </q-banner>

    <div v-if="mode==='administrador'" class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4"><q-card flat class="viti-card mini-stat"><q-card-section><q-icon name="assignment" color="orange" size="28px"/><div class="mini-number">{{dashboard.resumen?.solicitudes_activas||0}}</div><div class="text-caption text-grey-6">Solicitudes activas</div></q-card-section></q-card></div>
      <div class="col-12 col-sm-4"><q-card flat class="viti-card mini-stat"><q-card-section><q-icon name="account_tree" color="purple" size="28px"/><div class="mini-number">{{dashboard.resumen?.proyectos_activos||0}}</div><div class="text-caption text-grey-6">Proyectos activos</div></q-card-section></q-card></div>
      <div class="col-12 col-sm-4"><q-card flat class="viti-card mini-stat"><q-card-section><q-icon name="key" color="teal" size="28px"/><div class="mini-number">{{dashboard.resumen?.aplicaciones_pendientes_entrega||0}}</div><div class="text-caption text-grey-6">Pendientes de entrega</div></q-card-section></q-card></div>
    </div>

    <div class="flow-map" :class="`flow-map--${mode}`">
      <template v-for="(step,index) in visibleSteps" :key="step.key">
        <q-card flat class="flow-card" :class="`flow-card--${stateFor(index)}`">
          <q-card-section>
            <div class="row items-start no-wrap q-gutter-md">
              <q-avatar :class="`step-avatar step-avatar--${stateFor(index)}`" size="48px"><q-icon :name="stateIcon(index,step)" size="25px" /></q-avatar>
              <div class="col min-width-0"><div class="text-overline step-number">Paso {{index+1}}</div><div class="text-subtitle1 text-weight-bold">{{step.title}}</div><div class="text-body2 text-grey-6 q-mt-xs">{{step.text}}</div></div>
            </div>
            <q-btn flat dense no-caps color="primary" :label="step.action" icon-right="arrow_forward" class="q-mt-md" @click="go(step.to)" />
          </q-card-section>
        </q-card>
        <div v-if="index<visibleSteps.length-1" class="flow-connector"><q-icon name="south" size="24px" /></div>
      </template>
    </div>

    <div class="row q-col-gutter-lg q-mt-lg">
      <div class="col-12 col-lg-7">
        <q-card flat class="viti-card">
          <q-card-section><div class="text-h6 text-weight-bold">Qué significa cada estado</div><div class="text-caption text-grey-6">El estado indica quién debe actuar y qué puede hacerse después.</div></q-card-section><q-separator />
          <q-list separator><q-item v-for="item in statusGuide" :key="item.label"><q-item-section avatar><q-avatar :color="item.bg" :text-color="item.fg" :icon="item.icon"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{item.label}}</q-item-label><q-item-label caption>{{item.text}}</q-item-label></q-item-section></q-item></q-list>
        </q-card>
      </div>
      <div class="col-12 col-lg-5">
        <q-card flat class="viti-card full-height">
          <q-card-section><div class="text-h6 text-weight-bold">Ayuda rápida por módulo</div><div class="text-caption text-grey-6">Referencia corta para orientarse sin convertir cada pantalla en un manual interminable.</div></q-card-section><q-separator />
          <q-list separator>
            <q-item><q-item-section avatar><q-icon name="assignment" color="primary"/></q-item-section><q-item-section><q-item-label>Solicitudes</q-item-label><q-item-label caption>Cada idea nueva tiene su propia SOL y cuestionario.</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="account_tree" color="primary"/></q-item-section><q-item-section><q-item-label>Proyectos</q-item-label><q-item-label caption>Desarrollo, progreso, fechas, decisiones y avances.</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="payments" color="primary"/></q-item-section><q-item-section><q-item-label>Pagos</q-item-label><q-item-label caption>El comprobante se revisa antes de modificar el saldo.</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="forum" color="primary"/></q-item-section><q-item-section><q-item-label>Mensajes</q-item-label><q-item-label caption>Coordinación, imágenes, PDF y documentos permitidos.</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="apps" color="primary"/></q-item-section><q-item-section><q-item-label>Aplicaciones</q-item-label><q-item-label caption>Beta, producción, finalización y entrega son estados separados.</q-item-label></q-item-section></q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.guide-page{max-width:1480px}.guide-status{background:color-mix(in srgb,var(--viti-card) 92%,var(--viti-primary));border:1px solid var(--viti-border)}.mini-stat{height:100%}.mini-number{font-size:28px;font-weight:800;margin-top:8px}.flow-map{display:grid;grid-template-columns:minmax(0,1fr);max-width:980px;margin:0 auto}.flow-card{border:1px solid var(--viti-border);border-radius:20px;transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease}.flow-card--active{border-color:color-mix(in srgb,var(--viti-primary) 70%,transparent);box-shadow:0 12px 34px rgba(67,56,202,.15);transform:translateY(-1px)}.flow-card--done{border-color:rgba(34,197,94,.35)}.flow-card--pending{opacity:.78}.step-avatar{background:var(--viti-bg);color:var(--viti-muted);border:1px solid var(--viti-border)}.step-avatar--active{background:color-mix(in srgb,var(--viti-primary) 16%,var(--viti-card));color:var(--viti-primary);border-color:color-mix(in srgb,var(--viti-primary) 55%,transparent)}.step-avatar--done{background:rgba(34,197,94,.14);color:#16a34a;border-color:rgba(34,197,94,.28)}.step-number{color:var(--viti-primary);letter-spacing:.08em}.flow-connector{height:38px;display:grid;place-items:center;color:var(--viti-muted)}.min-width-0{min-width:0}
@media(min-width:1200px){.flow-map--administrador{grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;max-width:none;align-items:stretch}.flow-map--administrador .flow-connector{display:none}.flow-map--administrador .flow-card{height:100%}.flow-map--cliente{max-width:920px}}
@media(max-width:600px){.guide-page{padding:16px 12px}.flow-card{border-radius:16px}.flow-card :deep(.q-card__section){padding:16px}.flow-connector{height:28px}}
</style>
