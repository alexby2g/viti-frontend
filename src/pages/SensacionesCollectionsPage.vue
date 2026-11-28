<template>
<main class="collections"><div class="eyebrow">PORTAFOLIO OFICIAL</div><h1>{{comparisonMode?'Antes y después':'Proyectos y álbumes'}}</h1><p>{{comparisonMode?'Descubre el arte de la transformación. Desliza para comparar la imagen original y editada.':'Una mirada a nuestras producciones y procesos creativos.'}}</p><q-banner v-if="offlinePreview" class="bg-deep-orange-10 text-white">Vista previa: colecciones reales aún no conectadas.</q-banner><q-banner v-if="error" class="bg-negative text-white">{{error}}</q-banner><q-spinner v-if="loading" color="deep-orange" size="40px"/><p v-else-if="!visibleItems.length&&!error">{{comparisonMode?'Todavía no hay comparaciones publicadas en esta página.':'Todavía no hay proyectos o álbumes publicados en esta página.'}}</p>
<article v-for="c in visibleItems" :key="c.id"><div class="head"><img v-if="c.cover" :src="mediaUrl(c.cover)" :alt="'Portada: '+c.title" loading="lazy"/><div><span>{{labels[c.kind]}}</span><h2>{{c.title}}</h2><p>{{c.description}}</p></div></div>
<div v-if="c.kind==='comparison' && c.items.length===2" class="compare"><div class="frame"><img :src="mediaUrl(c.items[0].url)" alt="Original"/><img class="after" :src="mediaUrl(c.items[1].url)" alt="Editado" :style="{clipPath:'inset(0 0 0 '+(positions[c.id]??50)+'%)'}"/><div class="line" :style="{left:(positions[c.id]??50)+'%'}"></div></div><label>Original / editado <input type="range" min="0" max="100" :value="positions[c.id]??50" @input="positions[c.id]=Number($event.target.value)" /></label></div>
<div v-else-if="c.kind!=='comparison'" class="grid"><div v-for="m in c.items" :key="m.id"><video v-if="m.kind==='video'" :src="mediaUrl(m.url)" controls playsinline preload="none"/><button v-else class="photo" @click="active=m"><img :src="mediaUrl(m.url)" :alt="m.title" loading="lazy"/></button><p>{{m.title}}</p></div></div></article>
<q-pagination v-if="last>1" v-model="page" :max="last" color="deep-orange" @update:model-value="load"/>
<q-dialog :model-value="!!active" @update:model-value="v=>{if(!v)active=null}" maximized><div class="viewer"><q-btn flat color="white" label="Cerrar" @click="active=null"/><img v-if="active" :src="mediaUrl(active.url)" :alt="active.title"/></div></q-dialog>
</main></template>
<script setup>
import {ref,computed,onMounted} from 'vue'
import {useRoute} from 'vue-router'
const route=useRoute(),comparisonMode=route.meta.collectionMode==='comparison'
import {api} from '../boot/axios'
import {mediaUrl} from '../services/sensacionesMedia'
const offlinePreview=import.meta.env.VITE_SENSACIONES_OFFLINE_PREVIEW === '1'
const labels={album:'Álbum fotográfico',project:'Proyecto multimedia',comparison:'Antes y después'}
const items=ref([]),positions=ref({}),page=ref(1),last=ref(1),active=ref(null),error=ref(''),loading=ref(false)
const visibleItems=computed(()=>items.value.filter(c=>comparisonMode?c.kind==='comparison':c.kind!=='comparison'))
async function load(){if(offlinePreview)return;loading.value=true;error.value='';try{const {data}=await api.get('/sensaciones/collections',{params:{page:page.value,view:comparisonMode?'comparisons':'projects'}});items.value=data.data;last.value=data.last_page}catch{error.value='No se pudieron cargar las colecciones.'}finally{loading.value=false}}
onMounted(load)
</script>
<style scoped>
.collections{background:#101014;color:#fff;min-height:100vh;padding:32px clamp(18px,6vw,80px)}.collections a,.head span{color:#ff8d52}.collections h1{font-size:clamp(32px,6vw,65px);line-height:1.1}.collections p{color:#bbb;white-space:pre-wrap;overflow-wrap:anywhere}article{background:#1c1c22;border:1px solid #ffffff15;border-radius:16px;padding:20px;margin:24px 0}.head{display:flex;gap:22px;align-items:center;flex-wrap:wrap}.head img{width:min(250px,100%);aspect-ratio:16/10;object-fit:cover;border-radius:8px}.head h2{font-size:28px;line-height:1.2;margin:10px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px;margin-top:20px}.grid img,.grid video{width:100%;aspect-ratio:16/10;object-fit:contain;background:#000}.photo{display:block;width:100%;border:0;background:#000;padding:0;cursor:zoom-in}.compare{max-width:900px;margin:20px auto}.frame{position:relative;aspect-ratio:16/10;background:#000}.frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.line{position:absolute;top:0;bottom:0;width:2px;background:#fff}.compare input{width:100%;accent-color:#ff681e}.viewer{background:#101014;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}.viewer img{max-width:100%;max-height:85vh;object-fit:contain}
.eyebrow{font-size:12px;font-weight:850;letter-spacing:.16em;color:#ff681e}.collections{max-width:1660px;margin:auto}.collections h1{font-weight:850;letter-spacing:-.045em;margin:12px 0}
</style>
