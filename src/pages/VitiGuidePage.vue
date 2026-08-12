<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'
import PageHeader from '../components/PageHeader.vue'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const requests = ref([])
const project = ref(null)
const dashboard = ref({ resumen:{} })

const isClient = computed(() => auth.user?.rol === 'cliente')
const isAdmin = computed(() => ['superadmin','administrador'].includes(auth.user?.rol))

const clientSteps = [
  { icon:'person_add', title:'Registro', text:'Tus datos personales y los datos básicos de tu negocio se registran una sola vez.', action:'Mi cuenta', to:'/mi-cuenta' },
  { icon:'workspace_premium', title:'Plan', text:'Compara VITI Inicial, Profesional, Empresa o una cotización personalizada según el alcance que necesitas.', action:'Nueva solicitud', actionKey:'request' },
  { icon:'tune', title:'Configuración corta', text:'Solo respondes algunas preguntas útiles para tu plan. Esta parte puede omitirse y completarse durante la revisión.', action:'Mis solicitudes', to:'/mi-cuenta' },
  { icon:'handshake', title:'Acuerdo inicial', text:'Confirmas plan, forma de pago y modalidad de suscripción. AGR Studio valida el alcance antes de iniciar.', action:'Mis pagos', to:'/mi-pagos' },
  { icon:'manage_search', title:'Revisión', text:'AGR Studio revisa la solicitud y puede pedir una aclaración directamente por el buzón.', action:'Mi buzón', to:'/mi-buzon' },
  { icon:'account_tree', title:'Proyecto', text:'Al aprobarse la solicitud se crea el proyecto. Allí ves avance, decisiones, fechas y archivos.', action:'Mi proyecto', to:'/mi-proyecto' },
  { icon:'science', title:'Prueba y entrega', text:'La aplicación puede pasar por beta antes de producción. La entrega y el acceso se habilitan de forma controlada.', action:'Aplicaciones', to:'/mi-aplicaciones' },
  { icon:'support_agent', title:'Operación y soporte', text:'Después de la entrega sigues usando VITI para pagos, mensajes, soporte e historial de tu solución.', action:'Mi buzón', to:'/mi-buzon' },
]

const adminSteps = [
  { icon:'person_add', title:'Nuevo registro', text:'VITI registra la empresa y su responsable. El panel recibe una notificación interna del nuevo registro.', action:'Empresas', to:'/clientes' },
  { icon:'fact_check', title:'Solicitud enviada', text:'Revisa plan, acuerdo comercial y únicamente las respuestas que la empresa realmente completó.', action:'Solicitudes', to:'/solicitudes' },
  { icon:'forum', title:'Aclarar por el buzón', text:'Usa mensajes y respuestas rápidas para confirmar alcance, pedir un dato o informar el siguiente paso.', action:'Atención', to:'/buzon' },
  { icon:'request_quote', title:'Confirmar alcance y costos', text:'Valida que el plan elegido cubra el trabajo. Si no, ajusta el plan o define una cotización personalizada.', action:'Planes y cobros', to:'/saas' },
  { icon:'account_tree', title:'Convertir en proyecto', text:'Cuando el alcance sea coherente crea el proyecto y define responsables, fechas y progreso.', action:'Proyectos', to:'/proyectos' },
  { icon:'terminal', title:'Desarrollo y avances', text:'Registra avances, archivos y decisiones visibles para la empresa sin confundir progreso con entrega.', action:'Proyectos', to:'/proyectos' },
  { icon:'payments', title:'Cobros y comprobantes', text:'Implementación y suscripción se controlan por separado. Los comprobantes se revisan antes de afectar saldos.', action:'Pagos VITI', to:'/pagos' },
  { icon:'verified_user', title:'Aplicación y soporte', text:'Controla beta, producción, acceso, entrega y soporte posterior desde Aplicaciones y Atención.', action:'Aplicaciones', to:'/aplicaciones' },
]

const modulesAdmin = [
  ['Empresas','business','Registro del negocio, responsable, datos de contacto y relación con VITI.','/clientes'],
  ['Solicitudes','fact_check','Plan, acuerdo, respuestas reales, revisión y conversión a proyecto.','/solicitudes'],
  ['Proyectos','account_tree','Alcance aprobado, progreso, fechas, avances y archivos.','/proyectos'],
  ['Aplicaciones','apps','Estado técnico, entorno, acceso, beta, producción y entrega.','/aplicaciones'],
  ['Pagos VITI','payments','Implementación, suscripción, comprobantes y revisión de saldos.','/pagos'],
  ['Atención','forum','Mensajes, documentos, llamadas programadas y respuestas rápidas.','/buzon'],
]

const modulesClient = [
  ['Mi negocio','storefront','Datos de tu empresa y contexto activo dentro de VITI.','/mi-negocio'],
  ['Solicitudes','assignment','Nuevas necesidades, plan elegido y estado de revisión.','/mi-cuenta'],
  ['Mi proyecto','account_tree','Progreso, avances y archivos del proyecto aprobado.','/mi-proyecto'],
  ['Aplicaciones','apps','Acceso a los sistemas que AGR Studio ya te entregó.','/mi-aplicaciones'],
  ['Mis pagos','payments','Implementación, suscripción, saldos y comprobantes.','/mi-pagos'],
  ['Mi buzón','forum','Comunicación directa con AGR Studio y documentos privados.','/mi-buzon'],
]

const modules = computed(() => isAdmin.value ? modulesAdmin : modulesClient)
const steps = computed(() => isAdmin.value ? adminSteps : clientSteps)
const latestRequest = computed(() => requests.value[0] || null)

