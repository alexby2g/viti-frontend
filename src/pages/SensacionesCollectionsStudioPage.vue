<template>
<main class="collections"><router-link to="/sensaciones/studio">← Studio</router-link><h1>Álbumes y proyectos</h1>
<q-banner v-if="error" class="bg-negative text-white">{{error}}</q-banner>
<q-form class="form" @submit="save">
<q-select dark outlined v-model="form.kind" :options="kinds" emit-value map-options label="Tipo"/>
<q-input dark outlined v-model="form.title" label="Título" required maxlength="150"/>
<q-input dark outlined v-model="form.description" label="Descripción" type="textarea" maxlength="2000"/>
<p>Selecciona los archivos en el orden deseado. Para una comparación: original primero y editado después.</p>
<q-select dark outlined v-model="form.media_ids" :options="mediaOptions" multiple use-chips emit-value map-options label="Archivos"/>
<q-select dark outlined v-model="form.cover_id" :options="coverOptions" clearable emit-value map-options label="Portada"/>
<q-toggle dark v-model="form.published" label="Visible al público (todos los archivos deben estar publicados)"/>
<div class="actions"><q-btn color="deep-orange" type="submit" :loading="busy" :disable="!form.title.trim()||!form.media_ids.length" label="Guardar"/><q-btn flat label="Nuevo" @click="reset"/></div>
</q-form>
<h2>Mis colecciones</h2>
<article v-for="c in collections" :key="c.id"><div><strong>{{c.title}}</strong><p>{{c.kind}} · {{c.published?'Publicado':'Borrador'}}</p></div><q-btn outline color="deep-orange" label="Editar" @click="edit(c)"/></article>
<q-pagination v-if="last>1" v-model="page" :max="last" @update:model-value="loadCollections"/>
</main></template>
<script setup>
import {computed,onMounted,ref} from 'vue'
import {api,initCsrf} from '../boot/axios'
const kinds=[{label:'Álbum fotográfico',value:'album'},{label:'Proyecto multimedia',value:'project'},{label:'Antes y después',value:'comparison'}]
const initial=()=>({kind:'album',title:'',description:'',media_ids:[],cover_id:null,published:false})
const form=ref(initial()),editing=ref(null),media=ref([]),collections=ref([]),error=ref(''),busy=ref(false),page=ref(1),last=ref(1)
const mediaOptions=computed(()=>media.value.filter(x=>form.value.kind==='project'||x.kind==='photo').map(x=>({label:x.title+(x.published?'':' (borrador)'),value:x.id})))
const coverOptions=computed(()=>media.value.filter(x=>x.kind==='photo'&&form.value.media_ids.includes(x.id)).map(x=>({label:x.title,value:x.id})))
function fail(e){error.value=e.response?.data?.message||'No se pudo completar la operación.'}
function reset(){form.value=initial();editing.value=null}
function edit(c){editing.value=c.id;form.value={kind:c.kind,title:c.title,description:c.description||'',media_ids:[...c.media_ids],cover_id:c.cover_id,published:c.published}}
async function loadCollections(){try{const {data}=await api.get('/sensaciones/studio/collections',{params:{page:page.value}});collections.value=data.data;last.value=data.last_page}catch(e){fail(e)}}
async function loadMedia(){try{let p=1;const all=[];let result;do{result=(await api.get('/sensaciones/studio/media',{params:{page:p++}})).data;all.push(...result.data)}while(p<=result.last_page&&p<=20);media.value=all;if(result.last_page>20)error.value='El selector muestra los 480 archivos más recientes.'}catch(e){fail(e)}}
async function save(){if(busy.value)return;busy.value=true;error.value='';try{await initCsrf();const payload={...form.value,cover_id:coverOptions.value.some(x=>x.value===form.value.cover_id)?form.value.cover_id:null};if(editing.value)await api.put('/sensaciones/studio/collections/'+editing.value,payload);else await api.post('/sensaciones/studio/collections',payload);reset();page.value=1;await loadCollections()}catch(e){fail(e)}finally{busy.value=false}}
onMounted(async()=>{await loadCollections();await loadMedia()})
</script>
<style scoped>.collections{background:#101014;color:#fff;min-height:100vh;padding:32px clamp(18px,6vw,80px)}.collections a{color:#ff8d52}.collections h1{font-size:clamp(30px,5vw,54px)}.form{display:grid;gap:14px;max-width:750px}.actions{display:flex;gap:12px}.collections article{display:flex;justify-content:space-between;align-items:center;background:#24242a;margin:12px 0;padding:16px;border-radius:10px}.collections p{color:#bbb}</style>
