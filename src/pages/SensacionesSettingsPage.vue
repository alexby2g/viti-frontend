<template>
<main class="settings"><router-link to="/sensaciones/studio">← Studio</router-link><h1>Marca, servicios y SEO</h1><p>Personaliza la presentación pública del estudio.</p>
<q-banner v-if="error" class="bg-negative text-white q-mb-md">{{error}}</q-banner><q-banner v-if="saved" class="bg-positive text-white q-mb-md">Configuración guardada.</q-banner>
<q-spinner v-if="loading" color="deep-orange" size="40px"/>
<q-form v-else-if="form" class="form" @submit="save">
<q-input dark outlined v-model="form.brand" label="Nombre de marca" maxlength="100" required/>
<q-input dark outlined v-model="form.headline" label="Título de portada" maxlength="180" required/>
<q-input dark outlined v-model="form.tagline" label="Descripción" maxlength="500" type="textarea" required/>
<div class="colors"><label v-for="c in colors" :key="c.key">{{c.label}} <input type="color" v-model="form[c.key]"/> {{form[c.key]}}</label></div>
<q-select dark outlined v-model="form.logo_id" :options="photos" emit-value map-options clearable label="Logotipo (imagen publicada)"/>
<q-select dark outlined v-model="form.intro_id" :options="videos" emit-value map-options clearable label="Video de presentación (publicado)"/>
<p>Sube y publica tus archivos primero desde Studio.</p><q-toggle dark v-model="form.watermark" label="Aplicar marca de agua a fotografías públicas"/><p>Requiere GD habilitado en el servidor. Límite provisional: fotos de 6 megapíxeles y logotipo de 1 megapíxel. Los originales no se modifican.</p>
<q-input dark outlined v-model="form.whatsapp" label="WhatsApp internacional, solo números (ej. 591…)" maxlength="15"/>
<q-input dark outlined v-model="form.seo_title" label="Título SEO" maxlength="70" required/>
<q-input dark outlined v-model="form.seo_description" label="Descripción SEO" maxlength="160" type="textarea" required/>
<h2>Servicios profesionales</h2>
<div v-for="(service,i) in form.services" :key="i" class="service">
<q-input dark outlined v-model="service.title" label="Servicio" maxlength="100" required/>
<q-input dark outlined v-model="service.description" label="Descripción" maxlength="500" type="textarea" required/>
<q-btn flat color="orange" label="Quitar servicio" @click="form.services.splice(i,1)"/></div>
<q-btn outline color="deep-orange" label="Añadir servicio" :disable="form.services.length>=12" @click="form.services.push({title:'',description:''})"/>
<q-btn color="deep-orange" label="Guardar configuración" type="submit" :loading="busy"/>
</q-form></main>
</template>
<script setup>
import {ref,computed,onMounted} from 'vue'
import {api,initCsrf} from '../boot/axios'
const form=ref(null),media=ref([]),error=ref(''),saved=ref(false),loading=ref(true),busy=ref(false)
const colors=[{key:'primary',label:'Principal'},{key:'secondary',label:'Secundario'},{key:'background',label:'Fondo'}]
const options=kind=>media.value.filter(x=>x.kind===kind&&x.published).map(x=>({label:x.title,value:x.id}))
const photos=computed(()=>options('photo')),videos=computed(()=>options('video'))
function fail(e){error.value=e.response?.data?.message||'No se pudo completar la operación.'}
onMounted(async()=>{try{form.value=(await api.get('/sensaciones/studio/settings')).data;let p=1,r;do{r=(await api.get('/sensaciones/studio/media',{params:{page:p++}})).data;media.value.push(...r.data)}while(p<=r.last_page&&p<=15);if(r.last_page>15)error.value='El selector muestra los 360 archivos más recientes.'}catch(e){fail(e)}finally{loading.value=false}})
async function save(){if(busy.value)return;busy.value=true;error.value='';saved.value=false;try{await initCsrf();form.value=(await api.put('/sensaciones/studio/settings',{...form.value,whatsapp:form.value.whatsapp||null})).data;saved.value=true}catch(e){fail(e)}finally{busy.value=false}}
</script>
<style scoped>.settings{background:#101014;color:#fff;min-height:100vh;padding:32px clamp(18px,6vw,80px)}.settings a{color:#ff8d52}.settings h1{font-size:clamp(30px,5vw,54px);line-height:1.15}.settings h2{font-size:24px}.form{display:grid;gap:16px;max-width:750px}.colors{display:flex;flex-wrap:wrap;gap:18px}.colors label{display:grid;gap:8px}.colors input{width:90px;height:42px}.service{display:grid;gap:10px;background:#222229;padding:15px;border-radius:12px}.settings p{color:#bbb}</style>
