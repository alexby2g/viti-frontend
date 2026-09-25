<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
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
const loadError = ref('')
const rejectDialog = ref(false)
const editDialog = ref(false)
const editSaving = ref(false)
const submitLoading = ref(false)
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
const canReject = computed(() => ['borrador','en_revision'].includes(item.value?.estado) && !item.value?.proyecto)
const canCreateProject = computed(() => item.value?.estado === 'aprobada' && !item.value?.proyecto && hasAccount.value)
const waitingForAccount = computed(() => item.value?.estado === 'aprobada' && !item.value?.proyecto && !hasAccount.value)
const flowSteps = computed(() => [
  {label:'Solicitud',done:item.value?.estado!=='borrador',active:item.value?.estado==='borrador'},
  {label:'Aprobación',done:['aprobada','convertida'].includes(item.value?.estado),active:item.value?.estado==='en_revision'},
  {label:'Acceso',done:hasAccount.value,active:waitingForAccount.value},
  {label:'Proyecto',done:Boolean(item.value?.proyecto),active:canCreateProject.value},
])

function normalize(response){ return response?.data?.data ?? response?.data ?? null }
function pretty(value){ return String(value || '').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase()) }
function money(value){ return value === null || value === undefined || value === '' ? 'A cotizar' : `${Number(value).toFixed(0)} Bs` }
function statusTone(value){ return ({borrador:'blue-grey',en_revision:'warning',aprobada:'positive',convertida:'positive',rechazada:'negative',cerrada:'grey'}[value] || 'primary') }

async function load(){
  loadError.value=''; loading.value=true
  try{
    item.value=normalize(await api.get(`/solicitudes/${Number(route.params.id)}`))
    if(!item.value?.id) throw new Error('El servidor no devolvió una solicitud válida.')
  }catch(error){ loadError.value=error?.response?.data?.message||error?.message||'No se pudo cargar la solicitud.' }
  finally{ loading.value=false }
}

async function openEdit(){
  if(!canEdit.value) return
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
    })
    editDialog.value=true
  }catch(error){
    $q.notify({type:'negative',message:error?.response?.data?.message||'No se pudieron cargar los datos para editar.'})
  }
}

function editClientChanged(){
  if(item.value?.estado!=='borrador') return
  if(!editCompanyOptions.value.some(row=>row.value===editForm.empresa_id)){
    editForm.empresa_id=editCompanyOptions.value.length===1?editCompanyOptions.value[0].value:null
  }
}

async function saveEdit(){
  if(!item.value?.id) return
  if(!editForm.cliente_id||!editForm.empresa_id||!String(editForm.titulo||'').trim()){
    $q.notify({type:'warning',message:'Completa responsable, empresa y título.'})
    return
  }
  editSaving.value=true
  try{
    const response=await api.put(`/solicitudes/${item.value.id}`,{
      ...editForm,
      estado:item.value.estado,
      plan_viti_id:item.value.plan_viti_id,
      forma_pago_preferida:item.value.forma_pago_preferida,
      frecuencia_suscripcion_preferida:item.value.frecuencia_suscripcion_preferida,
    })
    const updated=normalize(response)
    if(!updated?.id) throw new Error('El servidor no devolvió la solicitud actualizada.')
    editDialog.value=false
    await load()
    if(route.query.editar) await router.replace({path:route.path,query:{}})
    $q.notify({type:'positive',message:'Solicitud actualizada correctamente.'})
  }catch(error){
    $q.notify({type:'negative',message:error?.response?.data?.message||error?.message||'No se pudo actualizar la solicitud.'})
  }finally{editSaving.value=false}
}

function submitRequest(){
  if(!canSubmit.value) return
  const returning=item.value?.estado==='rechazada'
  $q.dialog({
    title:returning?'Volver a revisión':'Enviar a revisión',
    message:returning?'La solicitud volverá a la cola de revisión administrativa. ¿Continuar?':'La solicitud saldrá de borrador y sus respuestas quedarán congeladas para la revisión administrativa. ¿Continuar?',
    cancel:true,
    persistent:true,
  }).onOk(async()=>{
    submitLoading.value=true
    try{
      await api.post(`/solicitudes/${item.value.id}/enviar`)
      $q.notify({type:'positive',message:returning?'Solicitud devuelta a revisión.':'Solicitud enviada a revisión.'})
      await load()
    }catch(error){
      $q.notify({type:'negative',message:error?.response?.data?.message||'No se pudo enviar la solicitud a revisión.',timeout:5000})
    }finally{submitLoading.value=false}
  })
}

async function clearEditQuery(){
  if(route.query.editar) await router.replace({path:route.path,query:{}})
}

