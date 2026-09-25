<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'
import PageHeader from '../components/PageHeader.vue'

const route=useRoute(), router=useRouter(), auth=useAuthStore()
const loading=ref(true), application=ref(null), error=ref('')
const isAdmin=computed(()=>['superadmin','administrador'].includes(auth.user?.rol))
const backPath=computed(()=>isAdmin.value?'/sistemas':'/mi-aplicaciones')
const safeUrl=computed(()=>{const value=application.value?.url_externa||application.value?.url;if(!value)return'';try{const parsed=new URL(value);return parsed.protocol==='https:'?parsed.toString():''}catch{return''}})
async function load(){loading.value=true;error.value='';try{const id=Number(route.params.id);if(!Number.isInteger(id)||id<1)throw new Error('El sistema solicitado no es válido.');if(isAdmin.value)application.value=(await api.get(`/aplicaciones/${id}`)).data.data;else{const apps=(await api.get('/mi/aplicaciones')).data.data||[];application.value=apps.find(item=>Number(item.id)===id)||null}if(!safeUrl.value)throw new Error('Este sistema no tiene un enlace HTTPS disponible.')}catch(e){application.value=null;error.value=e.response?.data?.message||e.message||'No se pudo abrir el sistema.'}finally{loading.value=false}}
function openExternal(){if(safeUrl.value)window.open(safeUrl.value,'_blank','noopener,noreferrer')}
onMounted(load)
</script>

<template>
  <q-page class="external-page viti-page">
    <q-inner-loading :showing="loading"/>
    <q-banner v-if="error&&!loading" rounded class="bg-red-10 text-white">{{error}}<template #action><q-btn flat label="Volver" @click="router.push(backPath)"/></template></q-banner>
    <template v-if="safeUrl&&!loading">
      <PageHeader eyebrow="Sistema externo" :title="application?.nombre||'Sistema'" :subtitle="application?.empresa?.nombre_comercial||'Administrado desde VITI'"/>
      <section class="external-card"><q-icon name="open_in_new" size="48px"/><h2>Este sistema funciona fuera de VITI</h2><p>VITI conserva el acceso y la información técnica, pero la operación del sistema se realiza en su propio sitio.</p><div class="url-box">{{safeUrl}}</div><div class="actions"><q-btn outline no-caps icon="arrow_back" label="Volver a VITI" @click="router.push(backPath)"/><q-btn color="primary" unelevated no-caps icon="open_in_new" label="Abrir sistema" @click="openExternal"/></div></section>
    </template>
  </q-page>
</template>

<style scoped>
.external-page{max-width:900px;padding-top:32px}.external-card{min-height:430px;border:1px solid rgba(80,112,143,.22);background:linear-gradient(180deg,rgba(13,37,62,.84),rgba(8,27,47,.9));border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:36px}.external-card>.q-icon{color:#f28b30}.external-card h2{font-size:27px;margin:15px 0 7px}.external-card p{color:#91a8bb;max-width:600px;line-height:1.6}.url-box{max-width:100%;overflow-wrap:anywhere;margin:16px 0;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(86,117,146,.18);color:#cbd8e2;font-size:11px}.actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.actions .q-btn{min-height:42px;border-radius:11px}@media(max-width:600px){.external-page{padding-top:18px}.actions{width:100%;display:grid;grid-template-columns:1fr}.actions .q-btn{width:100%}}
</style>
