<template>
  <div v-if="visible" class="agr006-root" :class="{ open, active: voiceActive, speaking, listening }">
    <div v-if="voiceActive" class="hologram-layer" aria-hidden="true">
      <div class="holo-aura"></div><div class="holo-grid"></div><div class="holo-scanlines"></div>
      <svg class="hologram" viewBox="0 0 420 720" role="img" aria-label="006 holograma">
        <defs>
          <linearGradient id="holoStrokeV3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6fcff"/><stop offset=".45" stop-color="#64e9ff" stop-opacity=".9"/><stop offset="1" stop-color="#2c8dff" stop-opacity=".25"/></linearGradient>
          <radialGradient id="holoFillV3" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#9ef7ff" stop-opacity=".3"/><stop offset=".58" stop-color="#167dff" stop-opacity=".11"/><stop offset="1" stop-color="#00162c" stop-opacity="0"/></radialGradient>
          <filter id="glowV3"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <ellipse class="holo-base" cx="210" cy="688" rx="120" ry="14"/><path class="holo-scan" d="M70 648 Q210 610 350 648"/>
        <g class="holo-body" filter="url(#glowV3)">
          <path class="body-fill" d="M126 625 C112 585 120 548 145 523 L168 498 L178 415 L145 352 L155 300 L182 270 L238 270 L265 300 L275 352 L242 415 L252 498 L275 523 C300 548 308 585 294 625 L270 676 L150 676 Z"/>
          <path class="body-stroke" d="M168 498 L178 415 L145 352 L155 300 L182 270 L238 270 L265 300 L275 352 L242 415 L252 498"/>
          <path class="lapel" d="M176 288 L207 330 L238 288 M207 330 L205 485 M207 330 L214 485"/><path class="tie" d="M204 294 L218 294 L225 383 L210 402 L196 383 Z"/>
          <path class="arm left" d="M158 310 Q124 353 105 430 Q96 465 118 474 Q138 482 150 447 L184 360"/><path class="arm right" d="M262 310 Q296 353 315 430 Q324 465 302 474 Q282 482 270 447 L236 360"/>
          <path class="hand left-hand" d="M118 447 Q103 441 96 454 Q90 466 102 477 Q115 488 130 480 Q141 473 140 458 Z"/><path class="hand right-hand" d="M302 447 Q317 441 324 454 Q330 466 318 477 Q305 488 290 480 Q279 473 280 458 Z"/>
          <path class="leg left-leg" d="M155 502 L202 502 L198 672 L150 672 Z"/><path class="leg right-leg" d="M218 502 L265 502 L270 672 L222 672 Z"/>
        </g>
        <g class="holo-head" filter="url(#glowV3)">
          <path class="head-fill" d="M164 150 Q165 82 210 60 Q255 82 256 150 L244 238 Q235 274 210 286 Q185 274 176 238 Z"/><path class="head-stroke" d="M164 150 Q165 82 210 60 Q255 82 256 150 L244 238 Q235 274 210 286 Q185 274 176 238 Z"/>
          <path class="hair" d="M165 142 Q173 64 210 58 Q250 64 255 142 Q240 112 210 108 Q184 111 165 142Z"/><path class="ear" d="M170 160 Q150 154 154 184 Q158 202 175 198 M250 160 Q270 154 266 184 Q262 202 245 198"/>
          <path class="eye" d="M180 165 Q194 156 204 165 Q194 174 180 165Z"/><path class="eye" d="M216 165 Q226 156 240 165 Q226 174 216 165Z"/><path class="nose" d="M210 168 L205 205 L214 208"/>
          <path class="mouth" :class="{ talking: speaking }" d="M194 224 Q210 232 226 224"/><path class="jaw" d="M180 226 Q188 260 210 268 Q232 260 240 226"/><circle class="forehead-mark" cx="210" cy="118" r="4"/>
        </g>
      </svg>
      <div class="holo-caption"><span class="status-dot"></span><strong>006</strong><span>{{ speaking ? 'HABLANDO' : 'ESCUCHANDO' }}</span></div>
      <div class="holo-wave" :class="{ active: speaking || listening }"><i v-for="n in 8" :key="n"></i></div>
    </div>

    <button v-else class="agr006-orb" type="button" @click="togglePanel" aria-label="Abrir 006"><span class="agr006-ring ring-a"></span><span class="agr006-ring ring-b"></span><span class="agr006-core">006</span><span class="agr006-status-dot"></span></button>

    <section v-if="open" class="agr006-panel" aria-label="Asistente 006">
      <header class="agr006-header"><div><strong>006</strong><small>VITI Intelligence Core · Voz propia</small></div><button type="button" class="agr006-close" @click="open = false">×</button></header>
      <div class="agr006-body">
        <p class="agr006-presence">{{ presence }}</p>
        <div class="agr006-messages" aria-live="polite"><div v-for="(item,index) in messages" :key="index" :class="['agr006-message',item.role]">{{ item.text }}</div></div>
        <div v-if="voiceActive" class="agr006-live-transcript"><span></span>{{ draft || 'Escuchando…' }}</div>
        <div class="agr006-actions"><button type="button" @click="submitCommand('resumen')">Resumen</button><button type="button" @click="submitCommand('haz una ronda completa')">Ronda</button><button type="button" @click="submitCommand('¿qué necesita atención?')">Atención</button></div>
        <form class="agr006-input" @submit.prevent="submitTyped"><input v-model="draft" type="text" autocomplete="off" placeholder="Habla con 006..."/><button type="button" class="voice-btn" :class="{armed:voiceArmed,active:voiceActive}" @click="toggleVoice">{{ voiceActive ? '■' : '●' }}</button><button type="submit" :disabled="!draft.trim()">→</button></form>
        <small class="agr006-hint">{{ voiceActive ? '006 procesa cada frase. Di “desactivar VITI” para terminar.' : 'Escribe o di “activar VITI”.' }}</small>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../../boot/axios'

