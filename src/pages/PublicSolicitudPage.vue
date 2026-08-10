<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api, initCsrf } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const route=useRoute(),$q=useQuasar(),item=ref(null),loading=ref(true),saving=ref(false),sent=ref(false),step=ref(1),advanced=ref(false)
const answers=reactive({}),otherAnswers=reactive({}),declaration=reactive({aceptada:false,nombre:'',fecha:new Date().toISOString().slice(0,10)})
const commercial=reactive({plan_viti_id:null,forma_pago_preferida:null,acuerdo_comercial_aceptado:false,acuerdo_comercial_nombre:'',acuerdo_comercial_fecha:new Date().toISOString().slice(0,10)})

const essential=new Set([7,9,12,13,17,18,19,20,22,31,32,41,43,50,51,52,60,61,67,68])
const groups=[
 {id:1,label:'Qué necesitas',sections:[2,3,4]},
 {id:2,label:'Cómo funcionará',sections:[5,6,7,8,9]},
 {id:3,label:'Diseño y seguridad',sections:[10,11,12]},
 {id:4,label:'Presupuesto y acuerdo',sections:[13,14]},
]
const moduleNames={inicio:'Inicio',agenda:'Agenda',ordenes:'Órdenes y servicios',clientes:'Clientes',equipos:'Equipos',tecnicos:'Técnicos',inventario:'Inventario',pagos:'Pagos',garantias:'Garantías',historial:'Historial y reportes',buzon:'Mensajes'}
const paymentOptions=[
 {value:'50_50',label:'50% para iniciar / 50% al entregar',description:'Divide el pago del desarrollo en dos momentos claros.'},
 {value:'contado',label:'Pago completo',description:'El proyecto se paga en un solo desembolso antes de iniciar.'},
 {value:'tres_partes',label:'Tres pagos durante el proyecto',description:'Permite distribuir el costo entre inicio, avance y entrega.'},
 {value:'por_definir',label:'Quiero acordarlo con AGR Studio',description:'La forma de pago se define durante la revisión de la solicitud.'},
]
const requestedModuleMap={
 'Reservas o citas':'agenda','Agenda o calendario':'agenda','Órdenes de trabajo':'ordenes','Registro de servicios':'ordenes',
 'Registro de clientes':'clientes','Historial de clientes':'historial','Registro de trabajadores':'tecnicos','Inventario':'inventario',
 'Registro de productos':'inventario','Control de pagos':'pagos','Cuentas por cobrar':'pagos','Garantías':'garantias','Reportes':'historial',
 'Notificaciones':'buzon',
}

const sections=computed(()=>item.value?.cuestionario?.secciones||[])
const currentSections=computed(()=>sections.value.filter(s=>groups.find(g=>g.id===step.value)?.sections.includes(s.numero)))
const registrationDuplicate=q=>[2,3].includes(Number(q.numero))||([1,4].includes(Number(q.numero))&&Boolean(item.value?.empresa))
const visible=q=>!registrationDuplicate(q)&&(advanced.value||q.obligatoria||essential.has(q.numero))
const visibleQuestions=computed(()=>sections.value.flatMap(s=>s.preguntas||[]).filter(visible))
const hasValue=value=>Array.isArray(value)?value.length>0:String(value??'').trim().length>0
const answered=computed(()=>visibleQuestions.value.filter(q=>hasValue(answers[q.id])).length)
const totalVisible=computed(()=>visibleQuestions.value.length)
const progress=computed(()=>totalVisible.value?Math.min(answered.value/totalVisible.value,1):0)
const draftKey=computed(()=>`viti-form-draft-${route.params.token}`)
const plans=computed(()=>item.value?.planes_disponibles||[])
const selectedPlan=computed(()=>plans.value.find(plan=>Number(plan.id)===Number(commercial.plan_viti_id))||item.value?.plan_viti||null)
const questionByNumber=number=>sections.value.flatMap(s=>s.preguntas||[]).find(q=>Number(q.numero)===Number(number))
const requestedModules=computed(()=>{
 const q=questionByNumber(17),value=q?answers[q.id]:[]
 const selected=Array.isArray(value)?value:[]
 return [...new Set(selected.map(label=>requestedModuleMap[label]).filter(Boolean))]
})
const missingPlanModules=computed(()=>{
 const plan=selectedPlan.value
 if(!plan||!Array.isArray(plan.modulos)||!plan.modulos.length)return []
 return requestedModules.value.filter(module=>!plan.modulos.includes(module))
})

