<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q=useQuasar(),rows=ref([]),selected=ref(null),loading=ref(true),sending=ref(false),reply=ref(''),fileInput=ref(null),attachment=ref(null),messagesBox=ref(null)
const current=computed(()=>rows.value.find(x=>x.id===selected.value)||null)
const isMobile=computed(()=>$q.screen.lt.md)
const chatOpen=ref(false)
function label(row){return row?.cliente?.nombre||row?.contacto?.nombre||row?.empresa?.nombre_comercial||'Cliente'}
async function bottom(){await nextTick();const el=messagesBox.value?.$el||messagesBox.value;if(el)el.scrollTop=el.scrollHeight}
async function load(){loading.value=true;try{rows.value=(await api.get('/soporte/buzon',{params:{per_page:100}})).data.data||[];if(!selected.value&&!isMobile.value&&rows.value[0])await choose(rows.value[0].id)}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo cargar el buzón asignado.'})}finally{loading.value=false}}
async function choose(id){selected.value=id;chatOpen.value=true;const {data}=await api.get(`/soporte/buzon/${id}`);const index=rows.value.findIndex(x=>x.id===id);if(index>=0)rows.value[index]={...rows.value[index],...data.data,no_leidos:0};await bottom()}
function chooseFile(){fileInput.value?.click()}
function onFile(e){const f=e.target?.files?.[0];if(!f)return;if(!f.type.startsWith('image/'))return $q.notify({type:'negative',message:'Solo se permiten imágenes.'});attachment.value=f}
async function send(){if(!current.value||sending.value)return;const text=reply.value.trim();if(!text&&!attachment.value)return;sending.value=true;try{if(attachment.value){const fd=new FormData();if(text)fd.append('mensaje',text);fd.append('archivo',attachment.value);await api.post(`/soporte/buzon/${current.value.id}/mensajes`,fd)}else await api.post(`/soporte/buzon/${current.value.id}/mensajes`,{mensaje:text});reply.value='';attachment.value=null;if(fileInput.value)fileInput.value.value='';await choose(current.value.id)}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo enviar el mensaje.'})}finally{sending.value=false}}
async function download(message){try{const response=await api.get(`/soporte/buzon/${current.value.id}/mensajes/${message.id}/archivo`,{responseType:'blob'});const url=URL.createObjectURL(response.data);const a=document.createElement('a');a.href=url;a.download=message.archivo_nombre||'archivo';a.click();URL.revokeObjectURL(url)}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo descargar el archivo.'})}}
onMounted(load)
</script>

<template>
<q-page class="viti-page">
  <PageHeader v-if="!isMobile||!chatOpen" eyebrow="Soporte interno" title="Mensajes asignados" subtitle="Solo aparecen conversaciones delegadas a tu cuenta."/>
  <div class="row q-col-gutter-md inbox-wrap">
    <div v-show="!isMobile||!chatOpen" class="col-12 col-md-4">
      <q-card flat class="viti-card contacts-card"><q-list separator><q-item v-for="row in rows" :key="row.id" clickable :active="row.id===selected" active-class="text-primary" @click="choose(row.id)"><q-item-section avatar><q-avatar color="primary" text-color="white" icon="person"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{label(row)}}</q-item-label><q-item-label caption lines="1">{{row.asunto||'Conversación VITI'}}</q-item-label><q-item-label caption lines="1">{{row.mensajes?.[0]?.mensaje||'Sin mensajes'}}</q-item-label></q-item-section><q-item-section side><q-badge v-if="row.no_leidos" color="negative" :label="row.no_leidos"/></q-item-section></q-item><div v-if="!rows.length&&!loading" class="empty-state">No tienes conversaciones asignadas.</div></q-list></q-card>
    </div>
    <div v-show="!isMobile||chatOpen" class="col-12 col-md-8">
      <q-card v-if="current" flat class="viti-card messenger-card column no-wrap">
        <q-card-section class="row items-center chat-header"><q-btn v-if="isMobile" flat round dense icon="arrow_back" @click="chatOpen=false"/><div class="q-ml-sm"><div class="text-subtitle1 text-weight-bold">{{label(current)}}</div><div class="text-caption text-grey-6">{{current.empresa?.nombre_comercial||current.asunto}}</div></div></q-card-section><q-separator/>
        <q-scroll-area ref="messagesBox" class="messages col" style="height:58vh"><div class="q-pa-md"><div v-for="m in current.mensajes||[]" :key="m.id" class="row q-mb-sm" :class="m.es_mio?'justify-end':'justify-start'"><div class="bubble" :class="m.es_mio?'bubble-mine':'bubble-team'"><div v-if="m.mensaje">{{m.mensaje}}</div><q-btn v-if="m.archivo_path" dense flat no-caps icon="attach_file" label="Descargar imagen" @click="download(m)"/><div class="text-caption message-meta q-mt-xs">{{m.usuario?.nombre}} · {{new Date(m.created_at).toLocaleString()}}</div></div></div></div></q-scroll-area>
        <q-separator/><q-card-section class="composer"><div v-if="attachment" class="text-caption q-mb-sm"><q-icon name="image"/> {{attachment.name}} <q-btn flat dense round icon="close" @click="attachment=null"/></div><div class="row items-end no-wrap q-gutter-sm"><q-btn flat round icon="attach_file" @click="chooseFile"/><input ref="fileInput" hidden type="file" accept="image/*" @change="onFile"/><q-input v-model="reply" autogrow outlined dense class="col" placeholder="Escribe una respuesta" @keydown.enter.exact.prevent="send"/><q-btn round color="primary" icon="send" :loading="sending" @click="send"/></div></q-card-section>
      </q-card>
      <div v-else-if="!loading" class="empty-state">Selecciona una conversación asignada.</div>
    </div>
  </div>
</q-page>
</template>

<style scoped>
.inbox-wrap{min-height:70vh}.messenger-card{min-height:70vh}.bubble{max-width:78%;padding:10px 13px;border-radius:16px;background:var(--viti-card);border:1px solid var(--viti-border)}.bubble-mine{background:var(--viti-primary,#1565c0);color:white;border-color:transparent}.messages{background:color-mix(in srgb,var(--viti-bg) 85%,var(--viti-card))}@media(max-width:600px){.viti-page{padding:0!important}.messenger-card,.contacts-card{border-radius:0!important;border-left:0;border-right:0}.bubble{max-width:88%}}
</style>