interface Message { role:'user'|'assistant'; text:string }
type Action={type?:string;to?:string}
const route=useRoute(); const router=useRouter(); const visible=computed(()=>route.meta?.requiresAuth===true)
const open=ref(false); const draft=ref(''); const messages=ref<Message[]>([{role:'assistant',text:'006 en línea. VITI está operativo. ¿Qué necesitas?'}]); const state=ref<'online'|'thinking'|'attention'|'critical'>('online'); const voiceArmed=ref(false); const voiceActive=ref(false); const listening=ref(false); const speaking=ref(false)
let recognition:any=null; let restartTimer:ReturnType<typeof setTimeout>|null=null; let audio:HTMLAudioElement|null=null; let audioUrl:string|null=null
const presence=computed(()=>speaking.value?'006 está respondiendo.':voiceActive.value?'006 está escuchando.':state.value==='thinking'?'Analizando VITI...':state.value==='attention'?'Hay algo que requiere atención.':state.value==='critical'?'Hay una incidencia importante en VITI.':'006 está activo y vigilando VITI.')
const norm=(v:string)=>v.toLocaleLowerCase('es-BO').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[¡!¿?.,;:]/g,' ').replace(/\s+/g,' ').trim()
const wake=(v:string)=>/(activar\s+(viti|006)|activar\s+v\s*i\s*t\s*i)/.test(norm(v)); const sleep=(v:string)=>/(desactivar\s+(viti|006)|detener\s+viti|silencio\s+viti)/.test(norm(v))
const localRoutes=[
  {to:'/empresas',keys:['cliente','clientes','empresa','empresas','negocio','negocios']},
  {to:'/solicitudes',keys:['solicitud','solicitudes']},
  {to:'/proyectos',keys:['proyecto','proyectos']},
  {to:'/pagos',keys:['pago','pagos']},
  {to:'/mantenimientos',keys:['soporte','soportes','mantenimiento','mantenimientos']},
]
function togglePanel(){open.value=!open.value} function push(role:Message['role'],text:string){messages.value.push({role,text});if(messages.value.length>60)messages.value.splice(0,messages.value.length-60)}
function localCommand(value:string){
  const t=norm(value); if(!t)return null
  if(/\b(atras|vuelve|volver|regresa|regresar)\b/.test(t))return {type:'browser_back' as const}
  const navVerb=/(abrir|abre|habre|habre|ir|entra|entrar|muestra|mostrar|ver|quiero\s+ver|llevarme|llevame|mandame|manda|vete|ve\s+a|vamos\s+a)/.test(t)
  for(const routeDef of localRoutes) if(routeDef.keys.some(k=>t.includes(k)) && navVerb) return {type:'navigate' as const,to:routeDef.to}
  return null
}
function localReply(value:string){
  const t=norm(value)
  if(/\b(abre|abrir|habre|ir|entra|muestra|mostrar|ver|lleva|llevame|manda|vamos)\b/.test(t) && !localCommand(value)) return 'Claro. Dime qué módulo quieres abrir: clientes, empresas, solicitudes, proyectos, pagos o soporte.'
  return null
}
async function ask(message:string){
  const value=message.trim(); if(!value||!visible.value)return
  const local=localCommand(value); if(local){ push('user',value); const answer=local.type==='browser_back'?'Regresando.':`Te llevo al módulo solicitado.`; push('assistant',answer); state.value='online'; await execute(local); await speak(answer); return }
  const guided=localReply(value); if(guided){push('user',value);push('assistant',guided);state.value='online';await speak(guided);return}
  state.value='thinking'; push('user',value)
  try{
    const response=await api.get('/dashboard',{params:{agr:value},timeout:30000}); const payload=response?.data||{}; const answer=String(payload?.data?.message??payload?.message??payload?.data?.data?.message??'No tengo una respuesta disponible todavía.'); const action:Action|null=payload?.data?.action??payload?.action??payload?.data?.data?.action??null
    push('assistant',answer); state.value=payload?.health==='critical'?'critical':payload?.health==='attention'?'attention':'online'; await execute(action); await speak(answer)
  }catch(error:any){state.value='attention';push('assistant',Number(error?.response?.status)===401?'La sesión de VITI no está lista.':'No pude consultar VITI en este momento. Revisa la conexión del sistema.')}
}
async function execute(action:Action|null){if(!action?.type)return;if(action.type==='navigate'&&action.to)await router.push(action.to);if(action.type==='browser_back')await router.back()}
function typedControl(value:string){if(wake(value)){activateVoice();return true}if(sleep(value)){deactivateVoice();return true}return false}
function submitTyped(){const value=draft.value.trim();if(!value)return;if(typedControl(value)){draft.value='';return}draft.value='';void ask(value)} function submitCommand(value:string){if(!typedControl(value))void ask(value)}
function activateVoice(){if(voiceActive.value)return;voiceArmed.value=true;voiceActive.value=true;open.value=true;state.value='online';push('assistant','VITI activo. Te escucho.');void speak('VITI activo. Te escucho.')}
function deactivateVoice(){voiceActive.value=false;voiceArmed.value=false;listening.value=false;draft.value='';recognition?.stop();recognition=null;if(restartTimer)clearTimeout(restartTimer);restartTimer=null;stopAudio();push('assistant','VITI desactivado. Quedo en espera.');state.value='online'}
function toggleVoice(){voiceActive.value?deactivateVoice():activateVoice()}
function startRecognition(){if(!voiceActive.value||speaking.value)return;const Recognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!Recognition){push('assistant','Este navegador no dispone de reconocimiento de voz.');return}recognition?.stop();recognition=new Recognition();recognition.lang='es-BO';recognition.interimResults=true;recognition.continuous=true;recognition.onstart=()=>listening.value=true;recognition.onend=()=>{listening.value=false;if(voiceActive.value&&!speaking.value){restartTimer=setTimeout(startRecognition,350)}};recognition.onerror=()=>{listening.value=false;if(voiceActive.value&&!speaking.value){restartTimer=setTimeout(startRecognition,800)}};recognition.onresult=(event:any)=>{let finalText='';let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const part=String(event.results?.[i]?.[0]?.transcript||'').trim();if(event.results[i].isFinal)finalText+=`${part} `;else interim+=`${part} `}if(interim)draft.value=interim.trim();const command=finalText.trim();if(!command)return;if(sleep(command)){deactivateVoice();return}draft.value='';void ask(command)};try{recognition.start()}catch{} }
async function speak(textToSpeak:string){if(!textToSpeak.trim())return;recognition?.stop();listening.value=false;stopAudio();speaking.value=true;try{const response=await api.post('/agr/voice',{text:textToSpeak},{responseType:'blob',headers:{Accept:'audio/mpeg'},timeout:30000});const type=String(response.headers?.['content-type']||'').toLowerCase();if(!type.includes('audio/'))throw new Error('TTS no devolvió audio');audioUrl=URL.createObjectURL(response.data);audio=new Audio(audioUrl);audio.onended=()=>{speaking.value=false;stopAudio(false);if(voiceActive.value)startRecognition()};await audio.play();return}catch{speaking.value=false}if('speechSynthesis'in window){const utterance=new SpeechSynthesisUtterance(textToSpeak);utterance.lang='es-MX';utterance.rate=.9;utterance.pitch=.78;utterance.onend=()=>{speaking.value=false;if(voiceActive.value)startRecognition()};window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance)}}
function stopAudio(revoke=true){if(audio){audio.pause();audio.src='';audio=null}if(revoke&&audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null}}
onBeforeUnmount(()=>{recognition?.stop();if(restartTimer)clearTimeout(restartTimer);stopAudio();window.speechSynthesis?.cancel()})
</script>

