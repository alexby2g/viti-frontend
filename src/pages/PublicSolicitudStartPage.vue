<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const $q = useQuasar()
const loading = ref(true)
const submitting = ref(false)
const step = ref(1)
const sent = ref(false)
const result = ref(null)
const plans = ref([])
const sections = ref([])
const questionnaire = ref(null)
const answers = reactive({})
const otherAnswers = reactive({})

const form = reactive({
  nombre: '', correo: '', telefono: '', whatsapp: '', documento: '', ci_expedido: '', ciudad: '', direccion: '',
  empresa_nombre: '', empresa_actividad: '', empresa_telefono: '', empresa_whatsapp: '', empresa_ciudad: '', empresa_direccion: '',
  titulo_sistema: '', resumen: '',
  plan_codigo: '', forma_pago_preferida: '', frecuencia_suscripcion_preferida: '',
  declaracion_aceptada: false, declaracion_nombre: '', declaracion_fecha: new Date().toISOString().slice(0, 10),
  acuerdo_comercial_aceptado: false, acuerdo_comercial_nombre: '', acuerdo_comercial_fecha: new Date().toISOString().slice(0, 10),
})

const selectedPlan = computed(() => plans.value.find(plan => plan.codigo === form.plan_codigo) || null)
const selectedKey = computed(() => planKey(selectedPlan.value))
const allQuestions = computed(() => sections.value.flatMap(section => section.preguntas || []))
const visibleQuestions = computed(() => allQuestions.value.filter(question => shouldShowQuestion(question)))
const requiredQuestions = computed(() => visibleQuestions.value.filter(question => Boolean(question.obligatoria)))
const selectedPlanBenefits = computed(() => planBenefits(selectedKey.value))
const paymentOptions = computed(() => paymentOptionsFor(selectedPlan.value))

const progress = computed(() => sent.value ? 100 : ((step.value - 1) / 4) * 100)

function planKey(plan) {
  const code = String(plan?.codigo || '').toLowerCase()
  if (code.includes('personalizado')) return 'custom'
  if (code.includes('empresa')) return 'enterprise'
  if (code.includes('profesional')) return 'professional'
  return 'initial'
}

function operationNumbersForKey(key) {
  const numbers = [12, 13, 17, 18, 19]
  if (key === 'professional') numbers.push(32, 35)
  if (key === 'enterprise') numbers.push(27, 32, 35)
  if (key === 'custom') numbers.push(70)
  return numbers
}

function shouldShowQuestion(question) {
  const operationNumbers = [12, 13, 17, 18, 19, 27, 32, 35, 70]
  const number = Number(question.numero)
  return !operationNumbers.includes(number) || operationNumbersForKey(selectedKey.value).includes(number)
}

function optionsFor(question) {
  const options = Array.isArray(question.opciones) ? question.opciones : []
  if (Number(question.numero) !== 17) return options
  const allowed = new Set([
    'Registro de clientes','Registro de trabajadores','Registro de productos','Registro de servicios','Inventario',
    'Reservas o citas','Órdenes de trabajo','Control de pagos','Cuentas por cobrar','Garantías','Historial de clientes',
    'Reportes','Agenda o calendario','Archivos y documentos','Fotografías','Otro',
  ])
  if (selectedKey.value === 'initial') {
    return options.filter(option => ['Registro de clientes','Registro de trabajadores','Registro de servicios','Reservas o citas','Órdenes de trabajo','Historial de clientes','Agenda o calendario','Archivos y documentos','Fotografías','Otro'].includes(option))
  }
  if (selectedKey.value === 'professional') {
    return options.filter(option => ['Registro de clientes','Registro de trabajadores','Registro de servicios','Reservas o citas','Órdenes de trabajo','Control de pagos','Cuentas por cobrar','Garantías','Historial de clientes','Reportes','Agenda o calendario','Archivos y documentos','Fotografías','Otro'].includes(option))
  }
  return options.filter(option => allowed.has(option))
}

function planBenefits(key) {
  return ({
    initial: ['1 aplicación VITI', 'Hasta 3 usuarios', 'Base operativa para clientes, servicios, agenda y seguimiento'],
    professional: ['1 aplicación VITI', 'Hasta 6 usuarios', 'Pagos, saldos, comprobantes y garantías'],
    enterprise: ['Hasta 3 aplicaciones', 'Hasta 15 usuarios', 'Inventario técnico y operación avanzada'],
    custom: ['AGR Studio revisa el alcance contigo', 'Plan y presupuesto a medida', 'Diseño antes de iniciar el desarrollo'],
  })[key] || []
}

