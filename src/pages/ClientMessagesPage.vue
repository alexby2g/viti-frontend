<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
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
const reply = ref('')
const pending = ref(pendingOfflineCount())
const fileInput = ref(null)
const attachment = ref(null)
const attachmentPreview = ref('')
const messagesBox = ref(null)
const support = ref({ puede_llamar:false, sesion_activa:null, solicitud_pendiente:null, proxima_sesion:null })
const requestDialog = ref(false)
const requestForm = ref({ modalidad:'video', motivo:'' })
const requestLoading = ref(false)
const mobileChatOpen = ref(false)
const CACHE_KEY = 'viti-client-buzon-cache-v3'
let supportTimer = null

const current = computed(() => rows.value[0] || null)
const isMobile = computed(() => $q.screen.lt.md)
const responsibleName = computed(() => {
  const u = current.value?.responsable
  return u ? `${u.nombre || ''} ${u.apellido || ''}`.trim() : 'Equipo VITI'
})
const lastMessage = computed(() => current.value?.mensajes?.[current.value.mensajes.length - 1] || null)
const callsEnabled = computed(() => Boolean(support.value?.puede_llamar))
const activeModality = computed(() => support.value?.sesion_activa?.modalidad || null)
const pendingRequest = computed(() => support.value?.solicitud_pendiente || null)
const upcoming = computed(() => support.value?.proxima_sesion || null)
const showConversation = computed(() => !isMobile.value || mobileChatOpen.value)

function saveCache() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows.value)) } catch {} }
function restoreCache() { try { const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); if (Array.isArray(cached)) rows.value = cached } catch {} }
function queueChanged(event) { pending.value = Number(event?.detail?.count ?? pendingOfflineCount()) }
function networkFailure(error) { return !navigator.onLine || !error?.response }

async function scrollBottom() {
  await nextTick()
  const el = messagesBox.value?.$el || messagesBox.value
  if (el) el.scrollTop = el.scrollHeight
}

async function loadCurrent() {
  if (!current.value?.id) return
  try {
    const { data } = await api.get(`/mi/buzon/${current.value.id}`)
    rows.value = [data.data]
    saveCache()
    await notifications.refresh()
    await scrollBottom()
  } catch (error) {
    if (!networkFailure(error)) throw error
  }
}

async function loadSupport() {
  if (!navigator.onLine) return
  try { support.value = (await api.get('/mi/atencion/sesiones')).data.data || support.value } catch {}
}

async function load() {
  loading.value = true
  try {
    rows.value = (await api.get('/mi/buzon')).data.data || []
    saveCache()
    await loadCurrent()
    await loadSupport()
  } catch (error) {
    if (networkFailure(error)) restoreCache()
    else throw error
  } finally {
    loading.value = false
    if (route.query.c) mobileChatOpen.value = true
    await scrollBottom()
  }
}

function openConversation() { mobileChatOpen.value = true; scrollBottom() }
function backToInbox() { mobileChatOpen.value = false }

function queueReply(message) {
  if (!current.value?.id) return
  pending.value = queueClientAction({ type: 'reply-message', conversation_id: current.value.id, mensaje: message })
  current.value.mensajes = current.value.mensajes || []
  current.value.mensajes.push({ id:`offline-${Date.now()}`, mensaje:message, created_at:new Date().toISOString(), pendiente:true, usuario:{ rol:'cliente', nombre:'Tú' } })
  reply.value = ''
  saveCache(); scrollBottom()
  $q.notify({ type:'warning', message:'Mensaje guardado. Se enviará automáticamente al volver Internet.' })
}

function chooseAttachment() { fileInput.value?.click() }
function onAttachment(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) return $q.notify({ type:'negative', message:'Selecciona una imagen o captura de pantalla.' })
  if (file.size > 8 * 1024 * 1024) return $q.notify({ type:'negative', message:'La imagen no puede superar 8 MB.' })
  clearAttachment(); attachment.value = file; attachmentPreview.value = URL.createObjectURL(file)
}
function clearAttachment() { if (attachmentPreview.value) URL.revokeObjectURL(attachmentPreview.value); attachmentPreview.value=''; attachment.value=null; if (fileInput.value) fileInput.value.value='' }

