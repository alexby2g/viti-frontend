<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const item = ref(null)
const loading = ref(true)
const actionLoading = ref(false)
const inviteLoading = ref(false)
const submitLoading = ref(false)
const editSaving = ref(false)
const loadError = ref('')
const activeTab = ref('resumen')
const editMode = ref(false)
const rejectDialog = ref(false)
const history = ref([])
const historyLoading = ref(false)
const clients = ref([])
const editForm = reactive({ empresa_id:null, cliente_id:null, titulo:'', resumen:'', prioridad:'normal', fecha_limite_deseada:null, presupuesto_estimado:null })
const rejectForm = reactive({ motivo:'' })

const plan = computed(() => item.value?.plan_viti || null)
const access = computed(() => item.value?.acceso_cliente || {})
const hasAccount = computed(() => Boolean(access.value?.tiene_cuenta) || access.value?.estado === 'cuenta_creada')
const answers = computed(() => item.value?.respuestas || [])
const editSelectedClient = computed(() => clients.value.find(row => row.id === editForm.cliente_id) || null)
const editCompanyOptions = computed(() => editSelectedClient.value?.empresas?.map(row => ({ label:row.nombre_comercial, value:row.id })) || [])
const canEdit = computed(() => Boolean(item.value?.id && !item.value?.proyecto && ['borrador','en_revision','rechazada'].includes(item.value?.estado)))
const canSubmit = computed(() => ['borrador','rechazada'].includes(item.value?.estado) && !item.value?.proyecto)
const approvalReady = computed(() => Boolean(item.value?.cliente_id && item.value?.cliente?.correo && item.value?.empresa_id && item.value?.plan_viti_id && plan.value && item.value?.declaracion_aceptada && item.value?.acuerdo_comercial_aceptado))
const canApprove = computed(() => item.value?.estado === 'en_revision' && !item.value?.proyecto && approvalReady.value)
const canCreateProject = computed(() => item.value?.estado === 'aprobada' && !item.value?.proyecto && hasAccount.value)
const waitingForAccount = computed(() => item.value?.estado === 'aprobada' && !item.value?.proyecto && !hasAccount.value)
const stage = computed(() => item.value?.proyecto ? 'trabajo' : item.value?.estado === 'aprobada' ? 'acceso' : item.value?.estado === 'en_revision' ? 'decision' : 'solicitud')
const flowSteps = computed(() => [
  {label:'Solicitud',done:item.value?.estado!=='borrador',active:stage.value==='solicitud'},
  {label:'Decisión',done:['aprobada','convertida'].includes(item.value?.estado),active:stage.value==='decision'},
  {label:'Acceso',done:hasAccount.value,active:stage.value==='acceso'},
  {label:'Trabajo',done:Boolean(item.value?.proyecto),active:stage.value==='trabajo'},
])

function normalize(response){ return response?.data?.data ?? response?.data ?? null }
function pretty(value){ return String(value || '').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase()) }
function statusLabel(value){ return ({borrador:'Borrador',en_revision:'Por revisar',aprobada:'Aprobada',convertida:'En trabajo',rechazada:'Rechazada',cerrada:'Cerrada'}[value] || pretty(value)) }
function statusTone(value){ return ({borrador:'blue-grey',en_revision:'warning',aprobada:'positive',convertida:'purple',rechazada:'negative',cerrada:'grey'}[value] || 'primary') }
function money(value){
  if(value === null || value === undefined || value === '') return 'Por definir'
  return `Bs ${Number(value).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2})}`
}
function eventLabel(value){
  return ({solicitud_creada:'Solicitud creada',solicitud_actualizada:'Datos actualizados',solicitud_enviada:'Enviada a revisión',solicitud_rechazada:'Solicitud rechazada',solicitud_aprobada:'Solicitud aprobada',cuestionario_guardado:'Información actualizada'}[value] || pretty(value))
}

