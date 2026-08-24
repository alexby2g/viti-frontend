<template>
  <div
    v-if="visible"
    class="agr006-root"
    :class="{ open, active: voiceActive, speaking, listening }"
  >
    <div v-if="voiceActive" class="hologram-layer" aria-hidden="true">
      <div class="holo-aura"></div>
      <div class="holo-grid"></div>
      <div class="holo-scanlines"></div>
      <svg class="hologram" viewBox="0 0 420 720" role="img" aria-label="006 holograma">
        <defs>
          <linearGradient id="holoStrokeV2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#e6fcff" stop-opacity=".95" />
            <stop offset=".45" stop-color="#64e9ff" stop-opacity=".9" />
            <stop offset="1" stop-color="#2c8dff" stop-opacity=".25" />
          </linearGradient>
          <radialGradient id="holoFillV2" cx="50%" cy="40%" r="70%">
            <stop offset="0" stop-color="#9ef7ff" stop-opacity=".30" />
            <stop offset=".58" stop-color="#167dff" stop-opacity=".11" />
            <stop offset="1" stop-color="#00162c" stop-opacity="0" />
          </radialGradient>
          <filter id="glowV2">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <ellipse class="holo-base" cx="210" cy="688" rx="120" ry="14" />
        <path class="holo-scan" d="M70 648 Q210 610 350 648" />
        <g class="holo-body" filter="url(#glowV2)">
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
        <g class="holo-head" filter="url(#glowV2)">
          <path class="head-fill" d="M164 150 Q165 82 210 60 Q255 82 256 150 L244 238 Q235 274 210 286 Q185 274 176 238 Z" />
          <path class="head-stroke" d="M164 150 Q165 82 210 60 Q255 82 256 150 L244 238 Q235 274 210 286 Q185 274 176 238 Z" />
          <path class="hair" d="M165 142 Q173 64 210 58 Q250 64 255 142 Q240 112 210 108 Q184 111 165 142Z" />
          <path class="ear" d="M170 160 Q150 154 154 184 Q158 202 175 198 M250 160 Q270 154 266 184 Q262 202 245 198" />
          <path class="eye left-eye" d="M180 165 Q194 156 204 165 Q194 174 180 165Z" />
          <path class="eye right-eye" d="M216 165 Q226 156 240 165 Q226 174 216 165Z" />
          <path class="nose" d="M210 168 L205 205 L214 208" />
          <path class="mouth" :class="{ talking: speaking }" d="M194 224 Q210 232 226 224" />
          <path class="jaw" d="M180 226 Q188 260 210 268 Q232 260 240 226" />
          <circle class="forehead-mark" cx="210" cy="118" r="4" />
        </g>
      </svg>
      <div class="holo-caption"><span class="status-dot"></span><strong>006</strong><span>{{ speaking ? 'HABLANDO' : 'ESCUCHANDO' }}</span></div>
      <div class="holo-wave" :class="{ active: speaking || listening }"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
    </div>

    <button v-else class="agr006-orb" type="button" @click="togglePanel" aria-label="Abrir 006">
      <span class="agr006-ring ring-a"></span>
      <span class="agr006-ring ring-b"></span>
      <span class="agr006-core">006</span>
      <span class="agr006-status-dot"></span>
    </button>

    <section v-if="open" class="agr006-panel" aria-label="Asistente 006">
      <header class="agr006-header">
        <div><strong>006</strong><small>VITI Intelligence Core · Voz propia</small></div>
        <button type="button" class="agr006-close" @click="open = false">×</button>
      </header>
      <div class="agr006-body">
        <p class="agr006-presence">{{ presence }}</p>
        <div class="agr006-messages" aria-live="polite">
          <div v-for="(item, index) in messages" :key="index" :class="['agr006-message', item.role]">{{ item.text }}</div>
        </div>
        <div v-if="voiceActive" class="agr006-live-transcript"><span></span>{{ draft || 'Escuchando…' }}</div>
        <div class="agr006-actions">
          <button type="button" @click="submitCommand('resumen')">Resumen</button>
          <button type="button" @click="submitCommand('haz una ronda completa')">Ronda</button>
          <button type="button" @click="submitCommand('¿qué necesita atención?')">Atención</button>
        </div>
        <form class="agr006-input" @submit.prevent="submitTyped">
          <input v-model="draft" type="text" autocomplete="off" placeholder="Habla con 006..." />
          <button type="button" class="voice-btn" :class="{ armed: voiceArmed, active: voiceActive }" @click="toggleVoice" :aria-label="voiceActive ? 'Desactivar VITI' : 'Activar VITI'">{{ voiceActive ? '■' : '●' }}</button>
          <button type="submit" :disabled="!draft.trim()">→</button>
        </form>
        <small class="agr006-hint">{{ voiceActive ? 'Di “desactivar VITI” para terminar.' : 'Puedes escribir o decir “activar VITI”.' }}</small>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../boot/axios'
