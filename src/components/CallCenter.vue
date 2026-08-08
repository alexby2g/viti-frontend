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
const speakerOn = ref(false)
const cameraOff = ref(false)
const facingMode = ref('user')
const photoFailed = ref(false)
const localVideo = ref(null)
const remoteVideo = ref(null)
const localVideoReady = ref(false)
const remoteVideoReady = ref(false)
const mediaHint = ref('')
const screenSharing = ref(false)
const remoteScreenFrame = ref('')
const minimized = ref(false)
const videoUpgradeWaiting = ref(false)
let peer = null
let localStream = null
let remoteStream = null
let screenStream = null
let dataChannel = null
let incomingTimer = null
let signalTimer = null
let videoTimer = null
let lastSignalId = 0
let pendingCandidates = []
let pendingRemoteCandidates = []

const active = computed(() => Boolean(call.value))
const isVideo = computed(() => mediaType.value === 'video' || call.value?.tipo === 'video' || incoming.value?.tipo === 'video')
const canShareScreen = computed(() => active.value && isVideo.value && phase.value === 'active')
const hasAndroidAudioBridge = computed(() => Boolean(window.Android?.setSpeakerphone))
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
  if (phase.value === 'active') return remoteScreenFrame.value ? 'Pantalla compartida' : 'En llamada'
  return 'Preparando…'
})

function notifyError(message) { $q.notify({ type: 'negative', message }) }
function normalizeSdp(raw) {
  if (!raw) return raw
  let sdp = String(raw)
  if (!/[\r\n]/.test(sdp) && /\\[rn]/.test(sdp)) sdp = sdp.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n')
  sdp = sdp.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = sdp.split('\n').map(line => line.replace(/[ \t]+$/, ''))
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return `${lines.join('\r\n')}\r\n`
}
async function playElement(element) { if (!element) return; try { await element.play?.() } catch {} }

function notifyNativeCallState(enabled, video = isVideo.value) {
  try { window.Android?.setCallActive?.(Boolean(enabled), Boolean(video)) } catch {}
}

async function attachStreams() {
  await nextTick()
  if (localVideo.value && localStream && !screenStream) {
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
    if (!remoteVideoReady.value && phase.value === 'active' && !remoteScreenFrame.value) mediaHint.value = 'La llamada está conectada, pero el otro dispositivo todavía no está enviando video.'
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
    video: type === 'video' ? { facingMode: facingMode.value, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } } : false,
  }
  localStream = await navigator.mediaDevices.getUserMedia(constraints)
  if (!localStream.getAudioTracks().length) throw new Error('No pudimos activar el micrófono.')
  if (type === 'video' && !localStream.getVideoTracks().length) throw new Error('No pudimos activar la cámara. Revisa el permiso de Cámara en VITI.')
  localStream.getTracks().forEach(track => { track.enabled = true })
  markLocalState()
  await attachStreams()
}

async function enableLocalVideo() {
  const currentTrack = localStream?.getVideoTracks?.()[0]
  if (currentTrack?.readyState === 'live') {
    currentTrack.enabled = true
    cameraOff.value = false
    mediaType.value = 'video'
    notifyNativeCallState(true, true)
    await attachStreams()
    return
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: facingMode.value, width:{ ideal:1280 }, height:{ ideal:720 }, frameRate:{ ideal:24,max:30 } },
  })
  const track = stream.getVideoTracks()[0]
  if (!track) throw new Error('No pudimos activar la cámara.')
  if (!localStream) localStream = new MediaStream()
  localStream.addTrack(track)
  peer?.addTrack(track, localStream)
  mediaType.value = 'video'
  cameraOff.value = false
  markLocalState()
  notifyNativeCallState(true, true)
  await attachStreams()
}

function sendData(payload) {
  if (dataChannel?.readyState !== 'open') return false
  try { dataChannel.send(JSON.stringify(payload)); return true } catch { return false }
}

