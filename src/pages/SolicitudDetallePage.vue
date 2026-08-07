<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { downloadFile } from '../utils/download'
import { formatDate, formatDateTime, todayInput } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const route=useRoute(),router=useRouter(),$q=useQuasar()
const item=ref(null),loading=ref(true),saving=ref(false),projectDialog=ref(false),editDialog=ref(false),editSaving=ref(false),loadError=ref(''),tab=ref('cuestionario'),clients=ref([])
const answers=reactive({})
const declaration=reactive({aceptada:false,nombre:'',fecha:todayInput()})
const project=reactive({solicitud_id:null,empresa_id:null,cliente_id:null,nombre:'',descripcion:'',fase:'levantamiento',estado:'activo',progreso:0,fecha_inicio:todayInput()})
const editForm=reactive({empresa_id:null,cliente_id:null,titulo:'',resumen:'',prioridad:'normal',fecha_limite_deseada:null,presupuesto_estimado:null,estado:'borrador'})
const sections=computed(()=>item.value?.cuestionario?.secciones||[])
const totalQuestions=computed(()=>sections.value.reduce((n,s)=>n+(s.preguntas?.length||0),0))
const answeredCount=computed(()=>Object.values(answers).filter(v=>Array.isArray(v)?v.length>0:String(v??'').trim()!=='').length)
const editSelectedClient=computed(()=>clients.value.find(x=>x.id===editForm.cliente_id)||null)
const editCompanyOptions=computed(()=>editSelectedClient.value?.empresas?.map(x=>({label:x.nombre_comercial,value:x.id}))||[])

function normalizePayload(response){return response?.data?.data ?? response?.data ?? null}
function initAnswers(){
  for(const key of Object.keys(answers)) delete answers[key]
  for(const section of sections.value) for(const q of section.preguntas||[]) answers[q.id]=q.tipo==='seleccion_multiple'?[]:''
  for(const r of item.value?.respuestas||[]) answers[r.pregunta_id]=r.respuesta_json??r.respuesta_texto??''
  Object.assign(declaration,{aceptada:Boolean(item.value?.declaracion_aceptada),nombre:item.value?.declaracion_nombre||item.value?.cliente?.nombre||'',fecha:item.value?.declaracion_fecha||todayInput()})
}
async function load(){
  const id=Number(route.params.id)
  loadError.value='';item.value=null
  if(!Number.isInteger(id)||id<=0){loadError.value='La solicitud indicada no es válida.';loading.value=false;return}
  loading.value=true
  try{
    const response=await api.get(`/solicitudes/${id}`)
    const payload=normalizePayload(response)
    if(!payload?.id) throw new Error('El servidor no devolvió una solicitud válida.')
    item.value=payload
    initAnswers()
  }catch(e){loadError.value=e.response?.data?.message||e.message||'No se pudo abrir la solicitud.'}
  finally{loading.value=false}
}

async function openEdit(){
  if(!item.value?.id)return
  try{
    if(!clients.value.length){
      const response=await api.get('/clientes',{params:{per_page:100}})
      clients.value=response.data?.data||[]
    }
    Object.assign(editForm,{
      empresa_id:item.value.empresa_id,
      cliente_id:item.value.cliente_id,
      titulo:item.value.titulo||'',
      resumen:item.value.resumen||'',
      prioridad:item.value.prioridad||'normal',
      fecha_limite_deseada:item.value.fecha_limite_deseada||null,
      presupuesto_estimado:item.value.presupuesto_estimado??null,
      estado:item.value.estado||'borrador',
    })
    editDialog.value=true
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudieron cargar los datos para editar.'})}
}
function editClientChanged(){
  if(!editCompanyOptions.value.some(x=>x.value===editForm.empresa_id)){
    editForm.empresa_id=editCompanyOptions.value.length===1?editCompanyOptions.value[0].value:null
  }
}
async function saveEdit(){
  if(!item.value?.id)return
  if(!editForm.cliente_id||!editForm.empresa_id||!String(editForm.titulo||'').trim()){
    $q.notify({type:'warning',message:'Completa cliente, empresa y título.'});return
  }
  editSaving.value=true
  try{
    const response=await api.put(`/solicitudes/${item.value.id}`,{...editForm})
    const updated=normalizePayload(response)
    if(!updated?.id)throw new Error('El servidor no devolvió la solicitud actualizada.')
    editDialog.value=false
    await load()
    if(route.query.editar) await router.replace({path:route.path,query:{}})
    $q.notify({type:'positive',message:'Solicitud actualizada correctamente.'})
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||e.message||'No se pudo actualizar la solicitud.'})}
  finally{editSaving.value=false}
}