import { resolveAgr006LocalAction, type Agr006LocalAction } from '../../utils/agr006CommandRouter'

interface Message { role: 'user' | 'assistant'; text: string }
type Action = { type?: string; to?: string }

const route = useRoute()
const router = useRouter()
const visible = computed(() => route.meta?.requiresAuth === true)
const open = ref(false)
const draft = ref('')
const messages = ref<Message[]>([{ role: 'assistant', text: '006 en línea. VITI está operativo. ¿Qué necesitas?' }])
const state = ref<'online' | 'thinking' | 'attention'>('online')
const voiceArmed = ref(false)
const voiceActive = ref(false)
const listening = ref(false)
const speaking = ref(false)
let recognition: any = null
let restartTimer: ReturnType<typeof setTimeout> | null = null
let audio: HTMLAudioElement | null = null
let audioUrl: string | null = null
let recognitionSuppressed = false

const presence = computed(() => {
  if (speaking.value) return '006 está respondiendo.'
  if (voiceActive.value && listening.value) return '006 está escuchando.'
  if (state.value === 'thinking') return 'Analizando VITI...'
  if (state.value === 'attention') return 'Hay algo que requiere atención.'
  return '006 está activo y vigilando VITI.'
})

const normalize = (value: string) => value.toLocaleLowerCase('es-BO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¡!¿?.,;:]/g, ' ').replace(/\s+/g, ' ').trim()
const isWake = (value: string) => /(activar\s+viti|activar\s+006|activar\s+v\s*i\s*t\s*i)/.test(normalize(value))
const isSleep = (value: string) => /(desactivar\s+viti|desactivar\s+006|detener\s+viti|silencio\s+viti)/.test(normalize(value))

function togglePanel() { open.value = !open.value }
function pushMessage(role: Message['role'], text: string) { messages.value.push({ role, text }); if (messages.value.length > 60) messages.value.splice(0, messages.value.length - 60) }

function pauseRecognition() {
  recognitionSuppressed = true
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = null
  recognition?.stop()
  listening.value = false
}

function resumeRecognition() {
  recognitionSuppressed = false
  if (voiceArmed.value && voiceActive.value && !speaking.value) ensureRecognition()
}

async function runLocalAction(message: string): Promise<boolean> {
  const action = resolveAgr006LocalAction(message)
  if (!action) return false
  pushMessage('user', message)
  state.value = 'thinking'
  if (action.type === 'navigate') {
    await router.push(action.to)
  } else {
    await router.back()
  }
  state.value = 'online'
  pushMessage('assistant', action.label)
  await speak(action.label)
  return true
}

async function ask(message: string) {
  const value = message.trim()
  if (!value || !visible.value) return
  if (await runLocalAction(value)) return

  state.value = 'thinking'
  pushMessage('user', value)
  try {
    const response = await api.get('/dashboard', { params: { agr: value }, timeout: 30000 })
    const payload = response?.data || {}
    const answer = String(payload?.data?.message ?? payload?.message ?? payload?.data?.data?.message ?? 'No tengo una respuesta disponible todavía.')
    const action: Action | null = payload?.data?.action ?? payload?.action ?? payload?.data?.data?.action ?? null
    pushMessage('assistant', answer)
    state.value = 'online'
    await executeAction(action)
    await speak(answer)
  } catch (error: any) {
    state.value = Number(error?.response?.status) === 401 ? 'attention' : 'attention'
    pushMessage('assistant', Number(error?.response?.status) === 401 ? 'La sesión de VITI no está lista.' : 'No pude consultar VITI en este momento. Revisa la conexión del sistema.')
  }
}

async function executeAction(action: Action | Agr006LocalAction | null) {
  if (!action?.type) return
  if (action.type === 'navigate' && action.to) await router.push(action.to)
  if (action.type === 'browser_back') await router.back()
}

function typedActivation(value: string) {
  if (isWake(value)) { void activateVoice(); return true }
  if (isSleep(value)) { deactivateVoice(); return true }
  return false
}

function submitTyped() {
  const value = draft.value.trim()
  if (!value) return
  draft.value = ''
  if (typedActivation(value)) return
  void ask(value)
}

function submitCommand(value: string) { if (!typedActivation(value)) void ask(value) }

async function activateVoice() {
  if (voiceActive.value) return
  voiceArmed.value = true
  voiceActive.value = true
  open.value = true
  state.value = 'online'
  pushMessage('assistant', 'VITI activo. Te escucho.')
  await speak('VITI activo. Te escucho.')
  resumeRecognition()
}

function deactivateVoice() {
  voiceActive.value = false
  voiceArmed.value = false
  draft.value = ''
  pauseRecognition()
  pushMessage('assistant', 'VITI desactivado. Quedo en espera.')
  stopAudio()
  recognitionSuppressed = false
}

function toggleVoice() { voiceActive.value ? deactivateVoice() : void activateVoice() }

function ensureRecognition() {
  if (!voiceArmed.value || !voiceActive.value || recognitionSuppressed || speaking.value) return
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!Recognition) { pushMessage('assistant', 'Este navegador no dispone de reconocimiento de voz. Puedes seguir usando el chat escrito.'); return }
  recognition?.stop()
  recognition = new Recognition()
  recognition.lang = 'es-BO'
  recognition.interimResults = true
  recognition.continuous = true
  recognition.onstart = () => { if (!recognitionSuppressed && !speaking.value) listening.value = true }
  recognition.onend = () => {
    listening.value = false
    if (voiceArmed.value && voiceActive.value && !recognitionSuppressed && !speaking.value) {
      if (restartTimer) clearTimeout(restartTimer)
      restartTimer = setTimeout(ensureRecognition, 350)
    }
  }
  recognition.onerror = () => {
    listening.value = false
    if (voiceArmed.value && voiceActive.value && !recognitionSuppressed && !speaking.value) {
      if (restartTimer) clearTimeout(restartTimer)
      restartTimer = setTimeout(ensureRecognition, 800)
    }
  }
  recognition.onresult = (event: any) => {
    if (recognitionSuppressed || speaking.value) return
    let finalText = ''
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const part = String(event.results?.[i]?.[0]?.transcript || '').trim()
      if (event.results[i].isFinal) finalText += `${part} `
      else interim += `${part} `
    }
    if (interim) draft.value = interim.trim()
    const command = finalText.trim()
    if (!command) return
    if (isSleep(command)) { deactivateVoice(); return }
    draft.value = ''
    void ask(command)
  }
  try { recognition.start() } catch { /* evita doble start */ }
}

