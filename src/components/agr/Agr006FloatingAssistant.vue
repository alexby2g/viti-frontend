<template>
  <div
    v-if="visible"
    class="agr006-root"
    :class="[`state-${state}`, { open, 'voice-armed': voiceArmed, 'voice-active': voiceActive, speaking }]"
  >
    <div v-if="voiceActive" class="agr006-hologram-shell" aria-hidden="true">
      <div class="holo-aura"></div>
      <div class="holo-grid"></div>
      <svg class="agr006-hologram" viewBox="0 0 420 720" role="img" aria-label="006 holograma">
        <defs>
          <linearGradient id="holoStroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#e7fdff" stop-opacity=".98" />
            <stop offset=".35" stop-color="#69efff" stop-opacity=".9" />
            <stop offset="1" stop-color="#168dff" stop-opacity=".22" />
          </linearGradient>
          <radialGradient id="holoFill" cx="50%" cy="40%" r="70%">
            <stop offset="0" stop-color="#c1fbff" stop-opacity=".26" />
            <stop offset=".55" stop-color="#167dff" stop-opacity=".11" />
            <stop offset="1" stop-color="#00162c" stop-opacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <ellipse class="holo-base" cx="210" cy="688" rx="112" ry="13" />
        <path class="holo-scan" d="M78 648 Q210 612 342 648" />

        <g class="holo-body" filter="url(#glow)">
          <path class="body-fill" d="M126 625 C112 585 120 548 145 523 L168 498 L178 415 L145 352 L155 300 L182 270 L238 270 L265 300 L275 352 L242 415 L252 498 L275 523 C300 548 308 585 294 625 L270 676 L150 676 Z" />
          <path class="body-stroke" d="M168 498 L178 415 L145 352 L155 300 L182 270 L238 270 L265 300 L275 352 L242 415 L252 498" />
          <path class="lapel" d="M176 288 L207 330 L238 288 M207 330 L205 485 M207 330 L214 485" />
          <path class="tie" d="M204 294 L218 294 L225 383 L210 402 L196 383 Z" />
          <path class="arm left" d="M158 310 Q124 353 105 430 Q96 465 118 474 Q138 482 150 447 L184 360" />
          <path class="arm right" d="M262 310 Q296 353 315 430 Q324 465 302 474 Q282 482 270 447 L236 360" />
          <path class="hand left-hand" d="M118 447 Q103 441 96 454 Q90 466 102 477 Q115 488 130 480 Q141 473 140 458 Z" />
          <path class="hand right-hand" d="M302 447 Q317 441 324 454 Q330 466 318 477 Q305 488 290 480 Q279 473 280 458 Z" />
          <path class="leg left-leg" d="M155 502 L202 502 L198 672 L150 672 Z" />
          <path class="leg right-leg" d="M218 502 L265 502 L270 672 L222 672 Z" />
        </g>

        <g class="holo-head" filter="url(#glow)">
          <path class="head-fill" d="M164 150 Q165 82 210 60 Q255 82 256 150 L244 238 Q235 274 210 286 Q185 274 176 238 Z" />
          <path class="head-stroke" d="M164 150 Q165 82 210 60 Q255 82 256 150 L244 238 Q235 274 210 286 Q185 274 176 238 Z" />
          <path class="hair" d="M165 142 Q173 64 210 58 Q250 64 255 142 Q240 112 210 108 Q184 111 165 142Z" />
          <path class="ear" d="M170 160 Q150 154 154 184 Q158 202 175 198 M250 160 Q270 154 266 184 Q262 202 245 198" />
          <path class="eye left-eye" d="M180 165 Q194 156 204 165 Q194 174 180 165Z" />
          <path class="eye right-eye" d="M216 165 Q226 156 240 165 Q226 174 216 165Z" />
          <path class="brow left-brow" d="M180 152 Q192 146 202 151" />
          <path class="brow right-brow" d="M218 151 Q228 146 240 152" />
          <path class="nose" d="M210 168 L205 205 L214 208" />
          <path class="mouth mouth-a" d="M194 224 Q210 232 226 224" />
          <path class="mouth mouth-b" d="M194 224 Q210 244 226 224" />
          <path class="jaw" d="M180 226 Q188 260 210 268 Q232 260 240 226" />
          <circle class="forehead-mark" cx="210" cy="118" r="4" />
        </g>
      </svg>

      <div class="holo-caption">
        <span class="status-dot"></span>
        <strong>006</strong>
        <span>{{ speaking ? 'HABLANDO' : voiceActive ? 'ESCUCHANDO' : 'EN LÍNEA' }}</span>
      </div>
      <div class="holo-wave" :class="{ active: speaking || voiceActive }">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
    </div>

    <button
      v-else
      class="agr006-orb"
      type="button"
      :aria-label="open ? 'Cerrar 006' : 'Abrir 006'"
      @click="toggle"
    >
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
          <input v-model="text" type="text" autocomplete="off" placeholder="Habla con 006…" />
          <button
            type="button"
            :class="['voice-btn', { listening }]"
            @click="toggleVoice"
            :aria-label="listening ? 'Detener escucha' : 'Activar escucha'"
          >{{ listening ? '■' : '●' }}</button>
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
type AgrAction = { type?: string; to?: string; label?: string; target?: string }

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
const speaking = ref(false)

