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
const step = ref(1)
const item = ref(null)
const billingMode = ref('mensual')
const accepted = ref(false)
const form = reactive({ empresa_nombre:'', empresa_actividad:'', titulo:'', resumen:'', plan_id:null })

const plans = computed(() => item.value?.planes_disponibles || [])
const selectedPlan = computed(() => plans.value.find(p => Number(p.id) === Number(form.plan_id)) || null)
const companyName = computed(() => item.value?.empresa?.nombre_comercial || 'tu negocio')
const clientName = computed(() => item.value?.cliente?.nombre || 'Cliente VITI')

function money(value){ return value === null || value === undefined || value === '' ? 'A cotizar' : `${Number(value).toFixed(0)} Bs` }
function choosePlan(plan){ form.plan_id = plan.id }
function next(){
  if(step.value===1 && (form.empresa_nombre.trim().length<2 || form.titulo.trim().length<3 || form.resumen.trim().length<8)){
    $q.notify({type:'warning',message:'Completa el nombre de tu negocio, qué necesitas y qué quieres resolver.'}); return
  }
  if(step.value===2 && !selectedPlan.value){ $q.notify({type:'warning',message:'Selecciona un plan o cotización personalizada.'}); return }
  step.value = Math.min(3, step.value + 1)
}
function back(){ if(step.value>1) step.value--; else router.push('/mi-cuenta') }

function payload(){
  const today = new Date().toISOString().slice(0,10)
  const p = selectedPlan.value
  const needsFrequency = p && (p.precio_mensual !== null || p.precio_anual !== null)
  return {
    plan_viti_id: form.plan_id,
    forma_pago_preferida: 'por_definir',
    frecuencia_suscripcion_preferida: needsFrequency ? billingMode.value : null,
    declaracion_aceptada: accepted.value,
    declaracion_nombre: clientName.value,
    declaracion_fecha: today,
    acuerdo_comercial_aceptado: accepted.value,
    acuerdo_comercial_nombre: clientName.value,
    acuerdo_comercial_fecha: today,
    registro: { empresa_nombre: form.empresa_nombre.trim(), empresa_actividad: form.empresa_actividad.trim() || null, titulo_sistema: form.titulo.trim(), resumen: form.resumen.trim() },
    respuestas: [],
  }
}

async function submit(){
  if(!accepted.value){ $q.notify({type:'warning',message:'Confirma que la información es correcta para enviar.'}); return }
  sending.value = true
  try{
    await api.put(`/publico/solicitudes/${route.params.token}`, payload(), {timeout:20000})
    await api.post(`/publico/solicitudes/${route.params.token}/enviar`, {}, {timeout:30000})
    $q.notify({type:'positive',message:'Solicitud enviada. VITI la revisará contigo.'})
    router.replace('/mi-cuenta')
  }catch(error){
    const errors=error?.response?.data?.errors
    const first=errors?Object.values(errors).flat()[0]:null
    $q.notify({type:'negative',message:first||error?.response?.data?.message||'No pudimos enviar la solicitud.'})
  }finally{ sending.value=false }
}

onMounted(async()=>{
  try{
    const {data}=await api.get(`/publico/solicitudes/${route.params.token}`)
    item.value=data?.data||null
    form.empresa_nombre=item.value?.empresa?.nombre_comercial === 'Mi negocio' ? '' : (item.value?.empresa?.nombre_comercial||'')
    form.empresa_actividad=item.value?.empresa?.actividad||''
    form.titulo=item.value?.titulo||''
    form.resumen=item.value?.resumen||''
    form.plan_id=item.value?.plan_viti_id||null
    billingMode.value=item.value?.frecuencia_suscripcion_preferida||'mensual'
  }catch(error){
    $q.notify({type:'negative',message:error?.response?.data?.message||'Esta solicitud ya no está disponible.'})
    router.replace('/mi-cuenta')
  }finally{ loading.value=false }
})
</script>