async function speak(textToSpeak: string) {
  if (!textToSpeak.trim()) return
  pauseRecognition()
  stopAudio()
  speaking.value = true
  try {
    const response = await api.post('/agr/voice', { text: textToSpeak }, { responseType: 'blob', headers: { Accept: 'audio/mpeg' }, timeout: 30000 })
    const type = String(response.headers?.['content-type'] || '').toLowerCase()
    if (!type.includes('audio/')) throw new Error('TTS no devolvió audio')
    audioUrl = URL.createObjectURL(response.data)
    audio = new Audio(audioUrl)
    audio.volume = 1
    audio.onended = () => { speaking.value = false; stopAudio(false); resumeRecognition() }
    await audio.play()
    return
  } catch {
    if ('speechSynthesis' in window) {
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(textToSpeak)
        utterance.lang = 'es-MX'
        utterance.rate = 0.9
        utterance.pitch = 0.78
        utterance.onend = () => { speaking.value = false; resumeRecognition(); resolve() }
        utterance.onerror = () => { speaking.value = false; resumeRecognition(); resolve() }
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
      })
      return
    }
  }
  speaking.value = false
  resumeRecognition()
}

function stopAudio(clearSpeaking = true) {
  if (audio) { audio.pause(); audio.src = ''; audio = null }
  if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = null }
  if (clearSpeaking) speaking.value = false
}