function paymentOptionsFor(plan) {
  const key = planKey(plan)
  if (!plan) return []
  if (key === 'custom') return [{ value: 'por_definir', label: 'Definir con AGR Studio', description: 'Se acuerda después de revisar el alcance.' }]
  const options = [
    { value: 'contado', label: 'Pago completo de implementación', description: 'Un solo desembolso para la implementación.' },
    { value: 'por_definir', label: 'Acordarlo con AGR Studio', description: 'Lo definimos durante la revisión.' },
  ]
  if (key === 'initial') options.unshift({ value: '50_50', label: '50% al iniciar / 50% al entregar', description: 'Dos hitos claros.' })
  else options.unshift({ value: 'tres_partes', label: '40% al iniciar / 30% en avance / 30% al entregar', description: 'Tres hitos claros.' })
  return options
}

function money(value) {
  if (value === null || value === undefined || value === '') return 'A cotizar'
  return `${Number(value).toFixed(0)} Bs`
}

function formatPlanPrice(plan) {
  if (!plan) return ''
  const project = money(plan.precio_proyecto)
  if (plan.precio_mensual !== null || plan.precio_anual !== null) return `${project} + suscripción`
  return project
}

function questionValue(question) {
  const value = answers[question.id]
  return Array.isArray(value) ? value : (value ?? '')
}

function hasValue(value) {
  return Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0
}

function selectedOther(question) {
  const value = answers[question.id]
  return Array.isArray(value) ? value.includes('Otro') : value === 'Otro'
}

function normalizedValue(question) {
  const value = answers[question.id]
  const custom = String(otherAnswers[question.id] || '').trim()
  if (Array.isArray(value)) return value.map(item => item === 'Otro' && custom ? `Otro: ${custom}` : item)
  return value === 'Otro' && custom ? `Otro: ${custom}` : value
}

function setPlan(plan) {
  form.plan_codigo = plan.codigo
  form.forma_pago_preferida = ''
  form.frecuencia_suscripcion_preferida = planKey(plan) === 'custom' ? '' : (plan.precio_mensual !== null && plan.precio_anual !== null ? 'mensual' : '')
  for (const question of allQuestions.value) {
    const n = Number(question.numero)
    if ([12,13,17,18,19,27,32,35,70].includes(n) && !operationNumbersForKey(planKey(plan)).includes(n)) {
      answers[question.id] = question.tipo === 'seleccion_multiple' ? [] : ''
      otherAnswers[question.id] = ''
    }
  }
}

function next() {
  if (step.value === 2 && !form.plan_codigo) return $q.notify({ type: 'warning', message: 'Selecciona un plan para continuar.' })
  if (step.value === 3 && !validateIdentity()) return
  if (step.value === 4 && !validateQuestions()) return
  if (step.value < 5) step.value += 1
}

function back() {
  if (step.value > 1) step.value -= 1
}

function validateIdentity() {
  const required = [
    [form.nombre, 'Ingresa tu nombre completo.'], [form.correo, 'Ingresa tu correo electrónico.'],
    [form.telefono, 'Ingresa tu teléfono.'], [form.ciudad, 'Indica tu ciudad.'],
    [form.empresa_nombre, 'Ingresa el nombre del negocio o proyecto.'], [form.titulo_sistema, 'Describe qué sistema necesitas.'],
  ]
  const missing = required.find(([value]) => !String(value || '').trim())
  if (missing) { $q.notify({ type: 'warning', message: missing[1] }); return false }
  if (!/^\d{7,15}$/.test(String(form.telefono))) { $q.notify({ type: 'warning', message: 'El teléfono debe contener entre 7 y 15 dígitos.' }); return false }
  if (form.whatsapp && !/^\d{7,15}$/.test(String(form.whatsapp))) { $q.notify({ type: 'warning', message: 'El WhatsApp debe contener entre 7 y 15 dígitos.' }); return false }
  return true
}