let recognition: any = null
let activeAudio: HTMLAudioElement | null = null
let activeAudioUrl: string | null = null
let restartTimer: ReturnType<typeof setTimeout> | null = null
let commitTimer: ReturnType<typeof setTimeout> | null = null

const presenceMessage = computed(() => {
  if (speaking.value) return '006 está respondiendo.'
  if (voiceActive.value) return '006 está escuchando.'
  if (voiceArmed.value) return 'Escucha preparada. Di “activar VITI”.'
  if (state.value === 'thinking') return 'Analizando VITI…'
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

function normalizeVoiceText(value: string) {
  return value
    .toLocaleLowerCase('es-BO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¡!¿?.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasWakeWord(value: string) {
  return /(activar viti|activar 006|activar v i t i)/.test(normalizeVoiceText(value))
}

function hasSleepWord(value: string) {
  return /(desactivar viti|desactiva viti|detener viti|silencio viti)/.test(normalizeVoiceText(value))
}

function isWakeCommand(value: string) {
  return /^(?:activar\s+(?:viti|006|v\s*i\s*t\s*i))$/i.test(normalizeVoiceText(value))
}

function isSleepCommand(value: string) {
  return /^(?:desactivar\s+viti|desactiva\s+viti|detener\s+viti|silencio\s+viti)$/i.test(normalizeVoiceText(value))
}

function cleanWakePhrase(value: string) {
  return value.replace(/activar\s+(viti|006|v\s*i\s*t\s*i)/i, '').trim()
}

function extractPayload(response: any) { return response?.data || {} }
function extractAnswer(payload: any) {
  return payload?.data?.message
    ?? payload?.message
    ?? payload?.data?.data?.message
    ?? 'No tengo una respuesta disponible todavía.'
}
function extractAction(payload: any): AgrAction | null {
  return payload?.data?.action
    ?? payload?.action
    ?? payload?.data?.data?.action
    ?? null
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
      text: status === 401 || status === 419
        ? 'La sesión de VITI no está lista. Mantén abierta la sesión e inténtalo de nuevo.'
        : 'No pude consultar VITI en este momento. Revisa la conexión del sistema.',
    })
  }
}

async function executeAction(action: AgrAction | null | undefined) {
  if (!action?.type) return
  if (action.type === 'navigate' && action.to) await router.push(action.to)
  if (action.type === 'browser_back') await router.back()
}