onBeforeUnmount(() => {
  recognitionSuppressed = true
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
.agr006-status-dot{position:absolute;right:7px;bottom:8px;width:10px;height:10px;border-radius:50%;background:#7dffb2;box-shadow:0 0 10px #7dffb2}.active .agr006-status-dot{background:#65dcff;box-shadow:0 0 14px #65dcff}
.agr006-panel{position:absolute;right:0;bottom:92px;width:min(420px,calc(100vw - 32px));max-height:560px;overflow:hidden;border:1px solid rgba(130,220,255,.2);border-radius:20px;background:linear-gradient(180deg,rgba(8,23,37,.96),rgba(3,12,22,.97));backdrop-filter:blur(18px);box-shadow:0 20px 70px rgba(0,0,0,.45),0 0 50px rgba(53,200,255,.12)}
.agr006-header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.07)}.agr006-header strong{display:block;font-size:18px;letter-spacing:.18em}.agr006-header small{display:block;margin-top:2px;color:#86a8b8;font-size:11px}.agr006-close{background:transparent;border:0;color:#92aebd;font-size:24px;cursor:pointer}
.agr006-body{padding:16px}.agr006-presence{margin:0 0 12px;color:#a9cedd;font-size:13px}.agr006-messages{display:flex;flex-direction:column;gap:9px;max-height:330px;overflow:auto;margin-bottom:12px}.agr006-message{max-width:88%;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.4}.agr006-message.user{align-self:flex-end;background:rgba(58,157,214,.17);border:1px solid rgba(98,197,244,.15)}.agr006-message.assistant{align-self:flex-start;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}
.agr006-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.agr006-actions button{border:1px solid rgba(133,220,255,.18);border-radius:10px;background:rgba(77,180,239,.1);color:#dff7ff;padding:7px 10px;cursor:pointer;font-size:12px}.agr006-input{display:flex;gap:8px}.agr006-input input{min-width:0;flex:1;border:1px solid rgba(133,220,255,.18);border-radius:12px;background:rgba(255,255,255,.035);color:#fff;padding:11px 12px;outline:none}.agr006-input button{width:40px;border:1px solid rgba(133,220,255,.18);border-radius:12px;background:rgba(77,180,239,.14);color:#dff7ff;cursor:pointer}.agr006-input button:disabled{opacity:.35;cursor:not-allowed}.voice-btn.active{background:rgba(56,201,255,.2);box-shadow:0 0 14px rgba(56,201,255,.22)}.voice-btn.armed{background:rgba(126,231,255,.12)}.agr006-hint{display:block;margin-top:9px;color:#7694a2;font-size:10px}
.agr006-live-transcript{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:8px 10px;border-radius:10px;background:rgba(47,170,222,.08);border:1px solid rgba(120,220,255,.15);color:#cdefff;font-size:12px}.agr006-live-transcript span{width:8px;height:8px;border-radius:50%;background:#69eaff;box-shadow:0 0 12px #69eaff;animation:pulse .9s infinite}
.hologram-layer{position:fixed;inset:0;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle at center,rgba(20,120,255,.10),rgba(0,0,0,0) 52%)}.holo-aura{position:absolute;width:520px;height:620px;border-radius:50%;background:radial-gradient(circle,rgba(65,211,255,.16),rgba(30,100,255,.06) 45%,rgba(0,0,0,0) 72%);filter:blur(15px);animation:breathe 3s ease-in-out infinite}.holo-grid{position:absolute;width:450px;height:650px;border:1px solid rgba(80,211,255,.09);background:repeating-linear-gradient(90deg,transparent 0 40px,rgba(90,220,255,.05) 41px 42px),repeating-linear-gradient(0deg,transparent 0 40px,rgba(90,220,255,.04) 41px 42px);transform:perspective(800px) rotateX(55deg) translateY(180px);opacity:.7}.holo-scanlines{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(128,230,255,.015) 0 2px,transparent 3px 6px);mix-blend-mode:screen}.hologram{position:relative;width:min(520px,78vw);height:min(80vh,760px);overflow:visible;filter:drop-shadow(0 0 14px rgba(72,214,255,.7));animation:materialize .9s ease-out, float 4s ease-in-out infinite}
.holo-body path,.holo-head path,.holo-head circle{fill:url(#holoFillV2);stroke:url(#holoStrokeV2);stroke-width:2}.holo-head .hair{fill:rgba(91,230,255,.16)}.holo-head .mouth{fill:none;stroke-linecap:round}.holo-head .mouth.talking{animation:mouthTalk .18s steps(2,end) infinite}.holo-caption{position:absolute;bottom:92px;display:flex;gap:10px;align-items:center;letter-spacing:.18em;font-size:12px;color:#b8eeff;text-shadow:0 0 12px rgba(104,227,255,.8)}.status-dot{width:9px;height:9px;border-radius:50%;background:#68efff;box-shadow:0 0 12px #68efff}.holo-wave{position:absolute;bottom:56px;display:flex;gap:4px;align-items:center}.holo-wave i{display:block;width:4px;height:10px;border-radius:4px;background:#64eaff;box-shadow:0 0 8px rgba(100,234,255,.65)}.holo-wave.active i{animation:wave .6s ease-in-out infinite alternate}.holo-wave i:nth-child(2){animation-delay:.08s}.holo-wave i:nth-child(3){animation-delay:.16s}.holo-wave i:nth-child(4){animation-delay:.24s}.holo-wave i:nth-child(5){animation-delay:.32s}.holo-wave i:nth-child(6){animation-delay:.4s}.holo-wave i:nth-child(7){animation-delay:.48s}.holo-wave i:nth-child(8){animation-delay:.56s}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes spin{to{transform:rotate(382deg)}}@keyframes spinReverse{to{transform:rotate(-382deg)}}@keyframes pulse{50%{opacity:.35}}@keyframes breathe{0%,100%{transform:scale(.96);opacity:.75}50%{transform:scale(1.04);opacity:1}}@keyframes materialize{from{opacity:0;transform:scale(.96) translateY(20px);filter:drop-shadow(0 0 2px rgba(72,214,255,.2))}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes mouthTalk{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1.25)}}@keyframes wave{from{height:7px;opacity:.45}to{height:24px;opacity:1}}
@media (max-width:640px){.agr006-root{right:14px;bottom:14px}.agr006-orb{width:68px;height:68px}.agr006-panel{bottom:82px}.hologram-layer{place-items:center}.hologram{width:92vw;height:78vh}.holo-caption{bottom:60px}}
</style>
