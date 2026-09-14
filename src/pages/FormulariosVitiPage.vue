<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q=useQuasar()
const loading=ref(false)
const forms=ref([])
const current=ref(null)
const selectedSectionId=ref(null)
const formDialog=ref(false)
const sectionDialog=ref(false)
const questionDialog=ref(false)
const editingForm=ref(null)
const editingSection=ref(null)
const editingQuestion=ref(null)
const formEdit=reactive({nombre:'',version:'1.0',descripcion:'',activo:false})
const sectionEdit=reactive({titulo:'',descripcion:'',activo:true,orden:1})
const questionEdit=reactive({pregunta:'',tipo:'texto',opciones_texto:'',ayuda:'',obligatoria:false,activo:true,orden:1})
const typeOptions=[
  {label:'Texto',value:'texto'},
  {label:'Número',value:'numero'},
  {label:'Selección única',value:'seleccion_unica'},
  {label:'Selección múltiple',value:'seleccion_multiple'},
]
const selectedSection=computed(()=>current.value?.secciones?.find(x=>Number(x.id)===Number(selectedSectionId.value))||current.value?.secciones?.[0]||null)
const previewSections=computed(()=>current.value?.secciones?.filter(s=>s.activo).map(s=>({...s,preguntas:(s.preguntas||[]).filter(q=>q.activo&&String(q.pregunta||'').trim())}))||[])