async function send() {
  if (!current.value) return
  const message = reply.value.trim()
  if (!message && !attachment.value) return
  if (!navigator.onLine) {
    if (attachment.value) return $q.notify({ type:'warning', message:'Conéctate a Internet para enviar una fotografía. El texto sí puede quedar pendiente.' })
    return queueReply(message)
  }
  try {
    const payload = new FormData()
    if (message) payload.append('mensaje', message)
    if (attachment.value) payload.append('archivo', attachment.value)
    await api.post(`/mi/buzon/${current.value.id}/mensajes`, payload, { headers:{ 'Content-Type':'multipart/form-data' } })
    reply.value=''; clearAttachment(); await loadCurrent()
  } catch (e) {
    if (networkFailure(e) && !attachment.value) return queueReply(message)
    $q.notify({ type:'negative', message:e.response?.data?.message || 'No se pudo enviar el mensaje.' })
  }
}

function startCall(type) {
  if (!current.value?.id) return
  if (!navigator.onLine) return $q.notify({ type:'warning', message:'Necesitas Internet para realizar llamadas.' })
  if (!callsEnabled.value) { requestDialog.value=true; requestForm.value.modalidad=type; return }
  window.dispatchEvent(new CustomEvent('viti-start-call', { detail:{ conversationId:current.value.id, type } }))
}

async function requestAttention() {
  if (!requestForm.value.motivo.trim()) return $q.notify({ type:'warning', message:'Cuéntanos brevemente qué necesitas revisar.' })
  requestLoading.value = true
  try {
    await api.post('/mi/atencion/solicitudes', { modalidad:requestForm.value.modalidad, motivo:requestForm.value.motivo.trim() })
    requestDialog.value=false; requestForm.value={ modalidad:'video', motivo:'' }; await loadSupport()
    $q.notify({ type:'positive', message:'Solicitud enviada. Atención VITI la revisará antes de habilitar la llamada.' })
  } catch (e) { $q.notify({ type:'negative', message:e.response?.data?.message || 'No se pudo enviar la solicitud.' }) }
  finally { requestLoading.value=false }
}

async function cancelRequest() {
  const item = pendingRequest.value || upcoming.value
  if (!item?.id) return
  try { await api.post(`/mi/atencion/sesiones/${item.id}/cancelar`); await loadSupport(); $q.notify({ type:'info', message:'Solicitud de atención cancelada.' }) }
  catch (e) { $q.notify({ type:'negative', message:e.response?.data?.message || 'No se pudo cancelar la solicitud.' }) }
}

function modalityLabel(value) { return value === 'audio' ? 'Llamada de voz' : value === 'pantalla' ? 'Asistencia con pantalla' : 'Videollamada' }

async function flushPending() {
  if (!navigator.onLine || !pending.value) return
  const result = await flushClientQueue(api); pending.value=result.pending
  if (result.sent) { $q.notify({ type:'positive', message:`${result.sent} acción(es) pendiente(s) fueron sincronizadas.` }); await load() }
}

onMounted(async()=>{ window.addEventListener('online',flushPending); window.addEventListener('viti-offline-queue-changed',queueChanged); await load(); await flushPending(); supportTimer=window.setInterval(loadSupport,30000) })
onBeforeUnmount(()=>{ window.removeEventListener('online',flushPending); window.removeEventListener('viti-offline-queue-changed',queueChanged); if(supportTimer)window.clearInterval(supportTimer); clearAttachment() })
</script>

