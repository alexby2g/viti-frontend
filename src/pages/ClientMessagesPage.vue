<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'
import { useNotificationsStore } from '../stores/notifications'
import { flushClientQueue, pendingOfflineCount, queueClientAction } from '../utils/offlineQueue'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const route = useRoute()
const notifications = useNotificationsStore()
const rows = ref([])
const loading = ref(true)
const sending = ref(false)
const reply = ref('')
const pending = ref(pendingOfflineCount())
const fileInput = ref(null)
const attachment = ref(null)
const attachmentPreview = ref('')
const messagesBox = ref(null)
const support = ref({ puede_llamar:false, sesion_activa:null, solicitud_pendiente:null, proxima_sesion:null })
const presence = ref({ en_linea:false, escribiendo:false, usuario:null })
const requestDialog = ref(false)
const requestForm = ref({ modalidad:'video', motivo:'' })
const requestLoading = ref(false)
const mobileChatOpen = ref(false)
const editDialog = ref(false)
const editingMessage = ref(null)
const editText = ref('')
const editLoading = ref(false)
let pollTimer = null
let lastTypingAt = 0

const context = computed(() => route.meta.chatContext === 'electrofrio' ? 'electrofrio' : 'viti')
const isElectrofrio = computed(() => context.value === 'electrofrio')
const customerPortal = computed(() => route.meta.customerPortal === true)
const apiBase = computed(() => customerPortal.value ? '/portal/electrofrio/buzon' : '/mi/buzon')
const attentionBase = computed(() => customerPortal.value ? '/portal/electrofrio/atencion' : '/mi/atencion')
const cacheKey = computed(() => `viti-client-buzon-${context.value}-v4`)
const current = computed(() => rows.value[0] || null)
const isMobile = computed(() => $q.screen.lt.md)
const responsibleName = computed(() => {
  const user = current.value?.responsable
  return user ? `${user.nombre || ''} ${user.apellido || ''}`.trim() : (isElectrofrio.value ? 'Administración Electrofrío' : 'Equipo VITI')
})
const lastMessage = computed(() => current.value?.mensajes?.at(-1) || null)
const callsEnabled = computed(() => Boolean(support.value?.puede_llamar))
const activeModality = computed(() => support.value?.sesion_activa?.modalidad || null)
const pendingRequest = computed(() => support.value?.solicitud_pendiente || null)
const upcoming = computed(() => support.value?.proxima_sesion || null)
const showConversation = computed(() => !isMobile.value || mobileChatOpen.value)
const pageTitle = computed(() => isElectrofrio.value ? 'Mensajes Electrofrío' : 'Mi buzón')
const pageSubtitle = computed(() => isElectrofrio.value ? 'Canal exclusivo de tu aplicación Electrofrío.' : 'Mensajes y atención con VITI.')
const presenceText = computed(() => presence.value.escribiendo ? 'Escribiendo…' : (presence.value.en_linea ? 'En línea' : 'Desconectado'))

function requestId() { return globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,char=>{const value=Math.random()*16|0;return(char==='x'?value:(value&0x3|0x8)).toString(16)}) }
function saveCache() { try { localStorage.setItem(cacheKey.value, JSON.stringify(rows.value)) } catch {} }
function restoreCache() { try { const cached=JSON.parse(localStorage.getItem(cacheKey.value)||'[]');if(Array.isArray(cached))rows.value=cached } catch {} }
function queueChanged(event) { pending.value = Number(event?.detail?.count ?? pendingOfflineCount()) }
function networkFailure(error) { return !navigator.onLine || !error?.response }

async function scrollBottom() {
  await nextTick()
  const element = messagesBox.value?.$el || messagesBox.value
  if (element) element.scrollTop = element.scrollHeight
}

async function heartbeat(typing=false) {
  if(!current.value?.id||!navigator.onLine)return
  try{presence.value=(await api.post(`${apiBase.value}/${current.value.id}/presencia`,{escribiendo:typing})).data.data||presence.value}catch{/* no bloquea mensajes */}
}