const focusIndex = computed(() => {
  if (isAdmin.value) {
    const r = dashboard.value?.resumen || {}
    if (Number(r.aplicaciones_pendientes_entrega || 0) > 0) return 7
    if (Number(r.proyectos_activos || 0) > 0) return 5
    if (Number(r.solicitudes_activas || 0) > 0) return 1
    return 0
  }
  const req = latestRequest.value
  if (!req) return 1
  if (req.estado === 'borrador') return 2
  if (req.estado === 'en_revision') return 4
  if (req.estado === 'aprobada') return 5
  if (req.estado === 'convertida') {
    if (!project.value) return 5
    if (project.value?.aplicacion?.acceso_cliente) return 7
    return 6
  }
  return 0
})

function go(path) { if (path) router.push(path) }
async function execute(step) {
  if (step.actionKey === 'request') {
    try {
      const { data } = await api.post('/mi/solicitud')
      window.location.href = data.data.enlace_publico
    } catch { router.push('/mi-cuenta') }
    return
  }
  go(step.to)
}

async function load() {
  loading.value = true
  try {
    if (isClient.value) {
      const [reqResult, projectResult] = await Promise.allSettled([api.get('/mi/solicitudes'),api.get('/mi/proyecto')])
      if (reqResult.status === 'fulfilled') requests.value = reqResult.value.data.data || []
      if (projectResult.status === 'fulfilled') project.value = projectResult.value.data.data || null
    } else if (isAdmin.value) {
      try { dashboard.value = (await api.get('/dashboard')).data || { resumen:{} } } catch { dashboard.value = { resumen:{} } }
    }
  } finally { loading.value = false }
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page guide-page">
    <q-inner-loading :showing="loading" />
    <PageHeader eyebrow="AGR Studio · VITI" title="Guía VITI" subtitle="Qué hace cada módulo y cuál es el siguiente paso. Sin manuales eternos ni funciones que ya no existen." />

    <q-banner rounded class="guide-summary q-mb-lg">
      <template #avatar><q-icon name="route" color="primary" size="30px" /></template>
      <div class="text-weight-bold">{{ isAdmin ? 'Flujo de trabajo de AGR Studio' : 'Así avanza tu solicitud dentro de VITI' }}</div>
      <div class="text-body2 text-grey-6">El paso resaltado es una orientación según la actividad actual. Puedes entrar directamente a cualquier módulo desde las tarjetas.</div>
    </q-banner>

    <div class="flow-grid q-mb-xl">
      <q-card v-for="(step,index) in steps" :key="step.title" flat class="viti-card guide-step" :class="{'guide-step--active':index===focusIndex}">
        <q-card-section>
          <div class="row items-start no-wrap q-gutter-md">
            <q-avatar :color="index===focusIndex?'primary':'grey-3'" :text-color="index===focusIndex?'white':'grey-8'" size="44px"><q-icon :name="step.icon" /></q-avatar>
            <div class="col min-width-0">
              <div class="text-overline text-primary">Paso {{index+1}}</div>
              <div class="text-subtitle1 text-weight-bold">{{step.title}}</div>
              <div class="text-body2 text-grey-6 q-mt-xs">{{step.text}}</div>
            </div>
          </div>
          <q-btn flat dense no-caps color="primary" :label="step.action" icon-right="arrow_forward" class="q-mt-md" @click="execute(step)" />
        </q-card-section>
      </q-card>
    </div>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-xl-8">
        <q-card flat class="viti-card">
          <q-card-section><div class="text-h6 text-weight-bold">Funciones actuales de VITI</div><div class="text-caption text-grey-6">Esta lista corresponde a los módulos que realmente existen en el panel actual.</div></q-card-section>
          <q-separator />
          <q-list separator>
            <q-item v-for="module in modules" :key="module[0]" clickable @click="go(module[3])">
              <q-item-section avatar><q-avatar color="primary" text-color="white" :icon="module[1]" /></q-item-section>
              <q-item-section><q-item-label class="text-weight-bold">{{module[0]}}</q-item-label><q-item-label caption>{{module[2]}}</q-item-label></q-item-section>
              <q-item-section side><q-icon name="chevron_right" /></q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
      <div class="col-12 col-xl-4">
        <q-card flat class="viti-card full-height">
          <q-card-section><div class="text-h6 text-weight-bold">Reglas simples</div></q-card-section><q-separator />
          <q-list separator>
            <q-item><q-item-section avatar><q-icon name="fact_check" color="primary" /></q-item-section><q-item-section><q-item-label>Solicitud ≠ proyecto</q-item-label><q-item-label caption>Primero se revisa alcance y acuerdo. Después se convierte.</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="science" color="primary" /></q-item-section><q-item-section><q-item-label>Beta ≠ entrega</q-item-label><q-item-label caption>Una prueba puede existir antes de habilitar el acceso definitivo.</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="payments" color="primary" /></q-item-section><q-item-section><q-item-label>Comprobante ≠ pago confirmado</q-item-label><q-item-label caption>AGR Studio revisa el comprobante antes de modificar el saldo.</q-item-label></q-item-section></q-item>
            <q-item><q-item-section avatar><q-icon name="forum" color="primary" /></q-item-section><q-item-section><q-item-label>El buzón conserva contexto</q-item-label><q-item-label caption>Usa mensajes, documentos y respuestas rápidas para coordinar sin perder trazabilidad.</q-item-label></q-item-section></q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.guide-page{max-width:1480px}.guide-summary{background:color-mix(in srgb,var(--viti-card) 92%,var(--viti-primary));border:1px solid var(--viti-border)}.flow-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.guide-step{height:100%;border:1px solid var(--viti-border)}.guide-step--active{border-color:color-mix(in srgb,var(--viti-primary) 72%,transparent);box-shadow:0 10px 30px rgba(21,101,192,.14)}.min-width-0{min-width:0}@media(max-width:760px){.flow-grid{grid-template-columns:1fr}}
</style>