<template>
  <q-page class="viti-page client-chat-page">
    <PageHeader v-if="!isMobile || !mobileChatOpen" eyebrow="Atención" title="Mi buzón" subtitle="Tus conversaciones con Atención VITI." />

    <div v-if="isMobile && !mobileChatOpen" class="mobile-inbox">
      <div class="inbox-title">Chats</div>
      <q-card v-if="current" flat class="viti-card inbox-item" @click="openConversation">
        <q-card-section class="row items-center no-wrap">
          <q-avatar size="52px" color="primary" text-color="white" class="q-mr-md"><img v-if="current.responsable?.foto_url" :src="current.responsable.foto_url" /><q-icon v-else name="support_agent" /></q-avatar>
          <div class="col min-width-0">
            <div class="text-weight-bold ellipsis">{{ responsibleName }}</div>
            <div class="text-caption text-grey-6 ellipsis">{{ lastMessage?.mensaje || (lastMessage?.archivo_url ? '📷 Imagen adjunta' : 'Canal de Atención VITI') }}</div>
            <div class="text-caption text-grey-5">{{ lastMessage?.created_at ? formatDateTime(lastMessage.created_at) : 'Disponible para atención' }}</div>
          </div>
          <q-icon name="chevron_right" size="26px" color="grey-6" />
        </q-card-section>
      </q-card>
      <div v-else-if="!loading" class="empty-state">Aún no hay conversaciones.</div>
    </div>

    <div v-if="showConversation" class="conversation-shell">
      <q-banner v-if="pending" rounded class="bg-orange-1 text-orange-10 q-mb-md"><template #avatar><q-icon name="cloud_off" /></template>Tienes {{ pending }} mensaje(s) pendiente(s). VITI los enviará cuando vuelva Internet.</q-banner>
      <q-banner v-if="pendingRequest" rounded class="bg-blue-1 text-primary q-mb-md"><template #avatar><q-icon name="schedule_send" /></template><div class="text-weight-bold">Solicitud de atención pendiente</div><div class="text-caption">{{ modalityLabel(pendingRequest.modalidad) }} · el equipo VITI debe aprobarla antes de habilitar la llamada.</div><template #action><q-btn flat no-caps label="Cancelar" @click="cancelRequest" /></template></q-banner>
      <q-banner v-else-if="upcoming" rounded class="bg-purple-1 text-purple-10 q-mb-md"><template #avatar><q-icon name="event_available" /></template><div class="text-weight-bold">Atención programada</div><div class="text-caption">{{ modalityLabel(upcoming.modalidad) }} · {{ formatDateTime(upcoming.programada_para) }}.</div></q-banner>
      <q-banner v-else-if="callsEnabled" rounded class="bg-green-1 text-positive q-mb-md"><template #avatar><q-icon name="verified" /></template><div class="text-weight-bold">Sesión de atención habilitada</div><div class="text-caption">Puedes iniciar {{ modalityLabel(activeModality) }} durante la ventana autorizada.</div></q-banner>

      <q-card v-if="current" flat class="viti-card messenger-card">
        <q-card-section class="row items-center no-wrap chat-header">
          <q-btn v-if="isMobile" round flat icon="arrow_back" color="primary" class="q-mr-xs" @click="backToInbox"><q-tooltip>Volver a chats</q-tooltip></q-btn>
          <q-avatar size="48px" color="primary" text-color="white" class="q-mr-sm"><img v-if="current.responsable?.foto_url" :src="current.responsable.foto_url" /><q-icon v-else name="support_agent" /></q-avatar>
          <div class="col min-width-0"><div class="text-subtitle1 text-weight-bold ellipsis">{{ responsibleName }}</div><div class="text-caption text-grey-6 ellipsis">Atención VITI · canal privado</div></div>
          <q-btn round flat color="primary" :icon="callsEnabled ? 'call' : 'lock'" @click="startCall('audio')"><q-tooltip>{{ callsEnabled ? 'Iniciar llamada' : 'Solicitar autorización de llamada' }}</q-tooltip></q-btn>
          <q-btn round flat color="primary" :icon="callsEnabled ? 'videocam' : 'lock'" @click="startCall('video')"><q-tooltip>{{ callsEnabled ? 'Iniciar videollamada' : 'Solicitar autorización de videollamada' }}</q-tooltip></q-btn>
        </q-card-section>

        <q-separator />
        <q-card-section ref="messagesBox" class="messages messenger-bg">
          <div v-if="!current.mensajes?.length" class="empty-state q-my-xl">Escríbenos aquí o adjunta una captura del problema. Tu mensaje llegará directamente a {{ responsibleName }}.</div>
          <div v-for="m in current.mensajes" :key="m.id" class="message-row" :class="m.usuario?.rol === 'cliente' ? 'mine' : 'team'">
            <q-avatar v-if="m.usuario?.rol !== 'cliente'" size="28px" color="primary" text-color="white" class="message-avatar"><img v-if="current.responsable?.foto_url" :src="current.responsable.foto_url" /><q-icon v-else name="support_agent" size="17px" /></q-avatar>
            <div class="bubble" :class="[{ pending:m.pendiente }, m.usuario?.rol === 'cliente' ? 'bubble-mine' : 'bubble-team']">
              <div v-if="m.archivo_url" class="attachment-wrap"><a :href="m.archivo_url" target="_blank" rel="noopener"><img :src="m.archivo_url" :alt="m.archivo_nombre || 'Imagen adjunta'" class="chat-image" /></a></div>
              <div v-if="m.mensaje" class="message-text">{{ m.mensaje }}</div>
              <div class="message-meta">{{ m.pendiente ? 'Pendiente de envío' : formatDateTime(m.created_at) }}</div>
            </div>
          </div>
        </q-card-section>

        <div v-if="attachmentPreview" class="attachment-preview q-px-md q-pt-sm"><img :src="attachmentPreview" alt="Vista previa" /><div class="col"><div class="text-weight-medium">{{ attachment?.name }}</div><div class="text-caption text-grey-6">Se enviará de forma privada a Atención VITI.</div></div><q-btn flat round icon="close" @click="clearAttachment" /></div>
        <q-separator />
        <q-card-section class="composer row q-gutter-sm items-end"><input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="onAttachment" /><q-btn round flat color="primary" icon="add_photo_alternate" @click="chooseAttachment"><q-tooltip>Enviar foto o captura</q-tooltip></q-btn><q-input v-model="reply" class="col message-input" rounded outlined autogrow placeholder="Escribe un mensaje..." @keyup.ctrl.enter="send" /><q-btn color="primary" unelevated round icon="send" @click="send"><q-tooltip>Enviar</q-tooltip></q-btn></q-card-section>
      </q-card>
    </div>

    <q-dialog v-model="requestDialog"><q-card style="width:520px;max-width:94vw" class="viti-card"><q-card-section><div class="text-overline text-primary">Atención programada</div><div class="text-h6 text-weight-bold">Solicitar una sesión</div><div class="text-caption text-grey-6">La llamada solo se habilitará cuando Atención VITI la apruebe o programe.</div></q-card-section><q-card-section class="q-gutter-md"><q-option-group v-model="requestForm.modalidad" type="radio" color="primary" :options="[{label:'Llamada de voz',value:'audio'},{label:'Videollamada',value:'video'},{label:'Asistencia con pantalla',value:'pantalla'}]"/><q-input v-model="requestForm.motivo" type="textarea" outlined autogrow label="¿Qué necesitas revisar?" hint="Ej.: no puedo guardar un registro y quiero mostrar en qué parte ocurre."/></q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Enviar solicitud" :loading="requestLoading" @click="requestAttention"/></q-card-actions></q-card></q-dialog>
    <q-inner-loading :showing="loading" />
  </q-page>