async function loadCurrent(background=false) {
  if (!current.value?.id) return
  const previousLast=current.value.mensajes?.at(-1)?.id
  try {
    const { data } = await api.get(`${apiBase.value}/${current.value.id}`)
    rows.value = [data.data]
    saveCache()
    if(!background)await notifications.refresh()
    if(!background||previousLast!==data.data.mensajes?.at(-1)?.id)await scrollBottom()
  } catch (error) {
    if (!networkFailure(error)) throw error
  }
}

async function loadSupport() {
  if (!navigator.onLine) return
  try { support.value = (await api.get(`${attentionBase.value}/sesiones`)).data.data || support.value } catch { /* conserva estado */ }
}

async function load() {
  loading.value = true
  try {
    rows.value = (await api.get(apiBase.value)).data.data || []
    saveCache()
    await Promise.all([loadCurrent(),loadSupport(),heartbeat(false)])
  } catch (error) {
    if (networkFailure(error)) restoreCache()
    else throw error
  } finally {
    loading.value = false
    if (route.query.c) mobileChatOpen.value = true
    await scrollBottom()
  }
}

async function poll(){if(document.visibilityState!=='visible'||sending.value||!current.value?.id)return;try{await Promise.all([loadCurrent(true),loadSupport(),heartbeat(false)])}catch{/* conserva vista */}}
function openConversation() { mobileChatOpen.value = true; scrollBottom() }
function backToInbox() { mobileChatOpen.value = false }

function queueReply(message) {
  if (!current.value?.id) return
  const id=requestId()
  pending.value = queueClientAction({ type:'reply-message', base:apiBase.value, conversation_id:current.value.id, mensaje:message, client_request_id:id })
  current.value.mensajes = current.value.mensajes || []
  current.value.mensajes.push({ id:`offline-${id}`, client_request_id:id, mensaje:message, created_at:new Date().toISOString(), pendiente:true, estado_envio:'pendiente', usuario:{ rol:'cliente', nombre:'Tú' } })
  reply.value='';saveCache();scrollBottom()
  $q.notify({type:'warning',message:'Mensaje guardado. Se enviará automáticamente al volver Internet.'})
}

function chooseAttachment(){if(!sending.value)fileInput.value?.click()}
function onAttachment(event){const file=event.target?.files?.[0];if(!file)return;if(!file.type.startsWith('image/'))return $q.notify({type:'negative',message:'Selecciona una imagen o captura de pantalla.'});if(file.size>8*1024*1024)return $q.notify({type:'negative',message:'La imagen no puede superar 8 MB.'});clearAttachment();attachment.value=file;attachmentPreview.value=URL.createObjectURL(file)}
function clearAttachment(){if(attachmentPreview.value)URL.revokeObjectURL(attachmentPreview.value);attachmentPreview.value='';attachment.value=null;if(fileInput.value)fileInput.value.value=''}

