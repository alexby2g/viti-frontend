<script setup>
import { mediaUrl } from '../utils/media.js'
import { CHAT_FILE_ACCEPT, CHAT_FILE_MAX_BYTES, attachmentPreviewLabel, chatFileIcon, formatFileSize, isAllowedChatFile, isImageFile, isImageMessage } from '../utils/chatFiles.js'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useNotificationsStore } from '../stores/notifications'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const notifications = useNotificationsStore()
const canManage = inject('electrofrioCanManage', computed(() => true))
const rows = ref([])
const selected = ref(null)
const mobileChatOpen = ref(false)
const reply = ref('')
const loading = ref(true)
const sending = ref(false)
const sessions = ref([])
const fileInput = ref(null)
const attachment = ref(null)
const attachmentPreview = ref('')
const messagesBox = ref(null)
const presence = ref({ en_linea:false, escribiendo:false, usuario:null })
const scheduleDialog = ref(false)
const scheduleLoading = ref(false)
const scheduleMode = ref('new')
const scheduleForm = ref({ modalidad:'video', programada_para:'', duracion_minutos:30, motivo:'', nota_admin:'' })
const editDialog = ref(false)
const editingMessage = ref(null)
const editText = ref('')
const editLoading = ref(false)
let pollTimer = null
let lastTypingAt = 0

const context = computed(() => route.meta.chatContext === 'electrofrio' ? 'electrofrio' : 'viti')
const isElectrofrio = computed(() => context.value === 'electrofrio')
const businessMode = computed(() => isElectrofrio.value && route.path.startsWith('/mi-apps/'))
const apiBase = computed(() => isElectrofrio.value ? (businessMode.value?'/mi/apps/electrofrio/buzon':'/apps/electrofrio/buzon') : '/buzon')
const attentionBase = computed(() => isElectrofrio.value ? (businessMode.value?'/mi/apps/electrofrio/atencion':'/apps/electrofrio/atencion') : '/atencion')
const inboxTitle = computed(() => isElectrofrio.value ? 'Mensajes Electrofrío' : 'Atención VITI')
const inboxSubtitle = computed(() => isElectrofrio.value ? 'Conversaciones independientes de la aplicación Electrofrío.' : 'Conversaciones y atención de la plataforma VITI.')
const isMobile = computed(() => $q.screen.lt.md)
const current = computed(() => rows.value.find(item => item.id === selected.value) || null)
const currentContact = computed(() => current.value?.contacto || current.value?.electrofrio_cliente || current.value?.cliente || null)
const pendingSession = computed(() => sessions.value.find(session => session.estado === 'solicitada') || null)
const activeSession = computed(() => sessions.value.find(session => {
  if (session.estado !== 'aprobada' || !session.habilitada_desde || !session.habilitada_hasta) return false
  const now = Date.now()
  return new Date(session.habilitada_desde).getTime() <= now && new Date(session.habilitada_hasta).getTime() >= now
}) || null)
const upcomingSession = computed(() => sessions.value.find(session => session.estado === 'aprobada' && session.habilitada_desde && new Date(session.habilitada_desde).getTime() > Date.now()) || null)
const callsEnabled = computed(() => Boolean(activeSession.value))
const showContacts = computed(() => !isMobile.value || !mobileChatOpen.value)
const showChat = computed(() => !isMobile.value || mobileChatOpen.value)
const presenceText = computed(() => presence.value.escribiendo ? 'Escribiendo…' : (presence.value.en_linea ? 'En línea' : 'Desconectado'))

function requestId() {
  return globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.random() * 16 | 0
    return (char === 'x' ? value : (value & 0x3 | 0x8)).toString(16)
  })
}

async function scrollBottom() {
  await nextTick()
  const element = messagesBox.value?.$el || messagesBox.value
  if (element) element.scrollTop = element.scrollHeight
}

async function loadSessions() {
  if (!selected.value) { sessions.value = []; return }
  try { sessions.value = (await api.get(`${attentionBase.value}/sesiones`, { params:{ conversacion_id:selected.value } })).data.data || [] }
  catch { sessions.value = [] }
}

