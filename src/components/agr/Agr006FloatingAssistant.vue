<template>
  <div v-if="visible" class="agr006-root" :class="[`state-${state}`, { open, 'voice-armed': voiceArmed, 'voice-active': voiceActive }]">
    <button class="agr006-orb" type="button" :aria-label="open ? 'Cerrar 006' : 'Abrir 006'" @click="toggle">
      <span class="agr006-ring ring-a"></span>
      <span class="agr006-ring ring-b"></span>
      <span class="agr006-core"><span>006</span></span>
      <span class="agr006-status-dot"></span>
    </button>

    <section v-if="open" class="agr006-panel" aria-label="Asistente 006">
      <header class="agr006-header">
        <div>
          <strong>006</strong>
          <small>VITI Intelligence Core · Voz propia</small>
        </div>
        <button class="agr006-close" type="button" aria-label="Cerrar 006" @click="open = false">×</button>
      </header>

      <div class="agr006-body">
        <p class="agr006-presence">{{ presenceMessage }}</p>

        <div v-if="messages.length" class="agr006-messages" aria-live="polite">
          <div v-for="(item, index) in messages" :key="index" :class="['agr006-message', item.role]">
            {{ item.text }}
          </div>
        </div>

        <div v-if="voiceActive" class="agr006-transcription">
          <span class="agr006-live-dot"></span>
          <span>{{ text || 'Escuchando…' }}</span>
        </div>

        <div class="agr006-actions">
          <button type="button" @click="runCommand('resumen')">Resumen</button>
          <button type="button" @click="runCommand('haz una ronda completa')">Ronda</button>
          <button type="button" @click="runCommand('¿qué necesita atención?')">Atención</button>
        </div>

        <form class="agr006-input" @submit.prevent="sendText">
          <input v-model="text" type="text" autocomplete="off" placeholder="Habla con 006..." />
          <button type="button" :class="['voice-btn', { listening } ]" @click="toggleVoice" :aria-label="listening ? 'Detener escucha' : 'Activar escucha'">
            {{ listening ? '■' : '●' }}
          </button>
          <button type="submit" :disabled="!text.trim()">→</button>
        </form>

        <small class="agr006-hint">
          {{ voiceActive ? 'Di “desactivar VITI” para terminar.' : 'Activa el micrófono una vez y di “activar VITI”.' }}
        </small>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../boot/axios'

interface Message { role: 'user' | 'assistant'; text: string }
type State = 'online' | 'thinking' | 'attention' | 'critical'

type AgrAction = {
  type?: string
  to?: string
  label?: string
  target?: string
}

const route = useRoute()
const router = useRouter()
const visible = computed(() => route.meta?.requiresAuth === true)
const open = ref(false)
const text = ref('')
const messages = ref<Message[]>([])
const state = ref<State>('online')
const listening = ref(false)
const voiceArmed = ref(false)
const voiceActive = ref(false)

let recognition: any = null
let activeAudio: HTMLAudioElement | null = null
let activeAudioUrl: string | null = null
let restartTimer: ReturnType<typeof setTimeout> | null = null

const presenceMessage = computed(() => {
  if (voiceActive.value) return '006 está escuchando.'
  if (voiceArmed.value) return 'Escucha preparada. Di “activar VITI”.'
  if (state.value === 'thinking') return 'Analizando VITI...'
  if (state.value === 'attention') return 'He detectado algo que merece tu atención.'
  if (state.value === 'critical') return 'Hay una incidencia importante en VITI.'
  return '006 está activo y vigilando VITI.'
})

function toggle() {
  open.value = !open.value
  if (open.value && messages.value.length === 0) {
    messages.value.push({ role: 'assistant', text: '006 en línea. VITI está operativo. ¿Qué necesitas?' })
  }
}

function extractPayload(response: any) { return response?.data || {} }
function extractAnswer(payload: any) {
  return payload?.data?.message ?? payload?.message ?? payload?.data?.data?.message ?? 'No tengo una respuesta disponible todavía.'
}
function extractAction(payload: any): AgrAction | null {
  return payload?.data?.action ?? payload?.action ?? payload?.data?.data?.action ?? null
}