function message(error,fallback){const errors=Object.values(error?.response?.data?.errors||{}).flat();return errors[0]||error?.response?.data?.message||fallback}
async function loadForms(selectId=null){
  loading.value=true
  try{
    const {data}=await api.get('/cuestionarios')
    forms.value=data?.data||[]
    const id=selectId||current.value?.id||forms.value[0]?.id
    if(id)await selectForm(id)
    else current.value=null
  }finally{loading.value=false}
}
async function selectForm(id){
  const {data}=await api.get(`/cuestionarios/${id}`)
  current.value=data?.data||null
  if(!current.value?.secciones?.some(s=>Number(s.id)===Number(selectedSectionId.value)))selectedSectionId.value=current.value?.secciones?.[0]?.id||null
}
function openForm(row=null){
  editingForm.value=row
  Object.assign(formEdit,{nombre:row?.nombre||'',version:row?.version||'1.0',descripcion:row?.descripcion||'',activo:!!row?.activo})
  formDialog.value=true
}
async function saveForm(){
  try{
    const payload={nombre:formEdit.nombre,version:formEdit.version,descripcion:formEdit.descripcion||null,activo:formEdit.activo}
    const response=editingForm.value?await api.put(`/cuestionarios/${editingForm.value.id}`,payload):await api.post('/cuestionarios',payload)
    formDialog.value=false
    await loadForms(response.data?.data?.id)
    $q.notify({type:'positive',message:'Formulario guardado.'})
  }catch(e){$q.notify({type:'negative',message:message(e,'No se pudo guardar el formulario.')})}
}
function removeForm(row){
  $q.dialog({title:'Eliminar formulario',message:'Solo se puede eliminar si nunca fue usado en una solicitud.',cancel:true,persistent:true,ok:{label:'Eliminar',color:'negative'}}).onOk(async()=>{
    try{await api.delete(`/cuestionarios/${row.id}`);current.value=null;await loadForms();$q.notify({type:'positive',message:'Formulario eliminado.'})}
    catch(e){$q.notify({type:'negative',message:message(e,'No se pudo eliminar.')})}
  })
}
function openSection(row=null){
  editingSection.value=row
  Object.assign(sectionEdit,{titulo:row?.titulo||'',descripcion:row?.descripcion||'',activo:row?!!row.activo:true,orden:row?.orden||((current.value?.secciones?.length||0)+1)})
  sectionDialog.value=true
}
async function saveSection(){
  try{
    const payload={...sectionEdit,descripcion:sectionEdit.descripcion||null}
    const response=editingSection.value?await api.put(`/cuestionario-secciones/${editingSection.value.id}`,payload):await api.post(`/cuestionarios/${current.value.id}/secciones`,payload)
    sectionDialog.value=false
    await selectForm(current.value.id)
    selectedSectionId.value=response.data?.data?.id||selectedSectionId.value
    $q.notify({type:'positive',message:'Sección guardada.'})
  }catch(e){$q.notify({type:'negative',message:message(e,'No se pudo guardar la sección.')})}
}
function removeSection(row){
  $q.dialog({title:'Eliminar sección',message:'Si contiene respuestas históricas, VITI impedirá eliminarla y podrás desactivarla.',cancel:true,persistent:true,ok:{label:'Eliminar',color:'negative'}}).onOk(async()=>{
    try{await api.delete(`/cuestionario-secciones/${row.id}`);await selectForm(current.value.id);$q.notify({type:'positive',message:'Sección eliminada.'})}
    catch(e){$q.notify({type:'negative',message:message(e,'No se pudo eliminar la sección.')})}
  })
}
function openQuestion(row=null){
  editingQuestion.value=row
  Object.assign(questionEdit,{pregunta:row?.pregunta||'',tipo:row?.tipo||'texto',opciones_texto:(row?.opciones||[]).join('\n'),ayuda:row?.ayuda||'',obligatoria:row?!!row.obligatoria:false,activo:row?!!row.activo:true,orden:row?.orden||((selectedSection.value?.preguntas?.length||0)+1)})
  questionDialog.value=true
}
async function saveQuestion(){
  const options=questionEdit.opciones_texto.split(/\n/).map(x=>x.trim()).filter(Boolean)
  const payload={pregunta:questionEdit.pregunta,tipo:questionEdit.tipo,opciones:options,ayuda:questionEdit.ayuda||null,obligatoria:questionEdit.obligatoria,activo:questionEdit.activo,orden:questionEdit.orden}
  try{
    if(editingQuestion.value)await api.put(`/cuestionario-preguntas/${editingQuestion.value.id}`,payload)
    else await api.post(`/cuestionario-secciones/${selectedSection.value.id}/preguntas`,payload)
    questionDialog.value=false
    await selectForm(current.value.id)
    $q.notify({type:'positive',message:'Pregunta guardada.'})
  }catch(e){$q.notify({type:'negative',message:message(e,'No se pudo guardar la pregunta.')})}
}
async function duplicateQuestion(row){
  try{await api.post(`/cuestionario-preguntas/${row.id}/duplicar`);await selectForm(current.value.id);$q.notify({type:'positive',message:'Pregunta duplicada. Ahora puedes editar la copia.'})}
  catch(e){$q.notify({type:'negative',message:message(e,'No se pudo duplicar.')})}
}
function removeQuestion(row){
  $q.dialog({title:'Eliminar pregunta',message:'Si ya tiene respuestas, VITI protegerá el historial y no permitirá borrarla.',cancel:true,persistent:true,ok:{label:'Eliminar',color:'negative'}}).onOk(async()=>{
    try{await api.delete(`/cuestionario-preguntas/${row.id}`);await selectForm(current.value.id);$q.notify({type:'positive',message:'Pregunta eliminada.'})}
    catch(e){$q.notify({type:'negative',message:message(e,'No se pudo eliminar la pregunta.')})}
  })
}
async function quickToggle(kind,row){
  try{
    if(kind==='form')await api.put(`/cuestionarios/${row.id}`,{activo:!row.activo})
    if(kind==='section')await api.put(`/cuestionario-secciones/${row.id}`,{activo:!row.activo})
    if(kind==='question')await api.put(`/cuestionario-preguntas/${row.id}`,{activo:!row.activo})
    await loadForms(current.value?.id)
  }catch(e){$q.notify({type:'negative',message:message(e,'No se pudo cambiar el estado.')})}
}
function typeLabel(type){return typeOptions.find(x=>x.value===type)?.label||type}
onMounted(loadForms)
</script>