function activateVoiceMode(source: 'voice' | 'text' = 'voice') {
  if (!(('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window))) {
    state.value = 'attention'
    messages.value.push({ role: 'assistant', text: 'Este navegador no expone reconocimiento de voz. Puedes escribirme.' })
    return
  }

  voiceArmed.value = true
  voiceActive.value = true
  open.value = true
  state.value = 'online'
  text.value = ''

  if (source === 'text') {
    messages.value.push({ role: 'user', text: 'Activar VITI' })
  }
  messages.value.push({ role: 'assistant', text: 'VITI activo. Te escucho.' })
  void speakWith006('VITI activo. Te escucho.')
  startRecognitionLoop()
}

function deactivateVoiceMode() {
  voiceActive.value = false
  voiceArmed.value = false
  listening.value = false
  speaking.value = false
  state.value = 'online'
  text.value = ''
  recognition?.stop()
  recognition = null
  if (restartTimer) clearTimeout(restartTimer)
  if (commitTimer) clearTimeout(commitTimer)
  restartTimer = null
  commitTimer = null
  messages.value.push({ role: 'assistant', text: 'VITI desactivado. Quedo en espera.' })
}

function sendText() {
  const value = text.value.trim()
  if (!value) return
  text.value = ''

  if (isWakeCommand(value)) {
    activateVoiceMode('text')
    return
  }
  if (isSleepCommand(value)) {
    deactivateVoiceMode()
    return
  }

  void ask(value)
}

function runCommand(command: string) {
  if (isWakeCommand(command)) activateVoiceMode('text')
  else if (isSleepCommand(command)) deactivateVoiceMode()
  else void ask(command)
}

function scheduleVoiceCommit() {
  if (!voiceActive.value || !text.value.trim()) return
  if (commitTimer) clearTimeout(commitTimer)
  commitTimer = setTimeout(() => {
    const value = text.value.trim()
    if (!value || hasWakeWord(value) || hasSleepWord(value)) return
    text.value = ''
    void ask(value)
  }, 1200)
}

function startRecognitionLoop() {
  if (!voiceArmed.value || speaking.value) return
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
    if (voiceArmed.value && !speaking.value) {
      if (restartTimer) clearTimeout(restartTimer)
      restartTimer = setTimeout(() => startRecognitionLoop(), 350)
    }
  }
  recognition.onerror = () => {
    listening.value = false
    if (voiceArmed.value && !speaking.value) {
      if (restartTimer) clearTimeout(restartTimer)
      restartTimer = setTimeout(() => startRecognitionLoop(), 700)
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
        activateVoiceMode('voice')
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
      scheduleVoiceCommit()
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

async function speakWith006(textToSpeak: string) {
  if (!textToSpeak.trim()) return
  stopAudio()
  speaking.value = true

  // Evita que 006 transcriba su propia voz.
  recognition?.stop()
  recognition = null
  listening.value = false

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
    activeAudio.onended = () => {
      speaking.value = false
      stopAudio()
      if (voiceArmed.value) startRecognitionLoop()
    }
    await activeAudio.play()
    return
  } catch {
    speaking.value = false
  }

  if (!('speechSynthesis' in window)) {
    if (voiceArmed.value) startRecognitionLoop()
    return
  }

  const fallback = new SpeechSynthesisUtterance(textToSpeak)
  fallback.lang = 'es-MX'
  fallback.rate = 0.90
  fallback.pitch = 0.78
  fallback.onend = () => {
    speaking.value = false
    if (voiceArmed.value) startRecognitionLoop()
  }
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(fallback)
}

function stopAudio() {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.src = ''
    activeAudio = null
  }
  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl)
    activeAudioUrl = null
  }
}

onBeforeUnmount(() => {
  recognition?.stop()
  if (restartTimer) clearTimeout(restartTimer)
  if (commitTimer) clearTimeout(commitTimer)
  stopAudio()
  window.speechSynthesis?.cancel()
})
</script>

