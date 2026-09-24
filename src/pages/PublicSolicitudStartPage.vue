<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'
import { publicPlanFallback } from '../composables/useVitiPublicPlans'
import AppBrand from '../components/AppBrand.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const submitting = ref(false)
const step = ref(1)
const sent = ref(false)
const result = ref(null)
const plans = ref([])

const form = reactive({
  empresa_nombre: '',
  empresa_actividad: '',
  titulo_sistema: '',
  resumen: '',
  nombre: '',
  celular: '',
  whatsapp_same: true,
  whatsapp: '',
  business_whatsapp_different: false,
  whatsapp_business: '',
  correo: '',
  ciudad: '',
  plan_codigo: '',
  frecuencia_suscripcion_preferida: 'mensual',
  forma_pago_preferida: '',
  terminos_aceptados: false,
})

// Formas de pago de la implementación. Deben coincidir con las reglas del servidor.
const paymentCatalog = {
  contado: { label:'Pago único', icon:'payments', text:'Pagas el 100% de la implementación al aprobar la propuesta.' },
  '50_50': { label:'50% y 50%', icon:'splitscreen', text:'50% al iniciar el desarrollo y 50% al entregar el sistema.' },
  tres_partes: { label:'Tres partes', icon:'view_week', text:'40% al iniciar, 30% en el avance y 30% al entregar.' },
  por_definir: { label:'Se define en la cotización', icon:'forum', text:'Para proyectos a medida acordamos la forma de pago en la propuesta.' },
}

const planKey = plan => {
  const code = String(plan?.codigo || '').toLowerCase()
  if (code.includes('personalizado')) return 'custom'
  if (code.includes('empresa')) return 'enterprise'
  if (code.includes('profesional')) return 'professional'
  return 'initial'
}
const selectedPlan = computed(() => plans.value.find(plan => plan.codigo === form.plan_codigo) || null)
const isCustom = computed(() => planKey(selectedPlan.value) === 'custom')
const paymentOptions = computed(() => {
  if (!selectedPlan.value) return []
  const keys = { custom:['por_definir'], professional:['tres_partes','contado'], enterprise:['tres_partes','contado'], initial:['50_50','contado'] }[planKey(selectedPlan.value)]
  return keys.map(value => ({ value, ...paymentCatalog[value] }))
})
const subscriptionAmount = computed(() => {
  if (!selectedPlan.value || isCustom.value) return null
  return form.frecuencia_suscripcion_preferida === 'anual' ? selectedPlan.value.precio_anual : selectedPlan.value.precio_mensual
})
const progress = computed(() => sent.value ? 100 : ((step.value - 1) / 2) * 100)
const effectiveWhatsapp = computed(() => form.whatsapp_same ? form.celular : form.whatsapp)
const paymentLabel = computed(() => paymentCatalog[form.forma_pago_preferida]?.label || 'Sin elegir')

watch(() => form.celular, value => { if (form.whatsapp_same) form.whatsapp = normalizePhone(value) })
watch(() => form.whatsapp_same, enabled => { if (enabled) form.whatsapp = normalizePhone(form.celular) })
watch(() => form.business_whatsapp_different, enabled => { if (!enabled) form.whatsapp_business = '' })

function money(value) {
  if (value === null || value === undefined || value === '') return 'A cotizar'
  return `${Number(value).toFixed(0)} Bs`
}
function normalizePhone(value) { return String(value ?? '').replace(/\D/g, '').slice(0, 15) }
function selectPlan(plan) {
  form.plan_codigo = plan.codigo
  const allowed = paymentOptions.value.map(option => option.value)
  if (!allowed.includes(form.forma_pago_preferida)) form.forma_pago_preferida = allowed.length === 1 ? allowed[0] : ''
  if (planKey(plan) === 'custom') form.frecuencia_suscripcion_preferida = ''
  else if (!form.frecuencia_suscripcion_preferida) form.frecuencia_suscripcion_preferida = 'mensual'
}
function warn(message) { $q.notify({ type:'warning', message }) }