async function handleDataPayload(payload) {
  if (payload.type === 'screen-frame' && payload.data) { remoteScreenFrame.value = payload.data; mediaHint.value = ''; return }
  if (payload.type === 'screen-stop') { remoteScreenFrame.value = ''; return }
  if (payload.type === 'video-upgrade-request') {
    $q.dialog({
      title: 'Cambiar a videollamada',
      message: `${otherPerson.value} quiere activar video. ¿Deseas encender tu cámara?`,
      cancel: { label:'Seguir con voz', flat:true },
      ok: { label:'Activar video', color:'primary', unelevated:true },
      persistent: true,
    }).onOk(async () => {
      try {
        await enableLocalVideo()
        sendData({ type:'video-upgrade-accepted' })
      } catch (e) {
        sendData({ type:'video-upgrade-declined' })
        notifyError(e.message || 'No se pudo activar la cámara.')
      }
    }).onCancel(() => sendData({ type:'video-upgrade-declined' }))
    return
  }
  if (payload.type === 'video-upgrade-accepted') {
    videoUpgradeWaiting.value = false
    try {
      await enableLocalVideo()
      await createRenegotiationOffer()
    } catch (e) { notifyError(e.message || 'No se pudo cambiar a videollamada.') }
    return
  }
  if (payload.type === 'video-upgrade-declined') {
    videoUpgradeWaiting.value = false
    $q.notify({ type:'info', message:'La otra persona prefirió continuar con llamada de voz.' })
    return
  }
  if (payload.type === 'renegotiate-offer' && payload.sdp) {
    await peer.setRemoteDescription({ type:'offer', sdp:normalizeSdp(payload.sdp) })
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
    sendData({ type:'renegotiate-answer', sdp:normalizeSdp(peer.localDescription.sdp) })
    mediaType.value = 'video'
    notifyNativeCallState(true, true)
    await attachStreams()
    return
  }
  if (payload.type === 'renegotiate-answer' && payload.sdp) {
    await peer.setRemoteDescription({ type:'answer', sdp:normalizeSdp(payload.sdp) })
    mediaType.value = 'video'
    notifyNativeCallState(true, true)
    await attachStreams()
  }
}

function setupDataChannel(channel) {
  dataChannel = channel
  dataChannel.onmessage = event => { try { handleDataPayload(JSON.parse(event.data)) } catch {} }
  dataChannel.onclose = () => { remoteScreenFrame.value = ''; if (dataChannel === channel) dataChannel = null }
}

function createPeer(isInitiator = false) {
  peer = new RTCPeerConnection({ bundlePolicy: 'max-bundle', iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] })
  localStream?.getTracks().forEach(track => peer.addTrack(track, localStream))
  if (isInitiator) setupDataChannel(peer.createDataChannel('viti-support', { ordered:true }))
  peer.ondatachannel = event => setupDataChannel(event.channel)
  peer.ontrack = async event => {
    remoteStream = event.streams?.[0] || new MediaStream([event.track])
    event.track.onunmute = async () => { markRemoteState(); await attachStreams(); if (event.track.kind === 'video') mediaHint.value = '' }
    event.track.onended = () => { if (event.track.kind === 'video') { remoteVideoReady.value = false; mediaHint.value = 'La cámara de la otra persona se detuvo.' } }
    await attachStreams(); markRemoteState()
  }
  peer.onicecandidate = event => {
    if (!event.candidate) return
    const payload = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
    if (call.value?.id) sendCandidate(payload); else pendingCandidates.push(payload)
  }
  peer.onconnectionstatechange = () => {
    if (peer?.connectionState === 'connected') { phase.value = 'active'; notifyNativeCallState(true, isVideo.value); watchRemoteVideo() }
    if (['failed','disconnected'].includes(peer?.connectionState) && call.value) phase.value = 'connecting'
  }
}