function validateQuestions() {
  if (!form.forma_pago_preferida) { $q.notify({ type: 'warning', message: 'Selecciona cómo prefieres manejar el pago de implementación.' }); return false }
  if (selectedPlan.value?.precio_mensual !== null && selectedPlan.value?.precio_anual !== null && selectedKey.value !== 'custom' && !form.frecuencia_suscripcion_preferida) {
    $q.notify({ type: 'warning', message: 'Selecciona mensual o anual para continuar.' }); return false
  }
  for (const question of requiredQuestions.value) {
    const value = answers[question.id]
    if (!hasValue(value)) { $q.notify({ type: 'warning', message: `Completa la pregunta ${question.numero}.` }); return false }
    if (selectedOther(question) && !String(otherAnswers[question.id] || '').trim()) { $q.notify({ type: 'warning', message: `Completa la opción “Otro” de la pregunta ${question.numero}.` }); return false }
  }
  return true
}

function buildPayload() {
  return {
    ...form,
    respuestas: visibleQuestions.value.filter(question => hasValue(answers[question.id])).map(question => ({
      pregunta_id: Number(question.id),
      valor: normalizedValue(question),
    })),
  }
}

async function submit() {
  if (!validateIdentity() || !validateQuestions()) { step.value = 4; return }
  if (!form.declaracion_aceptada || !form.declaracion_nombre) { $q.notify({ type: 'warning', message: 'Confirma que los datos de la solicitud son correctos.' }); return }
  if (!form.acuerdo_comercial_aceptado || !form.acuerdo_comercial_nombre) { $q.notify({ type: 'warning', message: 'Acepta el acuerdo comercial inicial para enviar la solicitud.' }); return }

  submitting.value = true
  try {
    const { data } = await api.post('/publico/solicitud/enviar', buildPayload(), { timeout: 30000 })
    result.value = data?.data || null
    sent.value = true
    step.value = 6
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No pudimos enviar tu solicitud. Revisa los datos e inténtalo nuevamente.' })
    if (Number(error?.response?.status) === 422) step.value = 4
  } finally {
    submitting.value = false
  }
}

async function loadCatalog() {
  loading.value = true
  try {
    const { data } = await api.get('/publico/solicitud/catalogo')
    plans.value = data?.data?.planes || []
    questionnaire.value = data?.data?.cuestionario || null
    sections.value = questionnaire.value?.secciones || []
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No pudimos cargar la información pública de VITI.' })
  } finally {
    loading.value = false
  }
}

onMounted(loadCatalog)
</script>