<style scoped>
.agr006-root{position:fixed;right:24px;bottom:24px;z-index:9999;color:#eaf7ff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.agr006-orb{width:78px;height:78px;position:relative;border:0;border-radius:50%;background:radial-gradient(circle at 50% 46%,#fff,rgba(117,225,255,.55) 17%,rgba(37,150,255,.2) 38%,transparent 67%);box-shadow:0 0 22px rgba(53,200,255,.55),0 0 70px rgba(53,200,255,.2);cursor:pointer;animation:float 3.8s ease-in-out infinite}.agr006-core{position:absolute;inset:18px;border-radius:50%;display:grid;place-items:center;background:rgba(7,25,41,.72);border:1px solid rgba(165,237,255,.7);box-shadow:inset 0 0 18px rgba(72,211,255,.45);font-weight:800;letter-spacing:.14em;font-size:12px}.agr006-ring{position:absolute;inset:5px;border:1px solid rgba(126,231,255,.55);border-radius:50%}.ring-a{animation:spin 7s linear infinite}.ring-b{inset:10px;border-style:dashed;opacity:.55;animation:spinR 11s linear infinite}.agr006-status-dot{position:absolute;right:7px;bottom:8px;width:10px;height:10px;border-radius:50%;background:#7dffb2;box-shadow:0 0 10px #7dffb2}.active .agr006-status-dot{background:#63f7ff;box-shadow:0 0 18px #63f7ff;animation:pulse .55s infinite}
.hologram-layer{position:fixed;right:70px;bottom:20px;width:min(370px,36vw);height:min(620px,72vh);display:flex;align-items:flex-end;justify-content:center;pointer-events:none;filter:drop-shadow(0 0 24px rgba(53,200,255,.45));animation:appear .65s ease-out}.hologram{width:100%;height:100%}.holo-aura{position:absolute;inset:14% 12% 3%;background:radial-gradient(ellipse,rgba(61,210,255,.16),transparent 72%);filter:blur(14px);animation:aura 2.8s ease-in-out infinite}.holo-grid{position:absolute;left:10%;right:10%;bottom:7%;height:30%;opacity:.18;background:repeating-linear-gradient(0deg,rgba(100,230,255,.7) 0 1px,transparent 1px 16px),repeating-linear-gradient(90deg,rgba(100,230,255,.4) 0 1px,transparent 1px 22px);mask-image:linear-gradient(to top,black,transparent)}.holo-scanlines{position:absolute;left:18%;right:18%;top:18%;bottom:13%;background:repeating-linear-gradient(0deg,rgba(120,235,255,.06) 0 1px,transparent 1px 5px);mix-blend-mode:screen;opacity:.5}.body-fill,.head-fill{fill:url(#holoFillV3)}.body-stroke,.head-stroke,.lapel,.tie,.arm,.hand,.leg,.hair,.ear,.eye,.nose,.mouth,.jaw,.holo-base,.holo-scan{fill:none;stroke:url(#holoStrokeV3);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.holo-body{transform-origin:center bottom;animation:bodyFloat 3.4s ease-in-out infinite}.holo-head{transform-origin:210px 170px;animation:headFloat 5s ease-in-out infinite}.hair{stroke-width:5}.forehead-mark{fill:#dffbff;filter:drop-shadow(0 0 9px #53eaff)}.eye{fill:#b8fbff;stroke-width:2;animation:blink 5.5s infinite}.mouth.talking{animation:talk .15s ease-in-out infinite alternate;transform-origin:center}.speaking .holo-head{animation:talkHead 1.5s ease-in-out infinite}.speaking .left-hand{animation:gestureL 1.5s infinite alternate;transform-origin:110px 462px}.speaking .right-hand{animation:gestureR 1.9s infinite alternate;transform-origin:310px 462px}.holo-caption{position:absolute;left:50%;bottom:8%;transform:translateX(-50%);display:flex;gap:8px;align-items:center;padding:7px 13px;border-radius:999px;border:1px solid rgba(108,232,255,.28);background:rgba(4,20,34,.75);backdrop-filter:blur(10px);white-space:nowrap}.holo-caption strong{font-size:12px;letter-spacing:.22em}.holo-caption span:last-child{font-size:10px;color:#8fe8ff}.status-dot{width:7px;height:7px;border-radius:50%;background:#6bffb0;box-shadow:0 0 12px #6bffb0}.speaking .status-dot{background:#ffd86b}.holo-wave{position:absolute;left:50%;bottom:3%;transform:translateX(-50%);display:flex;gap:3px;height:24px;align-items:center}.holo-wave i{width:3px;height:8px;border-radius:3px;background:#63edff}.holo-wave.active i{animation:wave .6s ease-in-out infinite alternate}.holo-wave i:nth-child(2){animation-delay:.08s}.holo-wave i:nth-child(3){animation-delay:.16s}.holo-wave i:nth-child(4){animation-delay:.24s}.holo-wave i:nth-child(5){animation-delay:.32s}.holo-wave i:nth-child(6){animation-delay:.4s}.holo-wave i:nth-child(7){animation-delay:.48s}.holo-wave i:nth-child(8){animation-delay:.56s}
.agr006-panel{position:absolute;right:0;bottom:92px;width:min(420px,calc(100vw - 32px));max-height:560px;overflow:hidden;border:1px solid rgba(130,220,255,.2);border-radius:20px;background:linear-gradient(180deg,rgba(8,23,37,.96),rgba(3,12,22,.97));backdrop-filter:blur(18px);box-shadow:0 20px 70px rgba(0,0,0,.45),0 0 50px rgba(53,200,255,.12)}.agr006-header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.07)}.agr006-header strong{display:block;font-size:18px;letter-spacing:.18em}.agr006-header small{display:block;margin-top:2px;color:#86a8b8;font-size:11px}.agr006-close{background:transparent;border:0;color:#92aebd;font-size:24px;cursor:pointer}.agr006-body{padding:16px}.agr006-presence{margin:0 0 12px;color:#a9cedd;font-size:13px}.agr006-messages{display:flex;flex-direction:column;gap:9px;max-height:320px;overflow:auto;margin-bottom:12px}.agr006-message{max-width:88%;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.4}.agr006-message.user{align-self:flex-end;background:rgba(58,157,214,.17);border:1px solid rgba(98,197,244,.15)}.agr006-message.assistant{align-self:flex-start;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}.agr006-live-transcript{display:flex;gap:8px;align-items:center;margin-bottom:10px;padding:10px 12px;border-radius:12px;background:rgba(63,229,255,.08);color:#b8f5ff;font-size:12px}.agr006-live-transcript span{width:7px;height:7px;border-radius:50%;background:#5ff4ff;box-shadow:0 0 12px #5ff4ff}.agr006-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.agr006-actions button,.voice-btn,.agr006-input>button{border:1px solid rgba(133,220,255,.18);border-radius:10px;background:rgba(77,180,239,.1);color:#dff7ff;padding:7px 10px;cursor:pointer}.agr006-input{display:flex;gap:8px}.agr006-input input{min-width:0;flex:1;border:1px solid rgba(133,220,255,.18);border-radius:12px;background:rgba(255,255,255,.035);color:#fff;padding:11px 12px;outline:none}.voice-btn.active{background:rgba(99,247,255,.16);box-shadow:0 0 14px rgba(99,247,255,.16)}.agr006-hint{display:block;margin-top:8px;color:#7094a6;font-size:10px;text-align:center}
@keyframes float{50%{transform:translateY(-7px)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes spinR{to{transform:rotate(-360deg)}}@keyframes pulse{50%{opacity:.35}}@keyframes appear{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}@keyframes aura{50%{transform:scale(1.05)}}@keyframes bodyFloat{50%{transform:translateY(-6px)}}@keyframes headFloat{50%{transform:translate(1px,-3px) rotate(.8deg)}}@keyframes blink{0%,44%,48%,100%{opacity:1}46%{opacity:.08}}@keyframes talk{from{transform:scaleY(.35)}to{transform:scaleY(1.25)}}@keyframes talkHead{50%{transform:translateY(-2px) rotate(-.6deg)}}@keyframes gestureL{to{transform:rotate(4deg) translate(2px,-3px)}}@keyframes gestureR{to{transform:rotate(-3deg) translate(-1px,2px)}}@keyframes wave{from{height:5px}to{height:22px}}
@media(max-width:900px){.hologram-layer{right:0;bottom:55px;width:80vw;height:62vh}.agr006-panel{right:0;bottom:88px}.hologram-layer+.agr006-panel{display:none}}@media(max-width:640px){.agr006-root{right:14px;bottom:14px}.hologram-layer{width:92vw;height:62vh}}
</style>