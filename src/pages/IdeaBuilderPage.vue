<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const $q = useQuasar()
const route = useRoute()
const loading = ref(true)
const saving = ref(false)
const submitting = ref(false)
const sent = ref(false)
const step = ref(1)
const request = ref(null)
const plans = ref([])
const form = reactive({
  clienteNombre:'', clienteWhatsApp:'', clienteCiudad:'',
  empresaNombre:'', empresaActividad:'',
  tituloSistema:'', resumen:'', publico:'', problema:'', vision:'',
  planId:null, pago:'por_definir', frecuencia:'',
  declaracion:false, declaracionNombre:'', acuerdo:false, acuerdoNombre:''
})

const currentPlan = computed(() => plans.value.find(p => Number(p.id) === Number(form.planId)) || null)
const progress = computed(() => step.value === 1 ? 25 : step.value === 2 ? 50 : step.value === 3 ? 75 : 100)
const suggestions = computed(() => {
  const text = `${form.tituloSistema} ${form.resumen} ${form.problema}`.toLowerCase()
  const modules = []
  const add = (label, why) => { if (!modules.some(m => m.label === label)) modules.push({ label, why }) }
  if (/producto|venta|comida|alimento|catálogo|catalogo|tienda/.test(text)) {
    add('Productos y catálogo','Organiza lo que ofreces y qué está disponible.')
    add('Pedidos y ventas','Registra solicitudes de compra y su estado.')
    add('Clientes','Centraliza la información de tus compradores.')
  }
  if (/cita|agenda|reserva|salón|salon|peluquer/.test(text)) {
    add('Agenda y citas','Permite reservar y consultar horarios.')
    add('Clientes','Mantiene el historial de atención.')
    add('Servicios','Ordena los servicios que ofreces.')
  }
  if (/servicio técnico|servicio tecnico|mantenimiento|aire|equipo|técnico|tecnico/.test(text)) {
    add('Clientes y equipos','Relaciona personas con equipos o servicios.')
    add('Órdenes de trabajo','Controla el trabajo desde la recepción hasta el cierre.')
    add('Historial','Conserva antecedentes y seguimiento.')
  }
  if (/pago|cobro|saldo|factur/.test(text)) add('Pagos y seguimiento','Controla cobros, saldos o estados de pago.')
  if (!modules.length) {
    add('Clientes','Centraliza a las personas que usarán o contratarán tu servicio.')
    add('Operación principal','Organiza el proceso central de tu negocio.')
    add('Seguimiento','Permite consultar estados, historial y avances.')
  }
  return modules.slice(0,6)
})

function money(v){ return v == null || v === '' ? 'A cotizar' : `${Number(v).toFixed(0)} Bs` }
function planPrice(plan){ if (!plan) return ''; const base = money(plan.precio_proyecto); return plan.precio_mensual !== null || plan.precio_anual !== null ? `${base} + suscripción` : base }

function validateStep1(){
  const required = [
    [form.tituloSistema,'Ponle un nombre a tu sistema.'],
    [form.resumen,'Cuéntanos en una frase qué hará.'],
    [form.publico,'Indica para quién es el sistema.'],
  ]
  const missing = required.find(([v]) => !String(v || '').trim())
  if (missing) { $q.notify({type:'warning',message:missing[1]}); return false }
  return true
}
function validateStep2(){
  if (!String(form.problema || '').trim() || !String(form.vision || '').trim()) { $q.notify({type:'warning',message:'Cuéntanos qué problema quieres resolver y cómo imaginas el resultado.'}); return false }
  return true
}
function validateStep3(){ if (!form.planId) { $q.notify({type:'warning',message:'Selecciona un plan para continuar.'}); return false } return true }
function next(){
  if(step.value===1 && !validateStep1()) return
  if(step.value===2 && !validateStep2()) return
  if(step.value===3 && !validateStep3()) return
  if(step.value<4) step.value++
  saveDraft()
}
function back(){ if(step.value>1) step.value-- }

