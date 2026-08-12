<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { downloadFile } from '../utils/download'
import { formatDate, formatDateTime, todayInput } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const route=useRoute(),router=useRouter(),$q=useQuasar()
const item=ref(null),loading=ref(true),saving=ref(false),projectDialog=ref(false),editDialog=ref(false),editSaving=ref(false),loadError=ref(''),tab=ref('resumen'),clients=ref([])
const answers=reactive({})
const declaration=reactive({aceptada:false,nombre:'',fecha:todayInput()})
const project=reactive({solicitud_id:null,empresa_id:null,cliente_id:null,nombre:'',descripcion:'',fase:'levantamiento',estado:'activo',progreso:0,fecha_inicio:todayInput()})
const editForm=reactive({empresa_id:null,cliente_id:null,titulo:'',resumen:'',prioridad:'normal',fecha_limite_deseada:null,presupuesto_estimado:null,estado:'borrador'})
const sections=computed(()=>item.value?.cuestionario?.secciones||[])
const totalQuestions=computed(()=>sections.value.reduce((count,section)=>count+(section.preguntas?.length||0),0))
const answeredCount=computed(()=>Object.values(answers).filter(value=>Array.isArray(value)?value.length>0:String(value??'').trim()!=='').length)
const editSelectedClient=computed(()=>clients.value.find(row=>row.id===editForm.cliente_id)||null)
const editCompanyOptions=computed(()=>editSelectedClient.value?.empresas?.map(row=>({label:row.nombre_comercial,value:row.id}))||[])
const plan=computed(()=>item.value?.plan_viti||null)
const annualSaving=computed(()=>plan.value?.precio_mensual&&plan.value?.precio_anual?Math.max(0,Number(plan.value.precio_mensual)*12-Number(plan.value.precio_anual)):0)

