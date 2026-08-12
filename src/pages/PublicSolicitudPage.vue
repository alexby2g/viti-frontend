<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api, initCsrf } from '../boot/axios'
import AppBrand from '../components/AppBrand.vue'

const route=useRoute()
const $q=useQuasar()
const item=ref(null)
const loading=ref(true)
const saving=ref(false)
const sent=ref(false)
const step=ref(1)
const advanced=ref(false)
const answers=reactive({})
const otherAnswers=reactive({})
const declaration=reactive({aceptada:false,nombre:'',fecha:new Date().toISOString().slice(0,10)})
const commercial=reactive({
  plan_viti_id:null,
  forma_pago_preferida:null,
  frecuencia_suscripcion_preferida:null,
  acuerdo_comercial_aceptado:false,
  acuerdo_comercial_nombre:'',
  acuerdo_comercial_fecha:new Date().toISOString().slice(0,10),
})

const diagnosticNumbers=new Set([7,9,12,13,17,31,39,41,42,43,56])
const baseDetailNumbers=new Set([18,19,20,22,23,24,27,28,29,40,44,45,50,51,52,55,57,58,60,63,64,65,66,67,68,70])
const professionalNumbers=new Set([14,15,16,25,26,32,33,34,35,36,37,38,53,54])
const enterpriseNumbers=new Set([21,30,46,47,48,49,59])
const optionalNumbers=new Set([5,6,8,10,11,69])
const moduleNames={inicio:'Inicio',agenda:'Agenda',ordenes:'Órdenes y servicios',clientes:'Clientes',equipos:'Equipos',tecnicos:'Técnicos',inventario:'Inventario técnico',pagos:'Pagos y saldos',garantias:'Garantías',historial:'Historial y reportes',buzon:'Mensajes'}
const requestedModuleMap={
  'Reservas o citas':'agenda','Agenda o calendario':'agenda','Órdenes de trabajo':'ordenes','Registro de servicios':'ordenes',
  'Registro de clientes':'clientes','Historial de clientes':'historial','Registro de trabajadores':'tecnicos','Inventario':'inventario',
  'Registro de productos':'inventario','Control de pagos':'pagos','Cuentas por cobrar':'pagos','Garantías':'garantias','Reportes':'historial',
  'Notificaciones':'buzon',
}
const customFunctionLabels=new Set(['Compras','Ventas','Facturación','Pedidos','Registro de proveedores','Cuentas por pagar'])

const sections=computed(()=>item.value?.cuestionario?.secciones||[])
const allQuestions=computed(()=>sections.value.flatMap(section=>section.preguntas||[]))
const plans=computed(()=>item.value?.planes_disponibles||[])
const draftKey=computed(()=>`viti-form-draft-${route.params.token}`)
const questionByNumber=number=>allQuestions.value.find(q=>Number(q.numero)===Number(number))
const answerByNumber=number=>{const q=questionByNumber(number);return q?answers[q.id]:null}
const answerList=number=>{const value=answerByNumber(number);return Array.isArray(value)?value:[]}
const hasValue=value=>Array.isArray(value)?value.length>0:String(value??'').trim().length>0

function planKey(plan){
  const code=String(plan?.codigo||'').toLowerCase()
  if(code.includes('personalizado'))return 'custom'
  if(code.includes('empresa'))return 'enterprise'
  if(code.includes('profesional'))return 'professional'
  return 'initial'
}
function planByKey(key){return plans.value.find(plan=>planKey(plan)===key)||null}

const selectedPlan=computed(()=>plans.value.find(plan=>Number(plan.id)===Number(commercial.plan_viti_id))||item.value?.plan_viti||null)
const selectedKey=computed(()=>planKey(selectedPlan.value))
const requestedModules=computed(()=>[...new Set(answerList(17).map(label=>requestedModuleMap[label]).filter(Boolean))])
const missingPlanModules=computed(()=>{
  const plan=selectedPlan.value
  if(!plan||selectedKey.value==='custom'||!Array.isArray(plan.modulos)||!plan.modulos.length)return []
  return requestedModules.value.filter(module=>!plan.modulos.includes(module))
})