<template>
  <q-page class="viti-page forms-admin-page">
    <PageHeader eyebrow="Administración" title="Formularios VITI" subtitle="Crea y corrige las preguntas de levantamiento sin entrar a la base de datos.">
      <q-btn outline color="primary" icon="add" label="Nuevo formulario" no-caps @click="openForm()" />
    </PageHeader>

    <q-banner rounded class="history-note q-mb-lg">
      <template #avatar><q-icon name="shield" color="orange" /></template>
      <b>El historial está protegido.</b> Si una pregunta ya tiene respuestas, puedes desactivarla o duplicarla; VITI no permitirá cambiar su significado ni eliminarla.
    </q-banner>

    <div class="forms-layout">
      <aside class="forms-list">
        <div class="panel-title"><span>Formularios</span><q-badge outline color="primary">{{forms.length}}</q-badge></div>
        <q-inner-loading :showing="loading" dark />
        <button v-for="row in forms" :key="row.id" class="form-item" :class="{active:current?.id===row.id}" @click="selectForm(row.id)">
          <div><b>{{row.nombre}}</b><small>v{{row.version}} · {{row.secciones_count}} secciones</small></div>
          <q-badge :color="row.activo?'positive':'grey-7'">{{row.activo?'Activo':'Inactivo'}}</q-badge>
        </button>
      </aside>

      <section v-if="current" class="builder-panel">
        <div class="builder-head">
          <div><div class="text-overline text-orange">FORMULARIO SELECCIONADO</div><h2>{{current.nombre}}</h2><p>{{current.descripcion||'Sin descripción.'}}</p></div>
          <div class="row q-gutter-sm">
            <q-btn flat round icon="edit" @click="openForm(current)"><q-tooltip>Editar formulario</q-tooltip></q-btn>
            <q-btn flat round :icon="current.activo?'toggle_on':'toggle_off'" :color="current.activo?'positive':'grey'" @click="quickToggle('form',current)"><q-tooltip>{{current.activo?'Desactivar':'Activar'}}</q-tooltip></q-btn>
            <q-btn flat round color="negative" icon="delete" @click="removeForm(current)"><q-tooltip>Eliminar</q-tooltip></q-btn>
          </div>
        </div>

        <div class="builder-grid">
          <div class="sections-column">
            <div class="column-head"><b>Secciones</b><q-btn flat dense color="primary" icon="add" label="Agregar" no-caps @click="openSection()" /></div>
            <div v-if="!current.secciones?.length" class="empty-block">Aún no hay secciones.</div>
            <div v-for="section in current.secciones" :key="section.id" class="section-item" :class="{active:selectedSection?.id===section.id,inactive:!section.activo}" @click="selectedSectionId=section.id">
              <div class="section-number">{{section.numero}}</div>
              <div class="col"><b>{{section.titulo}}</b><small>{{section.preguntas?.length||0}} preguntas · orden {{section.orden}}</small></div>
              <q-btn flat round dense icon="more_vert" @click.stop><q-menu><q-list dense style="min-width:180px"><q-item clickable v-close-popup @click="openSection(section)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar</q-item-section></q-item><q-item clickable v-close-popup @click="quickToggle('section',section)"><q-item-section avatar><q-icon :name="section.activo?'visibility_off':'visibility'"/></q-item-section><q-item-section>{{section.activo?'Desactivar':'Activar'}}</q-item-section></q-item><q-item clickable v-close-popup class="text-negative" @click="removeSection(section)"><q-item-section avatar><q-icon name="delete"/></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn>
            </div>
          </div>

          <div class="questions-column">
            <div class="column-head"><div><b>{{selectedSection?.titulo||'Preguntas'}}</b><small v-if="selectedSection">{{selectedSection.descripcion}}</small></div><q-btn v-if="selectedSection" color="primary" unelevated dense icon="add" label="Pregunta" no-caps @click="openQuestion()" /></div>
            <div v-if="selectedSection&&!selectedSection.preguntas?.length" class="empty-block">Esta sección todavía no tiene preguntas.</div>
            <div v-for="question in selectedSection?.preguntas||[]" :key="question.id" class="question-card" :class="{inactive:!question.activo,blank:!String(question.pregunta||'').trim()}">
              <div class="question-top">
                <div class="question-number">{{question.numero}}</div>
                <div class="col"><b>{{question.pregunta||'Pregunta sin texto'}}</b><div class="question-meta"><span>{{typeLabel(question.tipo)}}</span><span v-if="question.obligatoria">Obligatoria</span><span>{{question.respuestas_count||0}} respuestas</span><span v-if="!question.activo">Inactiva</span></div></div>
                <q-btn flat round dense icon="more_vert"><q-menu><q-list dense style="min-width:200px"><q-item clickable v-close-popup @click="openQuestion(question)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar</q-item-section></q-item><q-item clickable v-close-popup @click="duplicateQuestion(question)"><q-item-section avatar><q-icon name="content_copy"/></q-item-section><q-item-section>Duplicar</q-item-section></q-item><q-item clickable v-close-popup @click="quickToggle('question',question)"><q-item-section avatar><q-icon :name="question.activo?'visibility_off':'visibility'"/></q-item-section><q-item-section>{{question.activo?'Desactivar':'Activar'}}</q-item-section></q-item><q-item clickable v-close-popup class="text-negative" @click="removeQuestion(question)"><q-item-section avatar><q-icon name="delete"/></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn>
              </div>
              <div v-if="question.ayuda" class="question-help">{{question.ayuda}}</div>
              <div v-if="question.opciones?.length" class="options-row"><q-chip v-for="option in question.opciones" :key="option" dense outline color="blue-grey-4">{{option}}</q-chip></div>
            </div>
          </div>
        </div>
      </section>

      <aside v-if="current" class="preview-panel">
        <div class="panel-title"><span>Vista previa</span><q-icon name="visibility" color="orange" /></div>
        <div v-if="!previewSections.length" class="empty-block">No hay contenido activo para mostrar.</div>
        <div v-for="section in previewSections" :key="section.id" class="preview-section">
          <h4>{{section.titulo}}</h4><p v-if="section.descripcion">{{section.descripcion}}</p>
          <div v-for="question in section.preguntas" :key="question.id" class="preview-question">
            <label>{{question.pregunta}} <span v-if="question.obligatoria">*</span></label>
            <small v-if="question.ayuda">{{question.ayuda}}</small>
            <q-input v-if="question.tipo==='texto'" outlined dense disable placeholder="Respuesta" />
            <q-input v-else-if="question.tipo==='numero'" outlined dense disable type="number" placeholder="0" />
            <q-select v-else-if="question.tipo==='seleccion_unica'" outlined dense disable :options="question.opciones||[]" placeholder="Elegir una opción" />
            <q-option-group v-else disable type="checkbox" :options="(question.opciones||[]).map(x=>({label:x,value:x}))" />
          </div>
        </div>
      </aside>
    </div>

    <q-dialog v-model="formDialog"><q-card class="editor-card"><q-card-section><div class="text-overline text-orange">FORMULARIO</div><div class="text-h5 text-weight-bold">{{editingForm?'Editar formulario':'Nuevo formulario'}}</div></q-card-section><q-card-section class="q-gutter-md"><q-input v-model="formEdit.nombre" outlined label="Nombre *"/><q-input v-model="formEdit.version" outlined label="Versión"/><q-input v-model="formEdit.descripcion" outlined type="textarea" autogrow label="Descripción"/><q-toggle v-model="formEdit.activo" label="Usar como formulario activo" color="positive"/></q-card-section><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" label="Guardar" no-caps @click="saveForm"/></q-card-actions></q-card></q-dialog>

    <q-dialog v-model="sectionDialog"><q-card class="editor-card"><q-card-section><div class="text-overline text-orange">SECCIÓN</div><div class="text-h5 text-weight-bold">{{editingSection?'Editar sección':'Nueva sección'}}</div></q-card-section><q-card-section class="q-gutter-md"><q-input v-model="sectionEdit.titulo" outlined label="Título *"/><q-input v-model="sectionEdit.descripcion" outlined type="textarea" autogrow label="Descripción"/><q-input v-model.number="sectionEdit.orden" outlined type="number" min="1" label="Orden"/><q-toggle v-model="sectionEdit.activo" label="Visible en el formulario" color="positive"/></q-card-section><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" label="Guardar" no-caps @click="saveSection"/></q-card-actions></q-card></q-dialog>

    <q-dialog v-model="questionDialog"><q-card class="editor-card question-editor"><q-card-section><div class="text-overline text-orange">PREGUNTA</div><div class="text-h5 text-weight-bold">{{editingQuestion?'Editar pregunta':'Nueva pregunta'}}</div><div v-if="editingQuestion?.respuestas_count" class="text-caption text-orange q-mt-xs">Tiene {{editingQuestion.respuestas_count}} respuestas. Duplica la pregunta si necesitas cambiar texto, tipo u opciones.</div></q-card-section><q-card-section class="q-gutter-md"><q-input v-model="questionEdit.pregunta" outlined type="textarea" autogrow label="Pregunta *"/><q-select v-model="questionEdit.tipo" outlined emit-value map-options :options="typeOptions" label="Tipo *"/><q-input v-if="['seleccion_unica','seleccion_multiple'].includes(questionEdit.tipo)" v-model="questionEdit.opciones_texto" outlined type="textarea" autogrow label="Opciones" hint="Una opción por línea"/><q-input v-model="questionEdit.ayuda" outlined type="textarea" autogrow label="Texto de ayuda (opcional)"/><div class="row q-col-gutter-md"><div class="col-12 col-sm-4"><q-input v-model.number="questionEdit.orden" outlined type="number" min="1" label="Orden"/></div><div class="col-6 col-sm-4 flex items-center"><q-toggle v-model="questionEdit.obligatoria" label="Obligatoria" color="orange"/></div><div class="col-6 col-sm-4 flex items-center"><q-toggle v-model="questionEdit.activo" label="Activa" color="positive"/></div></div></q-card-section><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" label="Guardar" no-caps @click="saveQuestion"/></q-card-actions></q-card></q-dialog>
  </q-page>
