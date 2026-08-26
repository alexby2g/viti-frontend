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
  } catch (error) {
    throw error
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
            <div class="col-12 col-md-6"><q-input v-model="form.titulo_sistema" outlined label="Nombre del sistema *" placeholder="Ej. FitFamily" hint="El nombre que quieres que tenga tu aplicación." /></div>
            <div class="col-12 col-md-6"><q-input v-model="form.empresa_nombre" outlined label="Negocio o proyecto *" placeholder="Ej. FitFamily" /></div>
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
.request-page{min-height:100vh;background:#f4f9fb;color:#102a43}.request-shell{width:min(1080px,calc(100% - 32px));margin:0 auto;padding:28px 0 60px}.request-header{padding-bottom:22px;border-bottom:1px solid #dbe5ea}.request-kicker,.step-chip{font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:#0b7593}.request-kicker{margin-top:30px}.request-title{margin-top:12px}.request-title h1{font-size:clamp(38px,5vw,64px);line-height:.98;letter-spacing:-.06em;max-width:820px;margin:0}.request-title p{color:#5f7788;max-width:720px;font-size:17px;line-height:1.7;margin:16px 0 0}.step-badge{padding:10px 14px}.request-card{border:1px solid #d6e2e8;background:#fff;border-radius:24px;box-shadow:0 24px 70px rgba(16,42,67,.08)}.step-section{padding:42px}.step-section h2{font-size:34px;line-height:1.08;letter-spacing:-.04em;margin:14px 0}.lead{color:#647b8a;line-height:1.7}.vision-hints{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.vision-hints div{padding:14px;border-radius:14px;background:#f2f8fa;color:#536e7e;display:flex;gap:8px;align-items:center;font-size:12px}.proposal-card{padding:24px;border-radius:18px;background:#102a43;color:#fff}.proposal-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#73cbd7;font-weight:900}.proposal-title{font-size:28px;font-weight:800;margin-top:8px}.proposal-card p{color:#cfdee6;line-height:1.7}.proposal-modules{display:flex;flex-wrap:wrap;gap:8px}.proposal-note{margin-top:18px;padding:12px 14px;border-radius:12px;background:#173b52;color:#cfe1e7;display:flex;align-items:flex-start;gap:8px;font-size:12px}.plan-card{cursor:pointer;border-radius:16px;height:100%;transition:.16s}.plan-card:hover{border-color:#5c92a7}.plan-card.selected{border:2px solid #146ef5;background:#f4f9ff}.summary-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.summary-grid>div{padding:16px;border-radius:14px;background:#f4f8fa;display:flex;flex-direction:column;gap:5px}.summary-grid span{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#718694}.summary-grid strong{font-size:15px}.request-actions{padding:20px 28px;border-top:1px solid #e0e8ec}@media(max-width:800px){.step-section{padding:28px 22px}.vision-hints{grid-template-columns:1fr}.summary-grid{grid-template-columns:1fr}}@media(max-width:600px){.request-shell{width:min(100% - 20px,1080px)}.request-title{align-items:flex-start;flex-direction:column}.request-title h1{font-size:40px}.request-card{border-radius:18px}.step-section{padding:22px 18px}}
</style>
