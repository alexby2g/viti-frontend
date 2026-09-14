<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const loading = ref(true)
const saving = ref(false)
const sending = ref(false)
const step = ref(1)
const data = ref(null)

const form = reactive({
  cliente_nombre: '',
  cliente_whatsapp: '',
  cliente_ciudad: '',
  empresa_nombre: '',
  empresa_actividad: '',
  empresa_telefono: '',
  empresa_whatsapp: '',
  empresa_ciudad: '',
  titulo_sistema: '',
  resumen: '',
  plan_viti_id: null,
  forma_pago_preferida: '',
  frecuencia_suscripcion_preferida: '',
  declaracion_aceptada: false,
  declaracion_nombre: '',
  declaracion_fecha: new Date().toISOString().slice(0,10),
  acuerdo_comercial_aceptado: false,
  acuerdo_comercial_nombre: '',
  acuerdo_comercial_fecha: new Date().toISOString().slice(0,10),
})

const token = computed(() => String(route.params.token || ''))
const solicitud = computed(() => data.value || {})
const plans = computed(() => Array.isArray(data.value?.planes_disponibles) ? data.value.planes_disponibles : [])
const selectedPlan = computed(() => plans.value.find(p => Number(p.id) === Number(form.plan_viti_id)) || null)
const hasSubscription = computed(() => selectedPlan.value?.precio_mensual !== null || selectedPlan.value?.precio_anual !== null)
const canNext = computed(() => {
  if (step.value === 1) return Boolean(form.empresa_nombre.trim() && form.titulo_sistema.trim())
  if (step.value === 2) return Boolean(form.resumen.trim())
  if (step.value === 3) return Boolean(form.plan_viti_id && form.forma_pago_preferida && (!hasSubscription.value || form.frecuencia_suscripcion_preferida))
  return false
})

function money(v) { return v == null || v === '' ? 'A cotizar' : `${Number(v).toFixed(0)} Bs` }
function planLabel(plan) { return `${plan.nombre}${plan.precio_proyecto != null ? ` · ${money(plan.precio_proyecto)}` : ''}` }
function paymentOptions(plan) {
  if (!plan) return []
  const options = [{ value:'por_definir', label:'Acordarlo con AGR Studio' }]
  if (plan.precio_proyecto != null) options.unshift({ value:'contado', label:'Pago completo de implementación' })
  options.unshift({ value:'50_50', label:'50% al iniciar / 50% al entregar' })
  if (String(plan.codigo || '').toLowerCase().includes('profesional') || String(plan.codigo || '').toLowerCase().includes('empresa')) options.unshift({ value:'tres_partes', label:'40% al iniciar / 30% en avance / 30% al entregar' })
  return [...new Map(options.map(o => [o.value,o])).values()]
}

function hydrate() {
  const s = solicitud.value
  form.cliente_nombre = s.cliente?.nombre || ''
  form.cliente_whatsapp = s.cliente?.whatsapp || ''
  form.cliente_ciudad = s.cliente?.ciudad || ''
  form.empresa_nombre = s.empresa?.nombre_comercial || ''
  form.empresa_actividad = s.empresa?.actividad || ''
  form.empresa_telefono = s.empresa?.telefono || ''
  form.empresa_whatsapp = s.empresa?.whatsapp || ''
  form.empresa_ciudad = s.empresa?.ciudad || ''
  form.titulo_sistema = s.titulo || ''
  form.resumen = s.resumen || ''
  form.plan_viti_id = s.plan_viti_id || s.planViti?.id || null
  form.forma_pago_preferida = s.forma_pago_preferida || ''
  form.frecuencia_suscripcion_preferida = s.frecuencia_suscripcion_preferida || ''
  form.declaracion_aceptada = Boolean(s.declaracion_aceptada)
  form.declaracion_nombre = s.declaracion_nombre || s.cliente?.nombre || ''
  form.declaracion_fecha = s.declaracion_fecha || form.declaracion_fecha
  form.acuerdo_comercial_aceptado = Boolean(s.acuerdo_comercial_aceptado)
  form.acuerdo_comercial_nombre = s.acuerdo_comercial_nombre || s.cliente?.nombre || ''
  form.acuerdo_comercial_fecha = s.acuerdo_comercial_fecha || form.acuerdo_comercial_fecha
}