async function saveAnswers(){
  if(!item.value?.id) return false
  saving.value=true
  try{
    const payload=Object.entries(answers).map(([pregunta_id,valor])=>({pregunta_id:Number(pregunta_id),valor}))
    await api.put(`/solicitudes/${item.value.id}/respuestas`,{respuestas:payload,declaracion_aceptada:declaration.aceptada,declaracion_nombre:declaration.nombre,declaracion_fecha:declaration.fecha})
    $q.notify({type:'positive',message:'Cuestionario guardado.'});return true
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo guardar.'});return false}
  finally{saving.value=false}
}
async function submit(){if(!item.value?.id)return;const saved=await saveAnswers();if(!saved)return;try{await api.post(`/solicitudes/${item.value.id}/enviar`);$q.notify({type:'positive',message:'Solicitud enviada a revisión.'});await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo enviar la solicitud.'})}}
async function copyPublicLink(){if(!item.value?.enlace_publico)return;$q.platform.is.secureContext!==false&&await navigator.clipboard.writeText(item.value.enlace_publico);$q.notify({type:'positive',message:'Enlace del cuestionario copiado.'})}
function openPublic(){if(item.value?.enlace_publico)window.open(item.value.enlace_publico,'_blank','noopener')}
function openProject(){if(!item.value?.id)return;Object.assign(project,{solicitud_id:item.value.id,empresa_id:item.value.empresa_id,cliente_id:item.value.cliente_id,nombre:item.value.titulo||'',descripcion:item.value.resumen||'',fase:'levantamiento',estado:'activo',progreso:0,fecha_inicio:todayInput()});projectDialog.value=true}
async function createProject(){
  if(!item.value?.id)return
  try{
    const response=await api.post('/proyectos',project)
    const created=normalizePayload(response)
    if(!created?.id)throw new Error('El servidor no devolvió el proyecto creado.')
    projectDialog.value=false
    await router.push(`/proyectos/${created.id}`)
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||e.message||'No se pudo crear el proyecto.'})}
}
onMounted(async()=>{await load();if(route.query.editar==='1'&&item.value)await openEdit()});watch(()=>route.params.id,async()=>{await load()})
</script>

<template><q-page class="viti-page">
  <q-inner-loading :showing="loading"/>
  <q-banner v-if="loadError" rounded class="bg-red-1 text-negative q-mb-lg"><template #avatar><q-icon name="error_outline"/></template>{{loadError}}<template #action><q-btn flat color="negative" label="Volver a solicitudes" to="/solicitudes"/></template></q-banner>

  <template v-if="item">
    <PageHeader eyebrow="Solicitud de sistema" :title="`${item.codigo || 'Sin código'} · ${item.titulo || 'Sin título'}`" :subtitle="`${item.empresa?.nombre_comercial || 'Sin empresa'} · ${item.cliente?.nombre || 'Sin cliente'} · ${item.cliente?.telefono || 'Sin teléfono'}`">
      <div class="row q-gutter-sm">
        <q-btn outline color="primary" icon="open_in_new" label="Ver formulario del cliente" no-caps @click="openPublic"/>
        <q-btn outline color="primary" icon="content_copy" label="Copiar enlace" no-caps @click="copyPublicLink"/>
        <q-btn outline color="primary" icon="forum" label="Responder en buzón" no-caps to="/buzon"/><q-btn outline color="primary" icon="edit" label="Editar solicitud" no-caps @click="openEdit"/>
        <q-btn outline color="primary" icon="picture_as_pdf" label="PDF" no-caps @click="downloadFile(`/reportes/solicitudes/${item.id}.pdf`,`${item.codigo}.pdf`)"/>
        <q-btn v-if="!item.proyecto" color="secondary" unelevated icon="rocket_launch" label="Convertir en proyecto" no-caps @click="openProject"/>
        <q-btn v-else color="primary" outline icon="open_in_new" label="Abrir proyecto" no-caps :to="`/proyectos/${item.proyecto.id}`"/>
      </div>
    </PageHeader>

    <q-card flat class="viti-card q-mb-lg"><q-card-section class="row q-col-gutter-lg">
      <div class="col-12 col-md-3"><div class="text-caption text-grey-6">Estado</div><q-badge outline color="primary">{{String(item.estado||'').replaceAll('_',' ')}}</q-badge></div>
      <div class="col-12 col-md-3"><div class="text-caption text-grey-6">Prioridad</div><div class="text-weight-medium">{{item.prioridad||'normal'}}</div></div>
      <div class="col-12 col-md-3"><div class="text-caption text-grey-6">Fecha deseada</div><div>{{formatDate(item.fecha_limite_deseada)}}</div></div>
      <div class="col-12 col-md-3"><div class="text-caption text-grey-6">Registrada</div><div>{{formatDateTime(item.created_at)}}</div></div>
      <div class="col-12"><div class="text-caption text-grey-6">Resumen inicial</div><div style="white-space:pre-wrap">{{item.resumen||'Sin resumen inicial.'}}</div></div>
    </q-card-section></q-card>

    <q-tabs v-model="tab" align="left" dense active-color="primary" indicator-color="primary" class="q-mb-md">
      <q-tab name="cuestionario" icon="fact_check" :label="`Cuestionario (${answeredCount}/${totalQuestions})`" no-caps/>
      <q-tab name="resumen" icon="info" label="Datos de la solicitud" no-caps/>
    </q-tabs>

    <q-tab-panels v-model="tab" animated class="bg-transparent">
      <q-tab-panel name="resumen" class="q-pa-none"><q-card flat class="viti-card q-mb-lg"><q-card-section><div class="text-h6 text-weight-bold">Información relacionada</div></q-card-section><q-separator/><q-list><q-item><q-item-section avatar><q-icon name="person"/></q-item-section><q-item-section><q-item-label caption>Cliente responsable</q-item-label><q-item-label>{{item.cliente?.nombre}} · {{item.cliente?.telefono}}</q-item-label></q-item-section></q-item><q-separator/><q-item><q-item-section avatar><q-icon name="business"/></q-item-section><q-item-section><q-item-label caption>Empresa</q-item-label><q-item-label>{{item.empresa?.nombre_comercial}}</q-item-label></q-item-section></q-item></q-list></q-card></q-tab-panel>

      <q-tab-panel name="cuestionario" class="q-pa-none">
        <q-banner rounded class="bg-blue-1 text-primary q-mb-lg"><template #avatar><q-icon name="assignment"/></template><div class="text-weight-bold">Formulario de levantamiento incluido</div><div class="text-caption">Puedes completarlo aquí junto al cliente o enviarle el enlace público para que lo responda desde su teléfono.</div></q-banner>
        <div v-for="section in sections" :key="section.id" class="q-mb-lg"><q-card flat class="viti-card"><q-card-section><div class="section-label">Sección {{section.numero}}</div><div class="text-h6 text-weight-bold">{{section.titulo}}</div></q-card-section><q-separator/><q-card-section><div class="row q-col-gutter-lg"><div v-for="q in section.preguntas" :key="q.id" class="col-12"><div class="text-weight-medium q-mb-sm"><span class="text-primary">{{q.numero}}.</span> {{q.pregunta}} <span v-if="q.obligatoria" class="text-negative">*</span></div><div v-if="q.ayuda" class="text-caption text-grey-6 q-mb-sm">{{q.ayuda}}</div><q-input v-if="['texto','numero'].includes(q.tipo)" v-model="answers[q.id]" outlined :type="q.tipo==='numero'?'number':'textarea'" autogrow/><q-option-group v-else-if="q.tipo==='seleccion_unica'" v-model="answers[q.id]" :options="(q.opciones||[]).map(x=>({label:x,value:x}))" type="radio" color="primary"/><q-option-group v-else-if="q.tipo==='seleccion_multiple'" v-model="answers[q.id]" :options="(q.opciones||[]).map(x=>({label:x,value:x}))" type="checkbox" color="primary"/></div></div></q-card-section></q-card></div>
        <q-card flat class="viti-card q-mb-lg"><q-card-section><div class="section-label">Declaración final del cliente</div><div class="text-h6 text-weight-bold">Confirmación del levantamiento inicial</div><p class="page-subtitle">Confirmo que las respuestas proporcionadas representan de manera general la idea y las necesidades iniciales del sistema solicitado.</p><div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model="declaration.nombre" outlined label="Nombre del cliente"/></div><div class="col-12 col-sm-3"><q-input v-model="declaration.fecha" outlined type="date" stack-label label="Fecha"/></div><div class="col-12 col-sm-3 flex items-center"><q-checkbox v-model="declaration.aceptada" label="Declaración aceptada"/></div></div></q-card-section></q-card>
        <div class="row justify-end q-gutter-sm q-mb-xl"><q-btn outline color="primary" label="Guardar borrador" no-caps :loading="saving" @click="saveAnswers"/><q-btn color="primary" unelevated label="Guardar y enviar a revisión" no-caps :loading="saving" @click="submit"/></div>
      </q-tab-panel>
    </q-tab-panels>
  </template>


  <q-dialog v-model="editDialog">
    <q-card style="width:760px;max-width:94vw">
      <q-card-section><div class="section-label">Editar solicitud</div><div class="text-h5 text-weight-bold">Actualizar datos del levantamiento</div><div class="text-caption text-grey-6">Modifica el mismo registro. No se crea una nueva solicitud.</div></q-card-section>
      <q-separator/>
      <q-card-section><div class="row q-col-gutter-md">
        <div class="col-12"><q-select v-model="editForm.cliente_id" outlined emit-value map-options :options="clients.map(x=>({label:`${x.nombre} · ${x.telefono}`,value:x.id}))" label="Cliente responsable *" @update:model-value="editClientChanged"/></div>
        <div class="col-12"><q-select v-model="editForm.empresa_id" outlined emit-value map-options :options="editCompanyOptions" label="Empresa o microempresa *" :disable="!editForm.cliente_id"/></div>
        <div class="col-12"><q-input v-model="editForm.titulo" outlined label="Nombre o título del sistema *"/></div>
        <div class="col-12"><q-input v-model="editForm.resumen" outlined type="textarea" autogrow label="Resumen inicial"/></div>
        <div class="col-12 col-sm-3"><q-select v-model="editForm.prioridad" outlined :options="['baja','normal','alta','urgente']" label="Prioridad"/></div>
        <div class="col-12 col-sm-3"><q-select v-model="editForm.estado" outlined :options="['borrador','en_revision','aprobada','rechazada','convertida','cerrada']" label="Estado"/></div>
        <div class="col-12 col-sm-3"><q-input v-model="editForm.fecha_limite_deseada" outlined type="date" stack-label label="Fecha deseada"/></div>
        <div class="col-12 col-sm-3"><q-input v-model.number="editForm.presupuesto_estimado" outlined type="number" prefix="Bs" label="Presupuesto"/></div>
      </div></q-card-section>
      <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Guardar cambios" no-caps :loading="editSaving" @click="saveEdit"/></q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="projectDialog"><q-card style="width:700px;max-width:94vw"><q-card-section><div class="section-label">Nuevo proyecto</div><div class="text-h5 text-weight-bold">Convertir solicitud en proyecto</div></q-card-section><q-separator/><q-card-section><q-input v-model="project.nombre" outlined label="Nombre del proyecto *"/><q-input v-model="project.descripcion" outlined type="textarea" label="Descripción" class="q-mt-md"/><div class="row q-col-gutter-md q-mt-xs"><div class="col-6"><q-select v-model="project.fase" outlined :options="['levantamiento','analisis','diseno','desarrollo','beta','pruebas','ajustes','implementacion']" label="Fase inicial"/></div><div class="col-6"><q-input v-model="project.fecha_inicio" outlined type="date" label="Fecha de inicio" stack-label/></div></div></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Crear proyecto" no-caps @click="createProject"/></q-card-actions></q-card></q-dialog>
</q-page></template>