function payload(){
  return {
    registro:{
      cliente_nombre:form.clienteNombre || request.value?.cliente?.nombre || '',
      cliente_whatsapp:form.clienteWhatsApp || request.value?.cliente?.whatsapp || '',
      cliente_ciudad:form.clienteCiudad || request.value?.cliente?.ciudad || '',
      empresa_nombre:form.empresaNombre || request.value?.empresa?.nombre_comercial || '',
      empresa_actividad:form.empresaActividad || request.value?.empresa?.actividad || '',
      titulo_sistema:form.tituloSistema,
      resumen:[form.resumen, form.problema ? `Problema: ${form.problema}` : '', form.vision ? `Visión: ${form.vision}` : '', form.publico ? `Público: ${form.publico}` : ''].filter(Boolean).join('\n\n')
    },
    plan_viti_id:form.planId,
    forma_pago_preferida:form.pago,
    frecuencia_suscripcion_preferida:form.frecuencia || null,
    declaracion_aceptada:form.declaracion,
    declaracion_nombre:form.declaracionNombre,
    declaracion_fecha:new Date().toISOString().slice(0,10),
    acuerdo_comercial_aceptado:form.acuerdo,
    acuerdo_comercial_nombre:form.acuerdoNombre,
    acuerdo_comercial_fecha:new Date().toISOString().slice(0,10),
  }
}

async function saveDraft(){
  if(!request.value?.publico_habilitado || saving.value) return
  saving.value=true
  try{ await api.put(`/publico/solicitudes/${route.params.token}`,payload(),{timeout:20000}) } catch(e) { /* evita interrumpir la escritura */ } finally { saving.value=false }
}

async function submit(){
  if(!validateStep1() || !validateStep2() || !validateStep3()) return
  if(!form.declaracion || !form.declaracionNombre){$q.notify({type:'warning',message:'Confirma que los datos de la solicitud son correctos.'});return}
  if(!form.acuerdo || !form.acuerdoNombre){$q.notify({type:'warning',message:'Acepta el acuerdo comercial inicial para enviar la solicitud.'});return}
  submitting.value=true
  try{
    await api.put(`/publico/solicitudes/${route.params.token}`,payload(),{timeout:20000})
    const {data}=await api.post(`/publico/solicitudes/${route.params.token}/enviar`,{}, {timeout:30000})
    sent.value=true
    $q.notify({type:'positive',message:data?.message || 'Solicitud enviada correctamente.'})
  }catch(e){$q.notify({type:'negative',message:e?.response?.data?.message || 'No pudimos enviar la solicitud.'})}finally{submitting.value=false}
}

async function load(){
  loading.value=true
  try{
    const {data}=await api.get(`/publico/solicitudes/${route.params.token}`)
    request.value=data.data
    plans.value=request.value?.planes_disponibles || []
    const first = request.value?.respuestas?.find(r=>r.pregunta?.numero===1)?.respuesta_texto || ''
    form.clienteNombre=request.value?.cliente?.nombre || ''
    form.clienteWhatsApp=request.value?.cliente?.whatsapp || ''
    form.clienteCiudad=request.value?.cliente?.ciudad || ''
    form.empresaNombre=request.value?.empresa?.nombre_comercial || ''
    form.empresaActividad=request.value?.empresa?.actividad || ''
    form.tituloSistema=request.value?.titulo || first
    form.planId=request.value?.plan_viti_id || null
    form.pago=request.value?.forma_pago_preferida || 'por_definir'
    form.frecuencia=request.value?.frecuencia_suscripcion_preferida || ''
    if(request.value?.estado==='en_revision' || request.value?.estado==='aprobada' || request.value?.estado==='convertida') sent.value=true
  }catch(e){$q.notify({type:'negative',message:e?.response?.data?.message || 'No pudimos cargar esta solicitud.'})}finally{loading.value=false}
}

onMounted(load)
</script>