<template>
  <q-page class="request-page">
    <q-inner-loading :showing="loading" dark />
    <header class="request-header">
      <router-link to="/mi-cuenta" class="brand-link"><AppBrand/></router-link>
      <div class="step-label">Paso {{step}} de 3</div>
    </header>

    <main v-if="!loading" class="request-shell">
      <div class="request-intro">
        <div class="eyebrow">NUEVA SOLICITUD · {{ companyName }}</div>
        <h1 v-if="step===1">¿Qué necesitas ahora?</h1>
        <h1 v-else-if="step===2">Elige el alcance.</h1>
        <h1 v-else>Revisa y envía.</h1>
        <p v-if="step===1">No necesitas explicar tecnología. Dinos qué quieres hacer más fácil en tu negocio.</p>
        <p v-else-if="step===2">El plan sirve como referencia comercial. VITI confirmará el alcance antes de iniciar.</p>
        <p v-else>Después de enviar, la solicitud aparecerá en tu espacio y VITI la revisará.</p>
      </div>

      <q-card flat class="request-card">
        <q-card-section class="q-pa-lg">
          <div v-if="step===1" class="q-gutter-md">
            <div class="business-grid"><q-input v-model="form.empresa_nombre" outlined label="Negocio, institución o proyecto *" maxlength="180"/><q-input v-model="form.empresa_actividad" outlined label="¿A qué se dedica? (opcional)" maxlength="200"/></div>
            <q-input v-model="form.titulo" outlined label="¿Qué sistema o mejora necesitas? *" maxlength="200" />
            <q-input v-model="form.resumen" outlined type="textarea" autogrow label="¿Qué quieres resolver? *" maxlength="5000" hint="Ej.: organizar pedidos, controlar pagos, recibir reservas o mejorar un sistema que ya uso." />
          </div>

          <div v-else-if="step===2">
            <div class="subscription-note"><q-icon name="info"/><div><b>La implementación y la suscripción son cosas distintas.</b><span>La implementación paga el desarrollo inicial. La suscripción mantiene alojamiento, mantenimiento y soporte después de la entrega.</span></div></div><div class="billing-row"><span>Frecuencia de la suscripción</span><q-btn-toggle v-model="billingMode" no-caps unelevated rounded toggle-color="primary" :options="[{label:'Mensual',value:'mensual'},{label:'Anual',value:'anual'}]" /></div>
            <div class="plan-grid q-mt-md">
              <button v-for="plan in plans" :key="plan.id" type="button" class="plan-choice" :class="{selected:Number(form.plan_id)===Number(plan.id)}" @click="choosePlan(plan)">
                <div class="choice-top"><b>{{plan.nombre}}</b><q-icon v-if="Number(form.plan_id)===Number(plan.id)" name="check_circle"/></div>
                <p>{{plan.descripcion}}</p>
                <div class="choice-price"><small>Implementación</small><strong>{{money(plan.precio_proyecto)}}</strong></div>
                <div class="choice-service"><span>Servicio {{billingMode}}</span><b>{{money(billingMode==='anual'?plan.precio_anual:plan.precio_mensual)}}</b></div>
              </button>
            </div>
          </div>

          <div v-else class="review-box">
            <div><small>NEGOCIO</small><b>{{form.empresa_nombre}}</b><span>{{form.empresa_actividad || 'Actividad por definir'}}</span></div>
            <div><small>SOLICITUD</small><b>{{form.titulo}}</b><span>{{form.resumen}}</span></div>
            <div><small>PLAN</small><b>{{selectedPlan?.nombre}}</b><span>{{money(selectedPlan?.precio_proyecto)}} de implementación · {{billingMode}}</span></div>
            <q-checkbox v-model="accepted" color="orange" label="Confirmo que esta información es correcta y autorizo a VITI a revisarla para preparar el siguiente paso." />
          </div>
        </q-card-section>
      </q-card>

      <div class="request-actions">
        <q-btn flat no-caps icon="arrow_back" label="Atrás" @click="back" />
        <q-space/>
        <q-btn v-if="step<3" color="primary" unelevated no-caps label="Continuar" icon-right="arrow_forward" @click="next" />
        <q-btn v-else color="primary" unelevated no-caps label="Enviar solicitud" icon-right="send" :loading="sending" @click="submit" />
      </div>
    </main>
  </q-page>
