<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api, initCsrf } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const route = useRoute()
const $q = useQuasar()
const item = ref(null)
const loading = ref(true)
const saving = ref(false)
const sent = ref(false)
const step = ref(1)
const answers = reactive({})
const otherAnswers = reactive({})
const declaration = reactive({ aceptada:false, nombre:'', fecha:new Date().toISOString().slice(0,10) })
const commercial = reactive({
  plan_viti_id:null,
  forma_pago_preferida:null,
  frecuencia_suscripcion_preferida:null,
  acuerdo_comercial_aceptado:false,
  acuerdo_comercial_nombre:'',
  acuerdo_comercial_fecha:new Date().toISOString().slice(0,10),
})

const moduleNames = {
  inicio:'Inicio', agenda:'Agenda', ordenes:'Órdenes y servicios', clientes:'Clientes', equipos:'Equipos',
  tecnicos:'Técnicos', inventario:'Inventario técnico', pagos:'Pagos y saldos', garantias:'Garantías',
  historial:'Historial y reportes', buzon:'Mensajes',
}
const supportedFunctions = {
  initial:new Set(['Registro de clientes','Registro de trabajadores','Registro de servicios','Reservas o citas','Órdenes de trabajo','Historial de clientes','Agenda o calendario','Archivos y documentos','Fotografías','Otro']),
  professional:new Set(['Registro de clientes','Registro de trabajadores','Registro de servicios','Reservas o citas','Órdenes de trabajo','Control de pagos','Cuentas por cobrar','Garantías','Historial de clientes','Reportes','Agenda o calendario','Archivos y documentos','Fotografías','Otro']),
  enterprise:new Set(['Registro de clientes','Registro de trabajadores','Registro de productos','Registro de servicios','Inventario','Reservas o citas','Órdenes de trabajo','Control de pagos','Cuentas por cobrar','Garantías','Historial de clientes','Reportes','Agenda o calendario','Archivos y documentos','Fotografías','Otro']),
  custom:new Set(['Registro de clientes','Registro de trabajadores','Registro de productos','Registro de servicios','Inventario','Reservas o citas','Órdenes de trabajo','Control de pagos','Cuentas por cobrar','Garantías','Historial de clientes','Reportes','Agenda o calendario','Archivos y documentos','Fotografías','Otro']),
}

const sections = computed(() => item.value?.cuestionario?.secciones || [])
const allQuestions = computed(() => sections.value.flatMap(section => section.preguntas || []))
const plans = computed(() => item.value?.planes_disponibles || [])
const draftKey = computed(() => `viti-form-short-${route.params.token}`)
const questionByNumber = number => allQuestions.value.find(q => Number(q.numero) === Number(number))
const hasValue = value => Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0

function planKey(plan) {
  const code = String(plan?.codigo || '').toLowerCase()
  if (code.includes('personalizado')) return 'custom'
  if (code.includes('empresa')) return 'enterprise'
  if (code.includes('profesional')) return 'professional'
  return 'initial'
}
const selectedPlan = computed(() => plans.value.find(plan => Number(plan.id) === Number(commercial.plan_viti_id)) || item.value?.plan_viti || null)
const selectedKey = computed(() => planKey(selectedPlan.value))
const operationNumbers = computed(() => {
  const numbers = [12,13,17,18,19]
  if (selectedKey.value === 'professional') numbers.push(32,35)
  if (selectedKey.value === 'enterprise') numbers.push(27,32,35)
  if (selectedKey.value === 'custom') numbers.push(70)
  return numbers
})
const operationQuestions = computed(() => operationNumbers.value.map(questionByNumber).filter(Boolean))
const answeredOperation = computed(() => operationQuestions.value.filter(q => hasValue(answers[q.id])).length)

const planBenefits = key => ({
  initial:['1 aplicación VITI','Hasta 3 usuarios','Agenda, órdenes, clientes, equipos e historial'],
  professional:['1 aplicación VITI','Hasta 6 usuarios','Pagos, saldos, comprobantes y garantías'],
  enterprise:['Hasta 3 aplicaciones','Hasta 15 usuarios','Inventario técnico y operación avanzada'],
  custom:['AGR Studio revisa el alcance contigo','Sin cuestionario interminable','Cotización antes de desarrollar'],
}[key] || [])