async function createRenegotiationOffer() {
  const offer = await peer.createOffer()
  await peer.setLocalDescription(offer)
  if (!sendData({ type:'renegotiate-offer', sdp:normalizeSdp(peer.localDescription.sdp) })) throw new Error('No se pudo enviar el cambio a videollamada.')
}
async function requestVideoUpgrade() {
  if (isVideo.value) return
  if (phase.value !== 'active') return $q.notify({ type:'warning', message:'Espera a que la llamada esté conectada.' })
  if (dataChannel?.readyState !== 'open') return $q.notify({ type:'warning', message:'La conexión todavía está preparando el cambio a video.' })
  if (videoUpgradeWaiting.value) return
  videoUpgradeWaiting.value = true
  if (!sendData({ type:'video-upgrade-request' })) videoUpgradeWaiting.value = false
  else $q.notify({ type:'info', message:'Solicitud de videollamada enviada.' })
}

async function sendCandidate(payload) { if (!call.value?.id) return; try { await api.post(`/llamadas/${call.value.id}/senal`, { tipo: 'ice', payload }) } catch {} }
async function flushCandidates() { const items = [...pendingCandidates]; pendingCandidates = []; for (const item of items) await sendCandidate(item) }
async function addRemoteCandidate(payload) { if (!peer || !payload) return; if (!peer.remoteDescription) { pendingRemoteCandidates.push(payload); return }; try { await peer.addIceCandidate(payload) } catch {} }
async function flushRemoteCandidates() { if (!peer?.remoteDescription) return; const items = [...pendingRemoteCandidates]; pendingRemoteCandidates = []; for (const item of items) { try { await peer.addIceCandidate(item) } catch {} } }

async function startOutgoing(detail) {
  if (active.value || incoming.value) return
  if (!navigator.onLine) return notifyError('Necesitas conexión a Internet para realizar una llamada.')
  try {
    photoFailed.value = false; phase.value = 'calling'; facingMode.value = 'user'; await openMedia(detail.type); createPeer(true)
    const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: detail.type === 'video' })
    await peer.setLocalDescription(offer)
    const { data } = await api.post('/llamadas', { conversacion_id: detail.conversationId, tipo: detail.type, offer_sdp: normalizeSdp(peer.localDescription.sdp) })
    call.value = data.data
    notifyNativeCallState(true, detail.type === 'video')
    await attachStreams(); await flushCandidates(); startSignalPolling()
  } catch (e) { cleanup(false); notifyError(e.response?.data?.message || e.message || 'No se pudo iniciar la llamada.') }
}

async function answerIncoming() {
  const item = incoming.value
  if (!item || active.value) return
  try {
    photoFailed.value = false; phase.value = 'connecting'; mediaType.value = item.tipo; facingMode.value = 'user'; call.value = item; incoming.value = null
    await openMedia(item.tipo); createPeer(false)
    const offerSdp = normalizeSdp(item.offer_sdp)
    if (!offerSdp?.startsWith('v=')) throw new Error('La invitación de llamada llegó dañada. Vuelve a intentar la llamada.')
    await peer.setRemoteDescription({ type: 'offer', sdp: offerSdp }); await flushRemoteCandidates()
    const answer = await peer.createAnswer(); await peer.setLocalDescription(answer)
    const { data } = await api.post(`/llamadas/${item.id}/contestar`, { answer_sdp: normalizeSdp(peer.localDescription.sdp) })
    call.value = data.data
    notifyNativeCallState(true, item.tipo === 'video')
    await attachStreams(); await flushCandidates(); startSignalPolling()
  } catch (e) { await finish('rechazada', false); notifyError(e.response?.data?.message || e.message || 'No se pudo contestar la llamada.') }
}