async function load(){
  loadError.value=''; loading.value=true
  try{
    item.value=normalize(await api.get(`/solicitudes/${Number(route.params.id)}`))
    if(!item.value?.id) throw new Error('El servidor no devolvió una solicitud válida.')
  }catch(error){ loadError.value=error?.response?.data?.message||error?.message||'No se pudo cargar la solicitud.' }
  finally{ loading.value=false }
}
async function loadHistory(){
  if(!item.value?.id) return
  historyLoading.value=true
  try{ history.value=(await api.get(`/solicitudes/${item.value.id}/historial`)).data.data||[] }
  catch{ history.value=[] }
  finally{ historyLoading.value=false }
}
async function openEdit(){
  if(!canEdit.value) return
  try{
    if(!clients.value.length){
      const response=await api.get('/clientes',{params:{per_page:100}})
      clients.value=response.data?.data||[]
    }
    Object.assign(editForm,{empresa_id:item.value.empresa_id,cliente_id:item.value.cliente_id,titulo:item.value.titulo||'',resumen:item.value.resumen||'',prioridad:item.value.prioridad||'normal',fecha_limite_deseada:item.value.fecha_limite_deseada||null,presupuesto_estimado:item.value.presupuesto_estimado??null})
    editMode.value=true
    activeTab.value='resumen'
  }catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||'No se pudieron cargar los datos para editar.'})}
}
function cancelEdit(){ editMode.value=false; clearEditQuery() }
function editClientChanged(){
  if(item.value?.estado!=='borrador') return
  if(!editCompanyOptions.value.some(row=>row.value===editForm.empresa_id)) editForm.empresa_id=editCompanyOptions.value.length===1?editCompanyOptions.value[0].value:null
}
async function saveEdit(){
  if(!editForm.cliente_id||!editForm.empresa_id||!String(editForm.titulo||'').trim()){$q.notify({type:'warning',message:'Completa responsable, empresa y título.'});return}
  editSaving.value=true
  try{
    await api.put(`/solicitudes/${item.value.id}`,{...editForm,estado:item.value.estado,plan_viti_id:item.value.plan_viti_id,forma_pago_preferida:item.value.forma_pago_preferida,frecuencia_suscripcion_preferida:item.value.frecuencia_suscripcion_preferida})
    editMode.value=false
    await load(); await loadHistory(); await clearEditQuery()
    $q.notify({type:'positive',message:'Solicitud actualizada correctamente.'})
  }catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||error?.message||'No se pudo actualizar la solicitud.'})}
  finally{editSaving.value=false}
}
function submitRequest(){
  if(!canSubmit.value) return
  const returning=item.value?.estado==='rechazada'
  $q.dialog({title:returning?'Volver a revisión':'Enviar a revisión',message:returning?'La solicitud volverá a la cola de revisión administrativa. ¿Continuar?':'La solicitud quedará lista para que VITI decida si acepta o rechaza el trabajo. ¿Continuar?',cancel:true,persistent:true}).onOk(async()=>{
    submitLoading.value=true
    try{await api.post(`/solicitudes/${item.value.id}/enviar`);$q.notify({type:'positive',message:returning?'Solicitud devuelta a revisión.':'Solicitud enviada a revisión.'});await load();await loadHistory()}
    catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||'No se pudo enviar la solicitud a revisión.',timeout:5000})}
    finally{submitLoading.value=false}
  })
}
function approveRequest(){
  if(!canApprove.value) return
  $q.dialog({title:'Aceptar trabajo',message:'La solicitud quedará aprobada y VITI preparará el acceso del cliente para continuar con el trabajo. ¿Aceptar?',cancel:true,persistent:true}).onOk(async()=>{
    actionLoading.value=true
    try{const response=await api.post(`/solicitudes/${item.value.id}/aprobar`);$q.notify({type:response?.data?.data?.acceso?.email_enviado||response?.data?.data?.acceso?.tiene_cuenta?'positive':'warning',message:response?.data?.message||'Trabajo aceptado.',timeout:5000});await load();await loadHistory()}
    catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||'No se pudo aprobar la solicitud.'})}
    finally{actionLoading.value=false}
  })
}
function openReject(){rejectForm.motivo='';rejectDialog.value=true}
async function rejectRequest(){
  if(String(rejectForm.motivo).trim().length<5){$q.notify({type:'warning',message:'Escribe un motivo breve.'});return}
  actionLoading.value=true
  try{await api.post(`/solicitudes/${item.value.id}/rechazar`,{motivo:rejectForm.motivo.trim()});rejectDialog.value=false;$q.notify({type:'positive',message:'Solicitud rechazada.'});await load();await loadHistory()}
  catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||'No se pudo rechazar la solicitud.'})}
  finally{actionLoading.value=false}
}
async function createInvitation(){inviteLoading.value=true;try{const response=await api.post(`/solicitudes/${item.value.id}/invitacion`,{dias_vigencia:7});$q.notify({type:response?.data?.data?.email_enviado?'positive':'warning',message:response?.data?.message||'Acceso preparado.'});await load()}catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||'No se pudo crear el acceso.'})}finally{inviteLoading.value=false}}
async function resendInvitation(){inviteLoading.value=true;try{const response=await api.post(`/solicitudes/${item.value.id}/invitacion/reenviar`);$q.notify({type:response?.data?.data?.email_enviado?'positive':'warning',message:response?.data?.message||'Invitación procesada.'});await load()}catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||'No se pudo reenviar.'})}finally{inviteLoading.value=false}}
async function copyInvitation(){if(!access.value?.url)return;try{await navigator.clipboard.writeText(access.value.url);$q.notify({type:'positive',message:'Enlace copiado.'})}catch{$q.dialog({title:'Enlace de acceso',message:access.value.url,ok:'Cerrar'})}}
async function createProject(){
  if(!canCreateProject.value) return
  actionLoading.value=true
  try{
    const created=normalize(await api.post('/proyectos',{solicitud_id:item.value.id,empresa_id:item.value.empresa_id,cliente_id:item.value.cliente_id,nombre:item.value.titulo||'Trabajo VITI',descripcion:item.value.resumen||'',fase:'levantamiento',estado:'activo',progreso:0,fecha_inicio:new Date().toISOString().slice(0,10)}))
    if(!created?.id) throw new Error('No se recibió el trabajo creado.')
    $q.notify({type:'positive',message:'Trabajo iniciado.'});await router.push(`/trabajos/${created.id}`)
  }catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||error?.message||'No se pudo iniciar el trabajo.'})}
  finally{actionLoading.value=false}
}
async function clearEditQuery(){if(route.query.editar) await router.replace({path:route.path,query:{}})}