async function heartbeat(typing = false) {
  if (!selected.value || !navigator.onLine) return
  try { presence.value = (await api.post(`${apiBase.value}/${selected.value}/presencia`, { escribiendo:typing })).data.data || presence.value }
  catch { /* la presencia no bloquea el chat */ }
}

async function loadCurrent(background = false) {
  if (!selected.value) return
  const previousLast = current.value?.mensajes?.at(-1)?.id
  const { data } = await api.get(`${apiBase.value}/${selected.value}`)
  const detail = data.data
  const index = rows.value.findIndex(item => item.id === selected.value)
  if (index >= 0) rows.value[index] = { ...rows.value[index], ...detail, no_leidos:0 }
  if (!background) await notifications.refresh()
  await loadSessions()
  if (!background || previousLast !== detail.mensajes?.at(-1)?.id) await scrollBottom()
}

async function load() {
  loading.value = true
  try {
    rows.value = (await api.get(apiBase.value, { params:{ per_page:100 } })).data.data || []
    const requested = Number(route.query.c || 0)
    if (requested && rows.value.some(item => item.id === requested)) { selected.value=requested; mobileChatOpen.value=true }
    else if (!isMobile.value && !selected.value && rows.value[0]) selected.value=rows.value[0].id
    else if (selected.value && !rows.value.some(item => item.id === selected.value)) selected.value = isMobile.value ? null : rows.value[0]?.id || null
    if (selected.value) await Promise.all([loadCurrent(), heartbeat(false)])
  } finally { loading.value=false }
}

async function poll() {
  if (document.visibilityState !== 'visible' || !selected.value || sending.value) return
  try { await Promise.all([loadCurrent(true), heartbeat(false)]) } catch { /* conserva la conversación visible */ }
}

async function choose(id) {
  selected.value=id
  mobileChatOpen.value=true
  presence.value={en_linea:false,escribiendo:false,usuario:null}
  await router.replace({ query:{ ...route.query, c:id } })
  await Promise.all([loadCurrent(), heartbeat(false)])
}

async function backToChats() {
  mobileChatOpen.value=false
  await router.replace({ query:{} })
}

function chooseAttachment(){ if(!sending.value) fileInput.value?.click() }
function onAttachment(event){
  const file=event.target?.files?.[0]
  if(!file)return
  if(!isAllowedChatFile(file))return $q.notify({type:'negative',message:'Puedes adjuntar imágenes, PDF, Word, Excel o TXT.'})
  if(file.size>CHAT_FILE_MAX_BYTES)return $q.notify({type:'negative',message:'El archivo no puede superar 10 MB.'})
  clearAttachment()
  attachment.value=file
  if(isImageFile(file))attachmentPreview.value=URL.createObjectURL(file)
}
function clearAttachment(){ if(attachmentPreview.value)URL.revokeObjectURL(attachmentPreview.value); attachmentPreview.value=''; attachment.value=null; if(fileInput.value)fileInput.value.value='' }

async function send(){
  if(!current.value || sending.value)return
  const message=reply.value.trim()
  if(!message&&!attachment.value)return
  sending.value=true
  try{
    if(attachment.value){
      const payload=new FormData()
      if(message)payload.append('mensaje',message)
      payload.append('archivo',attachment.value)
      if(isImageFile(attachment.value)){
        payload.append('client_request_id',requestId())
        await api.post(`${apiBase.value}/${current.value.id}/mensajes`,payload)
      }else{
        await api.post(`${apiBase.value}/${current.value.id}/documentos`,payload)
      }
    }else{
      await api.post(`${apiBase.value}/${current.value.id}/mensajes`,{mensaje:message,client_request_id:requestId()})
    }
    reply.value=''; clearAttachment(); await loadCurrent()
  }catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo enviar la respuesta.'})}
  finally{sending.value=false}
}