async function rejectIncoming() { const item = incoming.value; incoming.value = null; if (!item) return; try { await api.post(`/llamadas/${item.id}/finalizar`, { estado: 'rechazada' }) } catch {} }
async function pollIncoming() {
  if (call.value || incoming.value || !navigator.onLine) return
  try { const { data } = await api.get('/llamadas/entrante'); if (data.data) { photoFailed.value = false; mediaType.value = data.data.tipo; incoming.value = data.data } } catch {}
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
      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp }); await flushRemoteCandidates(); phase.value = 'connecting'
    }
    for (const signal of data.data.senales || []) { lastSignalId = Math.max(lastSignalId, Number(signal.id || 0)); if (signal.tipo === 'ice' && signal.payload) await addRemoteCandidate(signal.payload) }
    if (['finalizada','rechazada','cancelada','perdida'].includes(serverCall.estado)) { const endedByOther = serverCall.estado !== 'finalizada'; cleanup(false); $q.notify({ type:'info', message: endedByOther ? 'La llamada terminó o fue rechazada.' : 'Llamada finalizada.' }) }
  } catch (e) {
    if (e?.name === 'InvalidAccessError' || /SDP|SessionDescription/i.test(e?.message || '')) { notifyError('No pudimos establecer la llamada. Actualiza VITI en ambos dispositivos e inténtalo nuevamente.'); await finish('cancelada') }
  }
}

function startSignalPolling() { stopSignalPolling(); lastSignalId = 0; signalTimer = window.setInterval(pollSignals, 1000); pollSignals() }
function stopSignalPolling() { if (signalTimer) window.clearInterval(signalTimer); signalTimer = null }
function toggleMute() { muted.value = !muted.value; localStream?.getAudioTracks().forEach(track => { track.enabled = !muted.value }) }
function toggleSpeaker() {
  speakerOn.value = !speakerOn.value
  try { window.Android?.setSpeakerphone?.(speakerOn.value) } catch {}
  if (!hasAndroidAudioBridge.value) $q.notify({ type:'info', message:'En computadora el audio usa la salida seleccionada por el sistema.' })
}
async function toggleCamera() { cameraOff.value = !cameraOff.value; localStream?.getVideoTracks().forEach(track => { track.enabled = !cameraOff.value }); markLocalState(); if (!cameraOff.value) await attachStreams() }
async function switchCamera() {
  if (!isVideo.value || screenSharing.value) return
  const nextFacing = facingMode.value === 'user' ? 'environment' : 'user'
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio:false, video:{ facingMode:{ ideal:nextFacing }, width:{ideal:1280}, height:{ideal:720} } })
    const newTrack = stream.getVideoTracks()[0]
    const oldTrack = localStream?.getVideoTracks?.()[0]
    const sender = peer?.getSenders?.().find(item => item.track?.kind === 'video')
    if (sender && newTrack) await sender.replaceTrack(newTrack)
    if (oldTrack) { localStream.removeTrack(oldTrack); oldTrack.stop() }
    localStream.addTrack(newTrack)
    facingMode.value = nextFacing
    cameraOff.value = false
    await attachStreams(); markLocalState()
  } catch { $q.notify({ type:'warning', message:'No pudimos cambiar de cámara en este dispositivo.' }) }
}

async function startScreenShare() {
  if (!canShareScreen.value || screenSharing.value) return
  if (window.Android?.startVitiScreenShare) {
    if (dataChannel?.readyState !== 'open') return $q.notify({ type:'warning', message:'Espera un momento mientras se prepara la asistencia.' })
    window.Android.startVitiScreenShare()
    return
  }
  if (!navigator.mediaDevices?.getDisplayMedia) return notifyError('Este dispositivo no permite compartir pantalla desde el navegador.')
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video:true, audio:false })
    const track = screenStream.getVideoTracks()[0]
    const sender = peer?.getSenders?.().find(item => item.track?.kind === 'video')
    if (!sender || !track) throw new Error('No se pudo preparar la pantalla compartida.')
    await sender.replaceTrack(track)
    screenSharing.value = true
    if (localVideo.value) { localVideo.value.srcObject = screenStream; await playElement(localVideo.value) }
    track.onended = stopScreenShare
  } catch (e) { notifyError(e.message || 'No se pudo compartir la pantalla.') }
}
async function stopScreenShare() {
  if (!screenSharing.value) return
  if (window.Android?.stopVitiScreenShare) window.Android.stopVitiScreenShare()
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop())
    const cameraTrack = localStream?.getVideoTracks?.()[0]
    const sender = peer?.getSenders?.().find(item => item.track?.kind === 'video')
    if (sender && cameraTrack) { try { await sender.replaceTrack(cameraTrack) } catch {} }
    screenStream = null
    await attachStreams()
  }
  sendData({ type:'screen-stop' })
  screenSharing.value = false
}
function handleAndroidScreenFrame(event) { if (!screenSharing.value || !event?.detail?.data) return; sendData({ type:'screen-frame', data:event.detail.data }) }
function handleScreenStarted() { screenSharing.value = true; minimized.value = true; $q.notify({ type:'positive', message:'Compartiendo VITI. Navega por la aplicación y el equipo verá lo que haces.' }) }
function handleScreenStopped() { screenSharing.value = false; sendData({ type:'screen-stop' }) }
function handleScreenCancelled() { screenSharing.value = false }
function minimizeCall() { if (!active.value) return; minimized.value = true; try { window.Android?.enterCallPip?.() } catch {} }
function restoreCall() { minimized.value = false; nextTick(attachStreams) }