</template>

<style scoped>
.forms-admin-page{max-width:1680px}.history-note{background:#0c2238;border:1px solid rgba(242,139,48,.24);color:#c8d5e1}.forms-layout{display:grid;grid-template-columns:250px minmax(0,1fr) 360px;gap:16px;align-items:start}.forms-list,.builder-panel,.preview-panel{background:#0b1e33;border:1px solid #24435f;border-radius:18px;overflow:hidden}.panel-title,.column-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(100,133,164,.18)}.panel-title{font-weight:800}.form-item{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;border:0;border-bottom:1px solid rgba(100,133,164,.12);background:transparent;color:#dce7f1;padding:15px 16px;cursor:pointer}.form-item:hover,.form-item.active{background:#102a47}.form-item.active{box-shadow:inset 3px 0 #f28b30}.form-item b,.form-item small{display:block}.form-item small{color:#8fa7bb;margin-top:4px}.builder-head{display:flex;justify-content:space-between;gap:20px;padding:20px 22px;border-bottom:1px solid rgba(100,133,164,.18)}.builder-head h2{margin:3px 0;font-size:25px}.builder-head p{margin:0;color:#9db0c0}.builder-grid{display:grid;grid-template-columns:290px minmax(0,1fr);min-height:570px}.sections-column{border-right:1px solid rgba(100,133,164,.18)}.section-item{display:flex;align-items:center;gap:10px;padding:13px 12px;border-bottom:1px solid rgba(100,133,164,.12);cursor:pointer}.section-item:hover,.section-item.active{background:#102a47}.section-item.inactive,.question-card.inactive{opacity:.55}.section-number,.question-number{display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;border-radius:9px;background:#172d44;color:#f28b30;font-weight:800;font-size:11px}.section-item b,.section-item small{display:block}.section-item small{color:#8fa7bb;margin-top:3px;font-size:10px}.questions-column{min-width:0}.column-head small{display:block;color:#8fa7bb;margin-top:3px}.question-card{margin:12px;border:1px solid #294761;border-radius:14px;padding:14px;background:#091a2c}.question-card.blank{border-color:#ef5350}.question-top{display:flex;align-items:flex-start;gap:10px}.question-top b{line-height:1.4}.question-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.question-meta span{font-size:9px;padding:3px 6px;border-radius:999px;background:#152d46;color:#a9bdcd}.question-help{margin:10px 0 0 40px;color:#8fa7bb;font-size:11px}.options-row{margin:8px 0 0 34px}.preview-panel{position:sticky;top:88px;max-height:calc(100vh - 118px);overflow:auto}.preview-section{padding:16px;border-bottom:1px solid rgba(100,133,164,.14)}.preview-section h4{margin:0;color:#f1f6fb}.preview-section>p{margin:4px 0 14px;color:#90a7ba;font-size:11px}.preview-question{display:grid;gap:6px;margin:14px 0}.preview-question label{font-size:12px;font-weight:700;color:#dce7f1}.preview-question label span{color:#f28b30}.preview-question small{color:#829bae}.empty-block{padding:28px 18px;text-align:center;color:#829bae}.editor-card{width:620px;max-width:94vw;background:#0b1e33;color:#edf4fb}.question-editor{width:700px}.editor-card :deep(.q-field--outlined .q-field__control){background:#07192a!important}.editor-card :deep(.q-field__label){color:#91a7b9!important}.editor-card :deep(.q-field__native),.editor-card :deep(.q-field__input){color:#edf4fb!important}@media(max-width:1250px){.forms-layout{grid-template-columns:230px 1fr}.preview-panel{grid-column:1/-1;position:static;max-height:none}.builder-grid{grid-template-columns:260px 1fr}}@media(max-width:780px){.forms-layout{grid-template-columns:1fr}.builder-grid{grid-template-columns:1fr}.sections-column{border-right:0;border-bottom:1px solid rgba(100,133,164,.18)}.builder-head{flex-direction:column}.forms-list{max-height:280px;overflow:auto}}
</style>