function approveRequest(){
  if(!canApprove.value) return
  $q.dialog({title:'Aprobar solicitud',message:'VITI aprobará la solicitud y preparará automáticamente el acceso del cliente. ¿Continuar?',cancel:true,persistent:true}).onOk(async()=>{
    actionLoading.value=true
    try{
      const response=await api.post(`/solicitudes/${item.value.id}/aprobar`)
      $q.notify({type:response?.data?.data?.acceso?.email_enviado||response?.data?.data?.acceso?.tiene_cuenta?'positive':'warning',message:response?.data?.message||'Solicitud aprobada.',timeout:5000})
      await load()
    }catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||'No se pudo aprobar la solicitud.'})}
    finally{actionLoading.value=false}
  })
}

function openReject(){rejectForm.motivo='';rejectDialog.value=true}
async function rejectRequest(){
  if(String(rejectForm.motivo).trim().length<5){$q.notify({type:'warning',message:'Escribe un motivo breve.'});return}
  actionLoading.value=true
  try{await api.post(`/solicitudes/${item.value.id}/rechazar`,{motivo:rejectForm.motivo.trim()});rejectDialog.value=false;$q.notify({type:'positive',message:'Solicitud rechazada.'});await load()}
  catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||'No se pudo rechazar la solicitud.'})}
  finally{actionLoading.value=false}
}

async function createInvitation(){
  inviteLoading.value=true
  try{const response=await api.post(`/solicitudes/${item.value.id}/invitacion`,{dias_vigencia:7});$q.notify({type:response?.data?.data?.email_enviado?'positive':'warning',message:response?.data?.message||'Invitación creada.'});await load()}
  catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||'No se pudo crear la invitación.'})}
  finally{inviteLoading.value=false}
}
async function resendInvitation(){
  inviteLoading.value=true
  try{const response=await api.post(`/solicitudes/${item.value.id}/invitacion/reenviar`);$q.notify({type:response?.data?.data?.email_enviado?'positive':'warning',message:response?.data?.message||'Invitación procesada.'});await load()}
  catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||'No se pudo reenviar.'})}
  finally{inviteLoading.value=false}
}
async function copyInvitation(){
  if(!access.value?.url) return
  try{await navigator.clipboard.writeText(access.value.url);$q.notify({type:'positive',message:'Enlace copiado.'})}
  catch{$q.dialog({title:'Enlace de acceso',message:access.value.url,ok:'Cerrar'})}
}

async function createProject(){
  if(!canCreateProject.value) return
  actionLoading.value=true
  try{
    const created=normalize(await api.post('/proyectos',{solicitud_id:item.value.id,empresa_id:item.value.empresa_id,cliente_id:item.value.cliente_id,nombre:item.value.titulo||'Proyecto VITI',descripcion:item.value.resumen||'',fase:'levantamiento',estado:'activo',progreso:0,fecha_inicio:new Date().toISOString().slice(0,10)}))
    if(!created?.id) throw new Error('No se recibió el proyecto creado.')
    $q.notify({type:'positive',message:'Proyecto iniciado.'})
    await router.push(`/proyectos/${created.id}`)
  }catch(error){$q.notify({type:'negative',message:error?.response?.data?.message||error?.message||'No se pudo iniciar el proyecto.'})}
  finally{actionLoading.value=false}
}

onMounted(async()=>{
  await load()
  if(route.query.editar==='1'&&canEdit.value) await openEdit()
})
</script>