async function finish(state = 'finalizada', notifyServer = true) {
  const id = call.value?.id
  await stopScreenShare()
  if (notifyServer && id) { try { await api.post(`/llamadas/${id}/finalizar`, { estado: state }) } catch {} }
  cleanup(false)
}
function cleanup(clearIncoming = true) {
  notifyNativeCallState(false, false)
  try { window.Android?.setSpeakerphone?.(false) } catch {}
  stopSignalPolling(); if (videoTimer) window.clearTimeout(videoTimer); videoTimer = null
  if (window.Android?.stopVitiScreenShare) { try { window.Android.stopVitiScreenShare() } catch {} }
  screenStream?.getTracks().forEach(track => track.stop()); screenStream = null; screenSharing.value = false; remoteScreenFrame.value = ''; minimized.value = false
  dataChannel?.close?.(); dataChannel = null; peer?.close?.(); peer = null
  localStream?.getTracks().forEach(track => track.stop()); remoteStream?.getTracks().forEach(track => track.stop()); localStream = null; remoteStream = null
  call.value = null; if (clearIncoming) incoming.value = null
  phase.value = 'idle'; mediaType.value = 'audio'; muted.value = false; speakerOn.value = false; cameraOff.value = false; facingMode.value = 'user'; videoUpgradeWaiting.value = false; photoFailed.value = false; localVideoReady.value = false; remoteVideoReady.value = false; mediaHint.value = ''; pendingCandidates = []; pendingRemoteCandidates = []; lastSignalId = 0
}
function handleStart(event) { const detail = event?.detail || {}; if (!detail.conversationId || !['audio','video'].includes(detail.type)) return; startOutgoing(detail) }

onMounted(() => {
  window.addEventListener('viti-start-call', handleStart)
  window.addEventListener('viti-screen-frame', handleAndroidScreenFrame)
  window.addEventListener('viti-screen-share-started', handleScreenStarted)
  window.addEventListener('viti-screen-share-stopped', handleScreenStopped)
  window.addEventListener('viti-screen-share-cancelled', handleScreenCancelled)
  incomingTimer = window.setInterval(pollIncoming, 3500)
  pollIncoming()
})
onBeforeUnmount(() => {
  window.removeEventListener('viti-start-call', handleStart)
  window.removeEventListener('viti-screen-frame', handleAndroidScreenFrame)
  window.removeEventListener('viti-screen-share-started', handleScreenStarted)
  window.removeEventListener('viti-screen-share-stopped', handleScreenStopped)
  window.removeEventListener('viti-screen-share-cancelled', handleScreenCancelled)
  if (incomingTimer) window.clearInterval(incomingTimer)
  cleanup()
})
</script>

