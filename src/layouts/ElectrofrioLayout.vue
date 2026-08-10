<script setup>
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
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
const theme = ref('light')
const allModules = ['inicio','agenda','ordenes','clientes','equipos','tecnicos','inventario','pagos','garantias','historial','buzon']

const businessName = computed(() => appInfo.value?.empresa?.nombre_comercial || 'Electrofrío')
const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const appBase = computed(() => clientMode.value ? '/mi-apps/electrofrio' : '/apps/electrofrio')
const apiBase = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const homePath = computed(() => clientMode.value ? '/mi-aplicaciones' : '/aplicaciones')
const roleLabel = computed(() => clientMode.value ? ({propietario:'Propietario',administrador:'Administrador',empleado:'Técnico / empleado'}[appInfo.value?.rol]||'Equipo de Electrofrío') : (auth.user?.rol==='superadmin'?'Superadministración VITI':'Administración VITI'))
const electroUnreadCount = computed(() => notifications.items.filter(item => item.contexto === 'electrofrio').length)
const unread = computed(() => electroUnreadCount.value > 99 ? '99+' : String(electroUnreadCount.value || ''))
const themeIcon = computed(() => theme.value === 'dark' ? 'light_mode' : 'dark_mode')
const enabledModules = computed(() => {
  const modules = appInfo.value?.plan?.modulos
  return Array.isArray(modules) ? modules : allModules
})
const planName = computed(() => appInfo.value?.plan?.nombre || 'Plan personalizado')
const planPrice = computed(() => Number(appInfo.value?.plan?.precio_proyecto || 0))
const hasModule = module => enabledModules.value.includes(module)
const canManage = computed(() => !clientMode.value || ['propietario','administrador'].includes(appInfo.value?.rol))
provide('electrofrioModules', enabledModules)
provide('electrofrioCanManage', canManage)
const menuGroups = computed(() => [
  {
    title: 'Gestión diaria',
    items: [
      { module:'inicio', label:'Inicio', caption:'Resumen del negocio', icon:'space_dashboard', to:`${appBase.value}/inicio` },
      { module:'agenda', label:'Agenda', caption:'Visitas programadas', icon:'event_available', to:`${appBase.value}/agenda` },
      { module:'ordenes', label:'Órdenes', caption:'Diagnóstico y servicio', icon:'assignment', to:`${appBase.value}/ordenes` },
    ],
  },
  {
    title: 'Personas y recursos',
    items: [
      { module:'clientes', label:'Clientes y equipos', icon:'groups', to:`${appBase.value}/clientes` },
      { module:'tecnicos', label:'Técnicos', icon:'engineering', to:`${appBase.value}/tecnicos` },
      { module:'inventario', label:'Inventario', icon:'inventory_2', to:`${appBase.value}/inventario` },
    ],
  },
  {
    title: 'Control y seguimiento',
    items: [
      { module:'pagos', label:'Pagos', icon:'payments', to:`${appBase.value}/pagos` },
      { module:'garantias', label:'Garantías', icon:'verified', to:`${appBase.value}/garantias` },
      { module:'historial', label:'Historial y reportes', icon:'history', to:`${appBase.value}/historial` },
      { module:'buzon', label:'Mensajes Electrofrío', icon:'forum', to:`${appBase.value}/buzon`, badge:true },
    ],
  },
].map(group => ({...group, items:group.items.filter(item => hasModule(item.module))})).filter(group => group.items.length))

function leaveTo(path){
  if(!String(path).startsWith(appBase.value))sessionStorage.setItem('viti-app-explicit-exit','1')
  router.push(path)
}
async function loadState(){
  loading.value=true
  try{
    appInfo.value=(await api.get(clientMode.value?`${apiBase.value}/estado`:`${apiBase.value}/resumen`)).data.data
    ensureAllowedRoute()
  }
  catch(e){
    $q.notify({type:'negative',message:e.response?.data?.message||'No se pudo abrir Electrofrío dentro de VITI.'})
    sessionStorage.setItem('viti-app-explicit-exit','1')
    router.replace(homePath.value)
  }finally{loading.value=false;ensureAllowedRoute()}
}
function toggleTheme(){
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('viti-electrofrio-theme', theme.value)
  syncThemeClass()
}
function syncThemeClass(){
  document.body.classList.add('electrofrio-app-active')
  document.body.classList.toggle('electrofrio-local-dark',theme.value==='dark')
  document.body.classList.toggle('electrofrio-local-light',theme.value!=='dark')
}
function routeModule(){
  if(route.meta.electroSection)return String(route.meta.electroSection)
  if(route.path.endsWith('/buzon'))return 'buzon'
  return 'inicio'
}
function ensureAllowedRoute(){
  if(!loading.value && !hasModule(routeModule()))router.replace(`${appBase.value}/inicio`)
}

onMounted(()=>{
  theme.value=localStorage.getItem('viti-electrofrio-theme')==='dark'?'dark':'light'
  syncThemeClass()
  drawer.value=$q.screen.gt.sm
  notifications.start()
  loadState()
})
onBeforeUnmount(()=>{
  notifications.stop()
  document.body.classList.remove('electrofrio-app-active','electrofrio-local-dark','electrofrio-local-light')
})
watch(()=>route.fullPath,ensureAllowedRoute)
</script>