<template>
  <div class="viti-page review-page">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="loadError" rounded class="error-banner"><template #avatar><q-icon name="error_outline"/></template>{{ loadError }}<template #action><q-btn flat label="Volver" to="/solicitudes"/></template></q-banner>

    <template v-if="item">
      <PageHeader eyebrow="Solicitud" :title="item.titulo || 'Solicitud VITI'" :subtitle="`${item.codigo} · recibida ${formatDateTime(item.created_at)}`">
        <div class="header-actions">
          <q-badge outline :color="statusTone(item.estado)" class="status-badge">{{ pretty(item.estado) }}</q-badge>
          <q-btn v-if="canEdit" outline color="primary" icon="edit" label="Editar" no-caps @click="openEdit"/>
        </div>
      </PageHeader>

      <div class="flow-strip q-mb-lg">
        <div v-for="(flow,index) in flowSteps" :key="flow.label" class="flow-item" :class="{done:flow.done,active:flow.active}">
          <span>{{ flow.done ? '✓' : index+1 }}</span><b>{{ flow.label }}</b>
        </div>
      </div>

      <section class="review-grid q-mb-lg">
        <article class="summary-card need-card">
          <small>LO QUE NECESITA</small>
          <h2>{{ item.titulo }}</h2>
          <p>{{ item.resumen || 'Sin descripción adicional.' }}</p>
          <div class="company-line"><q-icon name="business"/> {{ item.empresa?.nombre_comercial || 'Sin negocio' }}<span v-if="item.empresa?.actividad">· {{ item.empresa.actividad }}</span></div>
        </article>

        <article class="summary-card">
          <small>CONTACTO</small>
          <h3>{{ item.cliente?.nombre || 'Sin nombre' }}</h3>
          <p class="compact">{{ item.cliente?.telefono || 'Sin teléfono' }}</p>
          <p class="compact">{{ item.cliente?.correo || 'Sin correo' }}</p>
          <p class="compact">{{ item.cliente?.ciudad || 'Sin ciudad' }}</p>
        </article>

        <article class="summary-card">
          <small>PLAN ELEGIDO</small>
          <h3>{{ plan?.nombre || 'Sin plan' }}</h3>
          <div class="price-row"><span>Implementación</span><b>{{ money(plan?.precio_proyecto) }}</b></div>
          <div class="price-row"><span>Servicio mensual</span><b>{{ money(plan?.precio_mensual) }}</b></div>
          <div class="price-row"><span>Servicio anual</span><b>{{ money(plan?.precio_anual) }}</b></div>
        </article>
      </section>

      <q-card flat class="next-card q-mb-lg">
        <q-card-section class="next-content">
          <template v-if="item.estado==='borrador'">
            <div class="next-copy"><small>SIGUIENTE PASO</small><h2>Completa la solicitud y envíala a revisión.</h2><p>Puedes corregir los datos generales mientras siga en borrador. Al enviarla, VITI bloqueará las respuestas para que la decisión administrativa sea trazable.</p></div>
            <div class="next-actions"><q-btn outline color="primary" no-caps label="Editar solicitud" icon="edit" @click="openEdit"/><q-btn color="primary" unelevated no-caps label="Enviar a revisión" icon-right="arrow_forward" :loading="submitLoading" :disable="!canSubmit" @click="submitRequest"/></div>
          </template>

          <template v-else-if="item.estado==='en_revision'">
            <div class="next-copy"><small>DECISIÓN ADMINISTRATIVA</small><h2>¿El proyecto es viable para continuar?</h2><p>Si apruebas, VITI prepara el acceso del cliente. Si no corresponde continuar, registra el motivo del rechazo para mantener la trazabilidad.</p><div v-if="!approvalReady" class="warning-line"><q-icon name="warning_amber"/> Faltan datos obligatorios para aprobar. Revisa empresa, responsable, correo, plan, declaración y acuerdo comercial.</div></div>
            <div class="next-actions"><q-btn outline color="negative" no-caps label="Rechazar solicitud" icon="close" :disable="!canReject" @click="openReject"/><q-btn color="primary" unelevated no-caps label="Aprobar solicitud" icon="check_circle" :loading="actionLoading" :disable="!canApprove" @click="approveRequest"/></div>
          </template>

          <template v-else-if="item.estado==='rechazada'">
            <div class="next-copy"><small>CORRECCIÓN</small><h2>La solicitud fue rechazada.</h2><p>Puedes corregir sus datos generales y devolverla a revisión cuando esté lista.</p></div>
            <div class="next-actions"><q-btn outline color="primary" no-caps label="Editar solicitud" icon="edit" @click="openEdit"/><q-btn color="primary" unelevated no-caps label="Volver a revisión" icon-right="arrow_forward" :loading="submitLoading" :disable="!canSubmit" @click="submitRequest"/></div>
          </template>

          <template v-else-if="waitingForAccount">
            <div class="next-copy"><small>ACCESO DEL CLIENTE</small><h2>Solicitud aprobada. Falta que el cliente cree su cuenta.</h2><p v-if="access.url">El enlace ya está preparado para {{ item.cliente?.correo }}. Puedes copiarlo o reenviarlo.</p><p v-else>Genera el enlace de acceso para continuar.</p><div v-if="access.expira_at" class="access-expiry">Vigente hasta {{ formatDateTime(access.expira_at) }}</div></div>
            <div class="next-actions"><q-btn v-if="access.url" outline color="orange" no-caps icon="content_copy" label="Copiar enlace" @click="copyInvitation"/><q-btn v-if="access.url" flat no-caps icon="forward_to_inbox" label="Reenviar" :loading="inviteLoading" @click="resendInvitation"/><q-btn v-else color="primary" unelevated no-caps icon="person_add" label="Crear acceso" :loading="inviteLoading" @click="createInvitation"/></div>
          </template>

          <template v-else-if="canCreateProject">
            <div class="next-copy"><small>CLIENTE LISTO</small><h2>El acceso ya está creado. Puedes iniciar el proyecto.</h2><p>El proyecto quedará vinculado a esta misma solicitud, empresa y cliente.</p></div>
            <div class="next-actions"><q-btn color="primary" unelevated no-caps icon="rocket_launch" label="Crear proyecto ahora" :loading="actionLoading" @click="createProject"/></div>
          </template>

          <template v-else-if="item.proyecto?.id">
            <div class="next-copy"><small>PROYECTO ACTIVO</small><h2>Esta solicitud ya se convirtió en proyecto.</h2><p>Continúa el seguimiento desde el proyecto; no necesitas volver a editar la solicitud.</p></div>
            <div class="next-actions"><q-btn outline color="orange" no-caps icon="open_in_new" label="Abrir proyecto" :to="`/proyectos/${item.proyecto.id}`"/></div>
          </template>

          <template v-else>
            <div class="next-copy"><small>ESTADO</small><h2>{{ pretty(item.estado) }}</h2><p>La solicitud queda registrada en el historial.</p></div>
          </template>
        </q-card-section>
      </q-card>

      <q-expansion-item class="details-panel" icon="tune" label="Detalles internos" caption="Información administrativa y datos de levantamiento" expand-separator>
        <q-card flat class="details-card">
          <q-card-section class="details-grid">
            <div><small>Prioridad</small><b>{{ pretty(item.prioridad || 'normal') }}</b></div>
            <div><small>Forma de pago</small><b>{{ pretty(item.forma_pago_preferida || 'por_definir') }}</b></div>
            <div><small>Suscripción preferida</small><b>{{ pretty(item.frecuencia_suscripcion_preferida || 'por_definir') }}</b></div>
            <div><small>Respuestas internas</small><b>{{ answers.length }}</b></div>
          </q-card-section>
          <q-separator/>
          <q-list v-if="answers.length" separator>
            <q-item v-for="response in answers" :key="response.id"><q-item-section><q-item-label caption>Pregunta {{ response.pregunta?.numero || response.pregunta_id }}</q-item-label><q-item-label>{{ response.pregunta?.enunciado || 'Dato de levantamiento' }}</q-item-label><q-item-label caption class="answer-value">{{ Array.isArray(response.respuesta_json) ? response.respuesta_json.join(', ') : (response.respuesta_texto || 'Sin respuesta') }}</q-item-label></q-item-section></q-item>
          </q-list>
        </q-card>
      </q-expansion-item>
    </template>

    <q-dialog v-model="editDialog" @hide="clearEditQuery">
      <q-card class="edit-card">
        <q-card-section>
          <div class="text-overline text-primary">EDITAR SOLICITUD</div>
          <div class="text-h6 text-weight-bold">Actualizar datos generales</div>
          <div class="text-caption text-grey-6">El estado no se cambia manualmente: VITI lo actualiza mediante Enviar, Aprobar o Rechazar.</div>
        </q-card-section>
        <q-separator/>
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12"><q-select v-model="editForm.cliente_id" outlined emit-value map-options :options="clients.map(row=>({label:`${row.nombre} · ${row.telefono||'Sin teléfono'}`,value:row.id}))" label="Responsable *" :disable="item.estado!=='borrador'" @update:model-value="editClientChanged"/></div>
            <div class="col-12"><q-select v-model="editForm.empresa_id" outlined emit-value map-options :options="editCompanyOptions" label="Empresa *" :disable="item.estado!=='borrador'||!editForm.cliente_id"/></div>
            <div class="col-12"><q-input v-model="editForm.titulo" outlined label="Título de la solicitud *"/></div>
            <div class="col-12"><q-input v-model="editForm.resumen" outlined type="textarea" autogrow label="Resumen"/></div>
            <div class="col-12 col-sm-4"><q-select v-model="editForm.prioridad" outlined :options="['baja','normal','alta','urgente']" label="Prioridad"/></div>
            <div class="col-12 col-sm-4"><q-input v-model="editForm.fecha_limite_deseada" outlined type="date" stack-label label="Fecha deseada"/></div>
            <div class="col-12 col-sm-4"><q-input v-model.number="editForm.presupuesto_estimado" outlined type="number" prefix="Bs" label="Presupuesto"/></div>
          </div>
        </q-card-section>
        <q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Guardar cambios" :loading="editSaving" @click="saveEdit"/></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="rejectDialog"><q-card class="reject-card"><q-card-section><div class="text-overline text-negative">RECHAZAR SOLICITUD</div><div class="text-h6 text-weight-bold">Registra un motivo breve</div><div class="text-caption text-grey-6">Quedará en el historial para referencia interna.</div></q-card-section><q-card-section><q-input v-model="rejectForm.motivo" outlined type="textarea" autogrow label="Motivo *"/></q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn outline color="negative" no-caps label="Confirmar" :loading="actionLoading" @click="rejectRequest"/></q-card-actions></q-card></q-dialog>
  </div>