</template>

<style scoped>
.client-chat-page{max-width:1100px}.min-width-0{min-width:0}.mobile-inbox{display:flex;flex-direction:column;gap:10px}.inbox-title{font-size:26px;font-weight:800;margin-bottom:4px}.inbox-item{cursor:pointer;border-radius:18px}.messenger-card{overflow:hidden}.chat-header{min-height:72px}.messages{display:flex;flex-direction:column;gap:6px;height:min(60vh,650px);min-height:430px;overflow:auto;padding:18px}.messenger-bg{background:linear-gradient(180deg,rgba(127,127,127,.035),rgba(127,127,127,.015))}.message-row{display:flex;align-items:flex-end;gap:7px}.message-row.mine{justify-content:flex-end}.message-row.team{justify-content:flex-start}.message-avatar{flex:0 0 auto;margin-bottom:3px}.bubble{max-width:min(78%,620px);padding:9px 12px;border-radius:18px;box-shadow:0 1px 2px rgba(0,0,0,.07)}.bubble-mine{background:#1976d2;color:white;border-bottom-right-radius:5px}.bubble-team{background:var(--viti-card);color:var(--viti-text);border:1px solid var(--viti-border);border-bottom-left-radius:5px}.bubble.pending{opacity:.72;border:1px dashed currentColor}.message-text{white-space:pre-wrap;overflow-wrap:anywhere}.message-meta{font-size:10.5px;opacity:.68;text-align:right;margin-top:4px}.attachment-wrap{margin:-5px -8px 7px}.chat-image{display:block;max-width:100%;max-height:360px;border-radius:14px;object-fit:cover}.attachment-preview{display:flex;align-items:center;gap:12px}.attachment-preview img{width:64px;height:64px;border-radius:12px;object-fit:cover}.composer{padding:10px 14px}.message-input :deep(.q-field__control){min-height:44px}
@media(max-width:1023px){.client-chat-page{padding:0!important;max-width:none}.conversation-shell{height:calc(100dvh - 58px);display:flex;flex-direction:column}.conversation-shell>.messenger-card{flex:1;display:flex;flex-direction:column;border-radius:0!important;border-left:0;border-right:0}.messages{flex:1;height:auto;min-height:0;padding:12px}.chat-header{position:sticky;top:0;z-index:4;padding:8px 8px}.composer{position:sticky;bottom:0;z-index:5;padding:8px 10px max(8px,env(safe-area-inset-bottom))}.bubble{max-width:86%}.mobile-inbox{padding:16px 12px}.inbox-title{font-size:24px}}
</style>