function annualSaving(plan) {
  return plan?.precio_mensual && plan?.precio_anual ? Math.max(0, Number(plan.precio_mensual) * 12 - Number(plan.precio_anual)) : 0
}
function money(value) {
  return value === null || value === undefined || value === '' ? 'A cotizar' : `${Number(value).toFixed(0)} Bs`
}
function errorMessage(e, fallback) {
  const bag = e?.response?.data?.errors
  if (bag) return Object.values(bag).flat()[0]
  return e?.response?.data?.message || fallback
}
function optionsFor(q) {
  if (Number(q.numero) !== 17) return q.opciones || []
  const allowed = supportedFunctions[selectedKey.value] || supportedFunctions.initial
  return (q.opciones || []).filter(option => allowed.has(option))
}
function suggestionsFor(q) {
  const number = Number(q.numero)
  if (number === 13) return ['1','2','3','5','10']
  if (number === 18) {
    const base = ['Organizar citas y órdenes de servicio','Registrar clientes y equipos','Llevar historial de trabajos realizados']
    if (['professional','enterprise'].includes(selectedKey.value)) base.push('Controlar pagos, saldos y garantías')
    if (selectedKey.value === 'enterprise') base.push('Controlar inventario técnico')
    if (selectedKey.value === 'custom') base.push('Necesito una función adicional a los planes estándar')
    return base
  }
  if (number === 19) return [
    'El cliente solicita atención → agendo la visita → realizo diagnóstico → el cliente confirma → realizo el servicio → registro el pago → cierro el trabajo.',
    'Recibo la solicitud → registro al cliente → creo una orden → asigno el trabajo → actualizo el estado → finalizo y guardo el historial.',
  ]
  if (number === 70) return ['Necesito más usuarios o aplicaciones que los planes estándar','Tengo un flujo especial que AGR Studio debe revisar','Quiero explicar un requerimiento adicional en la revisión']
  return []
}
function applySuggestion(q, value) {
  answers[q.id] = q.tipo === 'numero' ? Number(value) : value
}
function hasOther(q) { return optionsFor(q).includes('Otro') }
function selectedOther(q) {
  const value = answers[q.id]
  return Array.isArray(value) ? value.includes('Otro') : value === 'Otro'
}
function normalizedValue(id, value) {
  const custom = String(otherAnswers[id] || '').trim()
  if (Array.isArray(value)) return value.map(x => x === 'Otro' && custom ? `Otro: ${custom}` : x)
  return value === 'Otro' && custom ? `Otro: ${custom}` : value
}
function paymentOptions() {
  if (selectedKey.value === 'custom') return [{ value:'por_definir', label:'Definir con AGR Studio', description:'Se acuerda después de revisar el alcance y la cotización.' }]
  const options = []
  if (['professional','enterprise'].includes(selectedKey.value)) options.push({ value:'tres_partes', label:'40% al iniciar / 30% en avance / 30% al entregar', description:'Tres hitos claros para la implementación.' })
  else options.push({ value:'50_50', label:'50% al iniciar / 50% al entregar', description:'Inicio y entrega final.' })
  options.push({ value:'contado', label:'Pago completo de implementación', description:'La implementación se paga en un solo desembolso.' })
  options.push({ value:'por_definir', label:'Acordarlo con AGR Studio', description:'Se define durante la revisión de la solicitud.' })
  return options
}
function selectPlan(plan) {
  if (sent.value) return
  commercial.plan_viti_id = plan.id
  if (planKey(plan) === 'custom') {
    commercial.frecuencia_suscripcion_preferida = null
    commercial.forma_pago_preferida = 'por_definir'
  } else if (!commercial.frecuencia_suscripcion_preferida) {
    commercial.frecuencia_suscripcion_preferida = 'mensual'
  }
  const allowed = paymentOptions().map(option => option.value)
  if (!allowed.includes(commercial.forma_pago_preferida)) commercial.forma_pago_preferida = null
}

function storeDraft() {
  if (sent.value) return
  try {
    localStorage.setItem(draftKey.value, JSON.stringify({ answers:{...answers}, otherAnswers:{...otherAnswers}, declaration:{...declaration}, commercial:{...commercial}, step:step.value }))
  } catch {}
}
function restoreDraft() {
  if (sent.value) return
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey.value) || 'null')
    if (!draft) return
    Object.assign(answers, draft.answers || {})
    Object.assign(otherAnswers, draft.otherAnswers || {})
    Object.assign(declaration, draft.declaration || {})
    Object.assign(commercial, draft.commercial || {})
    if (Number(draft.step) >= 1 && Number(draft.step) <= 3) step.value = Number(draft.step)
  } catch {}
}
function clearDraft() { try { localStorage.removeItem(draftKey.value) } catch {} }
function networkFailure(e) { return !navigator.onLine || !e?.response }