async function load() {
  if (!token.value) { router.replace('/solicitud'); return }
  try {
    const response = await api.get(`/publico/solicitudes/${token.value}`)
    data.value = response.data.data
    hydrate()
  } catch (error) {
    $q.notify({ type:'negative', message:error?.response?.data?.message || 'La solicitud no está disponible.' })
    router.replace('/solicitud')
  } finally { loading.value = false }
}

function next() {
  if (!canNext.value) {
    const messages = {
      1:'Completa el nombre del sistema y el nombre del negocio.',
      2:'Cuéntanos brevemente qué quieres resolver.',
      3:'Selecciona un plan y la forma de pago que prefieras.',
    }
    $q.notify({ type:'warning', message:messages[step.value] })
    return
  }
  if (step.value < 4) step.value += 1
}

function back() { if (step.value > 1) step.value -= 1 }

async function saveDraft() {
  saving.value = true
  try {
    await api.put(`/publico/solicitudes/${token.value}`, {
      registro: {
        cliente_nombre: form.cliente_nombre,
        cliente_whatsapp: form.cliente_whatsapp,
        cliente_ciudad: form.cliente_ciudad,
        empresa_nombre: form.empresa_nombre,
        empresa_actividad: form.empresa_actividad,
        empresa_telefono: form.empresa_telefono,
        empresa_whatsapp: form.empresa_whatsapp,
        empresa_ciudad: form.empresa_ciudad,
        titulo_sistema: form.titulo_sistema,
        resumen: form.resumen,
      },
      plan_viti_id: form.plan_viti_id,
      forma_pago_preferida: form.forma_pago_preferida,
      frecuencia_suscripcion_preferida: form.frecuencia_suscripcion_preferida,
      declaracion_aceptada: form.declaracion_aceptada,
      declaracion_nombre: form.declaracion_nombre,
      declaracion_fecha: form.declaracion_fecha,
      acuerdo_comercial_aceptado: form.acuerdo_comercial_aceptado,
      acuerdo_comercial_nombre: form.acuerdo_comercial_nombre,
      acuerdo_comercial_fecha: form.acuerdo_comercial_fecha,
    })
  } finally { saving.value = false }
}

async function submit() {
  if (!form.declaracion_aceptada || !form.declaracion_nombre) return $q.notify({ type:'warning', message:'Confirma que los datos son correctos.' })
  if (!form.acuerdo_comercial_aceptado || !form.acuerdo_comercial_nombre) return $q.notify({ type:'warning', message:'Acepta el acuerdo comercial inicial.' })
  if (!form.plan_viti_id || !form.forma_pago_preferida || (hasSubscription.value && !form.frecuencia_suscripcion_preferida)) return $q.notify({ type:'warning', message:'Completa el plan y la modalidad de pago.' })
  sending.value = true
  try {
    await saveDraft()
    const response = await api.post(`/publico/solicitudes/${token.value}/enviar`)
    $q.notify({ type:'positive', message:response.data?.message || 'Solicitud enviada correctamente.' })
    router.replace('/mi-cuenta')
  } catch (error) {
    $q.notify({ type:'negative', message:error?.response?.data?.message || 'No pudimos enviar la solicitud.' })
  } finally { sending.value = false }
}

onMounted(load)
</script>

