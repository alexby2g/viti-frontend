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
const sending = ref(false)
const savingDraft = ref(false)
const saveState = ref('idle')
const step = ref(1)
const item = ref(null)
const billingMode = ref('mensual')
const accepted = ref(false)
const form = reactive({ empresa_nombre: '', empresa_actividad: '', titulo: '', resumen: '', plan_id: null })
const answers = reactive({})

const plans = computed(() => item.value?.planes_disponibles || [])
const selectedPlan = computed(() => plans.value.find(p => Number(p.id) === Number(form.plan_id)) || null)
const companyName = computed(() => item.value?.empresa?.nombre_comercial || 'tu negocio')
const clientName = computed(() => item.value?.cliente?.nombre || 'Cliente VITI')
const rawSections = computed(() => item.value?.cuestionario?.secciones || [])
const operationQuestionNumbers = [12, 13, 17, 18, 19, 27, 32, 35, 70]

function planKey(plan) {
  const code = String(plan?.codigo || '').toLowerCase()
  if (code.includes('personalizado')) return 'custom'
  if (code.includes('empresa')) return 'enterprise'
  if (code.includes('profesional')) return 'professional'
  return 'initial'
}

function allowedOperationNumbers(plan) {
  const base = [12, 13, 17, 18, 19]
  const key = planKey(plan)
  if (key === 'professional') return [...base, 32, 35]
  if (key === 'enterprise') return [...base, 27, 32, 35]
  if (key === 'custom') return [...base, 70]
  return base
}

function questionVisible(question) {
  if (!question?.activo) return false
  const number = Number(question.numero)
  if (!operationQuestionNumbers.includes(number)) return true
  return allowedOperationNumbers(selectedPlan.value).includes(number)
}

const questionnaireSections = computed(() => rawSections.value
  .filter(section => section.activo)
  .map(section => ({ ...section, preguntas: (section.preguntas || []).filter(questionVisible) }))
  .filter(section => section.preguntas.length))

const totalSteps = computed(() => 3 + questionnaireSections.value.length)
const reviewStep = computed(() => totalSteps.value)
const sectionStepStart = 3
const currentSectionIndex = computed(() => step.value >= sectionStepStart && step.value < reviewStep.value ? step.value - sectionStepStart : -1)
const currentSection = computed(() => questionnaireSections.value[currentSectionIndex.value] || null)
const progress = computed(() => Math.min(1, step.value / Math.max(totalSteps.value, 1)))
const stepLabel = computed(() => `Paso ${step.value} de ${totalSteps.value}`)
const pageTitle = computed(() => {
  if (step.value === 1) return '¿Qué necesitas ahora?'
  if (step.value === 2) return 'Elige el alcance.'
  if (currentSection.value) return currentSection.value.titulo
  return 'Revisa y envía.'
})
const pageSubtitle = computed(() => {
  if (step.value === 1) return 'No necesitas explicar tecnología. Dinos qué quieres hacer más fácil en tu negocio.'
  if (step.value === 2) return 'El plan sirve como referencia comercial. VITI confirmará el alcance antes de iniciar.'
  if (currentSection.value) return currentSection.value.descripcion || 'Responde solo lo que corresponda a tu negocio. Puedes avanzar sección por sección.'
  return 'Comprueba la información y envía la solicitud para que VITI la revise.'
})

function money(value) {
  return value === null || value === undefined || value === '' ? 'A cotizar' : `${Number(value).toFixed(0)} Bs`
}