watch(activeTab, value => { if(value==='historial' && !history.value.length) loadHistory() })
onMounted(async()=>{await load();await loadHistory();if(route.query.editar==='1'&&canEdit.value)await openEdit()})
</script>

<template>
  <q-page class="viti-page request-detail-page">
    <q-inner-loading :showing="loading"/>
    <q-banner v-if="loadError" rounded class="error-banner"><template #avatar><q-icon name="error_outline"/></template>{{loadError}}<template #action><q-btn flat label="Volver" to="/solicitudes"/></template></q-banner>

    <template v-if="item">
      <PageHeader eyebrow="Solicitud" :title="item.titulo || 'Solicitud VITI'" :subtitle="`${item.codigo} · ${item.empresa?.nombre_comercial || 'Sin negocio'} · ${formatDateTime(item.created_at)}`">
        <q-badge outline :color="statusTone(item.estado)" class="status-badge">{{statusLabel(item.estado)}}</q-badge>
      </PageHeader>

      <div class="flow-strip q-mb-lg">
        <div v-for="(step,index) in flowSteps" :key="step.label" :class="['flow-item',{done:step.done,active:step.active}]"><span>{{step.done?'✓':index+1}}</span><b>{{step.label}}</b></div>
      </div>

      <section class="detail-layout">
        <main class="detail-main">
          <section v-if="editMode" class="edit-panel">
            <div class="panel-top"><div><div class="section-label">Editar solicitud</div><h2>Datos generales</h2><p>El estado no se cambia manualmente. VITI lo actualiza al enviar, aceptar o rechazar.</p></div><q-btn flat round icon="close" @click="cancelEdit"/></div>
            <div class="edit-grid">
              <q-select v-model="editForm.cliente_id" outlined emit-value map-options :options="clients.map(row=>({label:`${row.nombre} · ${row.telefono||'Sin teléfono'}`,value:row.id}))" label="Responsable *" :disable="item.estado!=='borrador'" @update:model-value="editClientChanged"/>
              <q-select v-model="editForm.empresa_id" outlined emit-value map-options :options="editCompanyOptions" label="Negocio *" :disable="item.estado!=='borrador'||!editForm.cliente_id"/>
              <q-input class="span-2" v-model="editForm.titulo" outlined label="Título de la solicitud *"/>
              <q-input class="span-2" v-model="editForm.resumen" outlined type="textarea" autogrow label="Resumen"/>
              <q-select v-model="editForm.prioridad" outlined :options="['baja','normal','alta','urgente']" label="Prioridad"/>
              <q-input v-model="editForm.fecha_limite_deseada" outlined type="date" stack-label label="Fecha deseada"/>
              <q-input v-model.number="editForm.presupuesto_estimado" outlined type="number" input-class="money-input" label="Presupuesto referencial">
                <template #prepend><span class="money-prefix">Bs</span></template>
              </q-input>
            </div>
            <div class="edit-actions"><q-btn flat no-caps label="Cancelar" @click="cancelEdit"/><q-btn color="primary" unelevated no-caps icon="save" label="Guardar cambios" :loading="editSaving" @click="saveEdit"/></div>
          </section>

          <template v-else>
            <q-tabs v-model="activeTab" dense no-caps align="left" class="detail-tabs" active-color="orange" indicator-color="orange">
              <q-tab name="resumen" label="Resumen"/>
              <q-tab name="necesidad" label="Necesidad"/>
              <q-tab name="comercial" label="Comercial"/>
              <q-tab name="historial" label="Historial"/>
            </q-tabs>

            <q-tab-panels v-model="activeTab" animated class="tab-panels">
              <q-tab-panel name="resumen">
                <div class="summary-grid">
                  <article class="info-card large"><small>NECESIDAD</small><h2>{{item.titulo}}</h2><p>{{item.resumen || 'Sin descripción adicional.'}}</p></article>
                  <article class="info-card"><small>CLIENTE</small><h3>{{item.cliente?.nombre || 'Sin contacto'}}</h3><p>{{item.cliente?.telefono || 'Sin teléfono'}}<br>{{item.cliente?.correo || 'Sin correo'}}</p></article>
                  <article class="info-card"><small>NEGOCIO</small><h3>{{item.empresa?.nombre_comercial || 'Sin negocio'}}</h3><p>{{item.empresa?.actividad || 'Actividad no especificada.'}}</p></article>
                  <article class="info-card"><small>PRESUPUESTO</small><h3>{{money(item.presupuesto_estimado)}}</h3><p>{{item.fecha_limite_deseada ? `Fecha deseada: ${item.fecha_limite_deseada}` : 'Sin fecha de entrega definida.'}}</p></article>
                  <article class="info-card"><small>PRIORIDAD</small><h3>{{pretty(item.prioridad || 'normal')}}</h3><p>Definida para la evaluación administrativa.</p></article>
                </div>
              </q-tab-panel>

              <q-tab-panel name="necesidad">
                <div class="section-copy"><div class="section-label">Levantamiento</div><h2>Lo que el cliente necesita</h2><p>Estas respuestas forman el contexto funcional del trabajo. Al enviar a revisión quedan congeladas para mantener trazabilidad.</p></div>
                <div v-if="answers.length" class="answers-list">
                  <article v-for="response in answers" :key="response.id" class="answer-card"><small>{{response.pregunta?.numero ? `PREGUNTA ${response.pregunta.numero}` : 'DATO'}}</small><h4>{{response.pregunta?.enunciado || 'Información del levantamiento'}}</h4><p>{{Array.isArray(response.respuesta_json)?response.respuesta_json.join(', '):(response.respuesta_texto||'Sin respuesta')}}</p></article>
                </div>
                <div v-else class="panel-empty"><q-icon name="description"/><b>No hay respuestas registradas</b></div>
              </q-tab-panel>

              <q-tab-panel name="comercial">
                <div class="section-copy"><div class="section-label">Acuerdo inicial</div><h2>Condiciones para aceptar el trabajo</h2><p>La aprobación se mantiene separada del desarrollo. Aquí VITI verifica cliente, plan y condiciones comerciales.</p></div>
                <div class="commercial-grid">
                  <article class="info-card"><small>PLAN</small><h3>{{plan?.nombre || 'Sin plan seleccionado'}}</h3><p>{{plan?.descripcion || 'Selecciona las condiciones comerciales antes de aprobar.'}}</p></article>
                  <article class="info-card"><small>IMPLEMENTACIÓN</small><h3>{{money(plan?.precio_proyecto)}}</h3><p>Precio del proyecto según el plan seleccionado.</p></article>
                  <article class="info-card"><small>SERVICIO</small><h3>{{item.frecuencia_suscripcion_preferida==='anual'?money(plan?.precio_anual):money(plan?.precio_mensual)}}</h3><p>{{pretty(item.frecuencia_suscripcion_preferida || 'por definir')}}</p></article>
                  <article class="info-card"><small>DECLARACIÓN</small><h3>{{item.declaracion_aceptada?'Confirmada':'Pendiente'}}</h3><p>{{item.declaracion_nombre || 'El cliente todavía no confirmó sus datos.'}}</p></article>
                  <article class="info-card"><small>ACUERDO COMERCIAL</small><h3>{{item.acuerdo_comercial_aceptado?'Aceptado':'Pendiente'}}</h3><p>{{item.acuerdo_comercial_nombre || 'Sin aceptación registrada.'}}</p></article>
                </div>
                <q-banner v-if="item.estado==='en_revision' && !approvalReady" rounded class="approval-warning"><template #avatar><q-icon name="warning_amber"/></template>Antes de aceptar el trabajo completa cliente con correo, negocio, plan, declaración y acuerdo comercial.</q-banner>
              </q-tab-panel>

              <q-tab-panel name="historial">
                <q-inner-loading :showing="historyLoading"/>
                <div class="section-copy"><div class="section-label">Trazabilidad</div><h2>Historial de la solicitud</h2><p>Cada decisión relevante queda registrada.</p></div>
                <div v-if="history.length" class="timeline-list">
                  <article v-for="event in history" :key="event.id" class="timeline-event"><span class="timeline-dot"></span><div><small>{{formatDateTime(event.created_at)}}</small><h4>{{eventLabel(event.accion)}}</h4><p>{{event.descripcion || 'Movimiento registrado en VITI.'}}</p><em v-if="event.usuario">{{event.usuario.nombre}} {{event.usuario.apellido}}</em></div></article>
                </div>
                <div v-else-if="!historyLoading" class="panel-empty"><q-icon name="history"/><b>Sin movimientos registrados</b></div>
              </q-tab-panel>
            </q-tab-panels>
          </template>
        </main>

        <aside class="action-rail">
          <div class="action-card">
            <div class="section-label">Acciones</div>
            <h3>{{statusLabel(item.estado)}}</h3>
            <p v-if="item.estado==='borrador'">Completa la solicitud y envíala a revisión.</p>
            <p v-else-if="item.estado==='en_revision'">Decide si VITI acepta o rechaza este trabajo.</p>
            <p v-else-if="waitingForAccount">El trabajo fue aceptado. Prepara el acceso del cliente.</p>
            <p v-else-if="canCreateProject">El cliente ya tiene acceso. Inicia el trabajo.</p>
            <p v-else-if="item.proyecto">El trabajo ya está en producción.</p>
            <p v-else>La solicitud permanece registrada en VITI.</p>

            <q-btn v-if="canEdit" outline color="orange" no-caps icon="edit" label="Editar solicitud" @click="openEdit"/>
            <q-btn v-if="canSubmit" color="primary" unelevated no-caps icon="send" :label="item.estado==='rechazada'?'Volver a revisión':'Enviar a revisión'" :loading="submitLoading" @click="submitRequest"/>
            <template v-if="item.estado==='en_revision'">
              <q-btn outline color="negative" no-caps icon="close" label="Rechazar" :disable="actionLoading" @click="openReject"/>
              <q-btn color="positive" unelevated no-caps icon="check" label="Aceptar trabajo" :loading="actionLoading" :disable="!canApprove" @click="approveRequest"/>
            </template>
            <template v-if="waitingForAccount">
              <q-btn v-if="access.url" outline color="orange" no-caps icon="content_copy" label="Copiar acceso" @click="copyInvitation"/>
              <q-btn v-if="access.url" flat no-caps icon="forward_to_inbox" label="Reenviar acceso" :loading="inviteLoading" @click="resendInvitation"/>
              <q-btn v-else color="primary" unelevated no-caps icon="person_add" label="Crear acceso" :loading="inviteLoading" @click="createInvitation"/>
            </template>
            <q-btn v-if="canCreateProject" color="primary" unelevated no-caps icon="rocket_launch" label="Iniciar trabajo" :loading="actionLoading" @click="createProject"/>
            <q-btn v-if="item.proyecto?.id" outline color="orange" no-caps icon="open_in_new" label="Abrir trabajo" :to="`/trabajos/${item.proyecto.id}`"/>
          </div>

          <div class="mini-card"><small>CÓDIGO</small><b>{{item.codigo}}</b></div>
          <div class="mini-card"><small>RESPONSABLE</small><b>{{item.asignado ? `${item.asignado.nombre} ${item.asignado.apellido||''}` : 'Sin asignar'}}</b></div>
        </aside>
      </section>

      <q-dialog v-model="rejectDialog"><q-card class="reject-card"><q-card-section><div class="text-overline text-negative">RECHAZAR SOLICITUD</div><div class="text-h6 text-weight-bold">Registra el motivo</div><div class="text-caption text-grey-6">Quedará guardado en el historial de la solicitud.</div></q-card-section><q-card-section><q-input v-model="rejectForm.motivo" outlined type="textarea" autogrow label="Motivo *"/></q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn outline color="negative" no-caps label="Confirmar rechazo" :loading="actionLoading" @click="rejectRequest"/></q-card-actions></q-card></q-dialog>
    </template>
  </q-page>