<template>
  <q-page class="request-page">
    <q-inner-loading :showing="loading" />
    <div v-if="!loading" class="request-shell">
      <header class="request-header row items-center justify-between">
        <AppBrand />
        <q-btn flat no-caps color="primary" label="Volver a Mi espacio" to="/mi-cuenta" />
      </header>

      <div class="request-kicker">NUEVA SOLICITUD VITI · {{ solicitud.codigo }}</div>
      <div class="request-title row items-end justify-between q-gutter-lg">
        <div>
          <h1>Cuéntanos tu idea. Nosotros nos encargamos de aterrizarla.</h1>
          <p>No necesitas saber de tecnología. Queremos entender tu negocio y lo que quieres lograr.</p>
        </div>
        <q-badge outline color="primary" class="step-badge">Paso {{ step }} de 4</q-badge>
      </div>
      <q-linear-progress :value="step/4" rounded color="primary" track-color="blue-1" size="8px" class="q-mt-lg" />

      <q-card flat class="request-card q-mt-xl">
        <q-card-section v-if="step===1" class="step-section">
          <div class="step-chip">01 · TU SISTEMA</div>
          <h2>¿Cómo se llamará y qué quieres construir?</h2>
          <div class="row q-col-gutter-lg q-mt-md">
            <div class="col-12 col-md-6"><q-input v-model="form.titulo_sistema" outlined label="Nombre del sistema *" placeholder="Ej. Mi sistema" hint="El nombre que quieres que tenga tu aplicación." /></div>
            <div class="col-12 col-md-6"><q-input v-model="form.empresa_nombre" outlined label="Negocio o proyecto *" placeholder="Ej. Mi negocio" /></div>
            <div class="col-12 col-md-6"><q-input v-model="form.empresa_actividad" outlined label="¿A qué se dedica?" placeholder="Ej. Venta de alimentos" /></div>
            <div class="col-12 col-md-6"><q-input v-model="form.empresa_ciudad" outlined label="Ciudad" /></div>
          </div>
        </q-card-section>

        <q-card-section v-else-if="step===2" class="step-section">
          <div class="step-chip">02 · TU VISIÓN</div>
          <h2>Descríbenos la idea con tus palabras.</h2>
          <p class="lead">No necesitas definir módulos. Solo dinos qué quieres resolver y cómo imaginas que funcionará.</p>
          <q-input v-model="form.resumen" outlined type="textarea" autogrow label="¿Qué hará tu sistema? *" placeholder="Ej. Quiero registrar productos de comida, mostrarlos en un catálogo y permitir que mis clientes hagan pedidos." counter maxlength="5000" class="q-mt-lg" />
          <div class="vision-hints q-mt-lg">
            <div><q-icon name="groups" color="primary"/> ¿Para quién será?</div>
            <div><q-icon name="lightbulb" color="primary"/> ¿Qué problema resolverá?</div>
            <div><q-icon name="visibility" color="primary"/> ¿Cómo te gustaría que se vea?</div>
          </div>
        </q-card-section>

        <q-card-section v-else-if="step===3" class="step-section">
          <div class="step-chip">03 · PROPUESTA VITI</div>
          <h2>Ahora VITI te muestra opciones.</h2>
          <div class="proposal-card q-mt-lg">
            <div class="proposal-label">Lo que entendimos</div>
            <div class="proposal-title">{{ form.titulo_sistema || 'Tu sistema' }}</div>
            <p>{{ form.resumen || 'Tu idea todavía no tiene una descripción.' }}</p>
            <div class="proposal-modules">
              <q-chip v-for="item in ['Catálogo','Clientes','Operación','Pedidos','Seguimiento']" :key="item" color="blue-1" text-color="primary" icon="check">{{ item }}</q-chip>
            </div>
            <div class="proposal-note"><q-icon name="auto_awesome" color="primary"/> VITI utiliza esta información para preparar la propuesta. Los módulos finales se ajustan después de la evaluación.</div>
          </div>
          <div class="row q-col-gutter-lg q-mt-lg">
            <div v-for="plan in plans" :key="plan.id" class="col-12 col-md-6 col-lg-4">
              <q-card flat bordered class="plan-card" :class="{selected:Number(form.plan_viti_id)===Number(plan.id)}" @click="form.plan_viti_id=plan.id">
                <q-card-section><div class="text-overline text-primary">PLAN VITI</div><div class="text-h6 text-weight-bold">{{ planLabel(plan) }}</div><div class="text-caption text-grey-6 q-mt-sm">{{ plan.descripcion || 'Alcance definido con AGR Studio.' }}</div><q-badge v-if="Number(form.plan_viti_id)===Number(plan.id)" color="primary" class="q-mt-md">Seleccionado</q-badge></q-card-section>
              </q-card>
            </div>
          </div>
          <q-option-group v-if="selectedPlan" v-model="form.forma_pago_preferida" :options="paymentOptions(selectedPlan).map(o=>({label:o.label,value:o.value}))" color="primary" type="radio" class="q-mt-lg" />
          <div v-if="hasSubscription" class="q-mt-md"><q-option-group v-model="form.frecuencia_suscripcion_preferida" :options="[{label:'Mensual',value:'mensual'},{label:'Anual',value:'anual'}]" color="primary" type="radio" /></div>
        </q-card-section>

        <q-card-section v-else class="step-section">
          <div class="step-chip">04 · CONFIRMA</div>
          <h2>Una última revisión y la enviamos.</h2>
          <div class="summary-grid q-mt-lg">
            <div><span>Sistema</span><strong>{{ form.titulo_sistema }}</strong></div>
            <div><span>Negocio</span><strong>{{ form.empresa_nombre }}</strong></div>
            <div><span>Plan</span><strong>{{ selectedPlan?.nombre || 'No seleccionado' }}</strong></div>
            <div><span>Pago</span><strong>{{ form.forma_pago_preferida || 'Por definir' }}</strong></div>
          </div>
          <q-checkbox v-model="form.declaracion_aceptada" label="Confirmo que la información de esta solicitud es correcta." class="q-mt-lg" />
          <q-input v-model="form.declaracion_nombre" outlined label="Nombre de quien confirma" class="q-mt-sm" />
          <q-checkbox v-model="form.acuerdo_comercial_aceptado" label="Acepto el acuerdo comercial inicial para que AGR Studio evalúe y prepare la propuesta." class="q-mt-md" />
          <q-input v-model="form.acuerdo_comercial_nombre" outlined label="Nombre para el acuerdo" class="q-mt-sm" />
        </q-card-section>

        <q-card-actions class="request-actions" align="between">
          <q-btn flat no-caps color="grey-7" label="Atrás" :disable="step===1 || saving || sending" @click="back" />
          <div class="row q-gutter-sm">
            <q-btn v-if="step<4" color="primary" unelevated no-caps label="Continuar" @click="next" />
            <q-btn v-else color="primary" unelevated no-caps icon="send" label="Enviar solicitud" :loading="sending" @click="submit" />
          </div>
        </q-card-actions>
      </q-card>
    </div>
  </q-page>
