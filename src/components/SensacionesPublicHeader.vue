<template>
<header class="sd-header">
  <router-link to="/" class="sd-logo" aria-label="Sensaciones Audiovisuales, inicio"><img :src="logo||'/sensaciones-logo.svg'" alt="Sensaciones Audiovisuales" @error="logo=''"/></router-link>
  <nav class="sd-desktop" aria-label="Navegación principal"><router-link v-for="n in nav" :key="n.to" :to="n.to">{{n.label}}</router-link></nav>
  <div class="sd-actions"><template v-if="!offline"><q-btn unelevated color="deep-orange" icon="add" label="Estudio" no-caps to="/sensaciones/studio"/><q-btn flat round icon="account_circle" aria-label="Mi cuenta" to="/login"/></template><q-btn class="sd-mobile" flat round icon="menu" aria-label="Menú"><q-menu><q-list><q-item v-for="n in nav" :key="n.to" clickable :to="n.to" v-close-popup><q-item-section>{{n.label}}</q-item-section></q-item></q-list></q-menu></q-btn></div>
</header>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import {api} from '../boot/axios'
import {mediaUrl} from '../services/sensacionesMedia'
const offline=import.meta.env.VITE_SENSACIONES_OFFLINE_PREVIEW==='1'
const logo=ref('')
const nav=[{label:'Inicio',to:'/'},{label:'Proyectos',to:'/sensaciones/portafolio'},{label:'Antes / después',to:'/sensaciones/antes-despues'},{label:'Fotografías',to:'/sensaciones/fotografias'},{label:'Servicios',to:'/sensaciones/servicios'},{label:'Comunidad',to:'/sensaciones/comunidad'}]
onMounted(async()=>{if(!offline){try{logo.value=mediaUrl((await api.get('/sensaciones/settings')).data.logo_url)||''}catch{/* recurso de marca incorporado */}}})
</script>
<style scoped>
.sd-header{min-height:76px;padding:12px clamp(16px,4.6vw,76px);display:flex;align-items:center;gap:22px;justify-content:space-between;flex-wrap:wrap;background:#101014;color:#fff;border-bottom:1px solid #ffffff22;position:sticky;top:0;z-index:30}.sd-logo{margin-right:auto;display:block}.sd-logo img{display:block;width:clamp(145px,14vw,214px);height:auto;max-height:66px;object-fit:contain}.sd-desktop{display:flex;align-items:center;gap:20px}.sd-desktop a{color:#fff;text-decoration:none;font-size:13px;font-weight:750;white-space:nowrap}.sd-desktop a:hover,.sd-desktop a.router-link-exact-active{color:#ff985c}.sd-actions{display:flex;align-items:center;gap:9px}.sd-actions .q-btn{border-radius:10px;font-weight:700}.sd-mobile{display:none}@media(max-width:1120px){.sd-desktop{display:none}.sd-mobile{display:inline-flex}}@media(max-width:430px){.sd-header{gap:8px;padding:10px}.sd-actions{gap:2px}.sd-actions .q-btn{font-size:11px}.sd-logo img{width:136px}}
</style>
