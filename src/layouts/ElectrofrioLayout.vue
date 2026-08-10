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
const theme = ref('light')

const businessName = computed(() => appInfo.value?.empresa?.nombre_comercial || 'Electrofrío')
const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const appBase = computed(() => clientMode.value ? '/mi-apps/electrofrio' : '/apps/electrofrio')
const apiBase = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const homePath = computed(() => clientMode.value ? '/mi-aplicaciones' : '/aplicaciones')
const roleLabel = computed(() => clientMode.value ? 'Propietario de Electrofrío' : (auth.user?.rol==='superadmin'?'Superadministración VITI':'Administración VITI'))
const electroUnreadCount = computed(() => notifications.items.filter(item => item.contexto === 'electrofrio').length)
const unread = computed(() => electroUnreadCount.value > 99 ? '99+' : String(electroUnreadCount.value || ''))
const themeIcon = computed(() => theme.value === 'dark' ? 'light_mode' : 'dark_mode')
const menuGroups = computed(() => [
  {
    title: 'Gestión diaria',
    items: [
      { label:'Inicio', caption:'Resumen del negocio', icon:'space_dashboard', to:`${appBase.value}/inicio` },
      { label:'Agenda', caption:'Visitas programadas', icon:'event_available', to:`${appBase.value}/agenda` },
      { label:'Órdenes', caption:'Diagnóstico y servicio', icon:'assignment', to:`${appBase.value}/ordenes` },
    ],
  },
  {
    title: 'Personas y recursos',
    items: [
      { label:'Clientes', icon:'groups', to:`${appBase.value}/clientes` },
      { label:'Equipos', icon:'ac_unit', to:`${appBase.value}/equipos` },
      { label:'Técnicos', icon:'engineering', to:`${appBase.value}/tecnicos` },
      { label:'Inventario', icon:'inventory_2', to:`${appBase.value}/inventario` },
    ],
  },
  {
    title: 'Control y seguimiento',
    items: [
      { label:'Pagos', icon:'payments', to:`${appBase.value}/pagos` },
      { label:'Garantías', icon:'verified', to:`${appBase.value}/garantias` },
      { label:'Historial', icon:'history', to:`${appBase.value}/historial` },
      { label:'Mensajes Electrofrío', icon:'forum', to:`${appBase.value}/buzon`, badge:true },
    ],
  },
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
function toggleTheme(){
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('viti-electrofrio-theme', theme.value)
  Dark.set(theme.value === 'dark')
}

onMounted(()=>{
  previousDark.value=Dark.isActive
  theme.value=localStorage.getItem('viti-electrofrio-theme')==='dark'?'dark':'light'
  Dark.set(theme.value==='dark')
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
    <q-header class="electro-header">
      <q-toolbar class="q-px-md q-px-lg-xl">
        <q-btn flat round dense icon="menu" color="white" aria-label="Abrir menú" @click="drawer=!drawer"/>
        <q-avatar size="42px" class="electro-brand-avatar q-ml-sm">
          <q-icon name="ac_unit" size="26px"/>
        </q-avatar>
        <div class="q-ml-md electro-brand-copy">
          <div class="text-weight-bold text-h6">Electrofrío</div>
          <div class="text-caption">{{businessName}} · aplicación de VITI</div>
        </div>
        <q-space/>
        <q-btn flat round :icon="themeIcon" color="white" aria-label="Cambiar apariencia" @click="toggleTheme">
          <q-tooltip>{{theme==='dark'?'Usar modo claro':'Usar modo oscuro'}}</q-tooltip>
        </q-btn>
        <q-btn flat round icon="notifications_none" color="white" class="lt-sm" @click="leaveTo(`${appBase}/buzon`)">
          <q-badge v-if="electroUnreadCount" floating rounded color="negative" :label="unread"/>
        </q-btn>
        <q-btn flat no-caps icon="forum" label="Mensajes" color="white" class="gt-xs" @click="leaveTo(`${appBase}/buzon`)">
          <q-badge v-if="electroUnreadCount" rounded color="negative" :label="unread" class="q-ml-sm"/>
        </q-btn>
        <q-btn outline color="white" no-caps icon="apps" :label="$q.screen.gt.xs?'Volver a VITI':''" class="q-ml-sm electro-back-btn" @click="leaveTo(homePath)"/>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" :width="292" bordered class="electro-drawer">
      <div class="electro-drawer-brand q-pa-lg">
        <div class="row items-center no-wrap">
          <q-avatar size="54px" class="electro-brand-avatar">
            <q-icon name="ac_unit" size="32px"/>
          </q-avatar>
          <div class="q-ml-md min-width-0">
            <div class="text-overline">VITI App</div>
            <div class="text-h6 text-weight-bold ellipsis">{{businessName}}</div>
            <div class="text-caption">Control técnico integral</div>
          </div>
        </div>
      </div>
      <q-scroll-area style="height:calc(100% - 175px)">
        <q-list padding class="electro-menu">
          <template v-for="group in menuGroups" :key="group.title">
            <q-item-label header class="electro-menu-title">{{group.title}}</q-item-label>
            <q-item v-for="item in group.items" :key="item.to" clickable v-ripple :to="item.to" active-class="electro-active" class="electro-menu-item">
              <q-item-section avatar><q-icon :name="item.icon"/></q-item-section>
              <q-item-section>
                <q-item-label>{{item.label}}</q-item-label>
                <q-item-label v-if="item.caption" caption>{{item.caption}}</q-item-label>
              </q-item-section>
              <q-item-section v-if="item.badge&&electroUnreadCount" side><q-badge rounded color="negative" :label="unread"/></q-item-section>
            </q-item>
          </template>
        </q-list>
      </q-scroll-area>
      <div class="absolute-bottom electro-session q-pa-md">
        <div class="row items-center no-wrap">
          <q-avatar size="36px" color="primary" text-color="white" icon="person"/>
          <div class="q-ml-sm min-width-0">
            <div class="text-caption text-weight-bold ellipsis">{{auth.user?.nombre}}</div>
            <div class="text-caption ellipsis">{{roleLabel}}</div>
          </div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <q-inner-loading :showing="loading" label="Preparando Electrofrío..."/>
      <router-view v-if="!loading"/>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.electro-app-shell{--electro-primary:#0b5f7a;--electro-secondary:#12b8c8;--electro-accent:#ff8a3d;--viti-bg:#eef5fb;--viti-card:#fff;--viti-text:#123047;--viti-muted:#63798a;--viti-border:rgba(15,76,129,.11);background:var(--viti-bg);color:var(--viti-text);min-height:100vh}
:global(.body--dark) .electro-app-shell{--viti-bg:#071827;--viti-card:#102a43;--viti-text:#edf8ff;--viti-muted:#a9bfce;--viti-border:rgba(129,200,222,.18)}
.electro-app-shell :deep(.q-page-container),.electro-app-shell :deep(.q-page){background:var(--viti-bg);color:var(--viti-text)}
.electro-app-shell :deep(.q-card),.electro-app-shell :deep(.q-table),.electro-app-shell :deep(.viti-card),.electro-app-shell :deep(.viti-table){background:var(--viti-card);color:var(--viti-text);border-color:var(--viti-border)}
.electro-app-shell :deep(.text-grey-6),.electro-app-shell :deep(.text-grey-7){color:var(--viti-muted)!important}
.electro-app-shell :deep(.text-primary){color:var(--electro-primary)!important}
.electro-app-shell :deep(.bg-primary),.electro-app-shell :deep(.q-btn.bg-primary){background:var(--electro-primary)!important}
.electro-header{background:linear-gradient(135deg,#0b3d68,#0f6fa4 55%,#00a6b6);color:#fff!important;box-shadow:0 8px 24px rgba(8,44,74,.2)}
.electro-header :deep(.q-toolbar){min-height:64px}.electro-header .text-caption{color:rgba(255,255,255,.78)}
.electro-brand-avatar{color:#0f5d7b;background:rgba(255,255,255,.94);box-shadow:0 8px 20px rgba(7,38,61,.2)}
.electro-brand-copy{line-height:1.15}.electro-back-btn{border-color:rgba(255,255,255,.66)}
.electro-drawer{background:linear-gradient(180deg,#fff 0%,#f3f8fc 100%);color:#244256}
:global(.body--dark) .electro-drawer{background:linear-gradient(180deg,#102a43 0%,#091e31 100%);color:#edf8ff}
.electro-drawer-brand{color:#fff;background:linear-gradient(135deg,#0b3d68,#0f4c81 58%,#127f9c);box-shadow:0 10px 28px rgba(8,44,74,.2)}
.electro-drawer-brand .text-overline{color:#9debf0}.electro-drawer-brand .text-caption{color:rgba(255,255,255,.76)}
.electro-menu{padding:12px 10px 90px}.electro-menu-title{padding:14px 10px 6px;color:#6b7d8c;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
:global(.body--dark) .electro-menu-title{color:#8eacbd}
.electro-menu-item{min-height:50px;margin:4px 0;border-radius:14px;color:inherit}.electro-menu-item :deep(.q-icon){font-size:23px}.electro-menu-item :deep(.q-item__label--caption){color:var(--viti-muted)}
.electro-active{color:#0b4f83!important;background:linear-gradient(135deg,rgba(25,118,210,.14),rgba(0,172,193,.11))!important;font-weight:800;box-shadow:inset 3px 0 0 #1976d2}
:global(.body--dark) .electro-active{color:#72dbe3!important;background:linear-gradient(135deg,rgba(25,118,210,.24),rgba(0,172,193,.16))!important;box-shadow:inset 3px 0 0 #12b8c8}
.electro-session{border-top:1px solid var(--viti-border);background:color-mix(in srgb,var(--viti-card) 92%,transparent);backdrop-filter:blur(12px);color:var(--viti-text)}
.rounded-borders{border-radius:12px}.min-width-0{min-width:0}
@media(max-width:600px){.electro-header :deep(.q-toolbar){min-height:58px;padding-left:8px;padding-right:8px}.electro-brand-avatar{margin-left:4px}.electro-brand-copy{margin-left:9px}.electro-brand-copy .text-h6{font-size:17px}.electro-brand-copy .text-caption{font-size:10px}.electro-back-btn{margin-left:2px}}
</style>