function validateNeed() {
  if (!form.empresa_nombre.trim()) return warn('Escribe el nombre de tu negocio, institución o proyecto.'), false
  if (form.titulo_sistema.trim().length < 3) return warn('Cuéntanos qué sistema necesitas.'), false
  if (form.resumen.trim().length < 8) return warn('Cuéntanos un poco más sobre lo que quieres resolver.'), false
  return true
}
function validatePlan() {
  if (!form.plan_codigo) return warn('Elige un plan o la cotización personalizada.'), false
  if (!isCustom.value && !form.frecuencia_suscripcion_preferida) return warn('Elige si pagarás la suscripción mensual o anual.'), false
  if (!form.forma_pago_preferida) return warn('Elige cómo pagarás la implementación.'), false
  return true
}
function validateContact() {
  if (form.nombre.trim().length < 3) return warn('Escribe tu nombre completo.'), false
  if (!/^\d{7,15}$/.test(form.celular)) return warn('El celular debe tener entre 7 y 15 dígitos.'), false
  if (!form.whatsapp_same && !/^\d{7,15}$/.test(form.whatsapp)) return warn('Escribe un WhatsApp válido o marca que es el mismo celular.'), false
  if (form.business_whatsapp_different && !/^\d{7,15}$/.test(form.whatsapp_business)) return warn('Escribe un WhatsApp del negocio válido.'), false
  return true
}
function next() {
  if (step.value === 1 && !validateNeed()) return
  if (step.value === 2 && !validatePlan()) return
  if (step.value < 3) step.value += 1
}
function back() { if (step.value > 1) step.value -= 1 }
function buildPayload() {
  return {
    nombre: form.nombre.trim(),
    telefono: form.celular,
    whatsapp: effectiveWhatsapp.value || form.celular,
    whatsapp_business: form.business_whatsapp_different ? form.whatsapp_business : null,
    ciudad: form.ciudad.trim() || null,
    empresa_nombre: form.empresa_nombre.trim(),
    empresa_actividad: form.empresa_actividad.trim() || null,
    empresa_telefono: form.celular,
    empresa_whatsapp: form.business_whatsapp_different ? form.whatsapp_business : (effectiveWhatsapp.value || form.celular),
    empresa_ciudad: form.ciudad.trim() || null,
    titulo_sistema: form.titulo_sistema.trim(),
    resumen: form.resumen.trim(),
    plan_codigo: form.plan_codigo,
    frecuencia_suscripcion_preferida: isCustom.value ? null : form.frecuencia_suscripcion_preferida,
    forma_pago_preferida: form.forma_pago_preferida,
    terminos_aceptados: form.terminos_aceptados,
    respuestas: [],
  }
}
async function submit() {
  if (!validateNeed()) { step.value = 1; return }
  if (!validatePlan()) { step.value = 2; return }
  if (!validateContact()) return
  if (!form.terminos_aceptados) return warn('Confirma los datos y la forma de pago para enviar tu solicitud.')
  submitting.value = true
  try {
    const { data } = await api.post('/mi/solicitud/enviar', buildPayload(), { timeout:30000 })
    result.value = data?.data || null
    sent.value = true
    window.scrollTo({ top:0, behavior:'smooth' })
  } catch (error) {
    if (error?.response?.status === 401) {
      $q.notify({ type:'warning', message:'Tu sesión expiró. Inicia sesión para enviar la solicitud.' })
      await router.replace({ name:'login', query:{ redirect:route.fullPath } })
      return
    }
    const errors = error?.response?.data?.errors
    const first = errors ? Object.values(errors).flat()[0] : null
    $q.notify({ type:'negative', message:first || error?.response?.data?.message || 'No pudimos enviar la solicitud. Revisa los datos e inténtalo otra vez.' })
  } finally { submitting.value = false }
}
function prefillFromAccount() {
  const user = auth.user || {}
  form.nombre = [user.nombre, user.apellido].filter(Boolean).join(' ').trim()
  form.correo = user.correo || ''
  form.celular = normalizePhone(user.telefono || user.cliente?.telefono || '')
  const whatsapp = normalizePhone(user.cliente?.whatsapp || '')
  if (whatsapp && whatsapp !== form.celular) { form.whatsapp_same = false; form.whatsapp = whatsapp }
  if (user.cliente?.ciudad) form.ciudad = user.cliente.ciudad
}
async function load() {
  loading.value = true
  prefillFromAccount()
  try {
    const { data } = await api.get('/publico/solicitud/catalogo')
    plans.value = data?.data?.planes?.length ? data.data.planes : publicPlanFallback
  } catch { plans.value = publicPlanFallback }
  finally {
    const requested = String(route.query.plan || '')
    const plan = plans.value.find(item => item.codigo === requested)
    if (plan) selectPlan(plan)
    if (['mensual','anual'].includes(String(route.query.frecuencia || '')) && !isCustom.value) form.frecuencia_suscripcion_preferida = String(route.query.frecuencia)
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <q-page class="request-page">
    <q-inner-loading :showing="loading" dark />
    <div class="request-shell">
      <header class="request-topbar">
        <router-link to="/viti" class="brand-link"><AppBrand /></router-link>
        <div class="top-actions">
          <q-btn flat no-caps label="Ver precios" to="/viti/planes" />
          <q-btn outline no-caps icon="home" label="Mi espacio" to="/mi-cuenta" />
        </div>
      </header>

      <template v-if="!sent">
        <section class="request-intro">
          <div class="eyebrow">SOLICITAR UN SISTEMA</div>
          <h1>Cuéntanos lo esencial. <span>VITI organiza el resto.</span></h1>
          <p>Describe tu necesidad, elige tu plan y cómo pagar. Con eso tu solicitud entra directo a la cola de atención de VITI.</p>
          <div class="account-chip"><q-icon name="verified_user" /> Solicitando como <b>{{ form.nombre || 'tu cuenta' }}</b><span v-if="form.correo">· {{ form.correo }}</span></div>
        </section>

        <div class="stepbar" aria-label="Progreso de la solicitud">
          <div v-for="item in [{n:1,t:'Tu necesidad'},{n:2,t:'Plan y pago'},{n:3,t:'Confirmar y enviar'}]" :key="item.n" class="stepbar-item" :class="{active:step>=item.n}">
            <span>{{ item.n }}</span><b>{{ item.t }}</b>
          </div>
          <q-linear-progress :value="progress/100" color="orange" track-color="blue-grey-10" rounded size="4px" />
        </div>

        <q-card flat class="request-card">
          <q-card-section v-if="step===1" class="request-section">
            <div class="section-head"><div><small>PASO 1 DE 3</small><h2>¿Qué necesitas resolver?</h2></div><q-icon name="lightbulb_outline" /></div>
            <p class="section-help">Empieza por tu necesidad. No tienes que decidir tecnologías, módulos ni servidores.</p>
            <div class="form-grid">
              <q-input v-model="form.empresa_nombre" outlined class="span-2" label="Negocio, institución o proyecto *" />
              <q-input v-model="form.empresa_actividad" outlined class="span-2" label="¿A qué se dedica? (opcional)" />
              <div class="span-2 field-block">
                <label>¿Qué sistema necesitas? *</label>
                <p>Por ejemplo: pedidos, reservas, ventas, inventario o gestión de servicios.</p>
                <q-input v-model="form.titulo_sistema" outlined type="textarea" autogrow placeholder="Describe brevemente el sistema" />
              </div>
              <div class="span-2 field-block">
                <label>¿Qué quieres mejorar o resolver? *</label>
                <p>Cuéntalo con tus palabras. VITI convierte esa necesidad en una propuesta técnica.</p>
                <q-input v-model="form.resumen" outlined type="textarea" autogrow placeholder="Ej.: quiero reducir pedidos por WhatsApp y controlar entregas" />
              </div>
            </div>
          </q-card-section>

          <q-card-section v-else-if="step===2" class="request-section">
            <div class="section-head"><div><small>PASO 2 DE 3</small><h2>Elige tu plan y cómo pagar</h2></div><q-icon name="sell" /></div>
            <p class="section-help">La <b>implementación</b> es el pago por el desarrollo inicial. La <b>suscripción</b> (mensual o anual) mantiene tu sistema publicado, con soporte y mantenimiento. Si no pagas la suscripción, el acceso se suspende al terminar los días de gracia.</p>
            <div class="plan-grid">
              <button v-for="plan in plans" :key="plan.codigo" type="button" class="plan-option" :class="{selected:form.plan_codigo===plan.codigo}" @click="selectPlan(plan)">
                <div class="plan-check"><q-icon :name="form.plan_codigo===plan.codigo?'check':'arrow_forward'" /></div>
                <div class="plan-name">{{ plan.nombre }}</div>
                <p>{{ plan.descripcion }}</p>
                <div class="plan-price"><small>IMPLEMENTACIÓN</small><strong>{{ money(plan.precio_proyecto) }}</strong></div>
                <div v-if="planKey(plan)!=='custom'" class="plan-service"><span>Suscripción</span><b>{{ money(plan.precio_mensual) }}/mes · {{ money(plan.precio_anual) }}/año</b></div>
              </button>
            </div>
            <div v-if="selectedPlan && !isCustom" class="billing-choice">
              <div><b>¿Cómo pagarás la suscripción?</b><small>Anual suele salir más barato. Puedes cambiarlo más adelante con Atención VITI.</small></div>
              <q-btn-toggle v-model="form.frecuencia_suscripcion_preferida" no-caps unelevated toggle-color="orange" color="transparent" text-color="grey-4" :options="[{label:'Mensual',value:'mensual'},{label:'Anual',value:'anual'}]" />
            </div>
            <div v-if="selectedPlan" class="payment-block">
              <b>¿Cómo pagarás la implementación?</b>
              <div class="payment-grid">
                <button v-for="option in paymentOptions" :key="option.value" type="button" class="payment-option" :class="{selected:form.forma_pago_preferida===option.value}" @click="form.forma_pago_preferida=option.value">
                  <q-icon :name="option.icon" /><div><strong>{{ option.label }}</strong><span>{{ option.text }}</span></div>
                </button>
              </div>
            </div>
          </q-card-section>

          <q-card-section v-else class="request-section">
            <div class="section-head"><div><small>PASO 3 DE 3</small><h2>Confirma y envía</h2></div><q-icon name="task_alt" /></div>
            <p class="section-help">Tomamos tus datos de tu cuenta. Revisa que el celular sea el correcto para que podamos contactarte.</p>
            <div class="form-grid">
              <q-input v-model="form.nombre" outlined label="Nombre completo *" autocomplete="name" />
              <q-input :model-value="form.correo" outlined label="Correo de tu cuenta" readonly />
              <q-input :model-value="form.celular" outlined label="Celular *" inputmode="numeric" maxlength="15" autocomplete="tel" @update:model-value="v=>form.celular=normalizePhone(v)" />
              <q-input v-model="form.ciudad" outlined label="Ciudad (opcional)" />
              <div class="toggle-card">
                <q-toggle v-model="form.whatsapp_same" color="orange" label="Mi celular también tiene WhatsApp" />
                <q-input v-if="!form.whatsapp_same" :model-value="form.whatsapp" outlined label="WhatsApp *" inputmode="numeric" maxlength="15" @update:model-value="v=>form.whatsapp=normalizePhone(v)" />
              </div>
              <div class="toggle-card">
                <q-toggle v-model="form.business_whatsapp_different" color="orange" label="Mi negocio atiende desde otro WhatsApp" />
                <q-input v-if="form.business_whatsapp_different" :model-value="form.whatsapp_business" outlined label="WhatsApp del negocio *" inputmode="numeric" maxlength="15" @update:model-value="v=>form.whatsapp_business=normalizePhone(v)" />
              </div>
            </div>
            <div class="summary-grid q-mt-lg">
              <article><small>NECESIDAD</small><b>{{ form.titulo_sistema }}</b><span>{{ form.empresa_nombre }}</span></article>
              <article><small>PLAN</small><b>{{ selectedPlan?.nombre }}</b><span>Implementación: {{ money(selectedPlan?.precio_proyecto) }}</span></article>
              <article><small>SUSCRIPCIÓN</small><b>{{ isCustom ? 'Se define en la cotización' : `${money(subscriptionAmount)} / ${form.frecuencia_suscripcion_preferida==='anual'?'año':'mes'}` }}</b><span>Alojamiento, mantenimiento y soporte</span></article>
              <article><small>FORMA DE PAGO</small><b>{{ paymentLabel }}</b><span>{{ paymentCatalog[form.forma_pago_preferida]?.text }}</span></article>
            </div>
            <q-checkbox v-model="form.terminos_aceptados" color="orange" class="confirm-check"><span>Confirmo mis datos y la forma de pago elegida. Autorizo a VITI a contactarme para confirmar el alcance antes de cobrar.</span></q-checkbox>
            <div class="privacy-note"><q-icon name="lock" /> Nada se cobra al enviar. VITI confirma el alcance y el monto final; después verás el cobro en Mis pagos.</div>
          </q-card-section>

          <q-separator />
          <q-card-actions class="request-actions">
            <q-btn v-if="step>1" flat no-caps icon="arrow_back" label="Atrás" @click="back" />
            <q-space />
            <q-btn v-if="step<3" outline no-caps color="orange" label="Continuar" icon-right="arrow_forward" @click="next" />
            <q-btn v-else unelevated no-caps color="primary" label="Enviar mi solicitud" icon-right="send" :loading="submitting" @click="submit" />
          </q-card-actions>
        </q-card>
      </template>

      <section v-else class="success-card">
        <div class="success-icon"><q-icon name="done" /></div>
        <div class="eyebrow">SOLICITUD RECIBIDA</div>
        <h1>Listo. Tu solicitud está en la cola de atención.</h1>
        <p>VITI revisará tu necesidad y confirmará el alcance y el monto final. Te avisaremos en tu espacio y por Atención.</p>
        <div class="request-code"><small>CÓDIGO DE SOLICITUD</small><strong>{{ result?.codigo }}</strong></div>
        <div class="summary-grid success-summary">
          <article><small>PLAN</small><b>{{ result?.plan?.nombre }}</b><span>Implementación: {{ money(result?.plan?.precio_proyecto) }}</span></article>
          <article><small>PAGO ELEGIDO</small><b>{{ paymentCatalog[result?.forma_pago]?.label || paymentLabel }}</b><span v-if="result?.frecuencia">Suscripción {{ result.frecuencia }}</span><span v-else>Suscripción a definir</span></article>
        </div>
        <div class="success-flow"><span class="done">Solicitud y pago elegido</span><q-icon name="east"/><span>Revisión VITI</span><q-icon name="east"/><span>Propuesta y cobro</span><q-icon name="east"/><span>Desarrollo</span></div>
        <div class="success-actions">
          <q-btn color="primary" unelevated no-caps label="Ir a mi espacio" to="/mi-cuenta" />
          <q-btn outline no-caps color="orange" label="Hablar con Atención" to="/mi-buzon" />
        </div>
      </section>

      <footer class="request-footer">VITI · Desarrollo, implementación y seguimiento de sistemas. <span>· Tecnología desarrollada por AGR Studio.</span></footer>
    </div>
  </q-page>
</template>

<style scoped>
.account-chip{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px;padding:8px 13px;border-radius:999px;background:rgba(85,213,143,.08);border:1px solid rgba(85,213,143,.25);color:#b9e9cf;font-size:12px}.account-chip .q-icon{color:#55d58f;font-size:16px}.account-chip span{color:#8fb8a2}.payment-block{margin-top:18px;padding:18px 20px;border-radius:16px;background:rgba(7,21,37,.72);border:1px solid rgba(76,111,145,.28)}.payment-block>b{display:block;margin-bottom:12px}.payment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.payment-option{display:flex;gap:12px;align-items:flex-start;text-align:left;padding:14px;border-radius:14px;border:1px solid #294761;background:#07192a;color:#e7eef6;cursor:pointer;transition:.15s ease}.payment-option:hover{border-color:#496b8a}.payment-option.selected{border-color:#f28b30;background:rgba(242,139,48,.08);box-shadow:0 0 0 1px rgba(242,139,48,.2)}.payment-option .q-icon{font-size:22px;color:#f28b30;margin-top:2px}.payment-option strong,.payment-option span{display:block}.payment-option span{color:#9fb0c0;font-size:12px;line-height:1.45;margin-top:3px}.success-summary{text-align:left;margin:4px 0 8px}
.request-page{min-height:100vh;background:radial-gradient(circle at 88% 4%,rgba(28,94,181,.16),transparent 28rem),linear-gradient(180deg,#06111f,#09192b 62%,#071321);color:#edf4fb;padding:0 18px 46px}.request-shell{width:min(1060px,100%);margin:0 auto}.request-topbar{min-height:82px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid rgba(103,137,171,.18)}.brand-link{text-decoration:none;color:inherit}.top-actions{display:flex;gap:8px}.top-actions :deep(.q-btn){color:#c7d3df;border-color:rgba(199,211,223,.28);border-radius:12px}.request-intro{max-width:830px;padding:54px 0 26px}.eyebrow{font-size:12px;font-weight:900;letter-spacing:.16em;color:#f28b30}.request-intro h1,.success-card h1{font-size:clamp(38px,5vw,62px);line-height:1.02;letter-spacing:-.045em;margin:14px 0;color:#f7fbff}.request-intro h1 span{color:#7fb1f4}.request-intro p,.success-card>p{max-width:760px;color:#adbdcc;font-size:18px;line-height:1.65}.stepbar{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}.stepbar-item{display:flex;align-items:center;gap:9px;color:#6f8498;font-size:12px}.stepbar-item span{width:27px;height:27px;border-radius:50%;display:grid;place-items:center;background:#0b1a2b;border:1px solid #2a425a;font-weight:800}.stepbar-item.active{color:#dfe8f1}.stepbar-item.active span{border-color:#f28b30;color:#ffad64;background:rgba(242,139,48,.08)}.stepbar .q-linear-progress{grid-column:1/-1}.request-card{background:linear-gradient(180deg,rgba(12,31,52,.97),rgba(10,27,46,.97))!important;border:1px solid rgba(76,111,145,.34);border-radius:24px;overflow:hidden;box-shadow:0 28px 70px rgba(0,0,0,.22)}.request-section{padding:32px}.section-head{display:flex;justify-content:space-between;gap:18px;align-items:start}.section-head small{color:#f28b30;font-weight:900;letter-spacing:.13em}.section-head h2{font-size:28px;margin:6px 0 0;color:#f3f7fb}.section-head>.q-icon{font-size:34px;color:#f28b30}.section-help{color:#9fb0c0;line-height:1.6;margin:9px 0 26px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.span-2{grid-column:1/-1}.field-block>label{display:block;color:#eaf1f7;font-weight:700;margin:0 0 4px}.field-block>p{margin:0 0 10px;color:#8097ab;font-size:12px;line-height:1.45}.toggle-card{padding:13px 15px;border:1px solid #294761;border-radius:15px;background:#07192a}.toggle-card :deep(.q-field){margin-top:10px}.request-card :deep(.q-field--outlined .q-field__control){background:#07192a!important;border-radius:15px;min-height:56px}.request-card :deep(.q-field--outlined .q-field__control:before){border-color:#294761!important}.request-card :deep(.q-field--focused .q-field__control:before){border-color:#f28b30!important}.request-card :deep(.q-field__native),.request-card :deep(.q-field__input){color:#edf4fb!important}.request-card :deep(.q-field__label){color:#8fa5b9!important}.request-card :deep(.q-field--focused .q-field__label){color:#ffad64!important}.request-card :deep(textarea){line-height:1.45;min-height:60px!important}.plan-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.plan-option{position:relative;text-align:left;border:1px solid #294761;background:linear-gradient(180deg,#08192a,#0b2036);color:#e7eef6;border-radius:18px;padding:22px;cursor:pointer;transition:.18s ease}.plan-option:hover{transform:translateY(-2px);border-color:#496b8a;background:#0d243d}.plan-option.selected{border-color:#f28b30;box-shadow:0 0 0 1px rgba(242,139,48,.22),0 16px 34px rgba(0,0,0,.16);background:linear-gradient(180deg,#0c2238,#102b49)}.plan-check{position:absolute;right:16px;top:16px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(143,165,185,.3);color:#91a7bb}.plan-option.selected .plan-check{background:#f28b30;color:#071321;border-color:#f28b30}.plan-name{font-size:21px;font-weight:850;padding-right:40px}.plan-option p{color:#a5b6c6;line-height:1.5;min-height:48px}.plan-price{margin-top:18px}.plan-price small,.plan-price strong{display:block}.plan-price small{font-size:10px;letter-spacing:.13em;color:#f28b30;font-weight:900}.plan-price strong{font-size:29px;margin-top:4px}.plan-service{display:flex;justify-content:space-between;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(100,132,162,.18);color:#9fb0c0}.plan-service b{color:#dfe8f1}.billing-choice{margin-top:18px;padding:18px 20px;border-radius:16px;background:rgba(7,21,37,.72);border:1px solid rgba(76,111,145,.28);display:flex;justify-content:space-between;align-items:center;gap:18px}.billing-choice b,.billing-choice small{display:block}.billing-choice small{color:#8fa3b7;margin-top:4px;max-width:610px}.summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.summary-grid article{padding:18px;background:#07192a;border:1px solid #294761;border-radius:15px}.summary-grid small,.summary-grid b,.summary-grid span{display:block}.summary-grid small{color:#f28b30;font-weight:900;letter-spacing:.11em;font-size:10px}.summary-grid b{margin:7px 0 5px;font-size:16px}.summary-grid span{color:#9fb0c0;font-size:13px}.confirm-check{margin-top:22px;color:#d7e0e9}.privacy-note{margin-top:12px;color:#849aaf;font-size:12px;display:flex;align-items:flex-start;gap:7px;line-height:1.5}.request-actions{padding:18px 26px}.request-actions :deep(.q-btn){min-height:44px;border-radius:12px}.success-card{max-width:760px;margin:72px auto 40px;padding:46px;text-align:center;background:linear-gradient(180deg,#0d2036,#09192b);border:1px solid rgba(242,139,48,.28);border-radius:28px;box-shadow:0 30px 80px rgba(0,0,0,.25)}.success-icon{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;margin:0 auto 22px;background:rgba(242,139,48,.12);border:1px solid rgba(242,139,48,.38);color:#f28b30;font-size:34px}.success-card>p{margin-left:auto;margin-right:auto}.request-code{display:inline-flex;flex-direction:column;margin:20px 0;padding:14px 24px;border-radius:14px;background:#07192a;border:1px solid #294761}.request-code small{color:#8ea3b6;font-size:9px;letter-spacing:.13em}.request-code strong{font-size:20px;margin-top:4px}.success-flow{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:10px;color:#899eb1;margin:18px 0 28px}.success-flow .done{color:#ffad64}.success-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}.success-actions :deep(.q-btn){border-radius:12px}.request-footer{text-align:center;color:#61788e;font-size:11px;padding:28px 0}.request-footer span{opacity:.78}.request-card :deep(.q-separator){background:rgba(76,111,145,.22)}
@media(max-width:760px){.request-page{padding:0 10px 80px}.request-shell{width:100%}.request-topbar{min-height:68px}.top-actions .q-btn:first-child{display:none}.top-actions .q-btn{padding-left:8px;padding-right:8px}.request-intro{padding:34px 8px 22px}.request-intro h1{font-size:40px}.request-intro p{font-size:16px}.form-grid,.plan-grid,.summary-grid{grid-template-columns:1fr}.span-2{grid-column:1}.billing-choice{align-items:flex-start;flex-direction:column}.request-section{padding:22px 16px}.section-head h2{font-size:25px}.stepbar{padding:0 6px}.stepbar-item b{display:none}.request-card{border-radius:20px}.success-card{padding:28px 18px;margin:36px 0}.request-actions{padding:14px 14px}.request-actions .q-space{display:none}.request-actions{justify-content:space-between}.request-actions :deep(.q-btn){flex:1}.success-actions{display:grid}.success-actions :deep(.q-btn){width:100%}}
</style>
