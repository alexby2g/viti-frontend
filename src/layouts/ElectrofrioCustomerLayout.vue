<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { api } from '../boot/axios'

const auth=useAuthStore(),router=useRouter(),name=computed(()=>auth.user?.nombre||'Cliente')
const system=ref({nombre_corto:'Aires Acondicionados',logo_url:null,color_primario:'#0B5F7A',color_secundario:'#12B8C8'})
const shellStyle=computed(()=>({'--customer-primary':system.value?.color_primario||'#0B5F7A','--customer-secondary':system.value?.color_secundario||'#12B8C8'}))
async function loadBrand(){try{const response=await api.get('/portal/electrofrio/resumen');system.value=response.data.data?.sistema||system.value}catch{/* El contenido de la página mostrará el error si la sesión no es válida. */}}
async function logout(){await auth.logout();router.replace('/electrofrio/acceso')}
onMounted(loadBrand)
</script>
<template><q-layout view="hHh lpR fFf" class="customer-shell" :style="shellStyle"><q-header class="customer-header"><q-toolbar><q-avatar color="white" text-color="primary"><img v-if="system.logo_url" :src="system.logo_url" alt="Logo"/><q-icon v-else name="ac_unit"/></q-avatar><div class="q-ml-md min-width-0"><div class="text-weight-bold ellipsis">{{system.nombre_corto||'Aires Acondicionados'}}</div><div class="text-caption">Portal de seguimiento del cliente</div></div><q-space/><div class="gt-xs q-mr-md">{{name}}</div><q-btn flat round icon="logout" @click="logout"/></q-toolbar></q-header><q-footer bordered class="customer-tabs"><q-tabs dense no-caps active-color="primary" indicator-color="primary"><q-route-tab icon="home" label="Inicio" to="/portal/electrofrio/inicio"/><q-route-tab icon="forum" label="Mensajes" to="/portal/electrofrio/mensajes"/></q-tabs></q-footer><q-page-container><router-view/></q-page-container></q-layout></template>
<style scoped>.customer-shell{--customer-primary:#0b5f7a;--customer-secondary:#12b8c8;background:#eef5fb;color:#123047}.customer-header{background:linear-gradient(135deg,var(--customer-primary),var(--customer-secondary))}.customer-tabs{background:#fff;color:#607d8b}.customer-header :deep(.q-toolbar){min-height:64px}.customer-header .q-avatar{overflow:hidden}.customer-header .q-avatar img{width:100%;height:100%;object-fit:cover}.min-width-0{min-width:0}@media(min-width:900px){.customer-tabs{left:50%;transform:translateX(-50%);width:420px;border-radius:18px 18px 0 0;box-shadow:0 -8px 24px rgba(11,95,122,.1)}}</style>