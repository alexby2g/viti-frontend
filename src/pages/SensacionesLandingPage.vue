<template>
  <main class="sensaciones" :style="{'--accent':settings.primary,'--secondary':settings.secondary,'--bg':settings.background,'--ink':ink}">
    <nav><router-link to="/sensaciones" class="brand"><img v-if="settings.logo_url" :src="mediaUrl(settings.logo_url)" :alt="settings.brand"/><span v-else class="brand-default"><img src="/sensaciones-mark.svg" alt=""/>{{settings.brand}}</span></router-link><div><router-link to="/sensaciones/portafolio">Portafolio</router-link> · <router-link :to="{path:'/',hash:'#servicios'}">Servicios</router-link><template v-if="!offlinePreview"> · <router-link to="/login">Acceso</router-link> · <router-link to="/sensaciones/studio">Studio</router-link></template></div></nav>
    <q-banner v-if="offlinePreview" class="bg-deep-orange-10 text-white">Vista previa de diseño · Sin conexión a producción. No contiene trabajos ni clientes reales.</q-banner>
    <section class="hero"><span>ARTE / CREATIVIDAD / PRODUCCIÓN</span><h1>{{settings.headline}}</h1><p>{{settings.tagline}}</p><q-btn color="deep-orange" unelevated label="Explorar trabajos" @click="gallery?.scrollIntoView({behavior:'smooth'})"/></section>
    <section v-if="settings.intro_url" class="catalog intro"><h2>Video de presentación</h2><SensacionesPlayer :src="mediaUrl(settings.intro_url)" :logo="mediaUrl(settings.logo_url)" :title="settings.brand"/></section>
    <section ref="gallery" class="catalog"><h2>Portafolio oficial</h2>
      <q-banner v-if="error" class="bg-grey-10 text-white">{{error}} <q-btn flat label="Actualizar" @click="load"/></q-banner>
      <q-spinner v-else-if="loading" color="deep-orange" size="40px"/>
      <p v-else-if="!items.length">{{offlinePreview ? 'El catálogo se habilitará al conectar el entorno de pruebas.' : 'Todavía no hay trabajos publicados.'}}</p>
      <div class="media-grid"><article v-for="item in items" :key="item.id"><SensacionesPlayer v-if="item.kind==='video'" :src="mediaUrl(item.url)" :title="item.title" :logo="mediaUrl(settings.logo_url)"/><img v-else :src="mediaUrl(item.url)" :alt="item.title" loading="lazy"/><h3>{{item.title}}</h3><p>{{item.description}}</p></article></div>
      <q-pagination v-if="last>1" v-model="page" :max="last" color="deep-orange" @update:model-value="load"/>
    </section><section class="catalog" id="servicios"><h2>Servicios profesionales</h2><div class="media-grid"><article v-for="(service,i) in settings.services" :key="i"><h3>{{service.title}}</h3><p>{{service.description}}</p><a v-if="settings.whatsapp" class="contact" :href="whatsapp(service.title)" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a></article></div><p v-if="settings.whatsapp"><a class="contact" :href="whatsapp('servicios audiovisuales')" target="_blank" rel="noopener noreferrer">Contactar al estudio</a></p></section><footer>{{settings.brand}} · Portafolio oficial</footer>
  </main>