function startSession() {
  if(!current.value?.id)return
  if(!navigator.onLine)return $q.notify({type:'warning',message:'Necesitas Internet para realizar llamadas.'})
  if(!callsEnabled.value){ openSchedule(pendingSession.value?.modalidad || 'video', pendingSession.value); return }
  const type = activeSession.value?.modalidad === 'audio' ? 'audio' : 'video'
  window.dispatchEvent(new CustomEvent('viti-start-call',{detail:{conversationId:current.value.id,type}}))
}
function openSchedule(modality='video',existing=null){scheduleMode.value=existing?'approve':'new';scheduleForm.value={modalidad:existing?.modalidad||modality,programada_para:'',duracion_minutos:30,motivo:existing?.motivo||'Atención con el cliente.',nota_admin:''};scheduleDialog.value=true}

async function saveSchedule(){
  if(!current.value?.id)return
  scheduleLoading.value=true
  try{
    const payload={modalidad:scheduleForm.value.modalidad,duracion_minutos:Number(scheduleForm.value.duracion_minutos||30),motivo:scheduleForm.value.motivo,nota_admin:scheduleForm.value.nota_admin||undefined,programada_para:scheduleForm.value.programada_para||undefined}
    if(scheduleMode.value==='approve'&&pendingSession.value?.id)await api.post(`${attentionBase.value}/sesiones/${pendingSession.value.id}/aprobar`,payload)
    else await api.post(`${attentionBase.value}/sesiones`,{...payload,conversacion_id:current.value.id})
    scheduleDialog.value=false;await loadSessions();$q.notify({type:'positive',message:scheduleForm.value.programada_para?'Atención programada y notificada.':'Atención habilitada por 30 minutos.'})
  }catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo habilitar la sesión.'})}finally{scheduleLoading.value=false}
}