async function load() {
  loading.value = true
  try {
    item.value = (await api.get(`/publico/solicitudes/${route.params.token}`)).data.data
    for (const q of allQuestions.value) answers[q.id] = q.tipo === 'seleccion_multiple' ? [] : ''
    for (const response of item.value.respuestas || []) {
      const raw = response.respuesta_json ?? response.respuesta_texto ?? ''
      if (Array.isArray(raw)) {
        const custom = raw.find(value => typeof value === 'string' && value.startsWith('Otro: '))
        answers[response.pregunta_id] = custom ? [...raw.filter(value => value !== custom), 'Otro'] : raw
        otherAnswers[response.pregunta_id] = custom ? custom.slice(6) : ''
      } else if (typeof raw === 'string' && raw.startsWith('Otro: ')) {
        answers[response.pregunta_id] = 'Otro'
        otherAnswers[response.pregunta_id] = raw.slice(6)
      } else answers[response.pregunta_id] = raw
    }
    Object.assign(declaration, {
      aceptada:Boolean(item.value.declaracion_aceptada),
      nombre:item.value.declaracion_nombre || item.value.cliente?.nombre || '',
      fecha:item.value.declaracion_fecha || new Date().toISOString().slice(0,10),
    })
    Object.assign(commercial, {
      plan_viti_id:item.value.plan_viti_id || null,
      forma_pago_preferida:item.value.forma_pago_preferida || null,
      frecuencia_suscripcion_preferida:item.value.frecuencia_suscripcion_preferida || null,
      acuerdo_comercial_aceptado:Boolean(item.value.acuerdo_comercial_aceptado),
      acuerdo_comercial_nombre:item.value.acuerdo_comercial_nombre || item.value.cliente?.nombre || '',
      acuerdo_comercial_fecha:item.value.acuerdo_comercial_fecha || new Date().toISOString().slice(0,10),
    })
    sent.value = ['en_revision','aprobada','convertida','cerrada'].includes(item.value.estado)
    restoreDraft()
  } catch (e) {
    $q.notify({ type:'negative', message:errorMessage(e, 'El enlace no está disponible.') })
  } finally {
    loading.value = false
  }
}
function payload() {
  const visibleAnswers = operationQuestions.value
    .filter(q => hasValue(answers[q.id]))
    .map(q => ({ pregunta_id:Number(q.id), valor:normalizedValue(q.id, answers[q.id]) }))
  return {
    respuestas:visibleAnswers,
    declaracion_aceptada:declaration.aceptada,
    declaracion_nombre:declaration.nombre,
    declaracion_fecha:declaration.fecha,
    plan_viti_id:commercial.plan_viti_id,
    forma_pago_preferida:commercial.forma_pago_preferida,
    frecuencia_suscripcion_preferida:commercial.frecuencia_suscripcion_preferida,
    acuerdo_comercial_aceptado:commercial.acuerdo_comercial_aceptado,
    acuerdo_comercial_nombre:commercial.acuerdo_comercial_nombre,
    acuerdo_comercial_fecha:commercial.acuerdo_comercial_fecha,
  }
}
async function save(quiet=false) {
  storeDraft()
  if (!navigator.onLine) {
    if (!quiet) $q.notify({ type:'warning', message:'Sin Internet. El borrador quedó guardado en este dispositivo.' })
    return true
  }
  saving.value = true
  try {
    await initCsrf()
    await api.put(`/publico/solicitudes/${route.params.token}`, payload())
    clearDraft()
    if (!quiet) $q.notify({ type:'positive', message:'Cambios guardados.' })
    return true
  } catch (e) {
    if (networkFailure(e)) {
      if (!quiet) $q.notify({ type:'warning', message:'Se perdió la conexión. El borrador quedó guardado.' })
      return true
    }
    $q.notify({ type:'negative', message:errorMessage(e, 'No se pudo guardar.') })
    return false
  } finally { saving.value = false }
}
async function next() {
  if (step.value === 1 && !commercial.plan_viti_id) return $q.notify({ type:'warning', message:'Selecciona un plan para continuar.' })
  if (await save(true)) step.value = Math.min(3, step.value + 1)
}
async function skipOperation() {
  await save(true)
  step.value = 3
}
async function submit() {
  if (!commercial.plan_viti_id) return $q.notify({ type:'warning', message:'Selecciona un plan.' })
  if (!commercial.forma_pago_preferida) return $q.notify({ type:'warning', message:'Selecciona la forma de pago de la implementación.' })
  if (selectedKey.value !== 'custom' && !commercial.frecuencia_suscripcion_preferida) return $q.notify({ type:'warning', message:'Selecciona suscripción mensual o anual.' })
  if (!declaration.aceptada) return $q.notify({ type:'warning', message:'Confirma que los datos de tu solicitud son correctos.' })
  if (!commercial.acuerdo_comercial_aceptado) return $q.notify({ type:'warning', message:'Acepta el acuerdo comercial inicial.' })
  saving.value = true
  try {
    await initCsrf()
    await api.put(`/publico/solicitudes/${route.params.token}`, payload())
    await api.post(`/publico/solicitudes/${route.params.token}/enviar`)
    sent.value = true
    clearDraft()
    $q.notify({ type:'positive', message:'Solicitud enviada a revisión.' })
  } catch (e) {
    $q.notify({ type:'negative', message:errorMessage(e, 'No se pudo enviar la solicitud.') })
  } finally { saving.value = false }
}
async function syncDraft() { if (navigator.onLine && localStorage.getItem(draftKey.value) && !sent.value) await save(true) }
watch(() => [JSON.stringify(answers), JSON.stringify(otherAnswers), JSON.stringify(declaration), JSON.stringify(commercial), step.value], storeDraft)
onMounted(async () => { window.addEventListener('online', syncDraft); await load(); await syncDraft() })
onBeforeUnmount(() => window.removeEventListener('online', syncDraft))
</script>