function choosePlan(plan) {
  form.plan_id = plan.id
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function validateCurrent() {
  if (step.value === 1 && (form.empresa_nombre.trim().length < 2 || form.titulo.trim().length < 3 || form.resumen.trim().length < 8)) {
    $q.notify({ type: 'warning', message: 'Completa el nombre de tu negocio, qué necesitas y qué quieres resolver.' })
    return false
  }
  if (step.value === 2 && !selectedPlan.value) {
    $q.notify({ type: 'warning', message: 'Selecciona un plan o cotización personalizada.' })
    return false
  }
  if (currentSection.value) {
    const missing = currentSection.value.preguntas.find(question => question.obligatoria && !hasValue(answers[question.id]))
    if (missing) {
      $q.notify({ type: 'warning', message: `Completa la pregunta obligatoria: ${missing.pregunta}` })
      return false
    }
  }
  return true
}

function answerPayload() {
  return questionnaireSections.value.flatMap(section => section.preguntas).map(question => ({
    pregunta_id: Number(question.id),
    valor: answers[question.id] ?? (question.tipo === 'seleccion_multiple' ? [] : ''),
  }))
}

function payload(withAcceptance = false) {
  const today = new Date().toISOString().slice(0, 10)
  const p = selectedPlan.value
  const needsFrequency = p && (p.precio_mensual !== null || p.precio_anual !== null)
  return {
    plan_viti_id: form.plan_id,
    forma_pago_preferida: 'por_definir',
    frecuencia_suscripcion_preferida: needsFrequency ? billingMode.value : null,
    declaracion_aceptada: withAcceptance ? accepted.value : false,
    declaracion_nombre: withAcceptance ? clientName.value : null,
    declaracion_fecha: withAcceptance ? today : null,
    acuerdo_comercial_aceptado: withAcceptance ? accepted.value : false,
    acuerdo_comercial_nombre: withAcceptance ? clientName.value : null,
    acuerdo_comercial_fecha: withAcceptance ? today : null,
    registro: {
      empresa_nombre: form.empresa_nombre.trim(),
      empresa_actividad: form.empresa_actividad.trim() || null,
      titulo_sistema: form.titulo.trim(),
      resumen: form.resumen.trim(),
    },
    respuestas: answerPayload(),
  }
}

async function saveDraft({ notify = false } = {}) {
  if (!item.value || savingDraft.value) return true
  savingDraft.value = true
  saveState.value = 'saving'
  try {
    await api.put(`/publico/solicitudes/${route.params.token}`, payload(false), { timeout: 20000 })
    saveState.value = 'saved'
    if (notify) $q.notify({ type: 'positive', message: 'Borrador guardado.' })
    return true
  } catch (error) {
    saveState.value = 'error'
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No pudimos guardar el borrador.' })
    return false
  } finally {
    savingDraft.value = false
  }
}

async function next() {
  if (!validateCurrent()) return
  if (step.value >= 2 && step.value < reviewStep.value) {
    const ok = await saveDraft()
    if (!ok) return
  }
  step.value = Math.min(reviewStep.value, step.value + 1)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function back() {
  if (step.value > 1) {
    if (step.value >= sectionStepStart && step.value <= reviewStep.value) await saveDraft()
    step.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    router.push('/mi-cuenta')
  }
}

async function submit() {
  if (!accepted.value) {
    $q.notify({ type: 'warning', message: 'Confirma que la información es correcta para enviar.' })
    return
  }
  sending.value = true
  try {
    await api.put(`/publico/solicitudes/${route.params.token}`, payload(true), { timeout: 20000 })
    await api.post(`/publico/solicitudes/${route.params.token}/enviar`, {}, { timeout: 30000 })
    $q.notify({ type: 'positive', message: 'Solicitud enviada. VITI la revisará contigo.' })
    router.replace('/mi-cuenta')
  } catch (error) {
    const errors = error?.response?.data?.errors
    const first = errors ? Object.values(errors).flat()[0] : null
    $q.notify({ type: 'negative', message: first || error?.response?.data?.message || 'No pudimos enviar la solicitud.' })
  } finally {
    sending.value = false
  }
}

function hydrateAnswers() {
  for (const section of rawSections.value) {
    for (const question of section.preguntas || []) answers[question.id] = question.tipo === 'seleccion_multiple' ? [] : ''
  }
  for (const response of item.value?.respuestas || []) {
    answers[response.pregunta_id] = response.respuesta_json ?? response.respuesta_texto ?? ''
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/publico/solicitudes/${route.params.token}`)
    item.value = data?.data || null
    form.empresa_nombre = item.value?.empresa?.nombre_comercial === 'Mi negocio' ? '' : (item.value?.empresa?.nombre_comercial || '')
    form.empresa_actividad = item.value?.empresa?.actividad || ''
    form.titulo = item.value?.titulo || ''
    form.resumen = item.value?.resumen || ''
    form.plan_id = item.value?.plan_viti_id || null
    billingMode.value = item.value?.frecuencia_suscripcion_preferida || 'mensual'
    hydrateAnswers()
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'Esta solicitud ya no está disponible.' })
    router.replace('/mi-cuenta')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <q-page class="request-page">
    <q-inner-loading :showing="loading" dark />

    <header class="request-header">
      <router-link to="/mi-cuenta" class="brand-link"><AppBrand /></router-link>
      <div class="header-status">
        <span v-if="saveState === 'saving'"><q-spinner size="14px" /> Guardando...</span>
        <span v-else-if="saveState === 'saved'" class="saved"><q-icon name="cloud_done" /> Guardado</span>
        <span v-else-if="saveState === 'error'" class="error"><q-icon name="cloud_off" /> Sin guardar</span>
        <span class="step-label">{{ stepLabel }}</span>
      </div>
    </header>

    <main v-if="!loading" class="request-shell">
      <div class="progress-wrap">
        <q-linear-progress rounded size="7px" :value="progress" color="primary" track-color="blue-grey-10" />
      </div>

      <div class="request-intro">
        <div class="eyebrow">SOLICITUD VITI · {{ companyName }}</div>
        <h1>{{ pageTitle }}</h1>
        <p>{{ pageSubtitle }}</p>
      </div>

      <q-card flat class="request-card">
        <q-card-section class="request-card-body">
          <div v-if="step === 1" class="q-gutter-md">
            <div class="business-grid"><q-input v-model="form.empresa_nombre" outlined label="Negocio, institución o proyecto *" maxlength="180" /><q-input v-model="form.empresa_actividad" outlined label="¿A qué se dedica? (opcional)" maxlength="200" /></div>
            <q-input v-model="form.titulo" outlined label="¿Qué sistema o mejora necesitas? *" maxlength="200" />
            <q-input v-model="form.resumen" outlined type="textarea" autogrow label="¿Qué quieres resolver? *" maxlength="5000" hint="Ej.: organizar pedidos, controlar pagos, recibir reservas o mejorar un sistema que ya uso." />
          </div>

          <div v-else-if="step === 2">
            <div class="subscription-note"><q-icon name="info" /><div><b>La implementación y la suscripción son cosas distintas.</b><span>La implementación cubre el desarrollo inicial. La suscripción mantiene alojamiento, mantenimiento y soporte después de la entrega.</span></div></div>
            <div class="billing-row"><span>Frecuencia de la suscripción</span><q-btn-toggle v-model="billingMode" no-caps unelevated rounded toggle-color="primary" :options="[{ label: 'Mensual', value: 'mensual' }, { label: 'Anual', value: 'anual' }]" /></div>
            <div class="plan-grid q-mt-md">
              <button v-for="plan in plans" :key="plan.id" type="button" class="plan-choice" :class="{ selected: Number(form.plan_id) === Number(plan.id) }" @click="choosePlan(plan)">
                <div class="choice-top"><b>{{ plan.nombre }}</b><q-icon v-if="Number(form.plan_id) === Number(plan.id)" name="check_circle" /></div>
                <p>{{ plan.descripcion }}</p>
                <div class="choice-price"><small>Implementación</small><strong>{{ money(plan.precio_proyecto) }}</strong></div>
                <div class="choice-service"><span>Servicio {{ billingMode }}</span><b>{{ money(billingMode === 'anual' ? plan.precio_anual : plan.precio_mensual) }}</b></div>
              </button>
            </div>
          </div>

          <div v-else-if="currentSection" class="section-form">
            <div class="section-counter"><q-icon name="assignment" />{{ currentSection.preguntas.length }} preguntas en esta sección</div>
            <div class="question-stack">
              <div v-for="(question, index) in currentSection.preguntas" :key="question.id" class="question-block">
                <div class="question-label-row">
                  <span class="question-number">{{ index + 1 }}</span>
                  <div><label>{{ question.pregunta }} <span v-if="question.obligatoria">*</span></label><small v-if="question.ayuda">{{ question.ayuda }}</small></div>
                </div>
                <q-input v-if="question.tipo === 'texto'" v-model="answers[question.id]" outlined type="textarea" autogrow placeholder="Escribe tu respuesta" />
                <q-input v-else-if="question.tipo === 'numero'" v-model="answers[question.id]" outlined type="number" placeholder="0" />
                <q-option-group v-else-if="question.tipo === 'seleccion_unica'" v-model="answers[question.id]" class="choice-group" :options="(question.opciones || []).map(option => ({ label: option, value: option }))" type="radio" color="primary" />
                <q-option-group v-else v-model="answers[question.id]" class="choice-group" :options="(question.opciones || []).map(option => ({ label: option, value: option }))" type="checkbox" color="primary" />
              </div>
            </div>
          </div>

          <div v-else class="review-box">
            <div><small>NEGOCIO</small><b>{{ form.empresa_nombre }}</b><span>{{ form.empresa_actividad || 'Actividad por definir' }}</span></div>
            <div><small>SOLICITUD</small><b>{{ form.titulo }}</b><span>{{ form.resumen }}</span></div>
            <div><small>PLAN</small><b>{{ selectedPlan?.nombre }}</b><span>{{ money(selectedPlan?.precio_proyecto) }} de implementación · {{ billingMode }}</span></div>
            <div><small>LEVANTAMIENTO</small><b>{{ questionnaireSections.length }} secciones completadas</b><span>{{ answerPayload().filter(row => hasValue(row.valor)).length }} respuestas registradas.</span></div>
            <q-checkbox v-model="accepted" color="orange" label="Confirmo que esta información es correcta y autorizo a VITI a revisarla para preparar el siguiente paso." />
          </div>
        </q-card-section>
      </q-card>

      <div class="request-actions">
        <q-btn flat no-caps icon="arrow_back" label="Atrás" @click="back" />
        <q-space />
        <q-btn v-if="step < reviewStep" color="primary" unelevated no-caps label="Continuar" icon-right="arrow_forward" :loading="savingDraft" @click="next" />
        <q-btn v-else color="primary" unelevated no-caps label="Enviar solicitud" icon-right="send" :loading="sending" @click="submit" />
      </div>
    </main>
  </q-page>
</template>

<style scoped>
.request-page{min-height:100vh;background:radial-gradient(circle at 90% 5%,rgba(20,87,184,.16),transparent 28rem),linear-gradient(180deg,#06111f,#09192b);color:#edf4fb;padding:0 18px}.request-header{width:min(1120px,100%);min-height:82px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(102,132,163,.18)}.brand-link{text-decoration:none;color:inherit}.header-status{display:flex;align-items:center;gap:10px;color:#8299ad;font-size:10px}.header-status>span{display:flex;align-items:center;gap:5px}.header-status .saved{color:#77c79b}.header-status .error{color:#ef8b83}.step-label{font-size:11px;color:#9fb1c1;border:1px solid rgba(102,132,163,.24);padding:7px 10px;border-radius:999px}.request-shell{width:min(900px,100%);margin:0 auto;padding:30px 0 78px}.progress-wrap{margin-bottom:38px}.request-intro{max-width:760px}.eyebrow{font-size:10px;font-weight:900;letter-spacing:.14em;color:#f28b30}.request-intro h1{font-size:clamp(34px,5vw,54px);line-height:1.04;letter-spacing:-.045em;margin:11px 0;color:#f7fbff}.request-intro p{font-size:16px;line-height:1.65;color:#aebdcc;margin-bottom:0}.request-card{margin-top:28px;background:linear-gradient(180deg,#0c2036,#091a2d)!important;color:#edf4fb;border:1px solid rgba(83,116,147,.30);border-radius:22px}.request-card-body{padding:28px}.request-card :deep(.q-field--outlined .q-field__control){background:#07192a!important;border-radius:14px}.request-card :deep(.q-field--outlined .q-field__control:before){border-color:#294761!important}.request-card :deep(.q-field--focused .q-field__control:before){border-color:#f28b30!important}.request-card :deep(.q-field__native),.request-card :deep(.q-field__input){color:#edf4fb!important}.request-card :deep(.q-field__label){color:#91a7b9!important}.business-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.subscription-note{display:flex;gap:10px;padding:14px 15px;margin-bottom:18px;border-radius:14px;background:rgba(20,87,184,.08);border:1px solid rgba(83,116,147,.24);color:#aec0ce}.subscription-note>.q-icon{color:#f28b30;font-size:21px}.subscription-note b,.subscription-note span{display:block}.subscription-note span{font-size:11px;line-height:1.5;color:#93a9ba;margin-top:3px}.billing-row{display:flex;justify-content:space-between;align-items:center;gap:14px;color:#b5c4d1}.plan-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.plan-choice{font:inherit;text-align:left;color:#eaf2f9;background:#091c30;border:1px solid #294761;border-radius:17px;padding:18px;cursor:pointer;transition:.18s ease}.plan-choice:hover{transform:translateY(-1px);border-color:#557794}.plan-choice.selected{border-color:#f28b30;background:#102944;box-shadow:0 0 0 1px rgba(242,139,48,.18)}.choice-top{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:17px}.choice-top .q-icon{color:#f28b30}.plan-choice p{min-height:56px;color:#9fb2c3;font-size:12px;line-height:1.55}.choice-price small,.choice-price strong{display:block}.choice-price small{color:#f28b30;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.choice-price strong{font-size:23px;margin-top:3px}.choice-service{display:flex;justify-content:space-between;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(102,132,163,.17);font-size:11px;color:#9fb2c3}.choice-service b{color:#edf4fb}.section-form{display:grid;gap:18px}.section-counter{display:inline-flex;align-items:center;gap:7px;width:max-content;max-width:100%;padding:7px 10px;border-radius:999px;background:#102944;color:#9fb2c3;font-size:10px}.section-counter .q-icon{color:#f28b30}.question-stack{display:grid;gap:18px}.question-block{padding:22px;border:1px solid rgba(88,124,156,.28);border-radius:18px;background:#081a2c}.question-label-row{display:flex;align-items:flex-start;gap:11px;margin-bottom:15px}.question-number{display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;border-radius:10px;background:#142d47;color:#f28b30;font-size:10px;font-weight:900}.question-label-row label{display:block;color:#eef5fb;font-size:15px;font-weight:800;line-height:1.45;padding-top:4px}.question-label-row label span{color:#f28b30}.question-label-row small{display:block;color:#829bae;margin-top:5px;line-height:1.5}.choice-group{display:grid;gap:8px;margin-left:40px}.choice-group :deep(.q-radio),.choice-group :deep(.q-checkbox){min-height:42px;padding:6px 10px;border:1px solid rgba(91,126,158,.22);border-radius:12px;background:#07192a}.review-box{display:grid;gap:12px}.review-box>div{padding:16px;border:1px solid rgba(102,132,163,.2);border-radius:14px;background:rgba(6,21,37,.36)}.review-box small,.review-box b,.review-box span{display:block}.review-box small{color:#f28b30;font-size:9px;font-weight:900;letter-spacing:.1em}.review-box b{margin-top:4px}.review-box span{color:#9fb2c3;font-size:12px;line-height:1.5;margin-top:3px}.request-actions{display:flex;align-items:center;margin-top:20px}.request-actions .q-btn{min-height:46px;border-radius:12px}@media(max-width:700px){.business-grid,.plan-grid{grid-template-columns:1fr}.request-shell{padding-top:24px}.billing-row{align-items:flex-start;flex-direction:column}.plan-choice p{min-height:0}.request-card-body{padding:20px}.question-block{padding:17px}.choice-group{margin-left:0}.header-status>span:not(.step-label){display:none}}@media(max-width:480px){.request-page{padding:0 12px}.request-actions .q-btn{min-width:0}.request-actions .q-btn:last-child{flex:1}}
</style>
