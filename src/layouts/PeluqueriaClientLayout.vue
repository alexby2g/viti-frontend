<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Dark, useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'
import { useTenantStore } from '../stores/tenant'
import { filterPeluqueriaMenu, peluqueriaModuleForPath } from '../utils/peluqueriaModules'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tenant = useTenantStore()
const drawer = ref(false)
const loading = ref(true)
const appInfo = ref(null)
const previousDark = ref(false)
const businessName = computed(() => appInfo.value?.empresa?.nombre_comercial || 'Mi peluquería')
const menu = computed(() => filterPeluqueriaMenu(module => tenant.hasModule(module)))
const firstAllowedPath = computed(() => menu.value[0]?.to || '/mi-aplicaciones')

function ensureAllowedRoute(){
  if(loading.value || !tenant.loaded) return
  const module = peluqueriaModuleForPath(route.path)
  if(module && !tenant.hasModule(module)){
    const target = firstAllowedPath.value
    if(target === '/mi-aplicaciones') sessionStorage.setItem('viti-app-explicit-exit','1')
    router.replace(target)
  }
}
function leaveTo(path){sessionStorage.setItem('viti-app-explicit-exit','1');router.push(path)}
async function loadState(){
  loading.value=true
  try{
    if(!tenant.loaded) await tenant.load()
    appInfo.value=(await api.get('/mi/apps/peluqueria/estado')).data.data
    ensureAllowedRoute()
  }
  catch(e){
    $q.notify({type:'negative',message:e.response?.data?.message||'No se pudo abrir Peluquería.'})
    sessionStorage.setItem('viti-app-explicit-exit','1')
    router.replace(e.response?.status===402?'/mi-pagos':'/mi-aplicaciones')
  }finally{loading.value=false;ensureAllowedRoute()}
}
onMounted(()=>{previousDark.value=Dark.isActive;Dark.set(false);drawer.value=$q.screen.gt.sm;loadState()})
watch(()=>route.fullPath,ensureAllowedRoute)
onBeforeUnmount(()=>Dark.set(previousDark.value))
</script>
<template><q-layout view="hHh LpR fFf" class="hair-app-shell"><q-header class="hair-header text-dark"><q-toolbar class="q-px-md q-px-lg-xl"><q-btn flat round dense icon="menu" @click="drawer=!drawer"/><q-avatar size="38px" color="primary" text-color="white" icon="content_cut" class="q-ml-sm"/><div class="q-ml-md"><div class="text-weight-bold">Peluquería</div><div class="text-caption text-grey-7">{{businessName}}</div></div><q-space/><q-btn flat no-caps icon="support_agent" label="Atención VITI" class="gt-xs" @click="leaveTo('/mi-buzon')"/><q-btn outline color="primary" no-caps icon="apps" label="Volver a VITI" class="q-ml-sm" @click="leaveTo('/mi-aplicaciones')"/></q-toolbar></q-header>
<q-drawer v-model="drawer" :width="250" bordered class="hair-drawer"><div class="q-pa-lg"><div class="text-overline text-primary">Aplicación entregada</div><div class="text-h6 text-weight-bold ellipsis">{{businessName}}</div><div class="text-caption text-grey-6 q-mt-xs">Tu espacio de trabajo</div></div><q-separator/><q-list padding><q-item v-for="item in menu" :key="item.to" clickable v-ripple :to="item.to" active-class="hair-active" class="q-mx-sm rounded-borders"><q-item-section avatar><q-icon :name="item.icon"/></q-item-section><q-item-section>{{item.label}}</q-item-section></q-item></q-list><div class="absolute-bottom q-pa-md"><q-separator class="q-mb-md"/><div class="text-caption text-grey-6">Sesión de {{auth.user?.nombre}}</div><q-btn flat dense no-caps icon="support_agent" label="Atención al cliente" color="primary" class="q-mt-xs full-width" @click="leaveTo('/mi-buzon')"/></div></q-drawer>
<q-page-container><q-inner-loading :showing="loading"/><router-view v-if="!loading"/></q-page-container></q-layout></template>
<style scoped>.hair-app-shell{--viti-bg:#f6f7fb;--viti-card:#fff;--viti-text:#172033;--viti-muted:#667085;--viti-border:#e4e7ec;background:var(--viti-bg);color:var(--viti-text);min-height:100vh}.hair-app-shell :deep(.q-page-container),.hair-app-shell :deep(.q-page){background:var(--viti-bg);color:var(--viti-text)}.hair-app-shell :deep(.q-card),.hair-app-shell :deep(.q-table),.hair-app-shell :deep(.viti-card),.hair-app-shell :deep(.viti-table){background:var(--viti-card);color:var(--viti-text);border-color:var(--viti-border)}.hair-app-shell :deep(.text-grey-6),.hair-app-shell :deep(.text-grey-7){color:var(--viti-muted)!important}.hair-header{background:rgba(255,255,255,.96);color:#172033!important;border-bottom:1px solid #e7e9ef;backdrop-filter:blur(12px)}.hair-drawer{background:#08264a;color:#fff}.hair-drawer :deep(.q-separator){background:rgba(255,255,255,.18)}.hair-drawer :deep(.text-grey-6){color:#afbdd0!important}.hair-active{background:#eef3ff!important;color:#1565c0!important;font-weight:700}.rounded-borders{border-radius:10px}</style>