<template>
<q-page class="public-page">
  <q-inner-loading :showing="loading" />
  <div v-if="item" class="public-shell">
    <div class="row items-center justify-between q-mb-lg"><AppBrand/><q-badge outline color="primary">{{item.codigo}}</q-badge></div>

    <q-banner v-if="sent" rounded class="bg-green-1 text-green-9 q-mb-lg">
      <template #avatar><q-icon name="check_circle"/></template>
      Tu solicitud fue enviada. AGR Studio revisará el alcance y te responderá desde VITI.
      <template #action><q-btn flat no-caps color="green-9" icon="login" label="Ingresar a mi cuenta" to="/login?tipo=cliente"/></template>
    </q-banner>

    <div class="section-label">Solicitud VITI</div>
    <h1 class="page-title">Elige el nivel que necesita tu negocio</h1>
    <div class="page-subtitle">{{item.empresa?.nombre_comercial || 'Tu empresa'}} · ya tenemos tus datos de registro. Aquí solo definimos plan y configuración básica.</div>

    <q-stepper v-model="step" flat animated color="primary" class="viti-card q-mt-lg">
      <q-step :name="1" title="Plan" icon="workspace_premium" :done="step>1">
        <q-banner rounded class="bg-blue-1 text-primary q-mb-lg"><template #avatar><q-icon name="info"/></template>Compara precio y alcance. No necesitas responder otro diagnóstico antes de elegir.</q-banner>
        <div class="plan-grid">
          <q-card v-for="plan in plans" :key="plan.id" flat bordered :class="['plan-card',{selected:Number(commercial.plan_viti_id)===Number(plan.id)}]" @click="selectPlan(plan)">
            <q-card-section>
              <div class="row items-start no-wrap q-gutter-sm"><div class="col"><div class="text-h6 text-weight-bold">{{plan.nombre}}</div><div class="text-caption text-grey-7 q-mt-sm">{{plan.descripcion}}</div></div><q-radio :model-value="commercial.plan_viti_id" :val="plan.id" color="primary" :disable="sent" @update:model-value="selectPlan(plan)"/></div>
              <div v-if="planKey(plan)!=='custom'" class="price-box q-mt-lg"><div><div class="price-label">Implementación</div><div class="price-value">{{money(plan.precio_proyecto)}}</div></div><div><div class="price-label">Suscripción</div><div class="text-weight-bold">{{money(plan.precio_mensual)}}/mes</div><div class="text-caption text-positive">{{money(plan.precio_anual)}}/año</div></div></div>
              <div v-else class="custom-price q-mt-lg"><q-icon name="request_quote" color="primary" size="28px"/><div><div class="text-weight-bold">Cotización después de una revisión corta</div><div class="text-caption text-grey-7">No se despliegan 70 preguntas. Solo nos cuentas lo esencial.</div></div></div>
              <q-list dense class="q-mt-md"><q-item v-for="benefit in planBenefits(planKey(plan))" :key="benefit" class="q-px-none"><q-item-section avatar style="min-width:30px"><q-icon name="check_circle" color="positive"/></q-item-section><q-item-section>{{benefit}}</q-item-section></q-item></q-list>
              <div v-if="annualSaving(plan)>0" class="text-caption text-positive text-weight-bold q-mt-sm">Ahorro anual: {{money(annualSaving(plan))}}.</div>
            </q-card-section>
          </q-card>
        </div>
      </q-step>

      <q-step :name="2" title="Configuración" icon="tune" :done="step>2">
        <div class="row items-start justify-between q-gutter-md q-mb-lg">
          <div><div class="text-h6 text-weight-bold">Solo lo necesario para {{selectedPlan?.nombre}}</div><div class="text-body2 text-grey-7">Son {{operationQuestions.length}} preguntas como máximo y ninguna bloquea el envío. Puedes usar sugerencias o saltar este paso.</div></div>
          <q-btn outline no-caps color="primary" icon="skip_next" label="Saltar configuración" :disable="sent" @click="skipOperation"/>
        </div>

        <div v-for="q in operationQuestions" :key="q.id" class="question-block">
          <div class="text-weight-medium q-mb-sm">{{q.pregunta}}</div>
          <div v-if="q.ayuda" class="text-caption text-grey-6 q-mb-sm">{{q.ayuda}}</div>
          <div v-if="suggestionsFor(q).length" class="row q-gutter-xs q-mb-sm">
            <q-chip v-for="suggestion in suggestionsFor(q)" :key="suggestion" clickable outline color="primary" @click="applySuggestion(q,suggestion)">{{suggestion}}</q-chip>
          </div>
          <q-input v-if="['texto','numero'].includes(q.tipo)" v-model="answers[q.id]" outlined :type="q.tipo==='numero'?'number':'textarea'" :autogrow="q.tipo==='texto'" :disable="sent"/>
          <div v-else-if="q.tipo==='seleccion_unica'"><q-option-group v-model="answers[q.id]" :options="optionsFor(q).map(x=>({label:x,value:x}))" type="radio" color="primary" :disable="sent"/><q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica" :disable="sent"/></div>
          <div v-else><q-option-group v-model="answers[q.id]" :options="optionsFor(q).map(x=>({label:x,value:x}))" type="checkbox" color="primary" :disable="sent"/><q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica" :disable="sent"/></div>
        </div>
        <q-banner rounded class="bg-grey-2 text-grey-8 q-mt-lg">Respondidas: {{answeredOperation}} de {{operationQuestions.length}}. Las que falten las podemos definir contigo durante la revisión.</q-banner>
      </q-step>

      <q-step :name="3" title="Acuerdo" icon="handshake">
        <q-card flat bordered class="summary-plan q-mb-lg"><q-card-section><div class="section-label">Plan elegido</div><div class="text-h5 text-weight-bold">{{selectedPlan?.nombre}}</div><div class="text-body2 text-grey-7 q-mt-sm">{{selectedPlan?.descripcion}}</div></q-card-section></q-card>

        <template v-if="selectedKey!=='custom'">
          <div class="text-h6 text-weight-bold">Suscripción</div>
          <div class="subscription-grid q-mb-xl q-mt-md">
            <q-card flat bordered :class="['subscription-card',{selected:commercial.frecuencia_suscripcion_preferida==='mensual'}]" @click="!sent&&(commercial.frecuencia_suscripcion_preferida='mensual')"><q-card-section class="row items-center justify-between"><div><div class="text-weight-bold">Mensual</div><div class="subscription-price">{{money(selectedPlan?.precio_mensual)}}<span>/mes</span></div><div class="text-caption text-grey-7">Después de {{selectedPlan?.dias_prueba||14}} días de prueba.</div></div><q-radio v-model="commercial.frecuencia_suscripcion_preferida" val="mensual" color="primary" :disable="sent"/></q-card-section></q-card>
            <q-card flat bordered :class="['subscription-card',{selected:commercial.frecuencia_suscripcion_preferida==='anual'}]" @click="!sent&&(commercial.frecuencia_suscripcion_preferida='anual')"><q-card-section class="row items-center justify-between"><div><div class="text-weight-bold">Anual</div><div class="subscription-price">{{money(selectedPlan?.precio_anual)}}<span>/año</span></div><div class="text-caption text-positive">Ahorras {{money(annualSaving(selectedPlan))}}.</div></div><q-radio v-model="commercial.frecuencia_suscripcion_preferida" val="anual" color="primary" :disable="sent"/></q-card-section></q-card>
          </div>
        </template>

        <div class="text-h6 text-weight-bold">Forma de pago de la implementación</div>
        <div class="payment-grid q-mb-xl q-mt-md"><q-card v-for="option in paymentOptions()" :key="option.value" flat bordered :class="['payment-card',{selected:commercial.forma_pago_preferida===option.value}]" @click="!sent&&(commercial.forma_pago_preferida=option.value)"><q-card-section class="row items-start no-wrap"><q-radio v-model="commercial.forma_pago_preferida" :val="option.value" color="primary" :disable="sent"/><div><div class="text-weight-bold">{{option.label}}</div><div class="text-caption text-grey-7">{{option.description}}</div></div></q-card-section></q-card></div>

        <q-card flat bordered class="q-mb-lg"><q-card-section><q-checkbox v-model="declaration.aceptada" :disable="sent" label="Confirmo que los datos de mi registro y esta solicitud son correctos." color="primary"/><div class="row q-col-gutter-md q-mt-sm"><div class="col-12 col-sm-7"><q-input v-model="declaration.nombre" outlined label="Nombre de quien confirma" :disable="sent"/></div><div class="col-12 col-sm-5"><q-input v-model="declaration.fecha" outlined type="date" stack-label label="Fecha" :disable="sent"/></div></div></q-card-section></q-card>
        <q-card flat bordered><q-card-section><q-checkbox v-model="commercial.acuerdo_comercial_aceptado" :disable="sent" color="primary"><span>Acepto que la implementación y la suscripción son conceptos separados y que cualquier requerimiento fuera del alcance se revisará antes de iniciar.</span></q-checkbox><div class="row q-col-gutter-md q-mt-sm"><div class="col-12 col-sm-7"><q-input v-model="commercial.acuerdo_comercial_nombre" outlined label="Nombre de quien acepta" :disable="sent"/></div><div class="col-12 col-sm-5"><q-input v-model="commercial.acuerdo_comercial_fecha" outlined type="date" stack-label label="Fecha" :disable="sent"/></div></div></q-card-section></q-card>
      </q-step>

      <template #navigation>
        <q-stepper-navigation class="row items-center q-gutter-sm">
          <q-btn v-if="step>1&&!sent" flat no-caps color="primary" icon="arrow_back" label="Anterior" @click="step--"/>
          <q-space/>
          <q-btn v-if="!sent" outline no-caps color="primary" icon="save" label="Guardar" :loading="saving" @click="save()"/>
          <q-btn v-if="step<3&&!sent" color="primary" unelevated no-caps icon-right="arrow_forward" label="Continuar" :loading="saving" @click="next"/>
          <q-btn v-else-if="!sent" color="positive" unelevated no-caps icon="send" label="Enviar a revisión" :loading="saving" @click="submit"/>
        </q-stepper-navigation>
      </template>
    </q-stepper>
  </div>