async function ask(message: string) {
  const normalized = message.trim()
  if (!normalized || !visible.value) return
  state.value = 'thinking'
  messages.value.push({ role: 'user', text: normalized })

  try {
    const response = await api.get('/dashboard', { params: { agr: normalized }, timeout: 30000 })
    const payload = extractPayload(response)
    const answerText = String(extractAnswer(payload))
    messages.value.push({ role: 'assistant', text: answerText })
    state.value = ['critical', 'attention'].includes(String(payload?.health || payload?.data?.health || '')) ? 'attention' : 'online'
    await executeAction(extractAction(payload))
    await speakWith006(answerText)
  } catch (error: any) {
    const status = Number(error?.response?.status || 0)
    state.value = status === 401 || status === 419 ? 'attention' : 'critical'
    messages.value.push({
      role: 'assistant',
      text: status === 401 || status === 419 ? 'La sesión de VITI no está lista. Mantén abierta la sesión e inténtalo de nuevo.' : 'No pude consultar VITI en este momento. Revisa la conexión del sistema.'
    })
  }
}

async function executeAction(action: AgrAction | null | undefined) {
  if (!action?.type) return
  switch (action.type) {
    case 'navigate':
      if (action.to) await router.push(action.to)
      break
    case 'browser_back':
      await router.back()
      break
    default:
      break
  }
}

function sendText() {
  const value = text.value.trim()
  if (!value) return
  text.value = ''
  void ask(value)
}

function runCommand(command: string) { void ask(command) }

function normalizeVoiceText(value: string) {
  return value.toLocaleLowerCase('es-BO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¡!¿?.,;:]/g, ' ').replace(/\s+/g, ' ').trim()
}

function hasWakeWord(value: string) {
  const normalized = normalizeVoiceText(value)
  return /(activar viti|activar 006|activar v i t i)/.test(normalized)
}

function hasSleepWord(value: string) {
  const normalized = normalizeVoiceText(value)
  return /(desactivar viti|desactiva viti|detener viti|silencio viti)/.test(normalized)
}

function cleanWakePhrase(value: string) {
  return value.replace(/activar\s+(viti|006|v\s*i\s*t\s*i)/i, '').trim()
}

function startRecognitionLoop() {
  if (!voiceArmed.value) return
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!Recognition) return

  recognition?.stop()
  recognition = new Recognition()
  recognition.lang = 'es-BO'
  recognition.interimResults = true
  recognition.continuous = true

  recognition.onstart = () => { listening.value = true }
  recognition.onend = () => {
    listening.value = false
    if (voiceArmed.value) {
      if (restartTimer) clearTimeout(restartTimer)
      restartTimer = setTimeout(() => startRecognitionLoop(), 250)
    }
  }
  recognition.onerror = () => {
    listening.value = false
    if (voiceArmed.value) {
      if (restartTimer) clearTimeout(restartTimer)
      restartTimer = setTimeout(() => startRecognitionLoop(), 500)
    }
  }
  recognition.onresult = (event: any) => {
    let finalText = ''
    let interimText = ''
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const chunk = String(event.results?.[i]?.[0]?.transcript || '').trim()
      if (event.results[i].isFinal) finalText += `${chunk} `
      else interimText += `${chunk} `
    }

    const combined = `${finalText} ${interimText}`.trim()

    if (!voiceActive.value) {
      if (hasWakeWord(combined)) {
        voiceActive.value = true
        open.value = true
        state.value = 'online'
        text.value = ''
        messages.value.push({ role: 'assistant', text: 'VITI activo. Te escucho.' })
        void speakWith006('VITI activo. Te escucho.')
        const remainder = cleanWakePhrase(combined)
        if (remainder && !hasSleepWord(remainder)) text.value = remainder
      }
      return
    }

    if (hasSleepWord(combined)) {
      deactivateVoiceMode()
      return
    }

    if (finalText) {
      const cleaned = finalText.replace(/desactivar\s+(viti|006)/i, '').trim()
      if (cleaned) text.value = `${text.value} ${cleaned}`.trim()
    } else if (interimText) {
      const stable = text.value.trim()
      text.value = stable ? `${stable} ${interimText.trim()}` : interimText.trim()
    }
  }

  recognition.start()
}