<template>
  <q-page class="idea-page">
    <q-inner-loading :showing="loading" />
    <div v-if="!loading" class="idea-shell">
      <header class="idea-header"><AppBrand /><q-badge outline color="primary">Constructor VITI</q-badge></header>
      <div v-if="sent" class="success-card"><q-icon name="verified" color="positive" size="64px"/><div class="eyebrow">SOLICITUD RECIBIDA</div><h1>Ya tenemos tu idea.</h1><p>AGR Studio revisará la información y te contactará para definir alcance y próximos pasos.</p><div class="code">{{ request?.codigo }}</div></div>
      <template v-else>
        <section class="intro"><div class="eyebrow">VITI · CONSTRUCTOR DE IDEA</div><h1>Cuéntanos la idea. No necesitas saber cómo programarla.</h1><p>Primero entendemos tu negocio. Después VITI propone una estructura para que AGR Studio la convierta en un sistema real.</p></section>
        <div class="progress"><div><span>Paso {{step}} de 4</span><strong>{{progress}}%</strong></div><q-linear-progress rounded :value="progress/100" color="primary" track-color="blue-1" size="8px" /></div>
        <q-card flat class="idea-card">
          <q-card-section v-if="step===1" class="q-pa-xl">
            <div class="step">01 · TU SISTEMA</div><h2>Empieza por la idea, no por los módulos.</h2>
            <div class="field-grid"><q-input v-model="form.tituloSistema" outlined label="¿Cómo se llamará tu sistema?" placeholder="Ej. FitFamily"/><q-input v-model="form.empresaNombre" outlined label="¿Para qué negocio o proyecto?" placeholder="Ej. FitFamily Store"/></div>
            <q-input v-model="form.resumen" outlined type="textarea" autogrow class="q-mt-md" label="¿Qué hará principalmente?" placeholder="Ej. Permitirá registrar productos, mostrar un catálogo y recibir pedidos."/>
            <q-input v-model="form.publico" outlined class="q-mt-md" label="¿Quién lo utilizará?" placeholder="Ej. Clientes de la tienda y personal de ventas"/>
          </q-card-section>
          <q-card-section v-else-if="step===2" class="q-pa-xl">
            <div class="step">02 · TU VISIÓN</div><h2>Cuéntanos qué quieres solucionar.</h2>
            <q-input v-model="form.problema" outlined type="textarea" autogrow label="¿Qué problema quieres resolver?" placeholder="Ej. Hoy registramos pedidos por WhatsApp y se nos pierden datos."/>
            <q-input v-model="form.vision" outlined type="textarea" autogrow class="q-mt-md" label="¿Cómo imaginas el resultado?" placeholder="Ej. Quiero que el cliente vea productos, elija lo que necesita y pueda enviar su compra."/>
            <q-banner rounded class="q-mt-lg hint"><template #avatar><q-icon name="lightbulb" color="primary"/></template>No necesitas conocer términos técnicos. Escríbelo como se lo explicarías a otra persona.</q-banner>
          </q-card-section>
          <q-card-section v-else-if="step===3" class="q-pa-xl">
            <div class="step">03 · PROPUESTA VITI</div><h2>Esto es lo que entendimos.</h2><p class="lead">A partir de lo que nos contaste, VITI propone una primera estructura. AGR Studio podrá ajustarla contigo.</p>
            <div class="summary"><div><span>Sistema</span><strong>{{form.tituloSistema}}</strong></div><div><span>Necesidad</span><strong>{{form.resumen}}</strong></div><div><span>Público</span><strong>{{form.publico}}</strong></div></div>
            <div class="module-grid q-mt-lg"><q-card v-for="item in suggestions" :key="item.label" flat bordered><q-card-section><div class="module-title"><q-icon name="check_circle" color="positive"/>{{item.label}}</div><div class="module-copy">{{item.why}}</div></q-card-section></q-card></div>
            <div class="step q-mt-xl">PLAN</div><div class="row q-col-gutter-md q-mt-sm"><div v-for="plan in plans" :key="plan.id" class="col-12 col-md-6"><q-card flat bordered clickable :class="['plan', {selected:Number(form.planId)===Number(plan.id)}]" @click="form.planId=plan.id"><q-card-section><div class="row items-center"><div class="text-h6 text-weight-bold">{{plan.nombre}}</div><q-space/><q-icon v-if="Number(form.planId)===Number(plan.id)" name="check_circle" color="primary"/></div><div class="text-caption text-grey-7 q-mt-xs">{{plan.descripcion}}</div><div class="text-subtitle1 text-weight-bold q-mt-md">{{planPrice(plan)}}</div></q-card-section></q-card></div></div>
          </q-card-section>
          <q-card-section v-else class="q-pa-xl">
            <div class="step">04 · CONFIRMA</div><h2>Una última revisión y lo enviamos.</h2>
            <div class="summary"><div><span>Sistema</span><strong>{{form.tituloSistema}}</strong></div><div><span>Plan</span><strong>{{currentPlan?.nombre || 'Sin seleccionar'}}</strong></div><div><span>Pago</span><strong>{{form.pago}}</strong></div></div>
            <div v-if="currentPlan?.precio_mensual !== null || currentPlan?.precio_anual !== null" class="q-mt-lg"><q-option-group v-model="form.frecuencia" inline :options="[{label:'Mensual',value:'mensual'},{label:'Anual',value:'anual'}]" /></div>
            <q-select v-model="form.pago" outlined class="q-mt-lg" label="¿Cómo prefieres manejar el pago?" :options="[{label:'Acordarlo con AGR Studio',value:'por_definir'},{label:'Pago completo de implementación',value:'contado'},{label:'50% al iniciar / 50% al entregar',value:'50_50'},{label:'40% / 30% / 30%',value:'tres_partes'}]" emit-value map-options />
            <q-checkbox v-model="form.declaracion" class="q-mt-md" label="Confirmo que la información enviada es correcta."/><q-input v-model="form.declaracionNombre" outlined label="Escribe tu nombre para confirmar"/>
            <q-checkbox v-model="form.acuerdo" class="q-mt-md" label="Acepto el acuerdo comercial inicial para que AGR Studio revise la solicitud."/><q-input v-model="form.acuerdoNombre" outlined label="Nombre para el acuerdo"/>
          </q-card-section>
          <q-separator/>
          <q-card-actions class="q-pa-lg" align="between"><q-btn v-if="step>1" flat color="primary" no-caps label="Atrás" @click="back"/><q-space/><q-btn v-if="step<4" color="primary" unelevated no-caps label="Continuar" @click="next"/><q-btn v-else color="primary" unelevated no-caps icon="send" label="Enviar solicitud" :loading="submitting" @click="submit"/></q-card-actions>
        </q-card>
      </template>
    </div>
  </q-page>