function normalizePayload(response){return response?.data?.data ?? response?.data ?? null}
function pretty(value){return String(value||'').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase())}
function money(value){return value===null||value===undefined||value===''?'A cotizar':`${Number(value).toFixed(0)} Bs`}
function paymentLabel(value){return ({contado:'Pago completo',50_50:'50% al iniciar / 50% al entregar',tres_partes:'40% al iniciar / 30% en avance / 30% al entregar',por_definir:'Por acordar con AGR Studio'}[value]||pretty(value)||'No definido')}
function initAnswers(){
  for(const key of Object.keys(answers))delete answers[key]
  for(const section of sections.value)for(const question of section.preguntas||[])answers[question.id]=question.tipo==='seleccion_multiple'?[]:''
  for(const response of item.value?.respuestas||[])answers[response.pregunta_id]=response.respuesta_json??response.respuesta_texto??''
  Object.assign(declaration,{aceptada:Boolean(item.value?.declaracion_aceptada),nombre:item.value?.declaracion_nombre||item.value?.cliente?.nombre||'',fecha:item.value?.declaracion_fecha||todayInput()})
}
async function load(){
  const id=Number(route.params.id);loadError.value='';item.value=null
  if(!Number.isInteger(id)||id<=0){loadError.value='La solicitud indicada no es válida.';loading.value=false;return}
  loading.value=true
  try{const payload=normalizePayload(await api.get(`/solicitudes/${id}`));if(!payload?.id)throw new Error('El servidor no devolvió una solicitud válida.');item.value=payload;initAnswers()}
  catch(error){loadError.value=error.response?.data?.message||error.message||'No se pudo abrir la solicitud.'}
  finally{loading.value=false}
}
async function openEdit(){
  if(!item.value?.id)return
  try{
    if(!clients.value.length){const response=await api.get('/clientes',{params:{per_page:100}});clients.value=response.data?.data||[]}
    Object.assign(editForm,{empresa_id:item.value.empresa_id,cliente_id:item.value.cliente_id,titulo:item.value.titulo||'',resumen:item.value.resumen||'',prioridad:item.value.prioridad||'normal',fecha_limite_deseada:item.value.fecha_limite_deseada||null,presupuesto_estimado:item.value.presupuesto_estimado??null,estado:item.value.estado||'borrador'})
    editDialog.value=true
  }catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudieron cargar los datos para editar.'})}
}
function editClientChanged(){if(!editCompanyOptions.value.some(row=>row.value===editForm.empresa_id))editForm.empresa_id=editCompanyOptions.value.length===1?editCompanyOptions.value[0].value:null}
async function saveEdit(){
  if(!item.value?.id)return
  if(!editForm.cliente_id||!editForm.empresa_id||!String(editForm.titulo||'').trim()){$q.notify({type:'warning',message:'Completa responsable, empresa y título.'});return}
  editSaving.value=true
  try{const payload=normalizePayload(await api.put(`/solicitudes/${item.value.id}`,{...editForm,plan_viti_id:item.value.plan_viti_id,forma_pago_preferida:item.value.forma_pago_preferida,frecuencia_suscripcion_preferida:item.value.frecuencia_suscripcion_preferida}));if(!payload?.id)throw new Error('El servidor no devolvió la solicitud actualizada.');editDialog.value=false;await load();if(route.query.editar)await router.replace({path:route.path,query:{}});$q.notify({type:'positive',message:'Solicitud actualizada correctamente.'})}
  catch(error){$q.notify({type:'negative',message:error.response?.data?.message||error.message||'No se pudo actualizar la solicitud.'})}
  finally{editSaving.value=false}
}
async function saveAnswers(){
  if(!item.value?.id)return false
  saving.value=true
  try{const payload=Object.entries(answers).map(([pregunta_id,valor])=>({pregunta_id:Number(pregunta_id),valor}));await api.put(`/solicitudes/${item.value.id}/respuestas`,{respuestas:payload,declaracion_aceptada:declaration.aceptada,declaracion_nombre:declaration.nombre,declaracion_fecha:declaration.fecha});$q.notify({type:'positive',message:'Cuestionario guardado.'});return true}
  catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo guardar.'});return false}
  finally{saving.value=false}
}
async function submit(){if(!item.value?.id)return;const saved=await saveAnswers();if(!saved)return;try{await api.post(`/solicitudes/${item.value.id}/enviar`);$q.notify({type:'positive',message:'Solicitud enviada a revisión.'});await load()}catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo enviar la solicitud.'})}}
async function copyPublicLink(){if(!item.value?.enlace_publico)return;if($q.platform.is.secureContext!==false)await navigator.clipboard.writeText(item.value.enlace_publico);$q.notify({type:'positive',message:'Enlace del diagnóstico copiado.'})}
function openPublic(){if(item.value?.enlace_publico)window.open(item.value.enlace_publico,'_blank','noopener')}
function openProject(){if(!item.value?.id)return;Object.assign(project,{solicitud_id:item.value.id,empresa_id:item.value.empresa_id,cliente_id:item.value.cliente_id,nombre:item.value.titulo||'',descripcion:item.value.resumen||'',fase:'levantamiento',estado:'activo',progreso:0,fecha_inicio:todayInput()});projectDialog.value=true}
async function createProject(){if(!item.value?.id)return;try{const created=normalizePayload(await api.post('/proyectos',project));if(!created?.id)throw new Error('El servidor no devolvió el proyecto creado.');projectDialog.value=false;await router.push(`/proyectos/${created.id}`)}catch(error){$q.notify({type:'negative',message:error.response?.data?.message||error.message||'No se pudo crear el proyecto.'})}}

onMounted(async()=>{await load();if(route.query.editar==='1'&&item.value)await openEdit()})
watch(()=>route.params.id,load)
</script>

<template><q-page class="viti-page">
  <q-inner-loading :showing="loading"/>
  <q-banner v-if="loadError" rounded class="bg-red-1 text-negative q-mb-lg"><template #avatar><q-icon name="error_outline"/></template>{{loadError}}<template #action><q-btn flat color="negative" label="Volver a solicitudes" to="/solicitudes"/></template></q-banner>

  <template v-if="item">
    <PageHeader eyebrow="Solicitud VITI" :title="`${item.codigo||'Sin código'} · ${item.titulo||'Sin título'}`" :subtitle="`${item.empresa?.nombre_comercial||'Sin empresa'} · ${item.cliente?.nombre||'Sin responsable'} · ${item.cliente?.telefono||'Sin teléfono'}`">
      <div class="row q-gutter-sm"><q-btn outline color="primary" icon="open_in_new" label="Ver diagnóstico" no-caps @click="openPublic"/><q-btn outline color="primary" icon="content_copy" label="Copiar enlace" no-caps @click="copyPublicLink"/><q-btn outline color="primary" icon="forum" label="Responder en buzón" no-caps to="/buzon"/><q-btn outline color="primary" icon="edit" label="Editar" no-caps @click="openEdit"/><q-btn outline color="primary" icon="picture_as_pdf" label="PDF" no-caps @click="downloadFile(`/reportes/solicitudes/${item.id}.pdf`,`${item.codigo}.pdf`)"/><q-btn v-if="!item.proyecto" color="secondary" unelevated icon="rocket_launch" label="Convertir en proyecto" no-caps @click="openProject"/><q-btn v-else color="primary" outline icon="open_in_new" label="Abrir proyecto" no-caps :to="`/proyectos/${item.proyecto.id}`"/></div>
    </PageHeader>

    <div class="row q-col-gutter-lg q-mb-lg">
      <div class="col-12 col-xl-7"><q-card flat class="viti-card full-height"><q-card-section><div class="row q-col-gutter-lg"><div class="col-6 col-md-3"><div class="detail-label">Estado</div><q-badge :color="item.estado==='en_revision'?'orange':item.estado==='convertida'?'positive':'primary'">{{pretty(item.estado)}}</q-badge></div><div class="col-6 col-md-3"><div class="detail-label">Prioridad</div><div class="text-weight-bold">{{pretty(item.prioridad||'normal')}}</div></div><div class="col-6 col-md-3"><div class="detail-label">Fecha deseada</div><div>{{formatDate(item.fecha_limite_deseada)}}</div></div><div class="col-6 col-md-3"><div class="detail-label">Registrada</div><div>{{formatDateTime(item.created_at)}}</div></div><div class="col-12"><div class="detail-label">Resumen inicial</div><div style="white-space:pre-wrap">{{item.resumen||'Sin resumen inicial.'}}</div></div></div></q-card-section></q-card></div>
      <div class="col-12 col-xl-5"><q-card flat class="viti-card commercial-card full-height"><q-card-section><div class="row items-center justify-between"><div><div class="section-label">Acuerdo comercial</div><div class="text-h6 text-weight-bold">{{plan?.nombre||'Plan sin seleccionar'}}</div></div><q-icon name="workspace_premium" color="primary" size="32px"/></div><div v-if="plan" class="commercial-prices q-mt-md"><div><span>Implementación</span><strong>{{money(plan.precio_proyecto)}}</strong></div><div><span>Mensual</span><strong>{{money(plan.precio_mensual)}}</strong></div><div><span>Anual</span><strong>{{money(plan.precio_anual)}}</strong></div></div><div v-if="annualSaving" class="text-caption text-positive text-weight-bold q-mt-sm">Ahorro anual frente a 12 mensualidades: {{money(annualSaving)}}</div><q-separator class="q-my-md"/><div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><div class="detail-label">Pago de implementación</div><div class="text-weight-bold">{{paymentLabel(item.forma_pago_preferida)}}</div></div><div class="col-12 col-sm-6"><div class="detail-label">Suscripción preferida</div><div class="text-weight-bold">{{item.frecuencia_suscripcion_preferida?pretty(item.frecuencia_suscripcion_preferida):plan?.precio_mensual?'Pendiente de definir':'A cotizar'}}</div></div><div class="col-12"><q-badge :color="item.acuerdo_comercial_aceptado?'positive':'orange'" outline>{{item.acuerdo_comercial_aceptado?'Acuerdo inicial aceptado':'Acuerdo pendiente'}}</q-badge><span v-if="item.acuerdo_comercial_nombre" class="text-caption text-grey-7 q-ml-sm">{{item.acuerdo_comercial_nombre}} · {{formatDate(item.acuerdo_comercial_fecha)}}</span></div></div></q-card-section></q-card></div>
    </div>

    <q-tabs v-model="tab" align="left" dense active-color="primary" indicator-color="primary" class="q-mb-md"><q-tab name="resumen" icon="info" label="Resumen" no-caps/><q-tab name="cuestionario" icon="fact_check" :label="`Respuestas (${answeredCount}/${totalQuestions})`" no-caps/></q-tabs>
    <q-tab-panels v-model="tab" animated class="bg-transparent">
      <q-tab-panel name="resumen" class="q-pa-none"><div class="row q-col-gutter-lg"><div class="col-12 col-md-6"><q-card flat class="viti-card"><q-card-section><div class="text-h6 text-weight-bold">Empresa</div></q-card-section><q-separator/><q-list><q-item><q-item-section avatar><q-icon name="business"/></q-item-section><q-item-section><q-item-label caption>Empresa o microempresa</q-item-label><q-item-label class="text-weight-bold">{{item.empresa?.nombre_comercial}}</q-item-label><q-item-label caption>{{item.empresa?.actividad||'Actividad no registrada'}}</q-item-label></q-item-section></q-item><q-item><q-item-section avatar><q-icon name="person"/></q-item-section><q-item-section><q-item-label caption>Responsable</q-item-label><q-item-label>{{item.cliente?.nombre}} · {{item.cliente?.telefono}}</q-item-label></q-item-section></q-item></q-list></q-card></div><div class="col-12 col-md-6"><q-card flat class="viti-card"><q-card-section><div class="text-h6 text-weight-bold">Siguiente decisión</div></q-card-section><q-separator/><q-card-section><q-banner rounded :class="item.proyecto?'bg-green-1 text-green-9':'bg-blue-1 text-primary'"><template #avatar><q-icon :name="item.proyecto?'check_circle':'rate_review'"/></template><div class="text-weight-bold">{{item.proyecto?'Solicitud convertida en proyecto':'Revisar alcance antes de convertir'}}</div><div class="text-caption">{{item.proyecto?'El plan y la empresa ya quedaron vinculados al proyecto.':'Verifica que el plan cubra las funciones pedidas y que el acuerdo comercial sea coherente antes de iniciar.'}}</div></q-banner></q-card-section></q-card></div></div></q-tab-panel>

      <q-tab-panel name="cuestionario" class="q-pa-none">
        <q-banner rounded class="bg-blue-1 text-primary q-mb-lg"><template #avatar><q-icon name="assignment"/></template><div class="text-weight-bold">Respuestas completas disponibles para revisión técnica</div><div class="text-caption">El formulario público muestra preguntas según el plan. Aquí el administrador conserva el cuestionario completo para revisar respuestas y completar información técnica si hace falta.</div></q-banner>
        <div v-for="section in sections" :key="section.id" class="q-mb-lg"><q-card flat class="viti-card"><q-card-section><div class="section-label">Sección {{section.numero}}</div><div class="text-h6 text-weight-bold">{{section.titulo}}</div></q-card-section><q-separator/><q-card-section><div class="row q-col-gutter-lg"><div v-for="question in section.preguntas" :key="question.id" class="col-12"><div class="text-weight-medium q-mb-sm"><span class="text-primary">{{question.numero}}.</span> {{question.pregunta}} <span v-if="question.obligatoria" class="text-negative">*</span></div><div v-if="question.ayuda" class="text-caption text-grey-6 q-mb-sm">{{question.ayuda}}</div><q-input v-if="['texto','numero'].includes(question.tipo)" v-model="answers[question.id]" outlined :type="question.tipo==='numero'?'number':'textarea'" autogrow/><q-option-group v-else-if="question.tipo==='seleccion_unica'" v-model="answers[question.id]" :options="(question.opciones||[]).map(option=>({label:option,value:option}))" type="radio" color="primary"/><q-option-group v-else-if="question.tipo==='seleccion_multiple'" v-model="answers[question.id]" :options="(question.opciones||[]).map(option=>({label:option,value:option}))" type="checkbox" color="primary"/></div></div></q-card-section></q-card></div>
        <q-card flat class="viti-card q-mb-lg"><q-card-section><div class="section-label">Declaración final</div><div class="text-h6 text-weight-bold">Confirmación del levantamiento</div><div class="row q-col-gutter-md q-mt-sm"><div class="col-12 col-sm-6"><q-input v-model="declaration.nombre" outlined label="Nombre"/></div><div class="col-12 col-sm-3"><q-input v-model="declaration.fecha" outlined type="date" stack-label label="Fecha"/></div><div class="col-12 col-sm-3 flex items-center"><q-checkbox v-model="declaration.aceptada" label="Aceptada"/></div></div></q-card-section></q-card>
        <div class="row justify-end q-gutter-sm q-mb-xl"><q-btn outline color="primary" label="Guardar cambios" no-caps :loading="saving" @click="saveAnswers"/><q-btn v-if="item.estado==='borrador'" color="primary" unelevated label="Enviar a revisión" no-caps :loading="saving" @click="submit"/></div>
      </q-tab-panel>
    </q-tab-panels>
  </template>

  <q-dialog v-model="editDialog"><q-card style="width:760px;max-width:94vw"><q-card-section><div class="section-label">Editar solicitud</div><div class="text-h5 text-weight-bold">Actualizar datos generales</div><div class="text-caption text-grey-6">El plan y la preferencia comercial se preservan al guardar.</div></q-card-section><q-separator/><q-card-section><div class="row q-col-gutter-md"><div class="col-12"><q-select v-model="editForm.cliente_id" outlined emit-value map-options :options="clients.map(row=>({label:`${row.nombre} · ${row.telefono}`,value:row.id}))" label="Responsable *" @update:model-value="editClientChanged"/></div><div class="col-12"><q-select v-model="editForm.empresa_id" outlined emit-value map-options :options="editCompanyOptions" label="Empresa *" :disable="!editForm.cliente_id"/></div><div class="col-12"><q-input v-model="editForm.titulo" outlined label="Título del sistema *"/></div><div class="col-12"><q-input v-model="editForm.resumen" outlined type="textarea" autogrow label="Resumen inicial"/></div><div class="col-12 col-sm-3"><q-select v-model="editForm.prioridad" outlined :options="['baja','normal','alta','urgente']" label="Prioridad"/></div><div class="col-12 col-sm-3"><q-select v-model="editForm.estado" outlined :options="['borrador','en_revision','aprobada','rechazada','convertida','cerrada']" label="Estado"/></div><div class="col-12 col-sm-3"><q-input v-model="editForm.fecha_limite_deseada" outlined type="date" stack-label label="Fecha deseada"/></div><div class="col-12 col-sm-3"><q-input v-model.number="editForm.presupuesto_estimado" outlined type="number" prefix="Bs" label="Presupuesto"/></div></div></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Guardar cambios" no-caps :loading="editSaving" @click="saveEdit"/></q-card-actions></q-card></q-dialog>

  <q-dialog v-model="projectDialog"><q-card style="width:700px;max-width:94vw"><q-card-section><div class="section-label">Nuevo proyecto</div><div class="text-h5 text-weight-bold">Convertir solicitud en proyecto</div><div v-if="plan" class="text-caption text-grey-6 q-mt-xs">{{plan.nombre}} · implementación {{money(plan.precio_proyecto)}} · suscripción {{item.frecuencia_suscripcion_preferida?pretty(item.frecuencia_suscripcion_preferida):'por definir'}}</div></q-card-section><q-separator/><q-card-section><q-banner v-if="item.acuerdo_comercial_requerido&&!item.acuerdo_comercial_aceptado" rounded class="bg-orange-1 text-orange-10 q-mb-md">El acuerdo comercial todavía aparece como pendiente. Confírmalo antes de iniciar el proyecto.</q-banner><q-input v-model="project.nombre" outlined label="Nombre del proyecto *"/><q-input v-model="project.descripcion" outlined type="textarea" label="Descripción" class="q-mt-md"/><div class="row q-col-gutter-md q-mt-xs"><div class="col-6"><q-select v-model="project.fase" outlined :options="['levantamiento','analisis','diseno','desarrollo','beta','pruebas','ajustes','implementacion']" label="Fase inicial"/></div><div class="col-6"><q-input v-model="project.fecha_inicio" outlined type="date" label="Fecha de inicio" stack-label/></div></div></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Crear proyecto" no-caps :disable="item.acuerdo_comercial_requerido&&!item.acuerdo_comercial_aceptado" @click="createProject"/></q-card-actions></q-card></q-dialog>
</q-page></template>

<style scoped>
.detail-label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--viti-muted);margin-bottom:5px}.commercial-card{border:1px solid color-mix(in srgb,var(--q-primary) 22%,var(--viti-border))}.commercial-prices{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.commercial-prices>div{padding:10px;border:1px solid var(--viti-border);border-radius:12px}.commercial-prices span{display:block;font-size:10px;text-transform:uppercase;color:var(--viti-muted);font-weight:700}.commercial-prices strong{display:block;margin-top:3px;font-size:16px}@media(max-width:600px){.commercial-prices{grid-template-columns:1fr}.q-tabs{overflow-x:auto}}
</style>