</template>

<style scoped>
.request-page{min-height:100vh;background:radial-gradient(circle at 88% 4%,rgba(36,107,199,.16),transparent 32rem),linear-gradient(180deg,#06111f,#091a2e);color:#edf4fb}.request-shell{width:min(1060px,calc(100% - 32px));margin:0 auto;padding:28px 0 60px}.request-header{padding-bottom:22px;border-bottom:1px solid rgba(121,151,179,.16)}.request-kicker,.step-chip{font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#ff9a3c}.request-kicker{margin-top:30px}.request-title{margin-top:12px}.request-title h1{font-size:clamp(38px,5vw,62px);line-height:.98;letter-spacing:-.055em;max-width:820px;margin:0;color:#f6f9fd}.request-title p{color:#a9bac9;max-width:720px;font-size:17px;line-height:1.7;margin:16px 0 0}.step-badge{padding:10px 14px;color:#ffb067!important;border-color:rgba(242,139,48,.55)!important}.request-card{border:1px solid rgba(91,125,157,.28);background:linear-gradient(180deg,rgba(11,28,47,.97),rgba(13,35,59,.95));border-radius:24px;box-shadow:0 24px 70px rgba(0,0,0,.25);color:#edf4fb;overflow:hidden}.step-section{padding:42px}.step-section h2{font-size:34px;line-height:1.08;letter-spacing:-.04em;margin:14px 0;color:#f5f9ff}.lead{color:#a9bac9;line-height:1.7}.vision-hints{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.vision-hints div{padding:15px;border-radius:14px;background:rgba(17,43,70,.78);border:1px solid rgba(91,125,157,.22);color:#b8c7d4;display:flex;gap:8px;align-items:center;font-size:12px}.vision-hints :deep(.q-icon){color:#ff9a3c!important}.proposal-card{padding:24px;border-radius:18px;background:linear-gradient(135deg,#0e2742,#143557);border:1px solid rgba(242,139,48,.22);color:#f3f7fc}.proposal-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#ff9a3c;font-weight:900}.proposal-title{font-size:28px;font-weight:800;margin-top:8px}.proposal-card p{color:#bac9d6;line-height:1.7}.proposal-modules{display:flex;flex-wrap:wrap;gap:8px}.proposal-note{margin-top:18px;padding:12px 14px;border-radius:12px;background:rgba(6,20,37,.50);color:#c8d6e1;border:1px solid rgba(98,133,165,.18);display:flex;align-items:flex-start;gap:8px;font-size:12px}.plan-card{cursor:pointer;border-radius:16px;height:100%;transition:.18s;background:rgba(16,40,66,.82)!important;color:#eaf1f8!important;border-color:rgba(91,125,157,.28)!important}.plan-card:hover{border-color:rgba(242,139,48,.45)!important;transform:translateY(-2px)}.plan-card.selected{border:2px solid #f28b30!important;background:linear-gradient(180deg,rgba(24,54,87,.96),rgba(16,39,65,.98))!important;box-shadow:0 14px 32px rgba(0,0,0,.15)}.plan-card .text-grey-6{color:#9fb1c1!important}.summary-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.summary-grid>div{padding:16px;border-radius:14px;background:rgba(16,41,67,.76);border:1px solid rgba(91,125,157,.22);display:flex;flex-direction:column;gap:5px}.summary-grid span{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#ff9a3c;font-weight:800}.summary-grid strong{font-size:15px;color:#edf4fb}.request-actions{padding:20px 28px;border-top:1px solid rgba(111,143,173,.16);background:rgba(7,21,37,.32)}
:deep(.q-field--outlined .q-field__control),:deep(.q-field--filled .q-field__control){background:#0a1a2c!important;color:#f3f7fc!important;border-radius:14px;min-height:54px}:deep(.q-field--outlined .q-field__control:before){border-color:#294864!important}:deep(.q-field--outlined:hover .q-field__control:before){border-color:#4b6d8b!important}:deep(.q-field--focused .q-field__control){background:#0d2239!important;box-shadow:0 0 0 3px rgba(242,139,48,.08)!important}:deep(.q-field--focused .q-field__control:after){color:#f28b30!important}:deep(.q-field__label){color:#91a6b9!important}:deep(.q-field--focused .q-field__label){color:#ffb067!important}:deep(.q-field__native),:deep(.q-field__input){color:#f4f8fc!important;opacity:1!important}:deep(.q-field__native::placeholder),:deep(.q-field__input::placeholder){color:#657f98!important;opacity:1!important}:deep(.q-field__marginal){color:#7891a8!important}:deep(.q-field__bottom){color:#7890a6!important}:deep(.q-checkbox__label),:deep(.q-radio__label){color:#c9d5df}:deep(.q-chip){background:rgba(255,255,255,.06)!important;color:#dce7f0!important}:deep(.q-btn){border-radius:12px;transition:.16s ease}:deep(.q-btn:hover){transform:translateY(-1px)}:deep(.q-btn.q-btn--flat),:deep(.q-btn.q-btn--outline){background:rgba(255,255,255,.025)!important}:deep(.q-btn.q-btn--flat:hover),:deep(.q-btn.q-btn--outline:hover){background:rgba(242,139,48,.07)!important}
@media(max-width:800px){.step-section{padding:28px 22px}.vision-hints{grid-template-columns:1fr}.summary-grid{grid-template-columns:1fr}}@media(max-width:600px){.request-shell{width:min(100% - 20px,1080px)}.request-title{align-items:flex-start;flex-direction:column}.request-title h1{font-size:40px}.request-card{border-radius:18px}.step-section{padding:22px 18px}}
</style>
