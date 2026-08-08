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
const photoFailed = ref(false)
const localVideo = ref(null)
const remoteVideo = ref(null)
const localVideoReady = ref(false)
const remoteVideoReady = ref(false)
const mediaHint = ref('')
let peer = null
let localStream = null
let remoteStream = null
let incomingTimer = null
let signalTimer = null
let videoTimer = null
let lastSignalId = 0
let pendingCandidates = []
let pendingRemoteCandidates = []

const active = computed(() => Boolean(call.value))
const isVideo = computed(() => (call.value?.tipo || incoming.value?.tipo || mediaType.value) === 'video')
const otherPerson = computed(() => {
  const c = call.value || incoming.value
  if (!c) return 'Atención VITI'
  const me = Number(auth.user?.id || 0)
  if (Number(c.iniciada_por_usuario_id) === me) return c.receptor?.nombre || c.cliente?.nombre || 'Atención VITI'
  return c.iniciador?.nombre || c.cliente?.nombre || 'Atención VITI'
})
const otherPhoto = computed(() => {
  if (photoFailed.value) return null
  const c = call.value || incoming.value
  if (!c) return null
  const me = Number(auth.user?.id || 0)
  if (Number(c.iniciada_por_usuario_id) === me) return c.receptor?.foto_url || c.cliente?.foto_url || null
  return c.iniciador?.foto_url || c.cliente?.foto_url || null
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

function normalizeSdp(raw) {
  if (!raw) return raw
  let sdp = String(raw)
  if (!/[\r\n]/.test(sdp) && /\\[rn]/.test(sdp)) {
    sdp = sdp.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n')
  }
  sdp = sdp.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = sdp.split('\n').map(line => line.replace(/[ \t]+$/, ''))
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return `${lines.join('\r\n')}\r\n`
}

async function playElement(element) {
  if (!element) return
  try { await element.play?.() } catch {}
}

async function attachStreams() {
  await nextTick()

  if (localVideo.value && localStream) {
    if (localVideo.value.srcObject !== localStream) localVideo.value.srcObject = localStream
    localVideo.value.muted = true
    await playElement(localVideo.value)
  }

  if (remoteVideo.value && remoteStream) {
    if (remoteVideo.value.srcObject !== remoteStream) remoteVideo.value.srcObject = remoteStream
    await playElement(remoteVideo.value)
  }
}

function markLocalState() {
  const videoTrack = localStream?.getVideoTracks?.()[0]
  localVideoReady.value = Boolean(videoTrack && videoTrack.readyState === 'live' && videoTrack.enabled)
  if (isVideo.value && !videoTrack) mediaHint.value = 'Este dispositivo no entregó una pista de cámara. Revisa el permiso de Cámara.'
}

function markRemoteState() {
  const videoTrack = remoteStream?.getVideoTracks?.()[0]
  remoteVideoReady.value = Boolean(videoTrack && videoTrack.readyState === 'live' && !videoTrack.muted)
}

function watchRemoteVideo() {
  if (videoTimer) window.clearTimeout(videoTimer)
  if (!isVideo.value) return
  videoTimer = window.setTimeout(() => {
    markRemoteState()
    if (!remoteVideoReady.value && phase.value === 'active') {
      mediaHint.value = 'La llamada está conectada, pero el otro dispositivo todavía no está enviando video. Revisa Cámara y vuelve a activar el botón de video.'
    }
  }, 7000)
}

async function openMedia(type) {
  mediaType.value = type
  mediaHint.value = ''
  localVideoReady.value = false
  remoteVideoReady.value = false

  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este dispositivo no permite llamadas desde VITI.')

  const constraints = {
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: type === 'video' ? {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 24, max: 30 },
    } : false,
  }

  localStream = await navigator.mediaDevices.getUserMedia(constraints)

  if (!localStream.getAudioTracks().length) throw new Error('No pudimos activar el micrófono.')
  if (type === 'video' && !localStream.getVideoTracks().length) throw new Error('No pudimos activar la cámara. Revisa el permiso de Cámara en VITI.')

  localStream.getTracks().forEach(track => {
    track.enabled = true
    track.onended = () => {
      if (track.kind === 'video') {
        localVideoReady.value = false
        mediaHint.value = 'La cámara se detuvo. Revisa los permisos o si otra aplicación está usando la cámara.'
      }
    }
  })

  markLocalState()
  await attachStreams()
}

function createPeer() {
  peer = new RTCPeerConnection({
    bundlePolicy: 'max-bundle',
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  })

  localStream?.getTracks().forEach(track => peer.addTrack(track, localStream))

  peer.ontrack = async event => {
    // Usamos directamente el MediaStream negociado por WebRTC. Esto evita perder
    // video en WebView/Chromium al copiar tracks manualmente a otro stream.
    remoteStream = event.streams?.[0] || new MediaStream([event.track])

    event.track.onunmute = async () => {
      markRemoteState()
      await attachStreams()
      if (event.track.kind === 'video') mediaHint.value = ''
    }
    event.track.onended = () => {
      if (event.track.kind === 'video') {
        remoteVideoReady.value = false
        mediaHint.value = 'La cámara de la otra persona se detuvo.'
      }
    }

    await attachStreams()
    markRemoteState()
  }

  peer.onicecandidate = event => {
    if (!event.candidate) return
    const payload = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
    if (call.value?.id) sendCandidate(payload)
    else pendingCandidates.push(payload)
  }

  peer.onconnectionstatechange = () => {
    if (peer?.connectionState === 'connected') {
      phase.value = 'active'
      watchRemoteVideo()
    }
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

async function addRemoteCandidate(payload) {
  if (!peer || !payload) return
  if (!peer.remoteDescription) {
    pendingRemoteCandidates.push(payload)
    return
  }
  try { await peer.addIceCandidate(payload) } catch {}
}

async function flushRemoteCandidates() {
  if (!peer?.remoteDescription) return
  const items = [...pendingRemoteCandidates]
  pendingRemoteCandidates = []
  for (const item of items) {
    try { await peer.addIceCandidate(item) } catch {}
  }
}

async function startOutgoing(detail) {
  if (active.value || incoming.value) return
  if (!navigator.onLine) return notifyError('Necesitas conexión a Internet para realizar una llamada.')
  try {
    photoFailed.value = false
    phase.value = 'calling'
    await openMedia(detail.type)
    createPeer()
    const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: detail.type === 'video' })
    await peer.setLocalDescription(offer)
    const { data } = await api.post('/llamadas', {
      conversacion_id: detail.conversationId,
      tipo: detail.type,
      offer_sdp: normalizeSdp(peer.localDescription.sdp),
    })
    call.value = data.data
    await attachStreams()
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
    photoFailed.value = false
    phase.value = 'connecting'
    mediaType.value = item.tipo
    call.value = item
    incoming.value = null
    await openMedia(item.tipo)
    createPeer()

    const offerSdp = normalizeSdp(item.offer_sdp)
    if (!offerSdp?.startsWith('v=')) throw new Error('La invitación de llamada llegó dañada. Vuelve a intentar la llamada.')
    await peer.setRemoteDescription({ type: 'offer', sdp: offerSdp })
    await flushRemoteCandidates()

    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
    const { data } = await api.post(`/llamadas/${item.id}/contestar`, { answer_sdp: normalizeSdp(peer.localDescription.sdp) })
    call.value = data.data
    await attachStreams()
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
      photoFailed.value = false
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
      const answerSdp = normalizeSdp(serverCall.answer_sdp)
      if (!answerSdp?.startsWith('v=')) throw new Error('La respuesta de la llamada llegó dañada.')
      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      await flushRemoteCandidates()
      phase.value = 'connecting'
    }

    for (const signal of data.data.senales || []) {
      lastSignalId = Math.max(lastSignalId, Number(signal.id || 0))
      if (signal.tipo === 'ice' && signal.payload) await addRemoteCandidate(signal.payload)
    }

    if (['finalizada','rechazada','cancelada','perdida'].includes(serverCall.estado)) {
      const endedByOther = serverCall.estado !== 'finalizada'
      cleanup(false)
      $q.notify({ type: 'info', message: endedByOther ? 'La llamada terminó o fue rechazada.' : 'Llamada finalizada.' })
    }
  } catch (e) {
    if (e?.name === 'InvalidAccessError' || /SDP|SessionDescription/i.test(e?.message || '')) {
      notifyError('No pudimos establecer la llamada. Actualiza VITI en ambos dispositivos e inténtalo nuevamente.')
      await finish('cancelada')
    }
  }
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

async function toggleCamera() {
  cameraOff.value = !cameraOff.value
  localStream?.getVideoTracks().forEach(track => { track.enabled = !cameraOff.value })
  markLocalState()
  if (!cameraOff.value) await attachStreams()
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
  if (videoTimer) window.clearTimeout(videoTimer)
  videoTimer = null
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
  photoFailed.value = false
  localVideoReady.value = false
  remoteVideoReady.value = false
  mediaHint.value = ''
  pendingCandidates = []
  pendingRemoteCandidates = []
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
        <q-avatar size="82px" color="primary" text-color="white">
          <img v-if="otherPhoto" :src="otherPhoto" alt="Foto de perfil" @error="photoFailed = true" />
          <q-icon v-else name="support_agent" size="42px" />
        </q-avatar>
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
        <q-avatar size="46px" color="primary" text-color="white" class="q-mr-md">
          <img v-if="otherPhoto" :src="otherPhoto" alt="Foto de perfil" @error="photoFailed = true" />
          <q-icon v-else name="person" />
        </q-avatar>
        <div>
          <div class="text-h6 text-weight-bold">{{ otherPerson }}</div>
          <div class="text-caption">{{ statusLabel }} · {{ isVideo ? 'Video' : 'Audio' }}</div>
        </div>
        <q-space />
        <q-badge color="positive" rounded>VITI BETA</q-badge>
      </q-card-section>

      <div class="col call-stage">
        <video v-if="isVideo" ref="remoteVideo" autoplay playsinline class="remote-video" @loadedmetadata="playElement(remoteVideo)" />
        <audio v-else ref="remoteVideo" autoplay @loadedmetadata="playElement(remoteVideo)" />

        <div v-if="isVideo && !remoteVideoReady" class="video-waiting">
          <q-icon name="videocam_off" size="74px" />
          <div class="text-h6 q-mt-md">Esperando video de {{ otherPerson }}</div>
          <div class="text-caption q-mt-sm">{{ mediaHint || 'La llamada está conectando la cámara…' }}</div>
        </div>

        <div v-if="!isVideo" class="audio-avatar">
          <q-avatar size="124px" color="primary" text-color="white">
            <img v-if="otherPhoto" :src="otherPhoto" alt="Foto de perfil" @error="photoFailed = true" />
            <q-icon v-else name="person" size="64px" />
          </q-avatar>
          <div class="text-h5 text-weight-bold q-mt-md">{{ otherPerson }}</div>
          <div class="text-grey-5 q-mt-sm">{{ statusLabel }}</div>
        </div>

        <div v-if="isVideo" class="local-video-wrap">
          <video ref="localVideo" autoplay playsinline muted class="local-video" @loadedmetadata="playElement(localVideo)" />
          <div v-if="!localVideoReady" class="local-video-fallback"><q-icon name="videocam_off" size="34px" /></div>
        </div>
      </div>

      <div v-if="isVideo && mediaHint" class="media-hint">{{ mediaHint }}</div>

      <q-card-section class="call-controls row justify-center q-gutter-md">
        <q-btn round size="lg" :color="muted ? 'negative' : 'grey-8'" :icon="muted ? 'mic_off' : 'mic'" @click="toggleMute" />
        <q-btn v-if="isVideo" round size="lg" :color="cameraOff ? 'negative' : 'grey-8'" :icon="cameraOff ? 'videocam_off' : 'videocam'" @click="toggleCamera" />
        <q-btn round size="lg" color="negative" icon="call_end" @click="finish('finalizada')" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.call-incoming-card{width:380px;max-width:92vw;border-radius:24px}
.call-screen{background:#050b13;color:#fff}
.call-header{background:#0b2447}
.call-stage{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:0;background:#000}
.remote-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}
.local-video-wrap{position:absolute;right:18px;top:18px;width:min(28vw,210px);height:min(38vw,280px);border-radius:18px;border:2px solid rgba(255,255,255,.5);background:#111;overflow:hidden;z-index:3}
.local-video{width:100%;height:100%;object-fit:cover;background:#111}
.local-video-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#111;color:#fff}
.video-waiting{position:relative;z-index:2;text-align:center;color:#fff;padding:24px;max-width:520px}
.audio-avatar{text-align:center}
.media-hint{background:#14233a;color:#dce7f7;padding:10px 18px;text-align:center;font-size:13px}
.call-controls{background:#0b2447;padding-bottom:max(20px,env(safe-area-inset-bottom));z-index:4}
</style>