</template>

<style scoped>
.review-page{max-width:1240px;padding-top:32px;padding-bottom:52px}.header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.status-badge{font-size:12px;padding:7px 11px;border-radius:999px}.flow-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.flow-item{display:flex;align-items:center;gap:9px;color:#70869b;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.018);border:1px solid rgba(71,105,137,.22)}.flow-item span{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#07192a;border:1px solid #294761;font-size:11px}.flow-item b{font-size:12px}.flow-item.done{color:#9bd8b9}.flow-item.done span{border-color:rgba(54,201,128,.45);color:#62d799}.flow-item.active{border-color:rgba(242,139,48,.38);color:#ffd0a4}.flow-item.active span{border-color:#f28b30;color:#f7a85e}.review-grid{display:grid;grid-template-columns:1.5fr .75fr .85fr;gap:14px}.summary-card{padding:22px;border-radius:18px;background:linear-gradient(180deg,#0c2138,#0a1c31);border:1px solid rgba(65,100,134,.3)}.summary-card small,.next-copy>small{font-size:10px;font-weight:900;letter-spacing:.13em;color:#f28b30}.summary-card h2{font-size:28px;line-height:1.15;margin:8px 0;color:#f3f7fb}.summary-card h3{font-size:19px;margin:8px 0 13px}.summary-card p{color:#a3b4c4;line-height:1.55;margin:0}.summary-card p.compact{font-size:13px;margin:4px 0}.company-line{margin-top:17px;padding-top:15px;border-top:1px solid rgba(78,110,141,.2);color:#c7d4df;font-size:13px}.company-line .q-icon{color:#f28b30;margin-right:5px}.company-line span{color:#8198ac;margin-left:5px}.price-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(78,110,141,.14);font-size:12px;color:#94a8ba}.price-row:last-child{border-bottom:0}.price-row b{color:#e8eff6}.next-card{background:linear-gradient(135deg,#0d2239,#102c4a)!important;border:1px solid rgba(242,139,48,.22);border-radius:20px;color:#edf4fb}.next-content{display:flex;align-items:center;justify-content:space-between;gap:28px;padding:25px}.next-copy{max-width:720px}.next-copy h2{font-size:24px;margin:6px 0}.next-copy p{color:#9fb1c1;margin:0;line-height:1.55}.next-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.next-actions :deep(.q-btn){min-height:44px;border-radius:12px}.warning-line{margin-top:11px;color:#f6bd7e;font-size:12px}.access-expiry{margin-top:10px;color:#7f96aa;font-size:11px}.details-panel{border:1px solid rgba(67,99,130,.24);border-radius:16px;background:rgba(7,25,42,.55);overflow:hidden;color:#c9d6e1}.details-card{background:#081a2c!important;color:#dce6ee}.details-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.details-grid>div{padding:11px;border:1px solid rgba(67,99,130,.22);border-radius:11px}.details-grid small,.details-grid b{display:block}.details-grid small{color:#738ba1;font-size:9px;text-transform:uppercase}.details-grid b{margin-top:4px;font-size:12px}.answer-value{white-space:pre-wrap;color:#92a8ba!important}.error-banner{background:rgba(193,0,21,.08);border:1px solid rgba(193,0,21,.2);color:#ff9ca8}.edit-card{width:760px;max-width:94vw;background:#0c1e32!important;color:#edf4fb;border:1px solid #294761;border-radius:18px!important}.reject-card{width:520px;max-width:94vw;background:#0c1e32!important;color:#edf4fb;border:1px solid #294761;border-radius:18px!important}
@media(max-width:980px){.review-grid{grid-template-columns:1fr 1fr}.need-card{grid-column:1/-1}.next-content{align-items:flex-start;flex-direction:column}.next-actions{justify-content:flex-start}.details-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.review-page{padding-top:18px}.flow-strip{grid-template-columns:1fr 1fr}.review-grid{grid-template-columns:1fr}.need-card{grid-column:auto}.details-grid{grid-template-columns:1fr}.next-actions{width:100%;display:grid;grid-template-columns:1fr}.next-actions .q-btn{width:100%}}
</style>
