<template><div ref="frame" class="player">
<video ref="video" :src="src" :poster="poster||undefined" controls playsinline preload="none" @error="failed=true" @loadedmetadata="failed=false" @play="playing=true" @pause="playing=false" @ended="playing=false"/>
<div v-if="failed" class="play-error">No se pudo reproducir el video. Comprueba la conexión o el formato.</div><div v-if="logo" class="mark"><img :src="logo" alt="Marca del estudio"/></div>
<div class="toolbar"><span>{{title}}</span><q-btn dense flat color="white" :icon="playing?'pause':'play_arrow'" :aria-label="playing?'Pausar':'Reproducir'" @click="toggle"/><q-btn dense flat color="white" icon="fullscreen" aria-label="Pantalla completa" @click="full"/></div>
</div></template>
<script setup>
import {ref} from 'vue'
defineProps({src:{type:String,required:true},title:{type:String,default:'Sensaciones'},logo:String,poster:String})
const video=ref(null),frame=ref(null),playing=ref(false),failed=ref(false)
async function toggle(){try{if(video.value.paused)await video.value.play();else video.value.pause()}catch{/* controles nativos disponibles */}}
async function full(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(frame.value.requestFullscreen)await frame.value.requestFullscreen();else video.value.webkitEnterFullscreen?.()}catch{/* navegador no compatible */}}
</script>
<style scoped>.player{position:relative;background:#09090b;color:#fff;overflow:hidden;border-radius:12px}.player video{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#000}.mark{position:absolute;top:12px;right:12px;pointer-events:none}.mark img{max-width:110px;max-height:48px;object-fit:contain;opacity:.75}.toolbar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#18181d}.toolbar span{flex:1;font-size:12px;overflow-wrap:anywhere}.player:fullscreen{display:flex;flex-direction:column;justify-content:center}.player:fullscreen video{max-height:calc(100vh - 55px);aspect-ratio:auto}.play-error{padding:10px 12px;color:#ffd1aa;background:#38231c;font-size:12px}
</style>