</template>

<style scoped>
.idea-page{min-height:100vh;background:#f5f9fb;color:#102a43}.idea-shell{width:min(980px,100%);margin:auto;padding:24px 18px 50px}.idea-header{display:flex;align-items:center;justify-content:space-between}.intro{max-width:760px;padding:52px 0 18px}.eyebrow,.step{font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#0b7593}.intro h1,.success-card h1{font-size:46px;line-height:1.02;letter-spacing:-.055em;margin:12px 0}.intro p,.lead{font-size:16px;line-height:1.7;color:#60798a}.progress{margin:18px 0}.progress>div{display:flex;justify-content:space-between;font-size:12px;color:#60798a;margin-bottom:7px}.progress strong{color:#102a43}.idea-card{border:1px solid #dce7ec;border-radius:22px;overflow:hidden;background:#fff}.idea-card h2{font-size:30px;line-height:1.1;letter-spacing:-.04em;margin:10px 0 20px}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.hint{background:#eef7f8;color:#587180}.summary{display:grid;grid-template-columns:1fr 1fr;gap:12px}.summary>div{padding:14px;border-radius:14px;background:#f6fafb}.summary span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#77909d;font-weight:800}.summary strong{display:block;margin-top:6px;line-height:1.45}.module-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.module-title{display:flex;gap:8px;align-items:center;font-weight:800}.module-copy{color:#647d8a;font-size:12px;line-height:1.5;margin-top:7px}.plan.selected{border:2px solid #146ef5}.plan{transition:.16s ease}.success-card{margin:100px auto;max-width:680px;text-align:center;padding:44px;border:1px solid #dce7ec;border-radius:22px;background:#fff}.success-card p{color:#60798a;line-height:1.7}.code{display:inline-block;margin-top:20px;padding:9px 14px;border-radius:10px;background:#eef7f8;color:#075f78;font-weight:900}@media(max-width:700px){.intro h1,.success-card h1{font-size:36px}.field-grid,.summary,.module-grid{grid-template-columns:1fr}.idea-shell{padding:16px 12px 36px}.idea-card h2{font-size:26px}.success-card{margin:50px auto 0;padding:28px 20px}}
</style>
