<template><main class="studio"><router-link to="/sensaciones">← Portafolio público</router-link><h1>Sensaciones Studio</h1><p>Publica tus trabajos oficiales. Los archivos nuevos se guardan como borradores.</p><q-banner v-if="error" class="bg-negative text-white q-mb-md">{{error}}</q-banner><q-form @submit="upload" class="form"><q-input dark outlined v-model="title" label="Título" maxlength="150" required/><q-input dark outlined v-model="description" label="Descripción" type="textarea" maxlength="2000"/><q-file dark outlined v-model="file" label="Foto (15 MiB) o video (250 MiB con R2)" accept=".jpg,.jpeg,.png,.webp,.mp4,.webm" :max-file-size="262144000"/><q-btn color="deep-orange" type="submit" label="Guardar borrador" :loading="busy" :disable="!file||!title.trim()"/></q-form><q-linear-progress v-if="busy" :value="progress" color="deep-orange" class="q-my-md"/><router-link to="/sensaciones/studio/colecciones">Administrar álbumes, proyectos y comparaciones</router-link><p><router-link to="/sensaciones/studio/marca">Configurar marca, video, servicios y SEO</router-link></p><h2>Publicaciones</h2><q-btn flat label="Actualizar" @click="load"/><div v-for="item in items" :key="item.id" class="entry"><div><strong>{{item.title}}</strong><p>{{item.kind==='video'?'Video':'Fotografía'}} · {{item.published?'Publicado':'Borrador'}}</p></div><q-btn :disable="busy" outline color="deep-orange" :label="item.published?'Retirar':'Publicar'" @click="publish(item)"/></div><q-pagination v-if="last>1" v-model="page" :max="last" color="deep-orange" @update:model-value="load"/></main></template>
<script setup>
import {ref,onMounted} from 'vue'
import axios from 'axios'
import {api,initCsrf} from '../boot/axios'
const title=ref(''),description=ref(''),file=ref(null),items=ref([]),error=ref(''),busy=ref(false),page=ref(1),last=ref(1),progress=ref(0)
function fail(e){error.value=e.response?.data?.message||'No se pudo completar la operación.'}
async function load(){try{error.value='';const {data}=await api.get('/sensaciones/studio/media',{params:{page:page.value}});items.value=data.data;last.value=data.last_page}catch(e){fail(e)}}
async function upload(){
  if(!file.value||busy.value)return
  busy.value=true;error.value='';progress.value=0
  try {
    await initCsrf()
    const selected=file.value
    if(selected.size>3145728){
      const {data}=await api.post('/sensaciones/studio/uploads',{title:title.value,description:description.value,mime:selected.type,bytes:selected.size})
      // Cliente separado: no enviar cookies, cabeceras de Viti ni tokens a R2.
      await axios.put(data.url,selected,{headers:data.headers,withCredentials:false,withXSRFToken:false,timeout:0,onUploadProgress:e=>{progress.value=e.total?e.loaded/e.total:0}})
      await api.post('/sensaciones/studio/uploads/'+data.id+'/finish')
    }else{
      const form=new FormData();form.append('title',title.value);form.append('description',description.value);form.append('file',selected)
      await api.post('/sensaciones/studio/media',form,{onUploadProgress:e=>{progress.value=e.total?e.loaded/e.total:0}})
    }
    title.value='';description.value='';file.value=null;page.value=1;await load()
  }catch(e){fail(e)}finally{busy.value=false}
}
async function publish(item){if(busy.value)return;busy.value=true;error.value='';try{await initCsrf();await api.patch('/sensaciones/studio/media/'+item.id,{published:!item.published});await load()}catch(e){fail(e)}finally{busy.value=false}}
onMounted(load)
</script>
<style scoped>.studio{min-height:100vh;background:#101014;color:#f5f5f5;padding:32px clamp(18px,6vw,80px)}.studio a{color:#ff8d52}.studio h1{font-size:clamp(30px,5vw,54px);line-height:1.15}.studio h2{font-size:25px}.form{display:grid;gap:14px;max-width:650px}.entry{display:flex;justify-content:space-between;align-items:center;gap:15px;background:#222229;padding:15px;border-radius:8px;margin:12px 0}.entry p{margin:5px 0;color:#bbb}</style>
