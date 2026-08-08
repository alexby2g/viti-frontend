<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { useTenantStore } from '../stores/tenant'
import PageHeader from '../components/PageHeader.vue'

const router=useRouter();const $q=useQuasar();const tenant=useTenantStore();const loading=ref(true);const items=ref([])
async function load(){loading.value=true;try{if(!tenant.loaded)await tenant.load();items.value=(await api.get('/mi/catalogo')).data.data||[]}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo cargar el catálogo.'})}finally{loading.value=false}}
async function requestApp(app){try{const {data}=await api.post('/mi/solicitud');sessionStorage.setItem('viti-app-solicitada',app.nombre);window.location.href=data.data.enlace_publico}catch{router.push('/mi-proyecto')}}
function changed(){load()}
onMounted(()=>{load();window.addEventListener('viti-tenant-changed',changed)})
onBeforeUnmount(()=>window.removeEventListener('viti-tenant-changed',changed))
</script>
<template><q-page class="viti-page"><PageHeader eyebrow="VITI Apps" title="Catálogo de aplicaciones" :subtitle="`Soluciones disponibles para ${tenant.active?.nombre_comercial||'tu negocio'}. La solicitud no activa ni cobra nada automáticamente.`"/><q-inner-loading :showing="loading"/><div v-if="!loading" class="apps-grid"><q-card v-for="app in items" :key="app.id" flat class="viti-card app-card"><q-card-section><div class="row items-start no-wrap"><q-avatar size="56px" color="primary" text-color="white" :icon="app.icono||'apps'"/><div class="q-ml-md col"><div class="text-h6 text-weight-bold">{{app.nombre}}</div><q-badge v-if="app.instalada" color="positive" class="q-mt-xs">Ya disponible</q-badge></div></div><div class="text-body2 text-grey-7 q-mt-md">{{app.descripcion}}</div></q-card-section><q-separator/><q-card-actions align="right" class="q-pa-md"><q-btn v-if="app.instalada" flat color="positive" icon="check" no-caps label="Ya forma parte de tu negocio"/><q-btn v-else color="primary" unelevated icon="send" no-caps label="Solicitar aplicación" @click="requestApp(app)"/></q-card-actions></q-card></div><div v-if="!loading&&!items.length" class="empty-state"><q-icon name="apps" size="54px"/><div class="text-h6 q-mt-md">No hay aplicaciones publicadas todavía</div></div></q-page></template>
<style scoped>.apps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,420px));gap:18px}.app-card{overflow:hidden}.empty-state{min-height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--viti-muted);text-align:center}</style>