<template>
  <q-dialog :model-value="Boolean(incoming)" persistent>
    <q-card class="call-incoming-card">
      <q-card-section class="text-center q-pa-xl">
        <q-avatar size="82px" color="primary" text-color="white"><img v-if="otherPhoto" :src="otherPhoto" alt="Foto de perfil" @error="photoFailed = true" /><q-icon v-else name="support_agent" size="42px" /></q-avatar>
        <div class="text-h5 text-weight-bold q-mt-md">{{ otherPerson }}</div>
        <div class="text-grey-6 q-mt-xs">{{ incoming?.tipo === 'video' ? 'Videollamada entrante' : 'Llamada de voz entrante' }}</div>
      </q-card-section>
      <q-card-actions align="center" class="q-pb-xl q-gutter-lg"><q-btn round size="lg" color="negative" icon="call_end" @click="rejectIncoming" /><q-btn round size="lg" color="positive" :icon="incoming?.tipo === 'video' ? 'videocam' : 'call'" @click="answerIncoming" /></q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog :model-value="active && !minimized" persistent maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="call-screen column no-wrap">
      <q-card-section class="row items-center call-header">
        <q-avatar size="46px" color="primary" text-color="white" class="q-mr-md"><img v-if="otherPhoto" :src="otherPhoto" alt="Foto de perfil" @error="photoFailed = true" /><q-icon v-else name="person" /></q-avatar>
        <div><div class="text-h6 text-weight-bold">{{ otherPerson }}</div><div class="text-caption">{{ statusLabel }} · {{ isVideo ? 'Video' : 'Audio' }}</div></div>
        <q-space />
        <q-btn round flat color="white" icon="remove" @click="minimizeCall"><q-tooltip>Minimizar</q-tooltip></q-btn>
        <q-badge color="positive" rounded>VITI BETA</q-badge>
      </q-card-section>

      <div class="col call-stage">
        <img v-if="remoteScreenFrame" :src="remoteScreenFrame" class="remote-screen" alt="Pantalla compartida" />
        <video v-if="isVideo" ref="remoteVideo" autoplay playsinline class="remote-video" :class="{ 'video-small': remoteScreenFrame }" @loadedmetadata="playElement(remoteVideo)" />
        <audio v-else ref="remoteVideo" autoplay @loadedmetadata="playElement(remoteVideo)" />
        <div v-if="isVideo && !remoteVideoReady && !remoteScreenFrame" class="video-waiting"><q-icon name="videocam_off" size="74px" /><div class="text-h6 q-mt-md">Esperando video de {{ otherPerson }}</div><div class="text-caption q-mt-sm">{{ mediaHint || 'La llamada está conectando la cámara…' }}</div></div>
        <div v-if="!isVideo" class="audio-avatar"><q-avatar size="128px" color="primary" text-color="white"><img v-if="otherPhoto" :src="otherPhoto" alt="Foto de perfil" @error="photoFailed = true" /><q-icon v-else name="person" size="64px" /></q-avatar><div class="text-h5 text-weight-bold q-mt-md">{{ otherPerson }}</div><div class="text-grey-5 q-mt-sm">{{ statusLabel }}</div></div>
        <div v-if="isVideo" class="local-video-wrap"><video ref="localVideo" autoplay playsinline muted class="local-video" @loadedmetadata="playElement(localVideo)" /><div v-if="!localVideoReady" class="local-video-fallback"><q-icon name="videocam_off" size="34px" /></div></div>
      </div>

      <div v-if="isVideo && mediaHint" class="media-hint">{{ mediaHint }}</div>
      <q-card-section class="call-controls">
        <div class="control-item"><q-btn round size="lg" :color="muted ? 'negative' : 'grey-8'" :icon="muted ? 'mic_off' : 'mic'" @click="toggleMute" /><span>{{ muted ? 'Activar mic.' : 'Micrófono' }}</span></div>
        <div class="control-item"><q-btn round size="lg" :color="speakerOn ? 'primary' : 'grey-8'" :icon="speakerOn ? 'volume_up' : 'hearing'" @click="toggleSpeaker" /><span>Altavoz</span></div>
        <div class="control-item"><q-btn round size="lg" :loading="videoUpgradeWaiting" :color="isVideo && cameraOff ? 'negative' : 'grey-8'" :icon="isVideo ? (cameraOff ? 'videocam_off' : 'videocam') : 'video_call'" @click="isVideo ? toggleCamera() : requestVideoUpgrade()" /><span>{{ isVideo ? 'Cámara' : 'Pasar a video' }}</span></div>
        <div v-if="isVideo" class="control-item"><q-btn round size="lg" color="grey-8" icon="cameraswitch" :disable="screenSharing" @click="switchCamera" /><span>Girar cámara</span></div>
        <div v-if="canShareScreen" class="control-item"><q-btn round size="lg" :color="screenSharing ? 'primary' : 'grey-8'" :icon="screenSharing ? 'stop_screen_share' : 'screen_share'" @click="screenSharing ? stopScreenShare() : startScreenShare()" /><span>{{ screenSharing ? 'Detener' : 'Compartir' }}</span></div>
        <div class="control-item"><q-btn round size="lg" color="negative" icon="call_end" @click="finish('finalizada')" /><span>Colgar</span></div>
      </q-card-section>
    </q-card>
  </q-dialog>

  <div v-if="active && minimized" class="call-mini" @click.self="restoreCall">
    <q-avatar size="40px" color="primary" text-color="white"><img v-if="otherPhoto" :src="otherPhoto" /><q-icon v-else name="support_agent" /></q-avatar>
    <div class="col overflow-hidden"><div class="text-weight-bold ellipsis">{{ otherPerson }}</div><div class="text-caption ellipsis">{{ screenSharing ? 'Compartiendo VITI' : statusLabel }}</div></div>
    <q-btn round flat color="white" :icon="muted ? 'mic_off' : 'mic'" @click="toggleMute" />
    <q-btn round flat color="white" icon="open_in_full" @click="restoreCall" />
    <q-btn round color="negative" icon="call_end" @click="finish('finalizada')" />
  </div>