<template>
  <q-page class="viti-application-page">
    <q-inner-loading :showing="loading" />

    <div v-if="!loading" class="application-shell">
      <div class="application-header row items-center justify-between q-gutter-md">
        <AppBrand />
        <q-badge outline color="primary" class="q-px-md q-py-sm">Solicitud VITI</q-badge>
      </div>

      <div class="application-intro">
        <div class="section-kicker">AGR STUDIO · VITI</div>
        <h1>Cuéntanos qué necesitas. Nosotros evaluamos cómo hacerlo.</h1>
        <p>Primero conocerás VITI, después elegirás el plan que mejor encaje con tu presupuesto y recién entonces te mostraremos las preguntas necesarias para entender tu sistema.</p>
      </div>

      <div v-if="!sent" class="progress-wrap q-mt-xl">
        <div class="progress-top row items-center justify-between">
          <span>Paso {{ step }} de 5</span>
          <span>{{ Math.round(progress) }}%</span>
        </div>
        <q-linear-progress :value="progress / 100" rounded color="primary" track-color="blue-1" size="8px" />
      </div>

      <q-card v-if="!sent" flat class="application-card q-mt-lg">
        <q-card-section v-if="step === 1" class="q-pa-xl">
          <div class="step-chip">01 · CONOCE VITI</div>
          <h2>Antes de pedir tu sistema, conoce cómo trabajamos.</h2>
          <p class="lead">VITI es la plataforma de AGR Studio para centralizar tu operación, tus aplicaciones, tus solicitudes, tu seguimiento y el desarrollo de soluciones digitales.</p>
          <div class="row q-col-gutter-lg q-mt-md">
            <div class="col-12 col-md-4"><q-card flat bordered class="info-card"><q-icon name="travel_explore" color="primary" size="32px"/><div class="text-h6 q-mt-md">1. Conocemos tu necesidad</div><p>Reunimos la información esencial y entendemos qué quieres resolver.</p></q-card></div>
            <div class="col-12 col-md-4"><q-card flat bordered class="info-card"><q-icon name="fact_check" color="primary" size="32px"/><div class="text-h6 q-mt-md">2. Evaluamos la viabilidad</div><p>AGR Studio revisa alcance, presupuesto, plan y respuestas antes de aprobar.</p></q-card></div>
            <div class="col-12 col-md-4"><q-card flat bordered class="info-card"><q-icon name="construction" color="primary" size="32px"/><div class="text-h6 q-mt-md">3. Trabajamos contigo</div><p>Si es viable, te orientamos, capacitamos y comenzamos a trabajar en tu sistema.</p></q-card></div>
          </div>
          <q-banner class="q-mt-lg access-note" rounded><template #avatar><q-icon name="lock" color="primary" /></template><strong>Importante:</strong> completar esta solicitud no crea una cuenta ni entrega códigos de acceso. El acceso se habilita únicamente después de la aprobación de AGR Studio.</q-banner>
        </q-card-section>

        <q-card-section v-else-if="step === 2" class="q-pa-xl">
          <div class="step-chip">02 · ELIGE TU PLAN</div>
          <h2>Selecciona el nivel que mejor encaje con tu presupuesto.</h2>
          <p class="lead">Las preguntas posteriores se adaptarán al plan que elijas para no pedirte información que no necesitamos.</p>
          <div class="row q-col-gutter-lg q-mt-md">
            <div v-for="plan in plans" :key="plan.id" class="col-12 col-md-6 col-lg-3">
              <q-card flat bordered :class="['plan-card', { selected: form.plan_codigo === plan.codigo }]" @click="setPlan(plan)">
                <q-card-section>
                  <div class="row items-center justify-between"><q-badge color="primary" outline>{{ plan.nombre }}</q-badge><q-icon v-if="form.plan_codigo === plan.codigo" name="check_circle" color="positive" /></div>
                  <div class="plan-price q-mt-md">{{ formatPlanPrice(plan) }}</div>
                  <div class="text-caption text-grey-6 q-mt-sm">{{ plan.descripcion || 'Plan VITI para tu operación.' }}</div>
                  <ul class="plan-list"><li v-for="benefit in planBenefits(planKey(plan))" :key="benefit">{{ benefit }}</li></ul>
                  <div class="text-caption text-primary q-mt-md">{{ plan.max_usuarios ? `Hasta ${plan.max_usuarios} usuarios` : 'Usuarios a definir' }}</div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>

        <q-card-section v-else-if="step === 3" class="q-pa-xl">
          <div class="step-chip">03 · TUS DATOS</div>
          <h2>Necesitamos saber quién está solicitando y qué quieres construir.</h2>
          <p class="lead">Estos datos acompañarán tu solicitud; no crean una cuenta de acceso.</p>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-8"><q-input v-model="form.nombre" outlined label="Nombre completo *" /></div>
            <div class="col-12 col-md-4"><q-input v-model="form.telefono" outlined label="Teléfono *" inputmode="numeric" /></div>
            <div class="col-12 col-md-6"><q-input v-model="form.correo" outlined label="Correo electrónico *" type="email" /></div>
            <div class="col-12 col-md-6"><q-input v-model="form.whatsapp" outlined label="WhatsApp" inputmode="numeric" /></div>
            <div class="col-12 col-md-4"><q-input v-model="form.documento" outlined label="CI / documento" /></div>
            <div class="col-12 col-md-4"><q-input v-model="form.ci_expedido" outlined label="Expedido" /></div>
            <div class="col-12 col-md-4"><q-input v-model="form.ciudad" outlined label="Ciudad *" /></div>
            <div class="col-12"><q-input v-model="form.direccion" outlined label="Dirección / zona" /></div>
            <div class="col-12 col-md-6"><q-input v-model="form.empresa_nombre" outlined label="Negocio, institución o proyecto *" /></div>
            <div class="col-12 col-md-6"><q-input v-model="form.empresa_actividad" outlined label="Actividad / rubro" /></div>
            <div class="col-12 col-md-4"><q-input v-model="form.empresa_telefono" outlined label="Teléfono del negocio" /></div>
            <div class="col-12 col-md-4"><q-input v-model="form.empresa_whatsapp" outlined label="WhatsApp del negocio" /></div>
            <div class="col-12 col-md-4"><q-input v-model="form.empresa_ciudad" outlined label="Ciudad del negocio" /></div>
            <div class="col-12"><q-input v-model="form.empresa_direccion" outlined label="Dirección del negocio" /></div>
            <div class="col-12"><q-input v-model="form.titulo_sistema" outlined label="¿Qué sistema necesitas? *" /></div>
            <div class="col-12"><q-input v-model="form.resumen" outlined type="textarea" autogrow label="Cuéntanos brevemente qué quieres resolver" /></div>
          </div>
        </q-card-section>

        <q-card-section v-else-if="step === 4" class="q-pa-xl">
          <div class="step-chip">04 · CONFIGURACIÓN</div>
          <h2>Ahora sí: las preguntas que corresponden a tu plan.</h2>
          <p class="lead">Plan elegido: <strong>{{ selectedPlan?.nombre }}</strong>. Solo mostramos la información que necesitamos para dimensionar el sistema.</p>

          <q-banner class="q-mb-lg" rounded><template #avatar><q-icon name="payments" color="primary" /></template><div class="text-weight-medium">Presupuesto / forma de pago</div><div class="text-caption q-mt-xs">Selecciona cómo prefieres manejar la implementación. Esto se revisará junto con tu solicitud.</div></q-banner>
          <div class="row q-col-gutter-md q-mb-xl">
            <div v-for="option in paymentOptions" :key="option.value" class="col-12 col-md-6">
              <q-card flat bordered :class="['option-card', { selected: form.forma_pago_preferida === option.value }]" @click="form.forma_pago_preferida = option.value">
                <q-card-section><div class="text-weight-medium">{{ option.label }}</div><div class="text-caption text-grey-6 q-mt-xs">{{ option.description }}</div></q-card-section>
              </q-card>
            </div>
            <div v-if="selectedPlan?.precio_mensual !== null && selectedPlan?.precio_anual !== null && selectedKey !== 'custom'" class="col-12"><q-option-group v-model="form.frecuencia_suscripcion_preferida" :options="[{label:'Mensual',value:'mensual'},{label:'Anual',value:'anual'}]" inline /></div>
          </div>

          <div v-for="question in visibleQuestions" :key="question.id" class="question-block">
            <div class="question-heading"><q-badge outline color="primary">{{ question.numero }}</q-badge><div><div class="question-title">{{ question.enunciado }}<span v-if="question.obligatoria"> *</span></div><div v-if="question.ayuda" class="text-caption text-grey-6">{{ question.ayuda }}</div></div></div>

            <q-select v-if="question.tipo === 'seleccion'" v-model="answers[question.id]" outlined emit-value map-options :options="optionsFor(question).map(option => ({label: option, value: option}))" class="q-mt-md" />
            <q-select v-else-if="question.tipo === 'seleccion_multiple'" v-model="answers[question.id]" outlined multiple use-chips emit-value map-options :options="optionsFor(question).map(option => ({label: option, value: option}))" class="q-mt-md" />
            <q-input v-else-if="question.tipo === 'numero'" v-model.number="answers[question.id]" outlined type="number" class="q-mt-md" />
            <q-input v-else-if="question.tipo === 'texto_largo'" v-model="answers[question.id]" outlined type="textarea" autogrow class="q-mt-md" />
            <q-input v-else v-model="answers[question.id]" outlined type="text" class="q-mt-md" />

            <q-input v-if="selectedOther(question)" v-model="otherAnswers[question.id]" outlined label="Especifica cuál" class="q-mt-sm" />
          </div>
        </q-card-section>

        <q-card-section v-else-if="step === 5" class="q-pa-xl">
          <div class="step-chip">05 · REVISAR Y ENVIAR</div>
          <h2>Todo listo para AGR Studio.</h2>
          <p class="lead">Revisa el resumen. Al enviar, la solicitud pasará directamente a evaluación. No se generará ningún acceso todavía.</p>

          <div class="summary-grid">
            <div><div class="summary-label">Responsable</div><div class="summary-value">{{ form.nombre }}</div><div class="text-caption text-grey-6">{{ form.correo }} · {{ form.telefono }}</div></div>
            <div><div class="summary-label">Negocio / proyecto</div><div class="summary-value">{{ form.empresa_nombre }}</div><div class="text-caption text-grey-6">{{ form.empresa_actividad || 'Actividad no especificada' }}</div></div>
            <div><div class="summary-label">Plan</div><div class="summary-value">{{ selectedPlan?.nombre }}</div><div class="text-caption text-grey-6">{{ formatPlanPrice(selectedPlan) }}</div></div>
            <div><div class="summary-label">Pago</div><div class="summary-value">{{ paymentOptions.find(option => option.value === form.forma_pago_preferida)?.label || 'Por definir' }}</div><div class="text-caption text-grey-6">{{ form.frecuencia_suscripcion_preferida || 'Sin frecuencia' }}</div></div>
          </div>

          <q-list bordered separator class="rounded-borders q-mt-lg">
            <q-item><q-item-section><q-item-label overline>Sistema solicitado</q-item-label><q-item-label>{{ form.titulo_sistema }}</q-item-label><q-item-label caption>{{ form.resumen || 'Sin resumen adicional.' }}</q-item-label></q-item-section></q-item>
            <q-item><q-item-section><q-item-label overline>Preguntas respondidas</q-item-label><q-item-label>{{ requiredQuestions.length }} preguntas clave según el plan</q-item-label></q-item-section></q-item>
          </q-list>

          <q-checkbox v-model="form.declaracion_aceptada" class="q-mt-lg" label="Confirmo que los datos enviados son correctos y autorizo a AGR Studio a utilizarlos para evaluar mi solicitud." />
          <q-input v-model="form.declaracion_nombre" outlined label="Nombre para confirmar la declaración" class="q-mt-md" />
          <q-checkbox v-model="form.acuerdo_comercial_aceptado" class="q-mt-md" label="Acepto el acuerdo comercial inicial y entiendo que la aprobación final depende de la evaluación de AGR Studio." />
          <q-input v-model="form.acuerdo_comercial_nombre" outlined label="Nombre para aceptar el acuerdo" class="q-mt-md" />

          <q-banner class="q-mt-lg access-note" rounded><template #avatar><q-icon name="lock" color="primary" /></template>Después de enviar, tu solicitud quedará en <strong>revisión</strong>. Si es viable, te contactaremos en privado para orientarte, capacitarte y habilitar tu acceso cuando corresponda.</q-banner>
        </q-card-section>
      </q-card>

      <div v-if="!sent" class="application-actions row justify-between q-gutter-sm q-mt-lg">
        <q-btn v-if="step > 1" flat no-caps label="Atrás" icon="arrow_back" @click="back" />
        <q-space />
        <q-btn v-if="step < 5" color="primary" unelevated no-caps :label="step === 1 ? 'Conocer los planes' : step === 2 ? 'Continuar con este plan' : 'Continuar'" @click="next" />
        <q-btn v-else color="primary" unelevated no-caps label="Enviar solicitud a AGR Studio" icon-right="send" :loading="submitting" @click="submit" />
      </div>

      <q-card v-else flat class="success-card q-mt-xl">
        <q-card-section class="q-pa-xl text-center">
          <q-icon name="verified_user" color="positive" size="74px" />
          <div class="text-h4 text-weight-bold q-mt-md">Solicitud recibida</div>
          <p class="lead">Tu información ya está en manos de AGR Studio. No necesitas crear una cuenta ni conseguir un código ahora.</p>
          <div class="request-code">{{ result?.codigo || 'SOL-VITI' }}</div>
          <div class="text-body1 q-mt-lg">Estado actual: <strong>En revisión</strong></div>

          <div class="status-track q-mt-xl">
            <div class="track-item active"><div class="track-dot">1</div><span>Recibida</span></div>
            <div class="track-line"></div>
            <div class="track-item"><div class="track-dot">2</div><span>Evaluación</span></div>
            <div class="track-line"></div>
            <div class="track-item"><div class="track-dot">3</div><span>Resultado</span></div>
            <div class="track-line"></div>
            <div class="track-item"><div class="track-dot">4</div><span>Orientación</span></div>
            <div class="track-line"></div>
            <div class="track-item"><div class="track-dot">5</div><span>Acceso</span></div>
            <div class="track-line"></div>
            <div class="track-item"><div class="track-dot">6</div><span>Desarrollo</span></div>
          </div>

          <q-banner rounded class="q-mt-xl access-note text-left"><template #avatar><q-icon name="support_agent" color="primary" /></template>AGR Studio te responderá por el canal privado disponible para tu solicitud. Allí podrás recibir orientación, capacitación y seguimiento del trabajo sin tener que perseguir códigos de acceso antes de tiempo.</q-banner>
          <q-btn flat color="primary" no-caps class="q-mt-lg" label="Volver al inicio de VITI" to="/acceso" />
        </q-card-section>
      </q-card>

      <div class="application-footer q-mt-xl">AGR Studio · VITI · Solicitud de solución digital</div>
    </div>
  </q-page>