</q-page>
</template>

<style scoped>
.question-block{padding:18px 0;border-bottom:1px solid rgba(120,135,155,.16)}
.question-block:last-child{border-bottom:0}
.plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.plan-card,.subscription-card,.payment-card{cursor:pointer;border-radius:18px;transition:.18s ease;background:var(--q-card-background,white)}
.plan-card:hover,.subscription-card:hover,.payment-card:hover{transform:translateY(-2px);border-color:rgba(25,118,210,.45)}
.plan-card.selected,.subscription-card.selected,.payment-card.selected{border:2px solid var(--q-primary);box-shadow:0 10px 30px rgba(30,90,160,.12)}
.price-box{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px;border-radius:14px;background:rgba(80,130,190,.08)}
.price-label{font-size:11px;color:#78869a;text-transform:uppercase;letter-spacing:.04em}
.price-value{font-size:24px;font-weight:900;color:var(--q-primary)}
.custom-price{display:flex;gap:12px;align-items:center;padding:14px;border-radius:14px;background:rgba(80,130,190,.08)}
.subscription-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.subscription-price{font-size:26px;font-weight:900;color:var(--q-primary);margin:4px 0}.subscription-price span{font-size:13px;font-weight:600;color:#78869a}
.payment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
.summary-plan{border-radius:18px}
@media(max-width:700px){.subscription-grid,.price-box{grid-template-columns:1fr}.plan-grid{grid-template-columns:1fr}.public-shell{padding-left:14px;padding-right:14px}}
</style>