<template>
  <q-layout view="hHh LpR fFf" class="electro-app-shell" :class="{'electro-dark':theme==='dark'}">
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
            <div class="text-caption">{{planName}}{{planPrice?` · ${planPrice.toFixed(0)} Bs`:''}}</div>
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
.electro-app-shell.electro-dark{--electro-primary:#57d6e1;--viti-bg:#071827;--viti-card:#102a43;--viti-text:#f4fbff;--viti-muted:#bed0dc;--viti-border:rgba(146,211,229,.28)}
.electro-app-shell :deep(.q-page-container),.electro-app-shell :deep(.q-page){background:var(--viti-bg);color:var(--viti-text)}
.electro-app-shell :deep(.q-card),.electro-app-shell :deep(.q-table),.electro-app-shell :deep(.viti-card),.electro-app-shell :deep(.viti-table){background:var(--viti-card);color:var(--viti-text);border-color:var(--viti-border)}
.electro-app-shell :deep(.text-grey-6),.electro-app-shell :deep(.text-grey-7){color:var(--viti-muted)!important}
.electro-app-shell :deep(.text-primary){color:var(--electro-primary)!important}
.electro-app-shell :deep(.bg-primary),.electro-app-shell :deep(.q-btn.bg-primary){background:var(--electro-primary)!important}
.electro-dark :deep(.q-field__label),.electro-dark :deep(.q-field__native),.electro-dark :deep(.q-field__input),.electro-dark :deep(.q-field__marginal),.electro-dark :deep(.q-item__label),.electro-dark :deep(.q-table th),.electro-dark :deep(.q-table td){color:var(--viti-text)}
.electro-dark :deep(.q-field--outlined .q-field__control:before){border-color:#52758d}
.electro-dark :deep(.q-separator){background:rgba(174,217,230,.24)}
.electro-header{background:linear-gradient(135deg,#0b3d68,#0f6fa4 55%,#00a6b6);color:#fff!important;box-shadow:0 8px 24px rgba(8,44,74,.2)}
.electro-header :deep(.q-toolbar){min-height:64px}.electro-header .text-caption{color:rgba(255,255,255,.78)}
.electro-brand-avatar{color:#0f5d7b;background:rgba(255,255,255,.94);box-shadow:0 8px 20px rgba(7,38,61,.2)}
.electro-brand-copy{line-height:1.15}.electro-back-btn{border-color:rgba(255,255,255,.66)}
.electro-drawer{background:linear-gradient(180deg,#fff 0%,#f3f8fc 100%);color:#244256}
.electro-dark .electro-drawer{background:linear-gradient(180deg,#102a43 0%,#091e31 100%);color:#f4fbff}
.electro-drawer-brand{color:#fff;background:linear-gradient(135deg,#0b3d68,#0f4c81 58%,#127f9c);box-shadow:0 10px 28px rgba(8,44,74,.2)}
.electro-drawer-brand .text-overline{color:#9debf0}.electro-drawer-brand .text-caption{color:rgba(255,255,255,.76)}
.electro-menu{padding:12px 10px 90px}.electro-menu-title{padding:14px 10px 6px;color:#6b7d8c;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.electro-dark .electro-menu-title{color:#b6cad6}
.electro-menu-item{min-height:50px;margin:4px 0;border-radius:14px;color:inherit}.electro-menu-item :deep(.q-icon){font-size:23px}.electro-menu-item :deep(.q-item__label--caption){color:var(--viti-muted)}
.electro-active{color:#0b4f83!important;background:linear-gradient(135deg,rgba(25,118,210,.14),rgba(0,172,193,.11))!important;font-weight:800;box-shadow:inset 3px 0 0 #1976d2}
.electro-dark .electro-active{color:#8fe9ef!important;background:linear-gradient(135deg,rgba(25,118,210,.28),rgba(0,172,193,.2))!important;box-shadow:inset 3px 0 0 #44d1dc}
.electro-session{border-top:1px solid var(--viti-border);background:color-mix(in srgb,var(--viti-card) 92%,transparent);backdrop-filter:blur(12px);color:var(--viti-text)}
.electro-dark .electro-session{color:#f4fbff}
:global(body.electrofrio-local-dark) .q-dialog__inner .q-card,:global(body.electrofrio-local-dark) .q-menu{background:#102a43;color:#f4fbff}
:global(body.electrofrio-local-dark) .q-dialog__inner .text-grey-6,:global(body.electrofrio-local-dark) .q-dialog__inner .text-grey-7{color:#bed0dc!important}
:global(body.electrofrio-local-dark) .q-dialog__inner .q-field__label,:global(body.electrofrio-local-dark) .q-dialog__inner .q-field__native,:global(body.electrofrio-local-dark) .q-dialog__inner .q-field__input,:global(body.electrofrio-local-dark) .q-dialog__inner .q-field__marginal{color:#f4fbff}
:global(body.electrofrio-local-dark) .q-dialog__inner .q-field--outlined .q-field__control:before{border-color:#52758d}
:global(body.electrofrio-local-light) .q-dialog__inner .q-card,:global(body.electrofrio-local-light) .q-menu{background:#fff;color:#123047}
.rounded-borders{border-radius:12px}.min-width-0{min-width:0}
@media(max-width:600px){.electro-header :deep(.q-toolbar){min-height:58px;padding-left:8px;padding-right:8px}.electro-brand-avatar{margin-left:4px}.electro-brand-copy{margin-left:9px}.electro-brand-copy .text-h6{font-size:17px}.electro-brand-copy .text-caption{font-size:10px}.electro-back-btn{margin-left:2px}}
</style>