function money(value){return value===null||value===undefined||value===''?'Cotización personalizada':`${Number(value).toFixed(0)} Bs`}
function pretty(value){return String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function errorMessage(e,fallback){const bag=e?.response?.data?.errors;if(bag)return Object.values(bag).flat()[0];return e?.response?.data?.message||fallback}
function storeDraft(){if(sent.value)return;try{localStorage.setItem(draftKey.value,JSON.stringify({answers:{...answers},otherAnswers:{...otherAnswers},declaration:{...declaration},commercial:{...commercial},step:step.value,advanced:advanced.value,updated_at:new Date().toISOString()}))}catch{}}
function restoreDraft(){if(sent.value)return;try{const d=JSON.parse(localStorage.getItem(draftKey.value)||'null');if(!d)return;Object.assign(answers,d.answers||{});Object.assign(otherAnswers,d.otherAnswers||{});Object.assign(declaration,d.declaration||{});Object.assign(commercial,d.commercial||{});if(Number(d.step)>=1&&Number(d.step)<=4)step.value=Number(d.step);advanced.value=Boolean(d.advanced)}catch{}}
function clearDraft(){try{localStorage.removeItem(draftKey.value)}catch{}}
function networkFailure(e){return !navigator.onLine||!e?.response}
function autoFillRegistrationAnswers(){
 const presets={1:item.value?.empresa?.nombre_comercial||'',2:item.value?.cliente?.nombre||'',3:item.value?.cliente?.telefono||'',4:item.value?.empresa?.actividad||''}
 for(const [number,value] of Object.entries(presets)){const q=questionByNumber(number);if(q&&!hasValue(answers[q.id])&&hasValue(value))answers[q.id]=value}
}

async function load(){
 loading.value=true
 try{
  item.value=(await api.get(`/publico/solicitudes/${route.params.token}`)).data.data
  for(const section of sections.value)for(const q of section.preguntas||[])answers[q.id]=q.tipo==='seleccion_multiple'?[]:''
  for(const r of item.value.respuestas||[]){
   const raw=r.respuesta_json??r.respuesta_texto??''
   if(Array.isArray(raw)){
    const custom=raw.find(x=>typeof x==='string'&&x.startsWith('Otro: '))
    answers[r.pregunta_id]=custom?[...raw.filter(x=>x!==custom),'Otro']:raw
    otherAnswers[r.pregunta_id]=custom?custom.slice(6):''
   }else if(typeof raw==='string'&&raw.startsWith('Otro: ')){
    answers[r.pregunta_id]='Otro';otherAnswers[r.pregunta_id]=raw.slice(6)
   }else answers[r.pregunta_id]=raw
  }
  Object.assign(declaration,{aceptada:Boolean(item.value.declaracion_aceptada),nombre:item.value.declaracion_nombre||item.value.cliente?.nombre||'',fecha:item.value.declaracion_fecha||new Date().toISOString().slice(0,10)})
  Object.assign(commercial,{
   plan_viti_id:item.value.plan_viti_id||null,
   forma_pago_preferida:item.value.forma_pago_preferida||null,
   acuerdo_comercial_aceptado:Boolean(item.value.acuerdo_comercial_aceptado),
   acuerdo_comercial_nombre:item.value.acuerdo_comercial_nombre||item.value.cliente?.nombre||'',
   acuerdo_comercial_fecha:item.value.acuerdo_comercial_fecha||new Date().toISOString().slice(0,10),
  })
  sent.value=['en_revision','aprobada','convertida','cerrada'].includes(item.value.estado)
  restoreDraft()
  autoFillRegistrationAnswers()
 }catch(e){$q.notify({type:'negative',message:errorMessage(e,'El enlace no está disponible.')})}
 finally{loading.value=false}
}
function hasOther(q){return (q.opciones||[]).includes('Otro')}
function selectedOther(q){const v=answers[q.id];return Array.isArray(v)?v.includes('Otro'):v==='Otro'}
function normalizedValue(id,value){const custom=String(otherAnswers[id]||'').trim();if(Array.isArray(value))return value.map(x=>x==='Otro'&&custom?`Otro: ${custom}`:x);return value==='Otro'&&custom?`Otro: ${custom}`:value}
function payload(){return{
 respuestas:Object.entries(answers).map(([pregunta_id,valor])=>({pregunta_id:Number(pregunta_id),valor:normalizedValue(pregunta_id,valor)})),
 declaracion_aceptada:declaration.aceptada,declaracion_nombre:declaration.nombre,declaracion_fecha:declaration.fecha,
 plan_viti_id:commercial.plan_viti_id,forma_pago_preferida:commercial.forma_pago_preferida,
 acuerdo_comercial_aceptado:commercial.acuerdo_comercial_aceptado,acuerdo_comercial_nombre:commercial.acuerdo_comercial_nombre,acuerdo_comercial_fecha:commercial.acuerdo_comercial_fecha,
}}
async function save(quiet=false){storeDraft();if(!navigator.onLine){if(!quiet)$q.notify({type:'warning',message:'Sin Internet. El borrador quedó guardado en este dispositivo.'});return true}saving.value=true;try{await initCsrf();await api.put(`/publico/solicitudes/${route.params.token}`,payload());clearDraft();if(!quiet)$q.notify({type:'positive',message:'Tus respuestas fueron guardadas.'});return true}catch(e){if(networkFailure(e)){if(!quiet)$q.notify({type:'warning',message:'Se perdió la conexión. El borrador quedó guardado y se sincronizará al volver Internet.'});return true}$q.notify({type:'negative',message:errorMessage(e,'No se pudo guardar el formulario.')});return false}finally{saving.value=false}}
async function next(){if(await save(true))step.value=Math.min(4,step.value+1)}
async function submit(){
 if(item.value?.acuerdo_comercial_requerido){
  if(!commercial.plan_viti_id)return $q.notify({type:'warning',message:'Selecciona el plan que prefieres.'})
  if(!commercial.forma_pago_preferida)return $q.notify({type:'warning',message:'Selecciona una forma de pago preferida.'})
  if(!commercial.acuerdo_comercial_aceptado)return $q.notify({type:'warning',message:'Acepta el acuerdo comercial inicial para continuar.'})
 }
 storeDraft();if(!navigator.onLine){$q.notify({type:'warning',message:'El formulario quedó guardado. Conéctate a Internet para enviarlo a revisión.'});return}
 saving.value=true
 try{await initCsrf();await api.put(`/publico/solicitudes/${route.params.token}`,payload());await api.post(`/publico/solicitudes/${route.params.token}/enviar`);sent.value=true;clearDraft();$q.notify({type:'positive',message:'Solicitud enviada correctamente. Nuestro equipo la revisará.'})}
 catch(e){if(networkFailure(e)){$q.notify({type:'warning',message:'Se guardó el borrador en el dispositivo. Intenta enviarlo cuando vuelva Internet.'});return}$q.notify({type:'negative',message:errorMessage(e,'Revisa los datos obligatorios.')})}
 finally{saving.value=false}
}
async function syncDraft(){if(navigator.onLine&&localStorage.getItem(draftKey.value)&&!sent.value)await save(true)}
watch(()=>[JSON.stringify(answers),JSON.stringify(otherAnswers),JSON.stringify(declaration),JSON.stringify(commercial),step.value,advanced.value],storeDraft)
onMounted(async()=>{window.addEventListener('online',syncDraft);await load();await syncDraft()})
onBeforeUnmount(()=>window.removeEventListener('online',syncDraft))
</script>

<template><q-page class="public-page"><q-inner-loading :showing="loading"/><div v-if="item" class="public-shell">
<div class="row items-center justify-between q-mb-lg"><AppBrand/><q-badge outline color="primary">{{item.codigo}}</q-badge></div>
<q-banner v-if="sent" rounded class="bg-green-1 text-green-9 q-mb-lg"><template #avatar><q-icon name="check_circle"/></template>Tu información fue enviada. Nuestro equipo la revisará y se comunicará contigo por teléfono o WhatsApp.<template #action><q-btn flat no-caps color="green-9" icon="login" label="Ingresar a mi cuenta" to="/login?tipo=cliente"/></template></q-banner>
<div class="section-label">Solicitud de proyecto</div><h1 class="page-title">Cuéntanos lo esencial de tu sistema</h1><div class="page-subtitle">{{item.empresa?.nombre_comercial||'Tu nueva empresa o proyecto'}} · {{item.cliente?.nombre}}</div>

<q-card flat class="viti-card q-mt-lg"><q-card-section><div class="row items-center justify-between q-gutter-md"><div><div class="text-weight-bold">Formulario simplificado</div><div class="text-caption text-grey-6">Respondidas {{answered}} de {{totalVisible}} preguntas {{advanced?'visibles':'principales'}}. Los datos que VITI ya conoce no se vuelven a pedir.</div></div><q-toggle v-model="advanced" label="Ver preguntas opcionales" color="primary" :disable="sent"/></div><q-linear-progress rounded size="10px" :value="progress" color="primary" class="q-mt-md"/></q-card-section></q-card>

<q-stepper v-model="step" flat animated color="primary" class="viti-card q-mt-lg" header-nav>
<q-step v-for="g in groups" :key="g.id" :name="g.id" :title="g.label" :done="step>g.id">
<div v-for="section in currentSections" :key="section.id" class="q-mb-xl"><div class="section-label">{{section.titulo}}</div><div v-for="q in (section.preguntas||[]).filter(visible)" :key="q.id" class="q-mb-xl"><div class="text-weight-medium q-mb-sm"><span class="text-primary">{{q.numero}}.</span> {{q.pregunta}} <span v-if="q.obligatoria" class="text-negative">*</span></div><div v-if="q.ayuda" class="text-caption text-grey-6 q-mb-sm">{{q.ayuda}}</div><q-input v-if="['texto','numero'].includes(q.tipo)" v-model="answers[q.id]" outlined :type="q.tipo==='numero'?'number':'textarea'" autogrow :disable="sent"/>
<div v-else-if="q.tipo==='seleccion_unica'"><q-option-group v-model="answers[q.id]" :options="(q.opciones||[]).map(x=>({label:x,value:x}))" type="radio" color="primary" :disable="sent"/><q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica otra opción" :disable="sent"/></div>
<div v-else><q-option-group v-model="answers[q.id]" :options="(q.opciones||[]).map(x=>({label:x,value:x}))" type="checkbox" color="primary" :disable="sent"/><q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica otra opción o sugerencia" :disable="sent"/></div></div></div>

<div v-if="g.id===4 && item.acuerdo_comercial_requerido" class="commercial-section">
 <q-separator class="q-my-xl"/>
 <div class="section-label">Acuerdo de proyecto</div><div class="text-h6 text-weight-bold">¿Qué plan prefieres?</div><p class="text-body2 text-grey-7">Esta elección es una preferencia inicial. AGR Studio revisará que el plan cubra lo que pediste antes de aprobar el proyecto.</p>
 <div class="plan-grid q-mt-md">
  <q-card v-for="plan in plans" :key="plan.id" flat bordered :class="['plan-card',{selected:Number(commercial.plan_viti_id)===Number(plan.id)}]" @click="!sent&&(commercial.plan_viti_id=plan.id)">
   <q-card-section><div class="row items-start no-wrap"><div class="col"><div class="text-subtitle1 text-weight-bold">{{plan.nombre}}</div><div class="text-h6 text-primary text-weight-bold q-mt-xs">{{money(plan.precio_proyecto)}}</div></div><q-radio v-model="commercial.plan_viti_id" :val="plan.id" :disable="sent"/></div><div class="text-body2 q-mt-md">{{plan.descripcion||'Alcance a definir durante la revisión.'}}</div><div v-if="plan.modulos?.length" class="row q-gutter-xs q-mt-md"><q-chip v-for="module in plan.modulos" :key="module" dense size="sm">{{moduleNames[module]||pretty(module)}}</q-chip></div></q-card-section>
  </q-card>
 </div>
 <q-banner v-if="selectedPlan&&missingPlanModules.length" rounded class="bg-orange-1 text-orange-10 q-mt-md"><template #avatar><q-icon name="info"/></template>El plan elegido no incluye: <strong>{{missingPlanModules.map(m=>moduleNames[m]||pretty(m)).join(', ')}}</strong>. Puedes mantenerlo como preferencia; AGR Studio revisará si hace falta ajustar el plan o la cotización.</q-banner>

 <div class="text-h6 text-weight-bold q-mt-xl">¿Cómo prefieres pagar el desarrollo?</div><div class="payment-grid q-mt-md"><q-card v-for="option in paymentOptions" :key="option.value" flat bordered :class="['payment-card',{selected:commercial.forma_pago_preferida===option.value}]" @click="!sent&&(commercial.forma_pago_preferida=option.value)"><q-card-section class="row items-start no-wrap"><q-radio v-model="commercial.forma_pago_preferida" :val="option.value" :disable="sent"/><div class="q-ml-sm"><div class="text-weight-bold">{{option.label}}</div><div class="text-caption text-grey-6 q-mt-xs">{{option.description}}</div></div></q-card-section></q-card></div>

 <q-card flat class="agreement-card q-mt-xl"><q-card-section><div class="text-subtitle1 text-weight-bold">Acuerdo comercial inicial</div><ul class="agreement-list"><li>El plan y su precio son referenciales hasta que AGR Studio revise el alcance solicitado.</li><li>El desarrollo comienza después de aprobar el alcance y registrar el primer pago acordado.</li><li>Funciones nuevas o cambios fuera del alcance pueden modificar precio y plazo.</li><li>El mantenimiento o suscripción posterior se registra por separado cuando corresponda.</li></ul><q-checkbox v-model="commercial.acuerdo_comercial_aceptado" :disable="sent" label="Entiendo y acepto este acuerdo comercial inicial."/><div class="row q-col-gutter-md q-mt-sm"><div class="col-12 col-sm-8"><q-input v-model="commercial.acuerdo_comercial_nombre" outlined label="Nombre de quien acepta" :disable="sent"/></div><div class="col-12 col-sm-4"><q-input v-model="commercial.acuerdo_comercial_fecha" outlined type="date" stack-label label="Fecha" :disable="sent"/></div></div></q-card-section></q-card>
</div>
</q-step>
<template #navigation><q-stepper-navigation v-if="!sent"><q-btn v-if="step<4" color="primary" unelevated label="Guardar y continuar" no-caps :loading="saving" @click="next"/><q-btn v-if="step>1" flat color="primary" label="Anterior" no-caps class="q-ml-sm" @click="step--"/><q-btn outline color="primary" label="Guardar borrador" no-caps class="q-ml-sm" :loading="saving" @click="save(false)"/></q-stepper-navigation></template>
</q-stepper>

<q-card flat class="viti-card q-mt-lg" v-if="step===4"><q-card-section><div class="section-label">Declaración final</div><p>Confirmo que las respuestas proporcionadas representan de manera general la idea y las necesidades iniciales del sistema solicitado.</p><div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model="declaration.nombre" outlined label="Nombre del solicitante" :disable="sent"/></div><div class="col-12 col-sm-3"><q-input v-model="declaration.fecha" outlined type="date" stack-label label="Fecha" :disable="sent"/></div><div class="col-12 col-sm-3 flex items-center"><q-checkbox v-model="declaration.aceptada" label="Acepto" :disable="sent"/></div></div></q-card-section></q-card>
<div v-if="!sent&&step===4" class="row justify-end q-gutter-sm q-my-xl"><q-btn outline color="primary" label="Guardar borrador" no-caps :loading="saving" @click="save(false)"/><q-btn color="primary" unelevated label="Enviar para revisión" no-caps :loading="saving" @click="submit"/></div>
</div></q-page></template>

<style scoped>
.public-page{min-height:100vh;background:var(--viti-bg);padding:32px 16px}.public-shell{max-width:1000px;margin:auto}.body--dark .public-page{background:#06162b}.plan-grid,.payment-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.plan-card,.payment-card{cursor:pointer;border-radius:16px;transition:.18s ease}.plan-card.selected,.payment-card.selected{border-color:#1976d2;box-shadow:0 0 0 2px rgba(25,118,210,.12)}.agreement-card{background:color-mix(in srgb,var(--viti-card) 88%,#1976d2 12%);border:1px solid var(--viti-border);border-radius:16px}.agreement-list{padding-left:20px;line-height:1.55;color:var(--viti-muted)}@media(max-width:700px){.public-page{padding:18px 10px}.plan-grid,.payment-grid{grid-template-columns:1fr}.q-stepper :deep(.q-stepper__header){overflow-x:auto;flex-wrap:nowrap}.q-stepper :deep(.q-stepper__tab){min-width:170px}}
</style>