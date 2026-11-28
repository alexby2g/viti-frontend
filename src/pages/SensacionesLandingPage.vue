<template>
  <main class="sensaciones">
    <nav><router-link to="/sensaciones" class="brand">SENSACIONES <small>AUDIOVISUALES DIGITAL</small></router-link><div><router-link to="/sensaciones/portafolio">Proyectos y álbumes</router-link> · <router-link to="/sensaciones/studio">Studio</router-link> · <router-link to="/viti">Viti</router-link></div></nav>
    <section class="hero"><span>ARTE / CREATIVIDAD / PRODUCCIÓN</span><h1>Historias que merecen ser vistas.</h1><p>Fotografía, video y creatividad con una mirada propia.</p><q-btn color="deep-orange" unelevated label="Explorar trabajos" @click="gallery?.scrollIntoView({behavior:'smooth'})"/></section>
    <section ref="gallery" class="catalog"><h2>Portafolio oficial</h2>
      <q-banner v-if="error" class="bg-negative text-white">{{error}} <q-btn flat label="Reintentar" @click="load"/></q-banner>
      <q-spinner v-else-if="loading" color="deep-orange" size="40px"/>
      <p v-else-if="!items.length">Todavía no hay trabajos publicados.</p>
      <div class="media-grid"><article v-for="item in items" :key="item.id"><video v-if="item.kind==='video'" :src="item.url" controls preload="none" playsinline/><img v-else :src="item.url" :alt="item.title" loading="lazy"/><h3>{{item.title}}</h3><p>{{item.description}}</p></article></div>
      <q-pagination v-if="last>1" v-model="page" :max="last" color="deep-orange" @update:model-value="load"/>
    </section><footer>Sensaciones Audiovisuales Digital · Portafolio oficial</footer>
  </main>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../boot/axios'
const items=ref([]), page=ref(1), last=ref(1), error=ref(''), loading=ref(false), gallery=ref(null)
async function load(){
  loading.value=true; error.value=''
  try {const {data}=await api.get('/sensaciones/media',{params:{page:page.value}});items.value=data.data;last.value=data.last_page}
  catch {error.value='El catálogo no está disponible. Comprueba la API de Sensaciones.'}
  finally {loading.value=false}
}
onMounted(load)
</script>
<style scoped>
.sensaciones{background:#101014;color:#f5f4f2;min-height:100vh;font-family:system-ui,sans-serif}.sensaciones nav{display:flex;justify-content:space-between;align-items:center;padding:20px clamp(18px,5vw,80px);gap:16px;flex-wrap:wrap;border-bottom:1px solid #ffffff20}.sensaciones a{color:#ff8d52;text-decoration:none}.brand{font-weight:900;letter-spacing:2px}.brand small{display:block;font-size:10px;letter-spacing:3px}.hero{padding:clamp(60px,12vw,160px) clamp(18px,7vw,100px);background:radial-gradient(ellipse at 90% 20%,#7d3219,transparent 55%),linear-gradient(140deg,#101014,#281b1b)}.hero span{letter-spacing:3px;color:#ff8d52;font-size:12px}.hero h1{font-size:clamp(38px,7vw,86px);line-height:1.05;max-width:900px;margin:22px 0}.hero p{color:#ccc;font-size:18px;margin-bottom:24px}.catalog{padding:32px clamp(18px,5vw,80px)}.catalog h2{font-size:30px}.media-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px}.media-grid article{background:#1e1e24;border:1px solid #ffffff15;border-radius:14px;overflow:hidden}.media-grid img,.media-grid video{display:block;width:100%;aspect-ratio:16/10;object-fit:contain;background:#000}.media-grid h3{font-size:19px;margin:14px}.media-grid p{padding:0 14px;color:#bbb;white-space:pre-wrap;overflow-wrap:anywhere}.sensaciones footer{padding:24px;text-align:center;color:#aaa;border-top:1px solid #ffffff15}
</style>