async function rejectPending(){if(!pendingSession.value?.id)return;try{await api.post(`${attentionBase.value}/sesiones/${pendingSession.value.id}/rechazar`,{nota_admin:'Coordina otra hora por el chat.'});await loadSessions();$q.notify({type:'info',message:'Solicitud rechazada. El cliente fue notificado.'})}catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo rechazar la solicitud.'})}}
function modalityLabel(value){return value==='audio'?'Llamada de voz':value==='pantalla'?'Asistencia con pantalla':'Videollamada'}

function openEdit(message){editingMessage.value=message;editText.value=message.mensaje||'';editDialog.value=true}
async function saveEdit(){
  if(!editingMessage.value||editLoading.value)return
  editLoading.value=true
  try{await api.put(`${apiBase.value}/${current.value.id}/mensajes/${editingMessage.value.id}`,{mensaje:editText.value});editDialog.value=false;await loadCurrent();$q.notify({type:'positive',message:'Mensaje editado.'})}
  catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo editar el mensaje.'})}
  finally{editLoading.value=false}
}
function removeMessage(message){
  $q.dialog({title:'Eliminar mensaje',message:'El mensaje quedará marcado como eliminado para ambas personas.',cancel:true,persistent:true,ok:{label:'Eliminar',color:'negative'}}).onOk(async()=>{
    try{await api.delete(`${apiBase.value}/${current.value.id}/mensajes/${message.id}`);await loadCurrent()}
    catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo eliminar el mensaje.'})}
  })
}
function deleteConversation(){
  if(!current.value)return
  $q.dialog({title:'Eliminar chat completo',message:'El chat desaparecerá para ambas partes. Si el cliente vuelve a escribir, comenzará una conversación nueva.',cancel:true,persistent:true,ok:{label:'Eliminar chat',color:'negative'}}).onOk(async()=>{
    try{await api.delete(`${apiBase.value}/${current.value.id}`);selected.value=null;mobileChatOpen.value=false;await router.replace({query:{}});await load();$q.notify({type:'positive',message:'Chat eliminado.'})}
    catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo eliminar el chat.'})}
  })
}
function statusIcon(message){return message.estado_envio==='enviado'?'done':'done_all'}
function statusColor(message){return message.estado_envio==='visto'?'light-blue-2':'white'}

watch(reply, value => {
  if(!value.trim()||!selected.value)return
  const now=Date.now()
  if(now-lastTypingAt>1500){lastTypingAt=now;heartbeat(true)}
})

onMounted(async()=>{await load();pollTimer=window.setInterval(poll,4000)})
onBeforeUnmount(()=>{if(pollTimer)window.clearInterval(pollTimer);heartbeat(false);clearAttachment()})
</script>

<template>
  <q-page class="viti-page admin-chat-page">
    <PageHeader v-if="!isMobile || !mobileChatOpen" :eyebrow="isElectrofrio?'Electrofrío':'Atención al cliente'" :title="inboxTitle" :subtitle="inboxSubtitle" />

    <div class="admin-chat-layout">
      <div v-show="showContacts" class="contacts-pane">
        <div v-if="isMobile" class="mobile-section-title">Chats</div>
        <q-card flat class="viti-card contacts-card">
          <q-list separator>
            <q-item v-for="conversation in rows" :key="conversation.id" clickable :active="!isMobile&&selected===conversation.id" active-class="bg-blue-1 text-primary" @click="choose(conversation.id)">
              <q-item-section avatar><q-avatar color="primary" text-color="white"><img v-if="conversation.contacto?.foto_url||conversation.contacto?.foto_path" :src="conversation.contacto?.foto_url||mediaUrl(conversation.contacto?.foto_path)"/><span v-else>{{conversation.contacto?.nombre?.[0]||conversation.cliente?.nombre?.[0]||'C'}}</span></q-avatar></q-item-section>
              <q-item-section><q-item-label class="text-weight-bold">{{conversation.contacto?.nombre||conversation.cliente?.nombre}}</q-item-label><q-item-label v-if="conversation.empresa" caption>{{conversation.empresa.nombre_comercial}}</q-item-label><q-item-label caption lines="1">{{conversation.mensajes?.[0]?.eliminado?'Mensaje eliminado':(conversation.mensajes?.[0]?.mensaje||attachmentPreviewLabel(conversation.mensajes?.[0]))}}</q-item-label><q-item-label caption>{{conversation.ultimo_mensaje_at?formatDateTime(conversation.ultimo_mensaje_at):'Sin mensajes todavía'}}</q-item-label></q-item-section>
              <q-item-section side class="items-end q-gutter-xs"><q-badge v-if="conversation.no_leidos" rounded color="negative" :label="conversation.no_leidos>99?'99+':conversation.no_leidos"/><q-icon v-if="isMobile" name="chevron_right" color="grey-6" size="24px"/></q-item-section>
            </q-item>
            <div v-if="!rows.length&&!loading" class="empty-state">No hay conversaciones en este buzón.</div>
          </q-list>
        </q-card>
      </div>

      <div v-show="showChat" class="conversation-pane">
        <q-card v-if="current" flat class="viti-card messenger-card">
          <q-menu v-if="canManage&&!isMobile" context-menu><q-list style="min-width:210px"><q-item clickable v-close-popup class="text-negative" @click="deleteConversation"><q-item-section avatar><q-icon name="delete_forever"/></q-item-section><q-item-section>Eliminar chat</q-item-section></q-item></q-list></q-menu>

          <q-card-section class="row items-center no-wrap chat-header">
            <q-btn v-if="isMobile" round flat icon="arrow_back" color="primary" class="q-mr-xs" @click="backToChats"/>
            <q-avatar size="48px" color="primary" text-color="white" class="q-mr-sm"><img v-if="currentContact?.foto_url||currentContact?.foto_path" :src="currentContact?.foto_url||mediaUrl(currentContact?.foto_path)"/><span v-else>{{currentContact?.nombre?.[0]||'C'}}</span></q-avatar>
            <div class="col min-width-0"><div class="text-subtitle1 text-weight-bold ellipsis">{{currentContact?.nombre}}</div><div class="text-caption ellipsis" :class="presence.escribiendo||presence.en_linea?'text-positive':'text-grey-6'">{{presenceText}} · {{isElectrofrio?'Electrofrío':'Atención VITI'}}</div></div>
            <q-btn round flat color="primary" :icon="callsEnabled?'video_call':'event'" @click="startSession"><q-tooltip>{{callsEnabled?'Iniciar sesión habilitada':'Agendar llamada o videollamada'}}</q-tooltip></q-btn>
            <q-btn v-if="canManage&&isMobile" round flat color="grey-7" icon="more_vert"><q-menu><q-list style="min-width:210px"><q-item clickable v-close-popup class="text-negative" @click="deleteConversation"><q-item-section avatar><q-icon name="delete_forever"/></q-item-section><q-item-section>Eliminar chat</q-item-section></q-item></q-list></q-menu></q-btn>
          </q-card-section>

          <q-banner v-if="pendingSession" class="bg-orange-1 text-orange-10 q-mx-md q-mb-sm" rounded><template #avatar><q-icon name="support_agent"/></template><div class="text-weight-bold">El cliente solicita {{modalityLabel(pendingSession.modalidad)}}</div><div class="text-caption">{{pendingSession.motivo}}</div><template #action><q-btn flat dense no-caps color="negative" label="Rechazar" @click="rejectPending"/><q-btn flat dense no-caps color="primary" label="Aprobar / agendar" @click="openSchedule(pendingSession.modalidad,pendingSession)"/></template></q-banner>
          <q-banner v-else-if="activeSession" class="bg-green-1 text-positive q-mx-md q-mb-sm" rounded><template #avatar><q-icon name="verified"/></template><strong>{{modalityLabel(activeSession.modalidad)}} habilitada ahora.</strong> Ventana hasta {{formatDateTime(activeSession.habilitada_hasta)}}.</q-banner>
          <q-banner v-else-if="upcomingSession" class="bg-purple-1 text-purple-10 q-mx-md q-mb-sm" rounded><template #avatar><q-icon name="event_available"/></template><strong>{{modalityLabel(upcomingSession.modalidad)}} programada:</strong> {{formatDateTime(upcomingSession.programada_para)}}.</q-banner>

          <q-separator/>
          <q-card-section ref="messagesBox" class="messages messenger-bg">
            <div v-if="!current.mensajes?.length" class="empty-state q-my-xl">Aún no hay mensajes en esta conversación.</div>
            <div v-for="message in current.mensajes" :key="message.id" class="message-row" :class="message.es_cliente_final?'client':'admin'">
              <q-avatar v-if="message.es_cliente_final" size="28px" color="primary" text-color="white" class="message-avatar"><img v-if="currentContact?.foto_url" :src="currentContact.foto_url"/><span v-else>{{currentContact?.nombre?.[0]||'C'}}</span></q-avatar>
              <div class="bubble" :class="message.es_cliente_final?'bubble-client':'bubble-admin'">
                <q-btn v-if="message.puede_editar||message.puede_eliminar" flat round dense size="sm" icon="more_vert" class="message-actions"><q-menu><q-list dense style="min-width:150px"><q-item v-if="message.puede_editar" clickable v-close-popup @click="openEdit(message)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar</q-item-section></q-item><q-item v-if="message.puede_eliminar" clickable v-close-popup class="text-negative" @click="removeMessage(message)"><q-item-section avatar><q-icon name="delete"/></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn>
                <div v-if="message.eliminado" class="deleted-message"><q-icon name="block"/> Mensaje eliminado</div>
                <template v-else>
                  <div v-if="message.archivo_url&&isImageMessage(message)" class="attachment-wrap"><a :href="message.archivo_url" target="_blank" rel="noopener"><img :src="message.archivo_url" :alt="message.archivo_nombre||'Imagen adjunta'" class="chat-image"/></a></div>
                  <a v-else-if="message.archivo_url" :href="message.archivo_url" target="_blank" rel="noopener" class="document-card"><q-icon :name="chatFileIcon(message)" size="28px"/><div class="col min-width-0"><div class="document-name ellipsis">{{message.archivo_nombre||'Documento adjunto'}}</div><div class="document-meta">{{formatFileSize(message.archivo_tamano)}} · Abrir documento</div></div><q-icon name="open_in_new"/></a>
                  <div v-if="message.mensaje" class="message-text">{{message.mensaje}}</div>
                </template>
                <div class="message-meta"><span v-if="message.editado_at">editado · </span>{{formatDateTime(message.created_at)}}<q-icon v-if="!message.es_cliente_final&&!message.eliminado" :name="statusIcon(message)" size="15px" :color="statusColor(message)" class="q-ml-xs"><q-tooltip>{{message.estado_envio}}</q-tooltip></q-icon></div>
              </div>
            </div>
            <div v-if="presence.escribiendo" class="typing-bubble">Escribiendo<span>.</span><span>.</span><span>.</span></div>
          </q-card-section>

          <div v-if="attachment" class="attachment-preview q-px-md q-pt-sm">
            <img v-if="attachmentPreview" :src="attachmentPreview" alt="Vista previa"/>
            <q-avatar v-else square color="grey-2" text-color="primary" :icon="chatFileIcon(attachment)"/>
            <div class="col min-width-0"><div class="text-weight-medium ellipsis">{{attachment.name}}</div><div class="text-caption text-grey-6">{{formatFileSize(attachment.size)}} · Archivo privado para esta conversación.</div></div><q-btn flat round icon="close" :disable="sending" @click="clearAttachment"/>
          </div>
          <q-separator/>
          <q-card-section class="composer"><input ref="fileInput" type="file" :accept="CHAT_FILE_ACCEPT" hidden @change="onAttachment"/><q-btn round flat color="primary" icon="attach_file" class="composer-action" :disable="sending" @click="chooseAttachment"><q-tooltip>Adjuntar imagen o documento</q-tooltip></q-btn><q-input v-model="reply" class="message-input" rounded outlined autogrow placeholder="Responder al cliente..." :disable="sending" @keydown.enter.exact.prevent="send"><q-tooltip>Enter envía · Shift + Enter crea una línea nueva</q-tooltip></q-input><q-btn color="primary" unelevated round icon="send" class="composer-action send-action" :loading="sending" :disable="(!reply.trim()&&!attachment)||sending" @click="send"><q-tooltip>Enviar mensaje</q-tooltip></q-btn></q-card-section>
        </q-card>
        <div v-else-if="!isMobile" class="empty-state">Selecciona un cliente para atenderlo.</div>
      </div>
    </div>

    <q-dialog v-model="scheduleDialog"><q-card class="viti-card" style="width:560px;max-width:94vw"><q-card-section><div class="text-overline text-primary">Sesión de atención</div><div class="text-h6 text-weight-bold">{{scheduleMode==='approve'?'Aprobar solicitud':'Habilitar o programar atención'}}</div><div class="text-caption text-grey-6">Una sola agenda controla llamada, videollamada o asistencia con pantalla.</div></q-card-section><q-card-section class="q-gutter-md"><q-select v-model="scheduleForm.modalidad" outlined emit-value map-options label="Modalidad" :options="[{label:'Llamada de voz',value:'audio'},{label:'Videollamada',value:'video'},{label:'Asistencia con pantalla',value:'pantalla'}]"/><q-input v-model="scheduleForm.programada_para" outlined type="datetime-local" label="Fecha y hora (opcional)" stack-label/><q-input v-model.number="scheduleForm.duracion_minutos" outlined type="number" min="15" max="180" label="Duración autorizada (minutos)"/><q-input v-model="scheduleForm.motivo" outlined type="textarea" autogrow label="Motivo / objetivo"/><q-input v-model="scheduleForm.nota_admin" outlined type="textarea" autogrow label="Nota para el cliente (opcional)"/></q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps :label="scheduleForm.programada_para?'Programar':'Habilitar ahora'" :loading="scheduleLoading" @click="saveSchedule"/></q-card-actions></q-card></q-dialog>
    <q-dialog v-model="editDialog"><q-card style="width:520px;max-width:94vw"><q-card-section><div class="text-h6 text-weight-bold">Editar mensaje</div><div class="text-caption text-grey-6">Disponible durante 15 minutos después del envío.</div></q-card-section><q-card-section><q-input v-model="editText" outlined type="textarea" autogrow autofocus maxlength="5000"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Guardar" :loading="editLoading" :disable="!editText.trim()&&!editingMessage?.archivo_path" @click="saveEdit"/></q-card-actions></q-card></q-dialog>
  </q-page>
</template>

<style scoped>
.admin-chat-page{max-width:1500px}.min-width-0{min-width:0}.admin-chat-layout{display:grid;grid-template-columns:minmax(280px,390px) minmax(0,1fr);gap:18px}.contacts-card{max-height:74vh;overflow:auto}.messenger-card{overflow:hidden;display:flex;flex-direction:column}.chat-header{min-height:72px}.messages{display:flex;flex-direction:column;gap:6px;height:min(60vh,650px);min-height:430px;overflow:auto;padding:18px}.messenger-bg{background:linear-gradient(180deg,rgba(127,127,127,.035),rgba(127,127,127,.015))}.message-row{display:flex;align-items:flex-end;gap:7px}.message-row.client{justify-content:flex-start}.message-row.admin{justify-content:flex-end}.message-avatar{margin-bottom:3px}.bubble{position:relative;max-width:min(78%,620px);padding:9px 12px;border-radius:18px;box-shadow:0 1px 2px rgba(0,0,0,.07)}.bubble-client{background:var(--viti-card);color:var(--viti-text);border:1px solid var(--viti-border);border-bottom-left-radius:5px}.bubble-admin{background:#1976d2;color:#fff;border-bottom-right-radius:5px}.message-actions{position:absolute;top:1px;right:1px;opacity:0}.bubble:hover .message-actions,.message-actions:focus{opacity:.8}.message-text{white-space:pre-wrap;overflow-wrap:anywhere;padding-right:16px}.message-meta{font-size:10.5px;opacity:.74;text-align:right;margin-top:4px;display:flex;justify-content:flex-end;align-items:center}.deleted-message{font-style:italic;opacity:.72;padding-right:18px}.attachment-wrap{margin:-5px -8px 7px}.chat-image{display:block;max-width:100%;max-height:360px;border-radius:14px;object-fit:cover}.document-card{display:flex;align-items:center;gap:10px;padding:10px 12px;margin:0 0 7px;border-radius:12px;background:rgba(127,127,127,.12);color:inherit;text-decoration:none;min-width:min(320px,70vw)}.document-name{font-weight:700}.document-meta{font-size:11px;opacity:.72}.attachment-preview{display:flex;align-items:center;gap:12px}.attachment-preview img{width:64px;height:64px;border-radius:12px;object-fit:cover}.composer{display:grid;grid-template-columns:48px minmax(0,1fr) 48px;gap:8px;align-items:end;padding:10px 14px}.composer-action{width:48px;height:48px;min-width:48px;flex:none}.send-action{box-shadow:0 5px 14px rgba(25,118,210,.25)}.message-input :deep(.q-field__control){min-height:48px}.typing-bubble{align-self:flex-start;padding:8px 14px;border-radius:16px;background:var(--viti-card);border:1px solid var(--viti-border);font-size:12px;color:var(--viti-muted)}.typing-bubble span{animation:pulse 1.2s infinite}.typing-bubble span:nth-child(2){animation-delay:.2s}.typing-bubble span:nth-child(3){animation-delay:.4s}.mobile-section-title{font-size:24px;font-weight:800;margin:4px 4px 12px}@keyframes pulse{0%,60%,100%{opacity:.25}30%{opacity:1}}
@media(max-width:1023px){.admin-chat-page{padding:0!important;max-width:none}.admin-chat-layout{display:block}.contacts-pane{padding:16px 12px}.contacts-card{max-height:none}.conversation-pane{height:calc(100dvh - 58px)}.messenger-card{height:100%;border-radius:0!important;border-left:0;border-right:0}.messages{flex:1;height:auto;min-height:0;padding:12px}.chat-header{position:sticky;top:0;z-index:5;padding:8px}.composer{position:sticky;bottom:0;z-index:5;padding:8px 10px max(8px,env(safe-area-inset-bottom))}.bubble{max-width:86%}.message-actions{opacity:.65}.document-card{min-width:0;max-width:78vw}}
</style>