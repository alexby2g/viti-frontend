<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Dark, useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'
import { useNotificationsStore } from '../stores/notifications'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notifications = useNotificationsStore()
const drawer = ref(false)
const loading = ref(true)
const appInfo = ref(null)
const previousDark = ref(false)

const businessName = computed(() => appInfo.value?.empresa?.nombre_comercial || 'Electrofrío')
const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const appBase = computed(() => clientMode.value ? '/mi-apps/electrofrio' : '/apps/electrofrio')
const apiBase = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const homePath = computed(() => clientMode.value ? '/mi-aplicaciones' : '/aplicaciones')
const roleLabel = computed(() => clientMode.value ? 'Propietario de Electrofrío' : (auth.user?.rol==='superadmin'?'Superadministración VITI':'Administración VITI'))
const electroUnreadCount = computed(() => notifications.items.filter(item => item.contexto === 'electrofrio').length)
const unread = computed(() => electroUnreadCount.value > 99 ? '99+' : String(electroUnreadCount.value || ''))
const menu = computed(() => [
  { label:'Inicio', icon:'dashboard', to:`${appBase.value}/inicio` },
  { label:'Agenda', icon:'event', to:`${appBase.value}/agenda` },
  { label:'Órdenes', icon:'assignment', to:`${appBase.value}/ordenes` },
  { label:'Clientes', icon:'groups', to:`${appBase.value}/clientes` },
  { label:'Equipos', icon:'ac_unit', to:`${appBase.value}/equipos` },
  { label:'Técnicos', icon:'engineering', to:`${appBase.value}/tecnicos` },
  { label:'Inventario', icon:'inventory_2', to:`${appBase.value}/inventario` },
  { label:'Pagos', icon:'payments', to:`${appBase.value}/pagos` },
  { label:'Garantías', icon:'verified', to:`${appBase.value}/garantias` },
  { label:'Historial', icon:'history', to:`${appBase.value}/historial` },
  { label:'Mensajes Electrofrío', icon:'forum', to:`${appBase.value}/buzon`, badge:true },
])

function leaveTo(path){
  if(!String(path).startsWith(appBase.value))sessionStorage.setItem('viti-app-explicit-exit','1')
  router.push(path)
}
async function loadState(){
  loading.value=true
  try{appInfo.value=(await api.get(clientMode.value?`${apiBase.value}/estado`:`${apiBase.value}/resumen`)).data.data}
  catch(e){
    $q.notify({type:'negative',message:e.response?.data?.message||'No se pudo abrir Electrofrío dentro de VITI.'})
    sessionStorage.setItem('viti-app-explicit-exit','1')
    router.replace(homePath.value)
  }finally{loading.value=false}
}

onMounted(()=>{
  previousDark.value=Dark.isActive
  Dark.set(false)
  drawer.value=$q.screen.gt.sm
  notifications.start()
  loadState()
})
onBeforeUnmount(()=>{
  notifications.stop()
  Dark.set(previousDark.value)
})
</script>

<template>
  <q-layout view="hHh LpR fFf" class="electro-app-shell">
    <q-header class="electro-header text-dark">
      <q-toolbar class="q-px-md q-px-lg-xl">
        <q-btn flat round dense icon="menu" @click="drawer=!drawer"/>
        <q-avatar size="40px" color="primary" text-color="white" icon="ac_unit" class="q-ml-sm"/>
        <div class="q-ml-md">
          <div class="text-weight-bold">Electrofrío</div>
          <div class="text-caption text-grey-7">{{businessName}} · VITI App</div>
        </div>
        <q-space/>
        <q-btn flat round icon="notifications_none" class="lt-sm" @click="leaveTo(`${appBase}/buzon`)">
          <q-badge v-if="electroUnreadCount" floating rounded color="negative" :label="unread"/>
        </q-btn>
        <q-btn flat no-caps icon="forum" label="Mensajes" class="gt-xs" @click="leaveTo(`${appBase}/buzon`)">
          <q-badge v-if="electroUnreadCount" rounded color="negative" :label="unread" class="q-ml-sm"/>
        </q-btn>
        <q-btn outline color="primary" no-caps icon="apps" label="Volver a VITI" class="q-ml-sm" @click="leaveTo(homePath)"/>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" :width="260" bordered class="electro-drawer">
      <div class="q-pa-lg">
        <div class="text-overline text-cyan-3">Aplicación nativa</div>
        <div class="text-h6 text-weight-bold ellipsis">{{businessName}}</div>
        <div class="text-caption text-blue-grey-2 q-mt-xs">Servicios técnicos organizados</div>
      </div>
      <q-separator/>
      <q-scroll-area style="height:calc(100% - 175px)">
        <q-list padding>
          <q-item v-for="item in menu" :key="item.to" clickable v-ripple :to="item.to" active-class="electro-active" class="q-mx-sm rounded-borders">
            <q-item-section avatar><q-icon :name="item.icon"/></q-item-section>
            <q-item-section>{{item.label}}</q-item-section>
            <q-item-section v-if="item.badge&&electroUnreadCount" side><q-badge rounded color="negative" :label="unread"/></q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
      <div class="absolute-bottom q-pa-md">
        <q-separator class="q-mb-md"/>
        <div class="text-caption text-blue-grey-2">Sesión de {{auth.user?.nombre}}</div>
        <div class="text-caption text-cyan-3">{{roleLabel}}</div>
      </div>
    </q-drawer>

    <q-page-container>
      <q-inner-loading :showing="loading" label="Preparando Electrofrío..."/>
      <router-view v-if="!loading"/>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.electro-app-shell{--viti-bg:#f4f7fb;--viti-card:#fff;--viti-text:#162033;--viti-muted:#667085;--viti-border:#dfe5ec;background:var(--viti-bg);color:var(--viti-text);min-height:100vh}
.electro-app-shell :deep(.q-page-container),.electro-app-shell :deep(.q-page){background:var(--viti-bg);color:var(--viti-text)}
.electro-app-shell :deep(.q-card),.electro-app-shell :deep(.q-table),.electro-app-shell :deep(.viti-card),.electro-app-shell :deep(.viti-table){background:var(--viti-card);color:var(--viti-text);border-color:var(--viti-border)}
.electro-app-shell :deep(.text-grey-6),.electro-app-shell :deep(.text-grey-7){color:var(--viti-muted)!important}
.electro-header{background:rgba(255,255,255,.97);color:#162033!important;border-bottom:1px solid #dfe5ec;backdrop-filter:blur(12px)}
.electro-drawer{background:#072746;color:#fff}.electro-drawer :deep(.q-separator){background:rgba(255,255,255,.18)}
.electro-active{background:#e7f5ff!important;color:#0569a7!important;font-weight:700}.rounded-borders{border-radius:11px}
@media(max-width:600px){.electro-header :deep(.q-toolbar){min-height:58px;padding-left:8px;padding-right:8px}.electro-header :deep(.q-btn__content .q-btn__content){white-space:nowrap}}
</style>