<style scoped>
.agr006-root{position:fixed;right:24px;bottom:24px;z-index:9999;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eaf7ff}
.agr006-orb{position:relative;width:78px;height:78px;border:0;border-radius:50%;background:radial-gradient(circle at 50% 46%,rgba(255,255,255,.95),rgba(117,225,255,.55) 17%,rgba(37,150,255,.2) 38%,rgba(0,0,0,0) 67%);box-shadow:0 0 22px rgba(53,200,255,.55),0 0 70px rgba(53,200,255,.2);cursor:pointer;animation:float 3.8s ease-in-out infinite}
.agr006-core{position:absolute;inset:18px;border-radius:50%;display:grid;place-items:center;background:rgba(7,25,41,.72);border:1px solid rgba(165,237,255,.7);box-shadow:inset 0 0 18px rgba(72,211,255,.45),0 0 18px rgba(72,211,255,.35);font-weight:800;letter-spacing:.14em;font-size:12px}
.agr006-ring{position:absolute;inset:5px;border:1px solid rgba(126,231,255,.55);border-radius:50%;transform:rotate(22deg)}.ring-a{animation:spin 7s linear infinite}.ring-b{inset:10px;border-style:dashed;opacity:.55;animation:spinReverse 11s linear infinite}
.agr006-status-dot{position:absolute;right:7px;bottom:8px;width:10px;height:10px;border-radius:50%;background:#7dffb2;box-shadow:0 0 10px #7dffb2}.voice-armed .agr006-status-dot{background:#ffe680;box-shadow:0 0 12px #ffe680;animation:pulse .9s infinite}.voice-active .agr006-status-dot{background:#63f7ff;box-shadow:0 0 18px #63f7ff;animation:pulse .55s infinite}
.agr006-hologram-shell{position:fixed;right:455px;bottom:34px;width:min(318px,26vw);height:min(560px,72vh);display:flex;align-items:flex-end;justify-content:center;pointer-events:none;z-index:1;filter:drop-shadow(0 0 22px rgba(53,200,255,.38));animation:holoAppear .7s ease-out both}
.agr006-hologram{position:relative;width:100%;height:100%;overflow:visible}.holo-aura{position:absolute;inset:14% 12% 3%;background:radial-gradient(ellipse at center,rgba(61,210,255,.16),rgba(20,120,255,.05) 48%,transparent 72%);filter:blur(16px);animation:aura 2.8s ease-in-out infinite}.holo-grid{position:absolute;left:8%;right:8%;bottom:7%;height:27%;opacity:.16;background:repeating-linear-gradient(0deg,rgba(100,230,255,.7) 0 1px,transparent 1px 15px),repeating-linear-gradient(90deg,rgba(100,230,255,.4) 0 1px,transparent 1px 21px);mask-image:linear-gradient(to top,black,transparent);animation:gridMove 4s linear infinite}
.holo-body{transform-origin:center bottom;animation:bodyFloat 3.4s ease-in-out infinite}.body-fill,.head-fill{fill:url(#holoFill)}.body-stroke,.head-stroke,.lapel,.tie,.arm,.hand,.leg,.hair,.ear,.eye,.nose,.mouth,.brow,.jaw,.forehead-mark,.holo-base,.holo-scan{fill:none;stroke:url(#holoStroke);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.holo-head{transform-origin:210px 170px;animation:headFloat 5s ease-in-out infinite}.hair{stroke-width:5}.forehead-mark{fill:#dffbff;filter:drop-shadow(0 0 9px #53eaff)}.eye{fill:#c7fcff;stroke-width:2;animation:blink 5.8s ease-in-out infinite}.mouth{stroke-width:3}.mouth-b{display:none}.speaking .mouth-a{display:none}.speaking .mouth-b{display:block;animation:talk 150ms ease-in-out infinite alternate}.speaking .holo-head{animation:talkHead 1.6s ease-in-out infinite}.speaking .left-hand{animation:gestureLeft 1.5s ease-in-out infinite alternate;transform-origin:110px 462px}.speaking .right-hand{animation:gestureRight 1.9s ease-in-out infinite alternate;transform-origin:310px 462px}.voice-active:not(.speaking) .left-hand{animation:listeningGesture 2.8s ease-in-out infinite alternate;transform-origin:110px 462px}.voice-active:not(.speaking) .right-hand{animation:listeningGestureRight 3.1s ease-in-out infinite alternate;transform-origin:310px 462px}.holo-base{stroke-width:4;opacity:.9}.holo-scan{stroke-width:2;opacity:.4;animation:scan 2.2s linear infinite}
.holo-caption{position:absolute;left:50%;bottom:8%;transform:translateX(-50%);display:flex;gap:8px;align-items:center;padding:7px 12px;border-radius:999px;border:1px solid rgba(108,232,255,.24);background:rgba(4,20,34,.72);backdrop-filter:blur(10px);box-shadow:0 0 22px rgba(50,200,255,.12);white-space:nowrap}.holo-caption strong{font-size:12px;letter-spacing:.22em}.holo-caption span:last-child{font-size:9px;color:#8fe8ff}.status-dot{width:7px;height:7px;border-radius:50%;background:#6bffb0;box-shadow:0 0 12px #6bffb0}.speaking .status-dot{background:#ffd86b;box-shadow:0 0 12px #ffd86b}.holo-wave{position:absolute;left:50%;bottom:3%;transform:translateX(-50%);display:flex;gap:3px;height:20px;align-items:center;opacity:.65}.holo-wave i{display:block;width:3px;height:7px;border-radius:3px;background:#63edff}.holo-wave.active i{animation:wave .6s ease-in-out infinite alternate}.holo-wave i:nth-child(2){animation-delay:.08s}.holo-wave i:nth-child(3){animation-delay:.16s}.holo-wave i:nth-child(4){animation-delay:.24s}.holo-wave i:nth-child(5){animation-delay:.32s}.holo-wave i:nth-child(6){animation-delay:.4s}.holo-wave i:nth-child(7){animation-delay:.48s}
.agr006-panel{position:absolute;right:0;bottom:92px;width:min(420px,calc(100vw - 32px));max-height:560px;overflow:hidden;border:1px solid rgba(130,220,255,.2);border-radius:20px;background:linear-gradient(180deg,rgba(8,23,37,.96),rgba(3,12,22,.97));backdrop-filter:blur(18px);box-shadow:0 20px 70px rgba(0,0,0,.45),0 0 50px rgba(53,200,255,.12);z-index:5}.agr006-header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.07)}.agr006-header strong{display:block;font-size:18px;letter-spacing:.18em}.agr006-header small{display:block;margin-top:2px;color:#86a8b8;font-size:11px}.agr006-close{background:transparent;border:0;color:#92aebd;font-size:24px;cursor:pointer}.agr006-body{padding:16px}.agr006-presence{margin:0 0 12px;color:#a9cedd;font-size:13px}.agr006-messages{display:flex;flex-direction:column;gap:9px;max-height:320px;overflow:auto;margin-bottom:12px}.agr006-message{max-width:88%;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.4}.agr006-message.user{align-self:flex-end;background:rgba(58,157,214,.17);border:1px solid rgba(98,197,244,.15)}.agr006-message.assistant{align-self:flex-start;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}.agr006-transcription{display:flex;gap:8px;align-items:center;margin-bottom:10px;padding:10px 12px;border-radius:12px;background:rgba(63,229,255,.08);border:1px solid rgba(63,229,255,.14);color:#b8f5ff;font-size:12px}.agr006-live-dot{width:7px;height:7px;border-radius:50%;background:#5ff4ff;box-shadow:0 0 12px #5ff4ff;animation:pulse .7s infinite}.agr006-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.agr006-actions button{border:1px solid rgba(133,220,255,.18);border-radius:10px;background:rgba(77,180,239,.1);color:#dff7ff;padding:7px 10px;cursor:pointer;font-size:12px}.agr006-input{display:flex;gap:8px}.agr006-input input{min-width:0;flex:1;border:1px solid rgba(133,220,255,.18);border-radius:12px;background:rgba(255,255,255,.035);color:#fff;padding:11px 12px;outline:none}.agr006-input button{width:40px;border:1px solid rgba(133,220,255,.18);border-radius:12px;background:rgba(77,180,239,.14);color:#dff7ff;cursor:pointer}.agr006-input button:disabled{opacity:.35;cursor:not-allowed}.voice-btn.listening{background:rgba(255,92,92,.2);border-color:rgba(255,112,112,.4)}.agr006-hint{display:block;margin-top:8px;color:#7094a6;font-size:10px;text-align:center}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes spin{to{transform:rotate(382deg)}}@keyframes spinReverse{to{transform:rotate(-382deg)}}@keyframes pulse{50%{opacity:.35}}@keyframes holoAppear{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}@keyframes aura{50%{transform:scale(1.05);opacity:.9}}@keyframes gridMove{to{background-position:0 40px,26px 0}}@keyframes bodyFloat{50%{transform:translateY(-7px)}}@keyframes headFloat{50%{transform:translate(1px,-3px) rotate(.8deg)}}@keyframes blink{0%,44%,48%,100%{opacity:1}46%{opacity:.08}}@keyframes talk{from{transform:scaleY(.25)}to{transform:scaleY(1.25)}}@keyframes talkHead{50%{transform:translateY(-2px) rotate(-.6deg)}}@keyframes gestureLeft{from{transform:rotate(-2deg)}to{transform:rotate(4deg) translate(2px,-3px)}}@keyframes gestureRight{from{transform:rotate(2deg)}to{transform:rotate(-3deg) translate(-1px,2px)}}@keyframes listeningGesture{from{transform:rotate(-1deg)}to{transform:rotate(2deg) translateY(-2px)}}@keyframes listeningGestureRight{from{transform:rotate(1deg)}to{transform:rotate(-2deg) translateY(-1px)}}@keyframes scan{from{transform:translateX(-25px)}to{transform:translateX(25px)}}@keyframes wave{from{height:5px}to{height:22px}}
@media (max-width:1100px){.agr006-hologram-shell{right:390px;width:280px;height:500px}}@media (max-width:900px){.agr006-hologram-shell{right:15px;bottom:24px;width:min(290px,55vw);height:62vh;opacity:.84}.agr006-panel{right:0;bottom:88px}.agr006-hologram-shell+.agr006-panel{display:none}}@media (max-width:640px){.agr006-root{right:14px;bottom:14px}.agr006-hologram-shell{right:0;bottom:55px;width:86vw;height:62vh;opacity:.76}.agr006-orb{width:68px;height:68px}}
</style>