async function send(){
  if(!current.value||sending.value)return
  const message=reply.value.trim()
  if(!message&&!attachment.value)return
  if(!navigator.onLine){if(attachment.value)return $q.notify({type:'warning',message:'Conéctate a Internet para enviar una fotografía. El texto sí puede quedar pendiente.'});return queueReply(message)}
  sending.value=true
  try{
    const payload=new FormData();if(message)payload.append('mensaje',message);if(attachment.value)payload.append('archivo',attachment.value);payload.append('client_request_id',requestId())
    await api.post(`${apiBase.value}/${current.value.id}/mensajes`,payload,{headers:{'Content-Type':'multipart/form-data'}})
    reply.value='';clearAttachment();await loadCurrent()
  }catch(error){if(networkFailure(error)&&!attachment.value)return queueReply(message);$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo enviar el mensaje.'})}
  finally{sending.value=false}
}

function startSession(){
  if(!current.value?.id)return
  if(!navigator.onLine)return $q.notify({type:'warning',message:'Necesitas Internet para realizar llamadas.'})
  if(!callsEnabled.value){requestDialog.value=true;requestForm.value.modalidad=pendingRequest.value?.modalidad||'video';return}
  const type=activeModality.value==='audio'?'audio':'video'
  window.dispatchEvent(new CustomEvent('viti-start-call',{detail:{conversationId:current.value.id,type}}))
}

async function requestAttention(){
  if(!requestForm.value.motivo.trim())return $q.notify({type:'warning',message:'Cuéntanos brevemente qué necesitas revisar.'})
  requestLoading.value=true
  try{await api.post(`${attentionBase.value}/solicitudes`,{modalidad:requestForm.value.modalidad,motivo:requestForm.value.motivo.trim()});requestDialog.value=false;requestForm.value={modalidad:'video',motivo:''};await loadSupport();$q.notify({type:'positive',message:'Solicitud enviada para revisión.'})}
  catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo enviar la solicitud.'})}finally{requestLoading.value=false}
}

async function cancelRequest(){const item=pendingRequest.value||upcoming.value;if(!item?.id)return;try{await api.post(`${attentionBase.value}/sesiones/${item.id}/cancelar`);await loadSupport();$q.notify({type:'info',message:'Solicitud de atención cancelada.'})}catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo cancelar la solicitud.'})}}
function modalityLabel(value){return value==='audio'?'Llamada de voz':value==='pantalla'?'Asistencia con pantalla':'Videollamada'}

function openEdit(message){if(!navigator.onLine)return $q.notify({type:'warning',message:'Conéctate a Internet para editar el mensaje.'});editingMessage.value=message;editText.value=message.mensaje||'';editDialog.value=true}
async function saveEdit(){if(!editingMessage.value||editLoading.value)return;editLoading.value=true;try{await api.put(`${apiBase.value}/${current.value.id}/mensajes/${editingMessage.value.id}`,{mensaje:editText.value});editDialog.value=false;await loadCurrent();$q.notify({type:'positive',message:'Mensaje editado.'})}catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo editar el mensaje.'})}finally{editLoading.value=false}}
function removeMessage(message){if(!navigator.onLine)return $q.notify({type:'warning',message:'Conéctate a Internet para eliminar el mensaje.'});$q.dialog({title:'Eliminar mensaje',message:'El mensaje quedará marcado como eliminado para ambas personas.',cancel:true,persistent:true,ok:{label:'Eliminar',color:'negative'}}).onOk(async()=>{try{await api.delete(`${apiBase.value}/${current.value.id}/mensajes/${message.id}`);await loadCurrent()}catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo eliminar el mensaje.'})}})}
function statusIcon(message){return message.estado_envio==='enviado'?'done':'done_all'}
function statusColor(message){return message.estado_envio==='visto'?'light-blue-2':'white'}

async function flushPending(){if(!navigator.onLine||!pending.value)return;const result=await flushClientQueue(api);pending.value=result.pending;if(result.sent){$q.notify({type:'positive',message:`${result.sent} acción(es) pendiente(s) fueron sincronizadas.`});await load()}}

watch(reply,value=>{if(!value.trim()||!current.value?.id)return;const now=Date.now();if(now-lastTypingAt>1500){lastTypingAt=now;heartbeat(true)}})
onMounted(async()=>{window.addEventListener('online',flushPending);window.addEventListener('viti-offline-queue-changed',queueChanged);await load();await flushPending();pollTimer=window.setInterval(poll,4000)})
onBeforeUnmount(()=>{window.removeEventListener('online',flushPending);window.removeEventListener('viti-offline-queue-changed',queueChanged);if(pollTimer)window.clearInterval(pollTimer);heartbeat(false);clearAttachment()})
</script>

<template>
  <q-page class="viti-page client-chat-page">
    <PageHeader v-if="!isMobile||!mobileChatOpen" :eyebrow="isElectrofrio?'Electrofrío':'Atención'" :title="pageTitle" :subtitle="pageSubtitle"/>

    <div v-if="isMobile&&!mobileChatOpen" class="mobile-inbox">
      <div class="inbox-title">Chats</div>
      <q-card v-if="current" flat class="viti-card inbox-item" @click="openConversation"><q-card-section class="row items-center no-wrap"><q-avatar size="52px" color="primary" text-color="white" class="q-mr-md"><img v-if="current.responsable?.foto_url" :src="current.responsable.foto_url"/><q-icon v-else name="support_agent"/></q-avatar><div class="col min-width-0"><div class="text-weight-bold ellipsis">{{responsibleName}}</div><div class="text-caption text-grey-6 ellipsis">{{lastMessage?.eliminado?'Mensaje eliminado':(lastMessage?.mensaje||(lastMessage?.archivo_url?'📷 Imagen adjunta':'Sin mensajes'))}}</div><div class="text-caption text-grey-5">{{lastMessage?.created_at?formatDateTime(lastMessage.created_at):'Sin mensajes todavía'}}</div></div><q-icon name="chevron_right" size="26px" color="grey-6"/></q-card-section></q-card>
      <div v-else-if="!loading" class="empty-state">Aún no hay conversaciones.</div>
    </div>

    <div v-if="showConversation" class="conversation-shell">
      <q-banner v-if="pending" rounded class="bg-orange-1 text-orange-10 q-mb-md"><template #avatar><q-icon name="cloud_off"/></template>Tienes {{pending}} mensaje(s) pendiente(s). Se enviarán cuando vuelva Internet.</q-banner>
      <q-banner v-if="pendingRequest" rounded class="bg-blue-1 text-primary q-mb-md"><template #avatar><q-icon name="schedule_send"/></template><div class="text-weight-bold">Solicitud de atención pendiente</div><div class="text-caption">{{modalityLabel(pendingRequest.modalidad)}} · debe aprobarse antes de habilitar la sesión.</div><template #action><q-btn flat no-caps label="Cancelar" @click="cancelRequest"/></template></q-banner>
      <q-banner v-else-if="upcoming" rounded class="bg-purple-1 text-purple-10 q-mb-md"><template #avatar><q-icon name="event_available"/></template><div class="text-weight-bold">Atención programada</div><div class="text-caption">{{modalityLabel(upcoming.modalidad)}} · {{formatDateTime(upcoming.programada_para)}}.</div></q-banner>
      <q-banner v-else-if="callsEnabled" rounded class="bg-green-1 text-positive q-mb-md"><template #avatar><q-icon name="verified"/></template><div class="text-weight-bold">Sesión de atención habilitada</div><div class="text-caption">Puedes iniciar {{modalityLabel(activeModality)}} durante la ventana autorizada.</div></q-banner>

      <q-card v-if="current" flat class="viti-card messenger-card">
        <q-card-section class="row items-center no-wrap chat-header"><q-btn v-if="isMobile" round flat icon="arrow_back" color="primary" class="q-mr-xs" @click="backToInbox"/><q-avatar size="48px" color="primary" text-color="white" class="q-mr-sm"><img v-if="current.responsable?.foto_url" :src="current.responsable.foto_url"/><q-icon v-else name="support_agent"/></q-avatar><div class="col min-width-0"><div class="text-subtitle1 text-weight-bold ellipsis">{{responsibleName}}</div><div class="text-caption ellipsis" :class="presence.escribiendo||presence.en_linea?'text-positive':'text-grey-6'">{{presenceText}} · {{isElectrofrio?'Electrofrío':'Atención VITI'}}</div></div><q-btn round flat color="primary" :icon="callsEnabled?'video_call':'event'" @click="startSession"><q-tooltip>{{callsEnabled?'Iniciar sesión habilitada':'Agendar llamada o videollamada'}}</q-tooltip></q-btn></q-card-section>

        <q-separator/>
        <q-card-section ref="messagesBox" class="messages messenger-bg">
          <div v-if="!current.mensajes?.length" class="empty-state q-my-xl">Aún no hay mensajes. Escribe para iniciar la conversación.</div>
          <div v-for="message in current.mensajes" :key="message.id" class="message-row" :class="message.es_mio||message.pendiente?'mine':'team'">
            <q-avatar v-if="!message.es_mio&&!message.pendiente" size="28px" color="primary" text-color="white" class="message-avatar"><img v-if="current.responsable?.foto_url" :src="current.responsable.foto_url"/><q-icon v-else name="support_agent" size="17px"/></q-avatar>
            <div class="bubble" :class="[{pending:message.pendiente},message.es_mio||message.pendiente?'bubble-mine':'bubble-team']">
              <q-btn v-if="message.puede_editar||message.puede_eliminar" flat round dense size="sm" icon="more_vert" class="message-actions"><q-menu><q-list dense style="min-width:150px"><q-item v-if="message.puede_editar" clickable v-close-popup @click="openEdit(message)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar</q-item-section></q-item><q-item v-if="message.puede_eliminar" clickable v-close-popup class="text-negative" @click="removeMessage(message)"><q-item-section avatar><q-icon name="delete"/></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn>
              <div v-if="message.eliminado" class="deleted-message"><q-icon name="block"/> Mensaje eliminado</div>
              <template v-else><div v-if="message.archivo_url" class="attachment-wrap"><a :href="message.archivo_url" target="_blank" rel="noopener"><img :src="message.archivo_url" :alt="message.archivo_nombre||'Imagen adjunta'" class="chat-image"/></a></div><div v-if="message.mensaje" class="message-text">{{message.mensaje}}</div></template>
              <div class="message-meta"><span v-if="message.editado_at">editado · </span>{{message.pendiente?'Pendiente':formatDateTime(message.created_at)}}<q-icon v-if="message.es_mio&&!message.pendiente&&!message.eliminado" :name="statusIcon(message)" size="15px" :color="statusColor(message)" class="q-ml-xs"><q-tooltip>{{message.estado_envio}}</q-tooltip></q-icon></div>
            </div>
          </div>
          <div v-if="presence.escribiendo" class="typing-bubble">Escribiendo<span>.</span><span>.</span><span>.</span></div>
        </q-card-section>

        <div v-if="attachmentPreview" class="attachment-preview q-px-md q-pt-sm"><img :src="attachmentPreview" alt="Vista previa"/><div class="col"><div class="text-weight-medium">{{attachment?.name}}</div><div class="text-caption text-grey-6">Se enviará solo a esta conversación.</div></div><q-btn flat round icon="close" :disable="sending" @click="clearAttachment"/></div>
        <q-separator/>
        <q-card-section class="composer"><input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onAttachment"/><q-btn round flat color="primary" icon="add_photo_alternate" class="composer-action" :disable="sending" @click="chooseAttachment"><q-tooltip>Enviar foto o captura</q-tooltip></q-btn><q-input v-model="reply" class="message-input" rounded outlined autogrow placeholder="Escribe un mensaje..." :disable="sending" @keyup.ctrl.enter="send"/><q-btn color="primary" unelevated round icon="send" class="composer-action send-action" :loading="sending" :disable="(!reply.trim()&&!attachment)||sending" @click="send"><q-tooltip>Enviar</q-tooltip></q-btn></q-card-section>
      </q-card>
    </div>

    <q-dialog v-model="requestDialog"><q-card style="width:520px;max-width:94vw" class="viti-card"><q-card-section><div class="text-overline text-primary">Sesión de atención</div><div class="text-h6 text-weight-bold">Agendar llamada o videollamada</div><div class="text-caption text-grey-6">Un solo formulario controla la modalidad y la cita.</div></q-card-section><q-card-section class="q-gutter-md"><q-option-group v-model="requestForm.modalidad" type="radio" color="primary" :options="[{label:'Llamada de voz',value:'audio'},{label:'Videollamada',value:'video'},{label:'Asistencia con pantalla',value:'pantalla'}]"/><q-input v-model="requestForm.motivo" type="textarea" outlined autogrow label="¿Qué necesitas revisar?"/></q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Enviar solicitud" :loading="requestLoading" @click="requestAttention"/></q-card-actions></q-card></q-dialog>
    <q-dialog v-model="editDialog"><q-card style="width:520px;max-width:94vw"><q-card-section><div class="text-h6 text-weight-bold">Editar mensaje</div><div class="text-caption text-grey-6">Disponible durante 15 minutos después del envío.</div></q-card-section><q-card-section><q-input v-model="editText" outlined type="textarea" autogrow autofocus maxlength="5000"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Guardar" :loading="editLoading" :disable="!editText.trim()&&!editingMessage?.archivo_path" @click="saveEdit"/></q-card-actions></q-card></q-dialog>
    <q-inner-loading :showing="loading"/>
  </q-page>
</template>

<style scoped>
.client-chat-page{max-width:1100px}.min-width-0{min-width:0}.mobile-inbox{display:flex;flex-direction:column;gap:10px}.inbox-title{font-size:26px;font-weight:800;margin-bottom:4px}.inbox-item{cursor:pointer;border-radius:18px}.messenger-card{overflow:hidden;display:flex;flex-direction:column}.chat-header{min-height:72px}.messages{display:flex;flex-direction:column;gap:6px;height:min(60vh,650px);min-height:430px;overflow:auto;padding:18px}.messenger-bg{background:linear-gradient(180deg,rgba(127,127,127,.035),rgba(127,127,127,.015))}.message-row{display:flex;align-items:flex-end;gap:7px}.message-row.mine{justify-content:flex-end}.message-row.team{justify-content:flex-start}.message-avatar{flex:0 0 auto;margin-bottom:3px}.bubble{position:relative;max-width:min(78%,620px);padding:9px 12px;border-radius:18px;box-shadow:0 1px 2px rgba(0,0,0,.07)}.bubble-mine{background:#1976d2;color:white;border-bottom-right-radius:5px}.bubble-team{background:var(--viti-card);color:var(--viti-text);border:1px solid var(--viti-border);border-bottom-left-radius:5px}.bubble.pending{opacity:.72;border:1px dashed currentColor}.message-actions{position:absolute;top:1px;right:1px;opacity:0}.bubble:hover .message-actions,.message-actions:focus{opacity:.8}.message-text{white-space:pre-wrap;overflow-wrap:anywhere;padding-right:16px}.message-meta{font-size:10.5px;opacity:.74;text-align:right;margin-top:4px;display:flex;justify-content:flex-end;align-items:center}.deleted-message{font-style:italic;opacity:.72;padding-right:18px}.attachment-wrap{margin:-5px -8px 7px}.chat-image{display:block;max-width:100%;max-height:360px;border-radius:14px;object-fit:cover}.attachment-preview{display:flex;align-items:center;gap:12px}.attachment-preview img{width:64px;height:64px;border-radius:12px;object-fit:cover}.composer{display:grid;grid-template-columns:48px minmax(0,1fr) 48px;gap:8px;align-items:end;padding:10px 14px}.composer-action{width:48px;height:48px;min-width:48px;flex:none}.send-action{box-shadow:0 5px 14px rgba(25,118,210,.25)}.message-input :deep(.q-field__control){min-height:48px}.typing-bubble{align-self:flex-start;padding:8px 14px;border-radius:16px;background:var(--viti-card);border:1px solid var(--viti-border);font-size:12px;color:var(--viti-muted)}.typing-bubble span{animation:pulse 1.2s infinite}.typing-bubble span:nth-child(2){animation-delay:.2s}.typing-bubble span:nth-child(3){animation-delay:.4s}@keyframes pulse{0%,60%,100%{opacity:.25}30%{opacity:1}}
@media(max-width:1023px){.client-chat-page{padding:0!important;max-width:none}.conversation-shell{height:calc(100dvh - 58px);display:flex;flex-direction:column}.conversation-shell>.messenger-card{flex:1;display:flex;flex-direction:column;border-radius:0!important;border-left:0;border-right:0}.messages{flex:1;height:auto;min-height:0;padding:12px}.chat-header{position:sticky;top:0;z-index:4;padding:8px}.composer{position:sticky;bottom:0;z-index:5;padding:8px 10px max(8px,env(safe-area-inset-bottom))}.bubble{max-width:86%}.message-actions{opacity:.65}.mobile-inbox{padding:16px 12px}.inbox-title{font-size:24px}}
</style>
