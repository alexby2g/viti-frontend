<template>
  <div v-if="visible" class="agr006-root" :class="[`state-${state}`, { open }]">
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
          <small>VITI Intelligence Core</small>
        </div>
        <button type="button" class="agr006-close" @click="open = false">×</button>
      </header>

      <div class="agr006-body">
        <p class="agr006-presence">{{ presenceMessage }}</p>

        <div v-if="messages.length" class="agr006-messages" aria-live="polite">
          <div v-for="(item, index) in messages" :key="index" :class="['agr006-message', item.role]">
            <span>{{ item.text }}</span>
          </div>
        </div>

        <div class="agr006-actions">
          <button type="button" @click="runCommand('resumen')">Resumen</button>
          <button type="button" @click="runCommand('haz una ronda completa')">Ronda</button>
          <button type="button" @click="runCommand('¿qué necesita atención?')">Atención</button>
        </div>

        <form class="agr006-input" @submit.prevent="sendText">
          <input v-model="text" type="text" autocomplete="off" placeholder="Habla con 006..." />
          <button type="button" :class="['voice-btn', { listening }]" :aria-label="listening ? 'Detener voz' : 'Hablar con 006'" @click="toggleVoice">
            {{ listening ? '■' : '●' }}
          </button>
          <button type="submit" :disabled="!text.trim()">→</button>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../../boot/axios'

interface Message { role: 'user' | 'assistant'; text: string }
type State = 'online' | 'thinking' | 'attention' | 'critical'

const route = useRoute()
const visible = computed(() => route.meta?.requiresAuth === true)
const open = ref(false)
const text = ref('')
const messages = ref<Message[]>([])
const state = ref<State>('online')
const listening = ref(false)

const presenceMessage = computed(() => {
  if (state.value === 'thinking') return 'Analizando VITI...'
  if (state.value === 'attention') return 'He detectado algo que merece tu atención.'
  if (state.value === 'critical') return 'Hay una incidencia importante en VITI.'
  return 'Estoy activo y vigilando VITI.'
})

let recognition: any = null

async function ask(message: string) {
  const normalized = String(message || '').trim()
  if (!normalized) return
  if (!visible.value) return
  state.value = 'thinking'
  messages.value.push({ role: 'user', text: normalized })
  try {
    const response = await api.get('/dashboard', { params: { agr: normalized } })
    const payload = response?.data || {}
    const answer = payload?.data?.message ?? payload?.message ?? payload?.data?.data?.message ?? 'No tengo una respuesta disponible todavía.'
    messages.value.push({ role: 'assistant', text: String(answer) })
    state.value = ['critical', 'attention'].includes(String(payload?.health || '')) ? 'attention' : 'online'
    speakIfEnabled(String(answer))
  } catch (error: any) {
    const status = Number(error?.response?.status || 0)
    state.value = status === 401 || status === 419 ? 'attention' : 'critical'
    messages.value.push({
      role: 'assistant',
      text: status === 401 || status === 419
        ? 'La sesión de VITI no está lista. Mantén abierta la sesión e inténtalo de nuevo.'
        : 'No pude consultar VITI en este momento. Revisa la conexión del sistema.'
    })
  }
}

function sendText() {
  const value = text.value.trim()
  if (!value) return
  text.value = ''
  void ask(value)
}

function runCommand(command: string) {
  void ask(command)
}

function toggle() {
  open.value = !open.value
  if (open.value && messages.value.length === 0) {
    messages.value.push({ role: 'assistant', text: '006 online. Estoy conectado al núcleo de VITI. ¿Qué necesitas?' })
  }
}

function toggleVoice() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    state.value = 'attention'
    messages.value.push({ role: 'assistant', text: 'Este navegador no expone reconocimiento de voz. Puedes escribirme aquí.' })
    return
  }
  if (listening.value) {
    recognition?.stop()
    return
  }
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  recognition = new Recognition()
  recognition.lang = 'es-BO'
  recognition.interimResults = false
  recognition.continuous = false
  recognition.onstart = () => { listening.value = true; state.value = 'thinking' }
  recognition.onend = () => { listening.value = false; if (state.value === 'thinking') state.value = 'online' }
  recognition.onerror = () => { listening.value = false; state.value = 'attention' }
  recognition.onresult = (event: any) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim()
    if (transcript) void ask(transcript)
  }
  recognition.start()
}