</template>

<style scoped>
.viti-application-page{min-height:100vh;background:linear-gradient(180deg,#071426 0%,#0a1c33 100%);padding:28px 18px 60px;color:#eaf7ff}
.application-shell{width:min(1180px,100%);margin:0 auto}.application-header{padding-bottom:12px}.application-intro{max-width:860px;padding:40px 0 8px}.section-kicker,.step-chip{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#7ce7ff;font-weight:800}.application-intro h1{font-size:clamp(34px,5vw,64px);line-height:1.02;margin:10px 0 18px;font-weight:900}.application-intro p,.lead{font-size:17px;line-height:1.65;color:#b8cfdf;max-width:900px}.progress-wrap{max-width:720px}.progress-top{font-size:12px;color:#86aabd;margin-bottom:8px}.application-card{background:rgba(9,23,39,.92);border:1px solid rgba(124,223,255,.15);border-radius:24px;box-shadow:0 28px 80px rgba(0,0,0,.32);color:#eaf7ff}.application-card h2{font-size:clamp(28px,4vw,44px);line-height:1.1;margin:12px 0 12px}.info-card,.plan-card,.option-card{height:100%;background:rgba(255,255,255,.035);border-color:rgba(124,223,255,.14);color:#eaf7ff;border-radius:18px}.info-card{padding:20px}.info-card p{color:#9eb9c8;line-height:1.55}.plan-card{cursor:pointer;transition:.2s;border-width:1px}.plan-card:hover,.plan-card.selected,.option-card.selected{border-color:#62e6ff;box-shadow:0 0 0 1px rgba(98,230,255,.25),0 20px 40px rgba(18,135,190,.08);transform:translateY(-2px)}.plan-price{font-size:27px;font-weight:900}.plan-list{margin:16px 0 0;padding-left:18px;color:#b8cfdf;line-height:1.8}.option-card{cursor:pointer}.question-block{padding:20px 0;border-top:1px solid rgba(255,255,255,.08)}.question-heading{display:flex;gap:12px;align-items:flex-start}.question-title{font-size:18px;font-weight:700;line-height:1.4}.question-title span{color:#ff9b83}.summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:22px}.summary-grid>div{padding:18px;border:1px solid rgba(124,223,255,.13);border-radius:16px;background:rgba(255,255,255,.03)}.summary-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#82a8ba}.summary-value{font-size:19px;font-weight:800;margin-top:5px}.access-note{background:rgba(66,188,236,.08);color:#dff7ff;border:1px solid rgba(98,230,255,.17)}.success-card{background:rgba(9,23,39,.96);border:1px solid rgba(95,250,166,.2);border-radius:24px;color:#eaf7ff}.request-code{display:inline-block;margin-top:18px;padding:12px 18px;border-radius:12px;background:rgba(98,230,255,.08);border:1px dashed rgba(98,230,255,.25);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:22px;letter-spacing:.12em}.status-track{display:flex;align-items:center;justify-content:center;gap:10px;overflow:auto;padding-bottom:8px}.track-item{min-width:84px;text-align:center;color:#6f8c9b;font-size:11px}.track-item.active{color:#7ce7ff}.track-dot{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;margin:0 auto 7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04)}.track-item.active .track-dot{border-color:#62e6ff;background:rgba(98,230,255,.1);color:#7ce7ff;box-shadow:0 0 16px rgba(98,230,255,.18)}.track-line{width:34px;height:1px;background:rgba(255,255,255,.12)}.application-footer{text-align:center;color:#6f8c9b;font-size:12px}
:deep(.q-field--outlined .q-field__control){border-color:rgba(133,220,255,.16);background:rgba(255,255,255,.02);color:#fff}.body--light :deep(.q-field--outlined .q-field__control){background:#fff;color:#111}:deep(.q-field__label),:deep(.q-field__native){color:#a9cedd}.body--light :deep(.q-field__label),.body--light :deep(.q-field__native){color:#536b7a}
@media(max-width:800px){.summary-grid{grid-template-columns:1fr}.status-track{justify-content:flex-start}.application-intro{padding-top:24px}.application-card .q-card__section{padding:22px!important}}
</style>