</template>

<style scoped>
.request-detail-page{max-width:1320px;padding-top:32px;padding-bottom:54px}.status-badge{font-size:11px;padding:7px 12px;border-radius:999px}.flow-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.flow-item{display:flex;align-items:center;gap:9px;color:#70869b;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.018);border:1px solid rgba(71,105,137,.22)}.flow-item span{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#07192a;border:1px solid #294761;font-size:11px}.flow-item b{font-size:11px}.flow-item.done{color:#9bd8b9}.flow-item.done span{border-color:rgba(54,201,128,.45);color:#62d799}.flow-item.active{border-color:rgba(242,139,48,.38);color:#ffd0a4}.flow-item.active span{border-color:#f28b30;color:#f7a85e}.detail-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start}.detail-main{min-width:0}.detail-tabs{border:1px solid rgba(74,106,137,.23);border-radius:14px 14px 0 0;background:rgba(8,25,45,.58);padding:3px 7px}.tab-panels{background:rgba(8,25,45,.48)!important;color:#edf4fb;border:1px solid rgba(74,106,137,.23);border-top:0;border-radius:0 0 18px 18px}.tab-panels :deep(.q-tab-panel){padding:22px}.summary-grid,.commercial-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.info-card{border:1px solid rgba(76,108,139,.21);background:linear-gradient(180deg,rgba(13,36,61,.72),rgba(8,26,45,.72));border-radius:16px;padding:18px;min-height:130px}.info-card.large{grid-column:1/-1;min-height:175px}.info-card small,.mini-card small{font-size:9px;font-weight:900;letter-spacing:.12em;color:#f28b30}.info-card h2{font-size:26px;line-height:1.2;margin:9px 0}.info-card h3{font-size:18px;margin:8px 0}.info-card p{color:#95aabc;font-size:11px;line-height:1.6;margin:0}.section-copy{margin-bottom:18px}.section-copy h2{font-size:23px;margin:4px 0}.section-copy p{margin:0;color:#91a7ba;font-size:11px;line-height:1.6;max-width:760px}.answers-list{display:grid;gap:10px}.answer-card{padding:15px;border:1px solid rgba(76,108,139,.2);background:rgba(12,34,57,.62);border-radius:14px}.answer-card small{font-size:8px;color:#f28b30;font-weight:900;letter-spacing:.12em}.answer-card h4{font-size:12px;margin:5px 0}.answer-card p{white-space:pre-wrap;color:#a7b8c7;font-size:11px;margin:0}.approval-warning{margin-top:14px;background:rgba(242,139,48,.08);border:1px solid rgba(242,139,48,.22);color:#f1c596}.timeline-list{display:grid}.timeline-event{position:relative;display:grid;grid-template-columns:18px 1fr;gap:10px;padding:0 0 20px}.timeline-event:before{content:"";position:absolute;left:6px;top:13px;bottom:-3px;width:1px;background:rgba(94,126,156,.26)}.timeline-event:last-child:before{display:none}.timeline-dot{width:13px;height:13px;border-radius:50%;margin-top:3px;background:#f28b30;box-shadow:0 0 0 4px rgba(242,139,48,.09);z-index:1}.timeline-event small{color:#778fa5;font-size:9px}.timeline-event h4{margin:3px 0;font-size:12px}.timeline-event p{margin:0;color:#9bb0c1;font-size:10px}.timeline-event em{display:block;margin-top:4px;color:#6f879d;font-size:9px;font-style:normal}.action-rail{display:grid;gap:10px;position:sticky;top:86px}.action-card,.mini-card,.edit-panel{border:1px solid rgba(77,109,139,.24);background:linear-gradient(180deg,rgba(13,37,62,.92),rgba(8,27,47,.94));border-radius:18px}.action-card{padding:19px}.action-card h3{font-size:20px;margin:6px 0}.action-card>p{color:#90a6b8;font-size:10px;line-height:1.55;margin:0 0 15px}.action-card .q-btn{width:100%;min-height:42px;border-radius:11px;margin-top:7px}.mini-card{padding:14px 16px}.mini-card small,.mini-card b{display:block}.mini-card b{font-size:11px;margin-top:5px;color:#d7e1ea}.edit-panel{padding:22px}.panel-top{display:flex;justify-content:space-between;gap:18px}.panel-top h2{margin:4px 0;font-size:23px}.panel-top p{margin:0;color:#91a7ba;font-size:10px}.edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:20px}.span-2{grid-column:1/-1}.money-prefix{font-size:11px;font-weight:900;color:#f28b30;border-right:1px solid rgba(95,126,157,.25);padding-right:8px}.edit-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.edit-actions .q-btn{border-radius:11px;min-height:42px}.panel-empty{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#738ca2}.panel-empty .q-icon{font-size:32px}.panel-empty b{margin-top:8px;color:#bdcad6}.reject-card{width:520px;max-width:94vw;background:#0c1e32!important;color:#edf4fb;border:1px solid #294761;border-radius:18px!important}.error-banner{background:rgba(193,0,21,.08);border:1px solid rgba(193,0,21,.2);color:#ff9ca8}
@media(max-width:980px){.detail-layout{grid-template-columns:1fr}.action-rail{position:static;grid-template-columns:1fr 1fr}.action-card{grid-column:1/-1}.summary-grid,.commercial-grid{grid-template-columns:1fr 1fr}}
@media(max-width:640px){.request-detail-page{padding-top:18px}.flow-strip{grid-template-columns:1fr 1fr}.summary-grid,.commercial-grid,.edit-grid,.action-rail{grid-template-columns:1fr}.info-card.large,.span-2,.action-card{grid-column:auto}.tab-panels :deep(.q-tab-panel){padding:15px}.detail-tabs{overflow:auto}.edit-actions{display:grid;grid-template-columns:1fr}.edit-actions .q-btn{width:100%}}
</style>