function speakIfEnabled(textToSpeak: string) {
  if (!('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(textToSpeak)
  utterance.lang = 'es-BO'
  utterance.rate = 1
  utterance.pitch = 0.95
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

onBeforeUnmount(() => {
  recognition?.stop()
  window.speechSynthesis?.cancel()
})
</script>

<style scoped>
.agr006-root{position:fixed;right:24px;bottom:24px;z-index:9999;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eaf7ff}
.agr006-orb{position:relative;width:78px;height:78px;border:0;border-radius:50%;background:radial-gradient(circle at 50% 46%,rgba(255,255,255,.95),rgba(117,225,255,.55) 17%,rgba(37,150,255,.2) 38%,rgba(0,0,0,0) 67%);box-shadow:0 0 22px rgba(53,200,255,.55),0 0 70px rgba(53,200,255,.2);cursor:pointer;animation:float 3.8s ease-in-out infinite}
.agr006-core{position:absolute;inset:18px;border-radius:50%;display:grid;place-items:center;background:rgba(7,25,41,.72);border:1px solid rgba(165,237,255,.7);box-shadow:inset 0 0 18px rgba(72,211,255,.45),0 0 18px rgba(72,211,255,.35);font-weight:800;letter-spacing:.14em;font-size:12px}
.agr006-ring{position:absolute;inset:5px;border:1px solid rgba(126,231,255,.55);border-radius:50%;transform:rotate(22deg)}
.ring-a{animation:spin 7s linear infinite}.ring-b{inset:10px;border-style:dashed;opacity:.55;animation:spinReverse 11s linear infinite}
.agr006-status-dot{position:absolute;right:7px;bottom:8px;width:10px;height:10px;border-radius:50%;background:#7dffb2;box-shadow:0 0 10px #7dffb2}
.state-thinking .agr006-status-dot{background:#ffe680;box-shadow:0 0 12px #ffe680;animation:pulse .8s infinite}.state-attention .agr006-status-dot{background:#ffbf66;box-shadow:0 0 12px #ffbf66}.state-critical .agr006-status-dot{background:#ff6565;box-shadow:0 0 13px #ff6565;animation:pulse .7s infinite}
.agr006-panel{position:absolute;right:0;bottom:92px;width:min(420px,calc(100vw - 32px));max-height:560px;overflow:hidden;border:1px solid rgba(130,220,255,.2);border-radius:20px;background:linear-gradient(180deg,rgba(8,23,37,.96),rgba(3,12,22,.97));backdrop-filter:blur(18px);box-shadow:0 20px 70px rgba(0,0,0,.45),0 0 50px rgba(53,200,255,.12)}
.agr006-header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.07)}.agr006-header strong{display:block;font-size:18px;letter-spacing:.18em}.agr006-header small{display:block;margin-top:2px;color:#86a8b8;font-size:11px}.agr006-close{background:transparent;border:0;color:#92aebd;font-size:24px;cursor:pointer}
.agr006-body{padding:16px}.agr006-presence{margin:0 0 12px;color:#a9cedd;font-size:13px}.agr006-messages{display:flex;flex-direction:column;gap:9px;max-height:360px;overflow:auto;margin-bottom:12px}.agr006-message{max-width:88%;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.4}.agr006-message.user{align-self:flex-end;background:rgba(58,157,214,.17);border:1px solid rgba(98,197,244,.15)}.agr006-message.assistant{align-self:flex-start;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}
.agr006-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.agr006-actions button{border:1px solid rgba(133,220,255,.18);border-radius:10px;background:rgba(77,180,239,.1);color:#dff7ff;padding:7px 10px;cursor:pointer;font-size:12px}.agr006-actions button:hover{background:rgba(77,180,239,.18)}
.agr006-input{display:flex;gap:8px}.agr006-input input{min-width:0;flex:1;border:1px solid rgba(133,220,255,.18);border-radius:12px;background:rgba(255,255,255,.035);color:#fff;padding:11px 12px;outline:none}.agr006-input input:focus{border-color:rgba(133,220,255,.5)}.agr006-input button{width:40px;border:1px solid rgba(133,220,255,.18);border-radius:12px;background:rgba(77,180,239,.14);color:#dff7ff;cursor:pointer}.agr006-input button:disabled{opacity:.35;cursor:not-allowed}.voice-btn.listening{background:rgba(255,92,92,.2);border-color:rgba(255,112,112,.4)}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes spin{to{transform:rotate(382deg)}}@keyframes spinReverse{to{transform:rotate(-382deg)}}@keyframes pulse{50%{opacity:.35}}
@media (max-width:640px){.agr006-root{right:14px;bottom:14px}.agr006-orb{width:68px;height:68px}.agr006-panel{bottom:82px}}
</style>