const recommendation=computed(()=>{
  const users=Number(answerByNumber(13)||0)
  const volume=Number(answerByNumber(56)||0)
  const functions=answerList(17)
  const integrations=answerList(39)
  const systemType=String(answerByNumber(41)||'')
  const offline=String(answerByNumber(42)||'')
  const scope=String(answerByNumber(43)||'')
  const reasons=[]

  const customFunction=functions.some(value=>customFunctionLabels.has(value))
  const specialIntegration=integrations.some(value=>['Sistema de facturación','Banco o pagos QR'].includes(value))
  const specialPlatform=['Aplicación para Android','Programa para computadora','Sistema web y aplicación móvil'].includes(systemType)
  const multiBusiness=['Varias sucursales','Varias empresas'].includes(scope)
  const specialOffline=['Sí','En algunas funciones'].includes(offline)

  if(users>15)reasons.push('más de 15 usuarios')
  if(multiBusiness)reasons.push('operación en varias sucursales o empresas')
  if(specialIntegration)reasons.push('integración externa especial')
  if(specialPlatform)reasons.push('plataforma adicional al sistema web estándar')
  if(specialOffline)reasons.push('funcionamiento sin conexión')
  if(customFunction)reasons.push('funciones fuera del catálogo estándar de VITI')
  if(users>15||multiBusiness||specialIntegration||specialPlatform||specialOffline||customFunction){
    return {key:'custom',reasons,summary:'Tu requerimiento necesita revisión de alcance y una cotización hecha a medida.'}
  }

  const enterpriseFunctions=functions.some(value=>['Inventario','Registro de productos'].includes(value))
  if(users>6||volume>500||enterpriseFunctions){
    if(users>6)reasons.push('más de 6 usuarios')
    if(volume>500)reasons.push('mayor volumen de movimientos')
    if(enterpriseFunctions)reasons.push('inventario técnico')
    return {key:'enterprise',reasons,summary:'Tu operación necesita mayor capacidad, inventario y controles avanzados.'}
  }

  const professionalFunctions=functions.some(value=>['Control de pagos','Cuentas por cobrar','Garantías'].includes(value))
  if(users>3||professionalFunctions||String(answerByNumber(31)||'')==='Sí'){
    if(users>3)reasons.push('varios usuarios de operación')
    if(professionalFunctions||String(answerByNumber(31)||'')==='Sí')reasons.push('control económico o garantías')
    return {key:'professional',reasons,summary:'Tu negocio necesita control operativo y económico más completo.'}
  }

  reasons.push('una aplicación y operación sencilla')
  return {key:'initial',reasons,summary:'El alcance encaja con la operación esencial de una microempresa de servicios.'}
})
const recommendedPlan=computed(()=>planByKey(recommendation.value.key))

function registrationDuplicate(q){
  const number=Number(q.numero)
  if(number===1)return Boolean(item.value?.empresa?.nombre_comercial)
  if(number===2)return Boolean(item.value?.cliente?.nombre)
  if(number===3)return Boolean(item.value?.cliente?.telefono)
  if(number===4)return Boolean(item.value?.empresa?.actividad)
  return false
}
const diagnosticQuestions=computed(()=>allQuestions.value.filter(q=>(diagnosticNumbers.has(Number(q.numero))||([1,2,3,4].includes(Number(q.numero))&&!registrationDuplicate(q)))&&!registrationDuplicate(q)))
const detailNumberSet=computed(()=>{
  const set=new Set(baseDetailNumbers)
  if(['professional','enterprise','custom'].includes(selectedKey.value))for(const number of professionalNumbers)set.add(number)
  if(['enterprise','custom'].includes(selectedKey.value))for(const number of enterpriseNumbers)set.add(number)
  if(selectedKey.value==='custom')for(const q of allQuestions.value)set.add(Number(q.numero))
  if(advanced.value)for(const number of optionalNumbers)set.add(number)
  for(const number of diagnosticNumbers)set.delete(number)
  for(const number of [1,2,3,4])set.delete(number)
  return set
})
const detailSections=computed(()=>sections.value.map(section=>({...section,preguntas:(section.preguntas||[]).filter(q=>detailNumberSet.value.has(Number(q.numero))&&!registrationDuplicate(q))})).filter(section=>section.preguntas.length))
const detailQuestions=computed(()=>detailSections.value.flatMap(section=>section.preguntas))
const progressQuestions=computed(()=>[...diagnosticQuestions.value,...detailQuestions.value])
const answered=computed(()=>progressQuestions.value.filter(q=>hasValue(answers[q.id])).length)
const totalVisible=computed(()=>progressQuestions.value.length)
const progress=computed(()=>totalVisible.value?Math.min(answered.value/totalVisible.value,1):0)

