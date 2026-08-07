<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'

const $q = useQuasar()
const auth = useAuthStore()
const incoming = ref(null)
const call = ref(null)
const mediaType = ref('audio')
const phase = ref('idle')
const muted = ref(false)
const cameraOff = ref(false)
const localVideo = ref(null)
const remoteVideo = ref(null)
let peer = null
let localStream = null
let remoteStream = null
let incomingTimer = null
let signalTimer = null
let lastSignalId = 0
let pendingCandidates = []

const active = computed(() => Boolean(call.value))
const isVideo = computed(() => (call.value?.tipo || incoming.value?.tipo || mediaType.value) === 'video')
const otherPerson = computed(() => {
  const c = call.value || incoming.value
  if (!c) return 'Atención VITI'
  const me = Number(auth.user?.id || 0)
  if (Number(c.iniciada_por_usuario_id) === me) return c.receptor?.nombre || c.cliente?.nombre || 'Atención VITI'
  return c.iniciador?.nombre || c.cliente?.nombre || 'Atención VITI'
})
const statusLabel = computed(() => {
  if (phase.value === 'calling') return 'Llamando…'
  if (phase.value === 'connecting') return 'Conectando…'
  if (phase.value === 'active') return 'En llamada'
  return 'Preparando…'
})

function notifyError(message) {
  $q.notify({ type: 'negative', message })
}

async function openMedia(type) {
  mediaType.value = type
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este dispositivo no permite llamadas desde VITI.')
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
  remoteStream = new MediaStream()
  await nextTick()
  attachStreams()
}

function attachStreams() {
  if (localVideo.value && localStream) {
    localVideo.value.srcObject = localStream
    localVideo.value.muted = true
    localVideo.value.play?.().catch(() => {})
  }
  if (remoteVideo.value && remoteStream) {
    remoteVideo.value.srcObject = remoteStream
    remoteVideo.value.play?.().catch(() => {})
  }
}

function createPeer() {
  peer = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  })

  localStream?.getTracks().forEach(track => peer.addTrack(track, localStream))
  peer.ontrack = event => {
    for (const track of event.streams?.[0]?.getTracks?.() || [event.track]) remoteStream.addTrack(track)
    nextTick(attachStreams)
  }
  peer.onicecandidate = event => {
    if (!event.candidate) return
    const payload = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
    if (call.value?.id) sendCandidate(payload)
    else pendingCandidates.push(payload)
  }
  peer.onconnectionstatechange = () => {
    if (peer?.connectionState === 'connected') phase.value = 'active'
    if (['failed','disconnected'].includes(peer?.connectionState) && call.value) phase.value = 'connecting'
  }
}

async function sendCandidate(payload) {
  if (!call.value?.id) return
  try { await api.post(`/llamadas/${call.value.id}/senal`, { tipo: 'ice', payload }) } catch {}
}

async function flushCandidates() {
  const items = [...pendingCandidates]
  pendingCandidates = []
  for (const item of items) await sendCandidate(item)
}

async function startOutgoing(detail) {
  if (active.value || incoming.value) return
  if (!navigator.onLine) return notifyError('Necesitas conexión a Internet para realizar una llamada.')
  try {
    phase.value = 'calling'
    await openMedia(detail.type)
    createPeer()
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    const { data } = await api.post('/llamadas', {
      conversacion_id: detail.conversationId,
      tipo: detail.type,
      offer_sdp: peer.localDescription.sdp,
    })
    call.value = data.data
    await nextTick()
    attachStreams()
    await flushCandidates()
    startSignalPolling()
  } catch (e) {
    cleanup(false)
    notifyError(e.response?.data?.message || e.message || 'No se pudo iniciar la llamada.')
  }
}

async function answerIncoming() {
  const item = incoming.value
  if (!item || active.value) return
  try {
    phase.value = 'connecting'
    mediaType.value = item.tipo
    call.value = item
    incoming.value = null
    await openMedia(item.tipo)
    createPeer()
    await peer.setRemoteDescription({ type: 'offer', sdp: item.offer_sdp })
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
    const { data } = await api.post(`/llamadas/${item.id}/contestar`, { answer_sdp: peer.localDescription.sdp })
    call.value = data.data
    await nextTick()
    attachStreams()
    await flushCandidates()
    startSignalPolling()
  } catch (e) {
    await finish('rechazada', false)
    notifyError(e.response?.data?.message || e.message || 'No se pudo contestar la llamada.')
  }
}

async function rejectIncoming() {
  const item = incoming.value
  incoming.value = null
  if (!item) return
  try { await api.post(`/llamadas/${item.id}/finalizar`, { estado: 'rechazada' }) } catch {}
}

async function pollIncoming() {
  if (call.value || incoming.value || !navigator.onLine) return
  try {
    const { data } = await api.get('/llamadas/entrante')
    if (data.data) {
      mediaType.value = data.data.tipo
      incoming.value = data.data
    }
  } catch {}
}

async function pollSignals() {
  if (!call.value?.id || !peer) return
  try {
    const { data } = await api.get(`/llamadas/${call.value.id}/senales`, { params: { since: lastSignalId } })
    const serverCall = data.data.llamada
    call.value = { ...call.value, ...serverCall }

    if (serverCall.answer_sdp && !peer.currentRemoteDescription && Number(serverCall.iniciada_por_usuario_id) === Number(auth.user?.id)) {
      await peer.setRemoteDescription({ type: 'answer', sdp: serverCall.answer_sdp })
      phase.value = 'connecting'
    }

    for (const signal of data.data.senales || []) {
      lastSignalId = Math.max(lastSignalId, Number(signal.id || 0))
      if (signal.tipo === 'ice' && signal.payload) {
        try { await peer.addIceCandidate(signal.payload) } catch {}
      }
    }

    if (['finalizada','rechazada','cancelada','perdida'].includes(serverCall.estado)) {
      const endedByOther = serverCall.estado !== 'finalizada'
      cleanup(false)
      $q.notify({ type: 'info', message: endedByOther ? 'La llamada terminó o fue rechazada.' : 'Llamada finalizada.' })
    }
  } catch {}
}