function toggleVoice() {
  if (!(('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window))) {
    state.value = 'attention'
    messages.value.push({ role: 'assistant', text: 'Este navegador no expone reconocimiento de voz. Puedes escribirme.' })
    return
  }

  if (voiceArmed.value) {
    deactivateVoiceMode()
    return
  }

  voiceArmed.value = true
  open.value = true
  messages.value.push({ role: 'assistant', text: 'Escucha preparada. Di “activar VITI”.' })
  startRecognitionLoop()
}

function deactivateVoiceMode() {
  voiceActive.value = false
  voiceArmed.value = false
  listening.value = false
  state.value = 'online'
  text.value = ''
  recognition?.stop()
  recognition = null
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = null
  messages.value.push({ role: 'assistant', text: 'Modo voz desactivado.' })
}

async function speakWith006(textToSpeak: string) {
  if (!textToSpeak.trim()) return
  stopAudio()

  try {
    const response = await api.post('/agr/voice', { text: textToSpeak }, {
      responseType: 'blob',
      headers: { Accept: 'audio/mpeg' },
      timeout: 30000,
    })
    const contentType = String(response.headers?.['content-type'] || '').toLowerCase()
    if (!contentType.includes('audio/')) throw new Error('006 TTS did not return audio')
    activeAudioUrl = URL.createObjectURL(response.data)
    activeAudio = new Audio(activeAudioUrl)
    activeAudio.volume = 1
    activeAudio.onended = stopAudio
    await activeAudio.play()
    return
  } catch {}

  if (!('speechSynthesis' in window)) return
  const fallback = new SpeechSynthesisUtterance(textToSpeak)
  fallback.lang = 'es-MX'
  fallback.rate = 0.90
  fallback.pitch = 0.78
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(fallback)
}

function stopAudio() {
  if (activeAudio) { activeAudio.pause(); activeAudio.src = ''; activeAudio = null }
  if (activeAudioUrl) { URL.revokeObjectURL(activeAudioUrl); activeAudioUrl = null }
}

onBeforeUnmount(() => {
  recognition?.stop()
  if (restartTimer) clearTimeout(restartTimer)
  stopAudio()
  window.speechSynthesis?.cancel()
})
</script>

<style scoped>
.agr006-root{position:fixed;right:24px;bottom:24px;z-index:9999;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eaf7ff}
.agr006-orb{position:relative;width:78px;height:78px;border:0;border-radius:50%;background:radial-gradient(circle at 50% 46%,rgba(255,255,255,.95),rgba(117,225,255,.55) 17%,rgba(37,150,255,.2) 38%,rgba(0,0,0,0) 67%);box-shadow:0 0 22px rgba(53,200,255,.55),0 0 70px rgba(53,200,255,.2);cursor:pointer;animation:float 3.8s ease-in-out infinite}
.agr006-core{position:absolute;inset:18px;border-radius:50%;display:grid;place-items:center;background:rgba(7,25,41,.72);border:1px solid rgba(165,237,255,.7);box-shadow:inset 0 0 18px rgba(72,211,255,.45),0 0 18px rgba(72,211,255,.35);font-weight:800;letter-spacing:.14em;font-size:12px}
.agr006-ring{position:absolute;inset:5px;border:1px solid rgba(126,231,255,.55);border-radius:50%;transform:rotate(22deg)}.ring-a{animation:spin 7s linear infinite}.ring-b{inset:10px;border-style:dashed;opacity:.55;animation:spinReverse 11s linear infinite}
.agr006-status-dot{position:absolute;right:7px;bottom:8px;width:10px;height:10px;border-radius:50%;background:#7dffb2;box-shadow:0 0 10px #7dffb2}.voice-armed .agr006-status-dot{background:#ffe680;box-shadow:0 0 12px #ffe680;animation:pulse .9s infinite}.voice-active .agr006-status-dot{background:#63f7ff;box-shadow:0 0 18px #63f7ff;animation:pulse .55s infinite}.state-thinking .agr006-status-dot{background:#ffe680;box-shadow:0 0 12px #ffe680;animation:pulse .8s infinite}.state-attention .agr006-status-dot{background:#ffbf66;box-shadow:0 0 12px #ffbf66}.state-critical .agr006-status-dot{background:#ff6565;box-shadow:0 0 13px #ff6565;animation:pulse .7s infinite}
.agr006-panel{position:absolute;right:0;bottom:92px;width:min(420px,calc(100vw - 32px));max-height:560px;overflow:hidden;border:1px solid rgba(130,220,255,.2);border-radius:20px;background:linear-gradient(180deg,rgba(8,23,37,.96),rgba(3,12,22,.97));backdrop-filter:blur(18px);box-shadow:0 20px 70px rgba(0,0,0,.45),0 0 50px rgba(53,200,255,.12)}
.agr006-header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.07)}.agr006-header strong{display:block;font-size:18px;letter-spacing:.18em}.agr006-header small{display:block;margin-top:2px;color:#86a8b8;font-size:11px}.agr006-close{background:transparent;border:0;color:#92aebd;font-size:24px;cursor:pointer}.agr006-body{padding:16px}.agr006-presence{margin:0 0 12px;color:#a9cedd;font-size:13px}
.agr006-messages{display:flex;flex-direction:column;gap:9px;max-height:360px;overflow:auto;margin-bottom:12px}.agr006-message{max-width:88%;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.4}.agr006-message.user{align-self:flex-end;background:rgba(58,157,214,.17);border:1px solid rgba(98,197,244,.15)}.agr006-message.assistant{align-self:flex-start;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}
.agr006-transcription{display:flex;gap:8px;align-items:flex-start;margin:0 0 12px;padding:10px 12px;border:1px solid rgba(99,247,255,.24);border-radius:12px;background:rgba(44,199,213,.08);font-size:12px;color:#c9faff}.agr006-live-dot{width:8px;height:8px;border-radius:50%;background:#63f7ff;box-shadow:0 0 10px #63f7ff;flex:none;margin-top:4px}
.agr006-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.agr006-actions button{border:1px solid rgba(133,220,255,.18);border-radius:10px;background:rgba(77,180,239,.1);color:#dff7ff;padding:7px 10px;cursor:pointer;font-size:12px}.agr006-actions button:hover{background:rgba(77,180,239,.18)}
.agr006-input{display:flex;gap:8px}.agr006-input input{min-width:0;flex:1;border:1px solid rgba(133,220,255,.18);border-radius:12px;background:rgba(255,255,255,.035);color:#fff;padding:11px 12px;outline:none}.agr006-input input:focus{border-color:rgba(133,220,255,.5)}.agr006-input button{width:40px;border:1px solid rgba(133,220,255,.18);border-radius:12px;background:rgba(77,180,239,.14);color:#dff7ff;cursor:pointer}.agr006-input button:disabled{opacity:.35;cursor:not-allowed}.voice-btn.listening{background:rgba(99,247,255,.18);border-color:rgba(99,247,255,.5)}.agr006-hint{display:block;margin-top:8px;color:#6f94a5;font-size:10px}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes spin{to{transform:rotate(382deg)}}@keyframes spinReverse{to{transform:rotate(-382deg)}}@keyframes pulse{50%{opacity:.35}}
@media (max-width:640px){.agr006-root{right:14px;bottom:14px}.agr006-orb{width:68px;height:68px}.agr006-panel{bottom:82px}}
</style>