const planBenefits=key=>({
  initial:['1 aplicación VITI','Hasta 3 usuarios','Agenda, órdenes, clientes, equipos e historial'],
  professional:['1 aplicación VITI','Hasta 6 usuarios','Pagos, saldos, comprobantes y garantías'],
  enterprise:['Hasta 3 aplicaciones','Hasta 15 usuarios','Inventario técnico y operación avanzada'],
  custom:['Alcance revisado por AGR Studio','Precio definido después del diagnóstico','Integraciones o plataformas especiales'],
}[key]||[])
function annualSaving(plan){return plan?.precio_mensual&&plan?.precio_anual?Math.max(0,Number(plan.precio_mensual)*12-Number(plan.precio_anual)):0}
function money(value){return value===null||value===undefined||value===''?'A cotizar':`${Number(value).toFixed(0)} Bs`}
function pretty(value){return String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function errorMessage(e,fallback){const bag=e?.response?.data?.errors;if(bag)return Object.values(bag).flat()[0];return e?.response?.data?.message||fallback}
function paymentOptions(){
  if(selectedKey.value==='custom')return [{value:'por_definir',label:'Definir con AGR Studio',description:'La forma de pago se acuerda después de revisar el alcance y la cotización.'}]
  const options=[]
  if(['professional','enterprise'].includes(selectedKey.value))options.push({value:'tres_partes',label:'40% al iniciar / 30% en avance / 30% al entregar',description:'Distribuye la implementación en tres hitos claros del proyecto.'})
  else options.push({value:'50_50',label:'50% al iniciar / 50% al entregar',description:'Divide la implementación en inicio y entrega.'})
  options.push({value:'contado',label:'Pago completo de implementación',description:'La implementación se paga en un solo desembolso antes de iniciar.'})
  options.push({value:'por_definir',label:'Quiero acordarlo con AGR Studio',description:'La forma de pago se define durante la revisión de la solicitud.'})
  return options
}
function selectPlan(plan){
  if(sent.value)return
  commercial.plan_viti_id=plan.id
  if(planKey(plan)==='custom')commercial.frecuencia_suscripcion_preferida=null
  const allowed=paymentOptions().map(option=>option.value)
  if(!allowed.includes(commercial.forma_pago_preferida))commercial.forma_pago_preferida=null
}
function planRecommended(plan){return recommendedPlan.value&&Number(recommendedPlan.value.id)===Number(plan.id)}
function hasOther(q){return (q.opciones||[]).includes('Otro')}
function selectedOther(q){const value=answers[q.id];return Array.isArray(value)?value.includes('Otro'):value==='Otro'}
function normalizedValue(id,value){const custom=String(otherAnswers[id]||'').trim();if(Array.isArray(value))return value.map(x=>x==='Otro'&&custom?`Otro: ${custom}`:x);return value==='Otro'&&custom?`Otro: ${custom}`:value}
function storeDraft(){if(sent.value)return;try{localStorage.setItem(draftKey.value,JSON.stringify({answers:{...answers},otherAnswers:{...otherAnswers},declaration:{...declaration},commercial:{...commercial},step:step.value,advanced:advanced.value,updated_at:new Date().toISOString()}))}catch{}}
function restoreDraft(){if(sent.value)return;try{const draft=JSON.parse(localStorage.getItem(draftKey.value)||'null');if(!draft)return;Object.assign(answers,draft.answers||{});Object.assign(otherAnswers,draft.otherAnswers||{});Object.assign(declaration,draft.declaration||{});Object.assign(commercial,draft.commercial||{});if(Number(draft.step)>=1&&Number(draft.step)<=4)step.value=Number(draft.step);advanced.value=Boolean(draft.advanced)}catch{}}
function clearDraft(){try{localStorage.removeItem(draftKey.value)}catch{}}
function networkFailure(e){return !navigator.onLine||!e?.response}
function autoFillRegistrationAnswers(){
  const presets={1:item.value?.empresa?.nombre_comercial||'',2:item.value?.cliente?.nombre||'',3:item.value?.cliente?.telefono||'',4:item.value?.empresa?.actividad||''}
  for(const [number,value] of Object.entries(presets)){const q=questionByNumber(number);if(q&&!hasValue(answers[q.id])&&hasValue(value))answers[q.id]=value}
}
function answerRequired(number){const q=questionByNumber(number);return q&&hasValue(answers[q.id])}
function validateStep(){
  if(step.value===1){
    const missing=[7,9,17].filter(number=>!answerRequired(number))
    if(missing.length){$q.notify({type:'warning',message:'Completa qué necesitas, qué problema quieres resolver y las funciones principales para recomendarte un plan.'});return false}
  }
  if(step.value===2&&!commercial.plan_viti_id){$q.notify({type:'warning',message:'Selecciona un plan para continuar.'});return false}
  if(step.value===3){
    const missing=[18,19].filter(number=>!answerRequired(number))
    if(missing.length){$q.notify({type:'warning',message:'Indica la función principal y cómo realizas actualmente el trabajo.'});return false}
  }
  return true
}

async function load(){
  loading.value=true
  try{
    item.value=(await api.get(`/publico/solicitudes/${route.params.token}`)).data.data
    for(const section of sections.value)for(const q of section.preguntas||[])answers[q.id]=q.tipo==='seleccion_multiple'?[]:''
    for(const response of item.value.respuestas||[]){
      const raw=response.respuesta_json??response.respuesta_texto??''
      if(Array.isArray(raw)){
        const custom=raw.find(value=>typeof value==='string'&&value.startsWith('Otro: '))
        answers[response.pregunta_id]=custom?[...raw.filter(value=>value!==custom),'Otro']:raw
        otherAnswers[response.pregunta_id]=custom?custom.slice(6):''
      }else if(typeof raw==='string'&&raw.startsWith('Otro: ')){
        answers[response.pregunta_id]='Otro';otherAnswers[response.pregunta_id]=raw.slice(6)
      }else answers[response.pregunta_id]=raw
    }
    Object.assign(declaration,{aceptada:Boolean(item.value.declaracion_aceptada),nombre:item.value.declaracion_nombre||item.value.cliente?.nombre||'',fecha:item.value.declaracion_fecha||new Date().toISOString().slice(0,10)})
    Object.assign(commercial,{
      plan_viti_id:item.value.plan_viti_id||null,
      forma_pago_preferida:item.value.forma_pago_preferida||null,
      frecuencia_suscripcion_preferida:item.value.frecuencia_suscripcion_preferida||null,
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
function payload(){return{
  respuestas:Object.entries(answers).map(([pregunta_id,valor])=>({pregunta_id:Number(pregunta_id),valor:normalizedValue(pregunta_id,valor)})),
  declaracion_aceptada:declaration.aceptada,declaracion_nombre:declaration.nombre,declaracion_fecha:declaration.fecha,
  plan_viti_id:commercial.plan_viti_id,forma_pago_preferida:commercial.forma_pago_preferida,frecuencia_suscripcion_preferida:commercial.frecuencia_suscripcion_preferida,
  acuerdo_comercial_aceptado:commercial.acuerdo_comercial_aceptado,acuerdo_comercial_nombre:commercial.acuerdo_comercial_nombre,acuerdo_comercial_fecha:commercial.acuerdo_comercial_fecha,
}}
async function save(quiet=false){storeDraft();if(!navigator.onLine){if(!quiet)$q.notify({type:'warning',message:'Sin Internet. El borrador quedó guardado en este dispositivo.'});return true}saving.value=true;try{await initCsrf();await api.put(`/publico/solicitudes/${route.params.token}`,payload());clearDraft();if(!quiet)$q.notify({type:'positive',message:'Tus respuestas fueron guardadas.'});return true}catch(e){if(networkFailure(e)){if(!quiet)$q.notify({type:'warning',message:'Se perdió la conexión. El borrador quedó guardado.'});return true}$q.notify({type:'negative',message:errorMessage(e,'No se pudo guardar el formulario.')});return false}finally{saving.value=false}}
async function next(){
  if(!validateStep())return
  if(step.value===1&&!commercial.plan_viti_id&&recommendedPlan.value)commercial.plan_viti_id=recommendedPlan.value.id
  if(await save(true))step.value=Math.min(4,step.value+1)
}
async function submit(){
  if(!commercial.plan_viti_id)return $q.notify({type:'warning',message:'Selecciona el plan que prefieres.'})
  if(!commercial.forma_pago_preferida)return $q.notify({type:'warning',message:'Selecciona la forma de pago de la implementación.'})
  if(selectedKey.value!=='custom'&&!commercial.frecuencia_suscripcion_preferida)return $q.notify({type:'warning',message:'Selecciona si prefieres suscripción mensual o anual.'})
  if(!declaration.aceptada)return $q.notify({type:'warning',message:'Confirma que la información del requerimiento es correcta.'})
  if(!commercial.acuerdo_comercial_aceptado)return $q.notify({type:'warning',message:'Acepta el acuerdo comercial inicial para continuar.'})
  storeDraft()
  if(!navigator.onLine){$q.notify({type:'warning',message:'El formulario quedó guardado. Conéctate a Internet para enviarlo a revisión.'});return}
  saving.value=true
  try{await initCsrf();await api.put(`/publico/solicitudes/${route.params.token}`,payload());await api.post(`/publico/solicitudes/${route.params.token}/enviar`);sent.value=true;clearDraft();$q.notify({type:'positive',message:'Solicitud enviada correctamente. AGR Studio revisará el plan y el alcance.'})}
  catch(e){if(networkFailure(e)){$q.notify({type:'warning',message:'Se guardó el borrador. Intenta enviarlo cuando vuelva Internet.'});return}$q.notify({type:'negative',message:errorMessage(e,'Revisa los datos obligatorios.')})}
  finally{saving.value=false}
}
async function syncDraft(){if(navigator.onLine&&localStorage.getItem(draftKey.value)&&!sent.value)await save(true)}
watch(()=>[JSON.stringify(answers),JSON.stringify(otherAnswers),JSON.stringify(declaration),JSON.stringify(commercial),step.value,advanced.value],storeDraft)
onMounted(async()=>{window.addEventListener('online',syncDraft);await load();await syncDraft()})
onBeforeUnmount(()=>window.removeEventListener('online',syncDraft))
</script>

<template>
<q-page class="public-page">
  <q-inner-loading :showing="loading"/>
  <div v-if="item" class="public-shell">
    <div class="row items-center justify-between q-mb-lg"><AppBrand/><q-badge outline color="primary">{{item.codigo}}</q-badge></div>

    <q-banner v-if="sent" rounded class="bg-green-1 text-green-9 q-mb-lg">
      <template #avatar><q-icon name="check_circle"/></template>
      Tu diagnóstico y preferencia comercial fueron enviados. AGR Studio revisará que el plan realmente cubra el alcance antes de aprobar el proyecto.
      <template #action><q-btn flat no-caps color="green-9" icon="login" label="Ingresar a mi cuenta" to="/login?tipo=cliente"/></template>
    </q-banner>

    <div class="section-label">Solicitud VITI</div>
    <h1 class="page-title">Encuentra el plan correcto para tu negocio</h1>
    <div class="page-subtitle">{{item.empresa?.nombre_comercial||'Tu empresa'}} · {{item.cliente?.nombre}}</div>

    <q-card flat class="viti-card q-mt-lg">
      <q-card-section>
        <div class="row items-center justify-between q-gutter-md">
          <div><div class="text-weight-bold">Proceso guiado</div><div class="text-caption text-grey-6">Primero diagnosticamos tu necesidad, después VITI recomienda un plan y solo entonces pregunta los detalles que corresponden.</div></div>
          <q-badge color="primary" outline>{{answered}} / {{totalVisible}} respuestas visibles</q-badge>
        </div>
        <q-linear-progress rounded size="10px" :value="progress" color="primary" class="q-mt-md"/>
      </q-card-section>
    </q-card>

    <q-stepper v-model="step" flat animated color="primary" class="viti-card q-mt-lg" header-nav>
      <q-step :name="1" title="Diagnóstico" icon="travel_explore" :done="step>1">
        <q-banner rounded class="bg-blue-1 text-primary q-mb-xl"><template #avatar><q-icon name="auto_awesome"/></template>Responde lo esencial. Con estas respuestas VITI estima qué nivel encaja mejor con tu operación.</q-banner>
        <div v-for="q in diagnosticQuestions" :key="q.id" class="question-block">
          <div class="text-weight-medium q-mb-sm"><span class="text-primary">{{q.numero}}.</span> {{q.pregunta}} <span v-if="[7,9,17].includes(Number(q.numero))" class="text-negative">*</span></div>
          <div v-if="q.ayuda" class="text-caption text-grey-6 q-mb-sm">{{q.ayuda}}</div>
          <q-input v-if="['texto','numero'].includes(q.tipo)" v-model="answers[q.id]" outlined :type="q.tipo==='numero'?'number':'textarea'" :autogrow="q.tipo==='texto'" :disable="sent"/>
          <div v-else-if="q.tipo==='seleccion_unica'"><q-option-group v-model="answers[q.id]" :options="(q.opciones||[]).map(x=>({label:x,value:x}))" type="radio" color="primary" :disable="sent"/><q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica otra opción" :disable="sent"/></div>
          <div v-else><q-option-group v-model="answers[q.id]" :options="(q.opciones||[]).map(x=>({label:x,value:x}))" type="checkbox" color="primary" :disable="sent"/><q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica otra opción" :disable="sent"/></div>
        </div>
      </q-step>

      <q-step :name="2" title="Plan" icon="workspace_premium" :done="step>2">
        <q-card flat bordered class="recommendation-card q-mb-lg">
          <q-card-section class="row items-start q-gutter-md">
            <q-avatar color="primary" text-color="white" icon="auto_awesome"/>
            <div class="col"><div class="section-label">Recomendación VITI</div><div class="text-h5 text-weight-bold">{{recommendedPlan?.nombre||'Plan por definir'}}</div><div class="text-body2 text-grey-7 q-mt-xs">{{recommendation.summary}}</div><div v-if="recommendation.reasons.length" class="row q-gutter-xs q-mt-md"><q-chip v-for="reason in recommendation.reasons" :key="reason" dense color="blue-1" text-color="primary">{{reason}}</q-chip></div></div>
          </q-card-section>
        </q-card>

        <div class="text-h6 text-weight-bold">Compara antes de elegir</div>
        <div class="text-body2 text-grey-7 q-mb-md">La recomendación es una guía, no una imposición. AGR Studio revisará el alcance antes de aprobar el proyecto.</div>
        <div class="plan-grid">
          <q-card v-for="plan in plans" :key="plan.id" flat bordered :class="['plan-card',{selected:Number(commercial.plan_viti_id)===Number(plan.id),recommended:planRecommended(plan)}]" @click="selectPlan(plan)">
            <q-card-section>
              <div class="row items-start no-wrap q-gutter-sm"><div class="col"><div class="row items-center q-gutter-sm"><div class="text-h6 text-weight-bold">{{plan.nombre}}</div><q-badge v-if="planRecommended(plan)" color="primary">Recomendado</q-badge></div><div class="text-caption text-grey-7 q-mt-sm">{{plan.descripcion}}</div></div><q-radio :model-value="commercial.plan_viti_id" :val="plan.id" color="primary" :disable="sent" @update:model-value="selectPlan(plan)"/></div>
              <div v-if="planKey(plan)!=='custom'" class="price-box q-mt-lg"><div><div class="price-label">Implementación inicial</div><div class="price-value">{{money(plan.precio_proyecto)}}</div></div><div><div class="price-label">Suscripción</div><div class="text-weight-bold">{{money(plan.precio_mensual)}}/mes</div><div class="text-caption text-positive">{{money(plan.precio_anual)}}/año</div></div></div>
              <div v-else class="custom-price q-mt-lg"><q-icon name="request_quote" color="primary" size="28px"/><div><div class="text-weight-bold">Cotización después de la revisión</div><div class="text-caption text-grey-7">No se fija un precio hasta definir el alcance real.</div></div></div>
              <q-list dense class="q-mt-md"><q-item v-for="benefit in planBenefits(planKey(plan))" :key="benefit" class="q-px-none"><q-item-section avatar style="min-width:30px"><q-icon name="check_circle" color="positive"/></q-item-section><q-item-section>{{benefit}}</q-item-section></q-item></q-list>
              <div v-if="annualSaving(plan)>0" class="text-caption text-positive text-weight-bold q-mt-sm">Con el anual ahorras {{money(annualSaving(plan))}} frente a 12 mensualidades.</div>
            </q-card-section>
          </q-card>
        </div>
      </q-step>

      <q-step :name="3" title="Tu operación" icon="fact_check" :done="step>3">
        <div class="row items-start justify-between q-gutter-md q-mb-lg"><div><div class="text-h6 text-weight-bold">Preguntas para {{selectedPlan?.nombre||'tu plan'}}</div><div class="text-body2 text-grey-7">Ya no te preguntamos cosas que no corresponden al nivel elegido.</div></div><q-toggle v-if="selectedKey!=='custom'" v-model="advanced" label="Ver preguntas adicionales" color="primary" :disable="sent"/></div>
        <q-banner v-if="missingPlanModules.length" rounded class="bg-orange-1 text-orange-10 q-mb-lg"><template #avatar><q-icon name="warning_amber"/></template>Pediste funciones que este plan no incluye: <strong>{{missingPlanModules.map(module=>moduleNames[module]||module).join(', ')}}</strong>. Puedes volver al paso anterior y elegir un nivel superior.</q-banner>
        <div v-for="section in detailSections" :key="section.id" class="q-mb-xl">
          <div class="section-label">{{section.titulo}}</div>
          <div v-for="q in section.preguntas" :key="q.id" class="question-block">
            <div class="text-weight-medium q-mb-sm"><span class="text-primary">{{q.numero}}.</span> {{q.pregunta}} <span v-if="q.obligatoria" class="text-negative">*</span></div>
            <div v-if="q.ayuda" class="text-caption text-grey-6 q-mb-sm">{{q.ayuda}}</div>
            <q-input v-if="['texto','numero'].includes(q.tipo)" v-model="answers[q.id]" outlined :type="q.tipo==='numero'?'number':'textarea'" :autogrow="q.tipo==='texto'" :disable="sent"/>
            <div v-else-if="q.tipo==='seleccion_unica'"><q-option-group v-model="answers[q.id]" :options="(q.opciones||[]).map(x=>({label:x,value:x}))" type="radio" color="primary" :disable="sent"/><q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica otra opción" :disable="sent"/></div>
            <div v-else><q-option-group v-model="answers[q.id]" :options="(q.opciones||[]).map(x=>({label:x,value:x}))" type="checkbox" color="primary" :disable="sent"/><q-input v-if="hasOther(q)&&selectedOther(q)" v-model="otherAnswers[q.id]" outlined dense class="q-mt-sm" label="Especifica otra opción" :disable="sent"/></div>
          </div>
        </div>
      </q-step>

      <q-step :name="4" title="Acuerdo" icon="handshake">
        <div class="section-label">Resumen comercial</div>
        <q-card flat bordered class="summary-plan q-mb-lg"><q-card-section class="row items-start q-col-gutter-lg"><div class="col-12 col-md"><div class="text-h5 text-weight-bold">{{selectedPlan?.nombre}}</div><div class="text-body2 text-grey-7 q-mt-sm">{{selectedPlan?.descripcion}}</div></div><div v-if="selectedKey!=='custom'" class="col-12 col-md-auto"><div class="text-caption text-grey-6">Implementación y configuración inicial</div><div class="text-h5 text-weight-bold text-primary">{{money(selectedPlan?.precio_proyecto)}}</div></div></q-card-section></q-card>

        <template v-if="selectedKey!=='custom'">
          <div class="text-h6 text-weight-bold">¿Cómo prefieres pagar la suscripción?</div>
          <div class="text-body2 text-grey-7 q-mb-md">Tienes {{selectedPlan?.dias_prueba||14}} días de prueba. La suscripción mantiene alojamiento, plataforma, base de datos, respaldos, actualizaciones generales y soporte ordinario. Nuevas funciones especiales se cotizan aparte.</div>
          <div class="subscription-grid q-mb-xl">
            <q-card flat bordered :class="['subscription-card',{selected:commercial.frecuencia_suscripcion_preferida==='mensual'}]" @click="!sent&&(commercial.frecuencia_suscripcion_preferida='mensual')"><q-card-section><div class="row items-center justify-between"><div><div class="text-weight-bold">Mensual</div><div class="subscription-price">{{money(selectedPlan?.precio_mensual)}}<span>/mes</span></div><div class="text-caption text-grey-7">Después de la prueba, el primer mes se calcula proporcionalmente por los días restantes.</div></div><q-radio v-model="commercial.frecuencia_suscripcion_preferida" val="mensual" color="primary" :disable="sent"/></div></q-card-section></q-card>
            <q-card flat bordered :class="['subscription-card',{selected:commercial.frecuencia_suscripcion_preferida==='anual'}]" @click="!sent&&(commercial.frecuencia_suscripcion_preferida='anual')"><q-card-section><div class="row items-center justify-between"><div><div class="row items-center q-gutter-sm"><div class="text-weight-bold">Anual</div><q-badge color="positive">Mejor precio</q-badge></div><div class="subscription-price">{{money(selectedPlan?.precio_anual)}}<span>/año</span></div><div class="text-caption text-positive text-weight-bold">Ahorro: {{money(annualSaving(selectedPlan))}} al año</div></div><q-radio v-model="commercial.frecuencia_suscripcion_preferida" val="anual" color="primary" :disable="sent"/></div></q-card-section></q-card>
          </div>
        </template>

        <div class="text-h6 text-weight-bold">Forma de pago de la implementación</div>
        <div class="text-body2 text-grey-7 q-mb-md">Este pago es independiente de la suscripción.</div>
        <div class="payment-grid q-mb-xl"><q-card v-for="option in paymentOptions()" :key="option.value" flat bordered :class="['payment-card',{selected:commercial.forma_pago_preferida===option.value}]" @click="!sent&&(commercial.forma_pago_preferida=option.value)"><q-card-section class="row items-start no-wrap"><q-radio v-model="commercial.forma_pago_preferida" :val="option.value" color="primary" :disable="sent"/><div><div class="text-weight-bold">{{option.label}}</div><div class="text-caption text-grey-7">{{option.description}}</div></div></q-card-section></q-card></div>

        <q-banner rounded class="bg-blue-1 text-primary q-mb-lg"><template #avatar><q-icon name="info"/></template>La elección del plan es una preferencia inicial. AGR Studio revisará que el alcance esté cubierto antes de aprobar. Si hace falta cambiar de plan o cotizar una función adicional, se te informará antes de iniciar.</q-banner>

        <q-card flat bordered class="q-mb-lg"><q-card-section><q-checkbox v-model="declaration.aceptada" :disable="sent" label="Confirmo que la información que proporcioné describe correctamente la necesidad de mi empresa." color="primary"/><div class="row q-col-gutter-md q-mt-sm"><div class="col-12 col-sm-7"><q-input v-model="declaration.nombre" outlined label="Nombre de quien confirma" :disable="sent"/></div><div class="col-12 col-sm-5"><q-input v-model="declaration.fecha" outlined type="date" stack-label label="Fecha" :disable="sent"/></div></div></q-card-section></q-card>
        <q-card flat bordered><q-card-section><q-checkbox v-model="commercial.acuerdo_comercial_aceptado" :disable="sent" color="primary"><span>Acepto que el precio mostrado corresponde a la <strong>implementación inicial</strong>, que la <strong>suscripción es separada</strong> y que los desarrollos o integraciones fuera del alcance se cotizan aparte.</span></q-checkbox><div class="row q-col-gutter-md q-mt-sm"><div class="col-12 col-sm-7"><q-input v-model="commercial.acuerdo_comercial_nombre" outlined label="Nombre de quien acepta" :disable="sent"/></div><div class="col-12 col-sm-5"><q-input v-model="commercial.acuerdo_comercial_fecha" outlined type="date" stack-label label="Fecha" :disable="sent"/></div></div></q-card-section></q-card>
      </q-step>

      <template #navigation>
        <q-stepper-navigation class="row items-center q-gutter-sm">
          <q-btn v-if="step>1&&!sent" flat no-caps color="primary" icon="arrow_back" label="Anterior" @click="step--"/>
          <q-space/>
          <q-btn v-if="!sent" outline no-caps color="primary" icon="save" label="Guardar" :loading="saving" @click="save()"/>
          <q-btn v-if="step<4&&!sent" color="primary" unelevated no-caps icon-right="arrow_forward" label="Continuar" :loading="saving" @click="next"/>
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
.plan-card.recommended{position:relative}
.recommendation-card,.summary-plan{border-radius:18px}
.price-box{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px;border-radius:14px;background:rgba(80,130,190,.08)}
.price-label{font-size:11px;color:#78869a;text-transform:uppercase;letter-spacing:.04em}
.price-value{font-size:24px;font-weight:900;color:var(--q-primary)}
.custom-price{display:flex;gap:12px;align-items:center;padding:14px;border-radius:14px;background:rgba(80,130,190,.08)}
.subscription-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.subscription-price{font-size:26px;font-weight:900;color:var(--q-primary);margin:4px 0}
.subscription-price span{font-size:13px;font-weight:600;color:#78869a}
.payment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
@media(max-width:700px){.subscription-grid,.price-box{grid-template-columns:1fr}.plan-grid{grid-template-columns:1fr}.public-shell{padding-left:14px;padding-right:14px}}
</style>