function startSignalPolling() {
  stopSignalPolling()
  lastSignalId = 0
  signalTimer = window.setInterval(pollSignals, 1000)
  pollSignals()
}

function stopSignalPolling() {
  if (signalTimer) window.clearInterval(signalTimer)
  signalTimer = null
}

function toggleMute() {
  muted.value = !muted.value
  localStream?.getAudioTracks().forEach(track => { track.enabled = !muted.value })
}

function toggleCamera() {
  cameraOff.value = !cameraOff.value
  localStream?.getVideoTracks().forEach(track => { track.enabled = !cameraOff.value })
}

async function finish(state = 'finalizada', notifyServer = true) {
  const id = call.value?.id
  if (notifyServer && id) {
    try { await api.post(`/llamadas/${id}/finalizar`, { estado: state }) } catch {}
  }
  cleanup(false)
}

function cleanup(clearIncoming = true) {
  stopSignalPolling()
  peer?.close?.()
  peer = null
  localStream?.getTracks().forEach(track => track.stop())
  remoteStream?.getTracks().forEach(track => track.stop())
  localStream = null
  remoteStream = null
  call.value = null
  if (clearIncoming) incoming.value = null
  phase.value = 'idle'
  mediaType.value = 'audio'
  muted.value = false
  cameraOff.value = false
  pendingCandidates = []
  lastSignalId = 0
}

function handleStart(event) {
  const detail = event?.detail || {}
  if (!detail.conversationId || !['audio','video'].includes(detail.type)) return
  startOutgoing(detail)
}

onMounted(() => {
  window.addEventListener('viti-start-call', handleStart)
  incomingTimer = window.setInterval(pollIncoming, 3500)
  pollIncoming()
})

onBeforeUnmount(() => {
  window.removeEventListener('viti-start-call', handleStart)
  if (incomingTimer) window.clearInterval(incomingTimer)
  cleanup()
})
</script>

<template>
  <q-dialog :model-value="Boolean(incoming)" persistent>
    <q-card class="call-incoming-card">
      <q-card-section class="text-center q-pa-xl">
        <q-avatar size="82px" color="primary" text-color="white" icon="support_agent" />
        <div class="text-h5 text-weight-bold q-mt-md">{{ otherPerson }}</div>
        <div class="text-grey-6 q-mt-xs">{{ incoming?.tipo === 'video' ? 'Videollamada entrante' : 'Llamada de voz entrante' }}</div>
      </q-card-section>
      <q-card-actions align="center" class="q-pb-xl q-gutter-lg">
        <q-btn round size="lg" color="negative" icon="call_end" @click="rejectIncoming"><q-tooltip>Rechazar</q-tooltip></q-btn>
        <q-btn round size="lg" color="positive" :icon="incoming?.tipo === 'video' ? 'videocam' : 'call'" @click="answerIncoming"><q-tooltip>Contestar</q-tooltip></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog :model-value="active" persistent maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="call-screen column no-wrap">
      <q-card-section class="row items-center call-header">
        <div>
          <div class="text-h6 text-weight-bold">{{ otherPerson }}</div>
          <div class="text-caption">{{ statusLabel }} · {{ isVideo ? 'Video' : 'Audio' }}</div>
        </div>
        <q-space />
        <q-badge color="positive" rounded>VITI BETA</q-badge>
      </q-card-section>

      <div class="col call-stage">
        <video v-if="isVideo" ref="remoteVideo" autoplay playsinline class="remote-video"></video>
        <audio v-else ref="remoteVideo" autoplay></audio>
        <div v-if="!isVideo" class="audio-avatar">
          <q-avatar size="124px" color="primary" text-color="white" icon="person" />
          <div class="text-h5 text-weight-bold q-mt-md">{{ otherPerson }}</div>
          <div class="text-grey-5 q-mt-sm">{{ statusLabel }}</div>
        </div>
        <video v-if="isVideo" ref="localVideo" autoplay playsinline muted class="local-video"></video>
      </div>

      <q-card-section class="call-controls row justify-center q-gutter-md">
        <q-btn round size="lg" :color="muted ? 'negative' : 'grey-8'" :icon="muted ? 'mic_off' : 'mic'" @click="toggleMute" />
        <q-btn v-if="isVideo" round size="lg" :color="cameraOff ? 'negative' : 'grey-8'" :icon="cameraOff ? 'videocam_off' : 'videocam'" @click="toggleCamera" />
        <q-btn round size="lg" color="negative" icon="call_end" @click="finish('finalizada')" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.call-incoming-card{width:380px;max-width:92vw;border-radius:24px}.call-screen{background:#07111f;color:#fff}.call-header{background:#0b2447}.call-stage{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:0}.remote-video{width:100%;height:100%;object-fit:cover}.local-video{position:absolute;right:18px;top:18px;width:min(28vw,210px);height:min(38vw,280px);object-fit:cover;border-radius:18px;border:2px solid rgba(255,255,255,.5);background:#000}.audio-avatar{text-align:center}.call-controls{background:#0b2447;padding-bottom:max(20px,env(safe-area-inset-bottom))}
</style>