</template>
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import SensacionesPlayer from '../components/SensacionesPlayer.vue'
import { mediaUrl } from '../services/sensacionesMedia'
import { api } from '../boot/axios'
const offlinePreview=import.meta.env.VITE_SENSACIONES_OFFLINE_PREVIEW === '1'
const items=ref([]), page=ref(1), last=ref(1), error=ref(''), loading=ref(false), gallery=ref(null)
async function load(){
  if(offlinePreview) return
  loading.value=true; error.value=''
  try {const {data}=await api.get('/sensaciones/media',{params:{page:page.value}});items.value=data.data;last.value=data.last_page}
  catch {error.value='El portafolio está en preparación. Vuelve pronto para conocer nuestras producciones.'}
  finally {loading.value=false}
}
const settings=ref({brand:'Sensaciones Audiovisuales Digital',headline:'Historias que merecen ser vistas.',tagline:'Fotografía, video y creatividad con una mirada propia.',primary:'#FF681E',secondary:'#980B20',background:'#101014',services:[{title:'Producción audiovisual',description:'Videos, eventos y producciones creativas.'},{title:'Fotografía profesional',description:'Sesiones fotográficas y edición.'},{title:'Publicidad y diseño',description:'Contenido creativo para marcas y empresas.'}]})
const ink=computed(()=>{const h=settings.value.background.slice(1);const rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.179?'#111111':'#f5f4f2'})
const whatsapp=service=>'https://wa.me/'+settings.value.whatsapp+'?text='+encodeURIComponent('Hola, me interesa '+service+'.')
let alive=true
const previousTitle=document.title
let descriptionNode=null,previousDescription=null,createdDescription=false
async function loadSettings(){try{const {data}=await api.get('/sensaciones/settings');if(!alive)return;settings.value=data;document.title=data.seo_title;descriptionNode=document.querySelector('meta[name="description"]');if(!descriptionNode){descriptionNode=document.createElement('meta');descriptionNode.name='description';document.head.append(descriptionNode);createdDescription=true}else previousDescription=descriptionNode.getAttribute('content');descriptionNode.content=data.seo_description}catch{/* el catálogo conserva su propio estado de error */}}
onMounted(()=>{if(offlinePreview){document.title='Sensaciones Digital | Vista previa'}else{load();loadSettings()}})
onBeforeUnmount(()=>{alive=false;document.title=previousTitle;if(createdDescription)descriptionNode?.remove();else if(descriptionNode){if(previousDescription===null)descriptionNode.removeAttribute('content');else descriptionNode.content=previousDescription}})
</script>
<style scoped>
.sensaciones{background:var(--bg,#101014);color:var(--ink,#f5f4f2);min-height:100vh;font-family:system-ui,sans-serif}.sensaciones nav{display:flex;justify-content:space-between;align-items:center;padding:20px clamp(18px,5vw,80px);gap:16px;flex-wrap:wrap;border-bottom:1px solid #ffffff20}.sensaciones a{color:var(--ink);text-decoration:none}.brand{font-weight:900;letter-spacing:2px}.brand small{display:block;font-size:10px;letter-spacing:3px}.hero{padding:clamp(60px,12vw,160px) clamp(18px,7vw,100px);background:radial-gradient(ellipse at 90% 20%,var(--secondary),transparent 55%),linear-gradient(140deg,#101014,#281b1b);color:#fff}.hero span{letter-spacing:3px;color:#ffb58e;font-size:12px}.hero h1{font-size:clamp(38px,7vw,86px);line-height:1.05;max-width:900px;margin:22px 0}.hero p{color:#ccc;font-size:18px;margin-bottom:24px}.catalog{padding:32px clamp(18px,5vw,80px)}.catalog h2{font-size:30px}.media-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px}.media-grid article{color:#f5f4f2;background:#1e1e24;border:1px solid #ffffff15;border-radius:14px;overflow:hidden}.media-grid img,.media-grid video{display:block;width:100%;aspect-ratio:16/10;object-fit:contain;background:#000}.media-grid h3{font-size:19px;margin:14px}.media-grid p{padding:0 14px;color:#bbb;white-space:pre-wrap;overflow-wrap:anywhere}.sensaciones footer{padding:24px;text-align:center;color:#aaa;border-top:1px solid #ffffff15}
.brand img{max-width:220px;max-height:65px;object-fit:contain}.contact{display:inline-block;background:#24242a;color:#fff!important;padding:10px 14px;border:1px solid var(--accent);border-radius:8px;margin:10px 14px}.intro{max-width:1100px;margin:auto}.hero .q-btn{background:var(--accent)!important;color:#111!important}
.brand-default{display:flex;align-items:center;gap:10px;letter-spacing:.06em}.brand-default img{width:44px;height:44px}.sensaciones nav div{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
</style>