</template>

<style scoped>
.call-incoming-card{width:390px;max-width:92vw;border-radius:26px}.call-screen{background:#030914;color:#fff}.call-header{background:#0b2a52;padding:14px 18px}.call-stage{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:0;background:#02060b}.remote-video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#02060b}.remote-video.video-small{left:auto;right:18px;bottom:18px;top:auto;width:min(24vw,190px);height:min(32vw,250px);border-radius:18px;border:2px solid rgba(255,255,255,.55);z-index:4;object-fit:cover}.remote-screen{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#050505;z-index:2}.local-video-wrap{position:absolute;right:18px;top:18px;width:min(26vw,210px);height:min(34vw,280px);border-radius:20px;border:2px solid rgba(255,255,255,.55);background:#111;overflow:hidden;z-index:5;box-shadow:0 8px 24px rgba(0,0,0,.35)}.local-video{width:100%;height:100%;object-fit:cover;background:#111}.local-video-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#111;color:#fff}.video-waiting{position:relative;z-index:2;text-align:center;color:#fff;padding:24px;max-width:520px}.audio-avatar{text-align:center}.media-hint{background:#14233a;color:#dce7f7;padding:10px 18px;text-align:center;font-size:13px}.call-controls{background:#0b2a52;display:flex;justify-content:center;align-items:flex-start;gap:18px;flex-wrap:wrap;padding:14px 18px max(18px,env(safe-area-inset-bottom));z-index:6}.control-item{min-width:70px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11px;color:#dce7f7;text-align:center}.call-mini{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(540px,94vw);z-index:9999;display:flex;align-items:center;gap:9px;background:#0b2a52;color:#fff;padding:10px 12px;border-radius:20px;box-shadow:0 12px 34px rgba(0,0,0,.42)}
@media(max-width:600px){.call-header{padding:10px 12px}.local-video-wrap{right:10px;top:10px;width:118px;height:168px}.call-controls{gap:11px;padding-left:8px;padding-right:8px}.control-item{min-width:57px;font-size:10px}.control-item :deep(.q-btn){font-size:15px}.remote-video{object-fit:contain}}
</style>