</template>

<style scoped>
.request-page{min-height:100vh;background:radial-gradient(circle at 90% 5%,rgba(20,87,184,.16),transparent 28rem),linear-gradient(180deg,#06111f,#09192b);color:#edf4fb;padding:0 18px}.request-header{width:min(1120px,100%);min-height:82px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(102,132,163,.18)}.brand-link{text-decoration:none;color:inherit}.step-label{font-size:11px;color:#9fb1c1;border:1px solid rgba(102,132,163,.24);padding:7px 10px;border-radius:999px}.request-shell{width:min(980px,100%);margin:0 auto;padding:58px 0 78px}.request-intro{max-width:720px}.eyebrow{font-size:11px;font-weight:900;letter-spacing:.14em;color:#f28b30}.request-intro h1{font-size:clamp(38px,5vw,58px);line-height:1;letter-spacing:-.05em;margin:12px 0;color:#f7fbff}.request-intro p{font-size:17px;line-height:1.65;color:#aebdcc}.request-card{margin-top:28px;background:linear-gradient(180deg,#0c2036,#091a2d)!important;color:#edf4fb;border:1px solid rgba(83,116,147,.30);border-radius:22px}.request-card :deep(.q-field--outlined .q-field__control){background:#07192a!important;border-radius:14px}.request-card :deep(.q-field--outlined .q-field__control:before){border-color:#294761!important}.request-card :deep(.q-field--focused .q-field__control:before){border-color:#f28b30!important}.request-card :deep(.q-field__native),.request-card :deep(.q-field__input){color:#edf4fb!important}.request-card :deep(.q-field__label){color:#91a7b9!important}.business-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.subscription-note{display:flex;gap:10px;padding:13px 14px;margin-bottom:16px;border-radius:13px;background:rgba(20,87,184,.08);border:1px solid rgba(83,116,147,.24);color:#aec0ce}.subscription-note>.q-icon{color:#f28b30;font-size:21px}.subscription-note b,.subscription-note span{display:block}.subscription-note span{font-size:11px;line-height:1.5;color:#93a9ba;margin-top:3px}.billing-row{display:flex;justify-content:space-between;align-items:center;gap:14px;color:#b5c4d1}.plan-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.plan-choice{font:inherit;text-align:left;color:#eaf2f9;background:#091c30;border:1px solid #294761;border-radius:17px;padding:18px;cursor:pointer;transition:.18s ease}.plan-choice:hover{transform:translateY(-1px);border-color:#557794}.plan-choice.selected{border-color:#f28b30;background:#102944;box-shadow:0 0 0 1px rgba(242,139,48,.18)}.choice-top{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:17px}.choice-top .q-icon{color:#f28b30}.plan-choice p{min-height:56px;color:#9fb2c3;font-size:12px;line-height:1.55}.choice-price small,.choice-price strong{display:block}.choice-price small{color:#f28b30;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.choice-price strong{font-size:23px;margin-top:3px}.choice-service{display:flex;justify-content:space-between;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(102,132,163,.17);font-size:11px;color:#9fb2c3}.choice-service b{color:#edf4fb}.review-box{display:grid;gap:12px}.review-box>div{padding:16px;border:1px solid rgba(102,132,163,.2);border-radius:14px;background:rgba(6,21,37,.36)}.review-box small,.review-box b,.review-box span{display:block}.review-box small{color:#f28b30;font-size:9px;font-weight:900;letter-spacing:.1em}.review-box b{margin-top:4px}.review-box span{color:#9fb2c3;font-size:12px;line-height:1.5;margin-top:3px}.request-actions{display:flex;align-items:center;margin-top:18px}.request-actions .q-btn{min-height:46px;border-radius:12px}@media(max-width:700px){.business-grid{grid-template-columns:1fr}.request-shell{padding-top:36px}.plan-grid{grid-template-columns:1fr}.billing-row{align-items:flex-start;flex-direction:column}.plan-choice p{min-height:0}}@media(max-width:480px){.request-page{padding:0 12px}.request-actions .q-btn{min-width:0}.request-actions .q-btn:last-child{flex:1}}
</style>
