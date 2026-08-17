<script setup>
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'
import { useNotificationsStore } from '../stores/notifications'

const $q=useQuasar(),route=useRoute(),router=useRouter(),auth=useAuthStore(),notifications=useNotificationsStore()
const drawer=ref(false),loading=ref(true),appInfo=ref(null),airSystemConfig=ref(null),theme=ref('light')
const allModules=['inicio','agenda','ordenes','clientes','equipos','tecnicos','inventario','pagos','garantias','historial','buzon']
const clientMode=computed(()=>route.path.startsWith('/mi-apps/'))
const appBase=computed(()=>clientMode.value?'/mi-apps/electrofrio':'/apps/electrofrio')
const apiBase=computed(()=>clientMode.value?'/mi/apps/electrofrio':'/apps/electrofrio')
const homePath=computed(()=>clientMode.value?'/mi-aplicaciones':'/aplicaciones')
const businessName=computed(()=>airSystemConfig.value?.empresa?.nombre_comercial||appInfo.value?.empresa?.nombre_comercial||'Mi empresa')
const systemName=computed(()=>airSystemConfig.value?.nombre_corto||'Aires Acondicionados')
const fullSystemName=computed(()=>airSystemConfig.value?.nombre_sistema||'Sistema de Gestión de Servicios de Aire Acondicionado')
const brandLogo=computed(()=>airSystemConfig.value?.logo_url||null)
const enabledModules=computed(()=>Array.isArray(appInfo.value?.plan?.modulos)?appInfo.value.plan.modulos:allModules)
const hasModule=module=>enabledModules.value.includes(module)
const canManage=computed(()=>!clientMode.value||['propietario','administrador'].includes(appInfo.value?.rol))
const roleLabel=computed(()=>clientMode.value?({propietario:'Propietario',administrador:'Administrador',empleado:'Técnico / empleado'}[appInfo.value?.rol]||'Equipo técnico'):(auth.user?.rol==='superadmin'?'Superadministración VITI':'Administración VITI'))
const unreadCount=computed(()=>notifications.items.filter(item=>item.contexto==='electrofrio').length)
const unread=computed(()=>unreadCount.value>99?'99+':String(unreadCount.value||''))
const brandStyle=computed(()=>({'--electro-primary':airSystemConfig.value?.color_primario||'#0B5F7A','--electro-secondary':airSystemConfig.value?.color_secundario||'#12B8C8'}))
const themeIcon=computed(()=>theme.value==='dark'?'light_mode':'dark_mode')
provide('electrofrioModules',enabledModules);provide('electrofrioCanManage',canManage);provide('airSystemConfig',airSystemConfig)

const menuGroups=computed(()=>[
  {title:'Trabajo',items:[
    {module:'inicio',label:'Inicio',caption:'Qué necesita atención hoy',icon:'space_dashboard',to:`${appBase.value}/inicio`},
    {module:'ordenes',label:'Servicios',caption:'Todo el flujo en una sola ficha',icon:'assignment_turned_in',to:`${appBase.value}/ordenes`},
  ]},
  {title:'Personas y equipos',items:[
    {module:'clientes',label:'Clientes',caption:'Datos y acceso del cliente',icon:'groups',to:`${appBase.value}/clientes`},
    {module:'equipos',label:'Equipos',caption:'Ficha técnica e historial',icon:'ac_unit',to:`${appBase.value}/equipos`},
  ]},
  {title:'Recursos',items:[
    {module:'inventario',label:'Inventario',caption:'Materiales y stock',icon:'inventory_2',to:`${appBase.value}/inventario`},
  ]},
  {title:'Configuración',items:[
    {module:'tecnicos',label:'Técnicos',caption:'Personal que realiza servicios',icon:'engineering',to:`${appBase.value}/tecnicos`},
    {module:'inicio',label:'Mi sistema',caption:'Identidad y preferencias',icon:'tune',to:`${appBase.value}/configuracion`,manageOnly:true},
  ]},
].map(group=>({...group,items:group.items.filter(item=>hasModule(item.module)&&(!item.manageOnly||canManage.value))})).filter(group=>group.items.length))

function leaveTo(path){if(!String(path).startsWith(appBase.value))sessionStorage.setItem('viti-app-explicit-exit','1');router.push(path)}
async function loadState(){
  loading.value=true
  try{
    const [stateResponse,configResponse]=await Promise.all([api.get(clientMode.value?`${apiBase.value}/estado`:`${apiBase.value}/resumen`),api.get(`${apiBase.value}/configuracion`)])
    appInfo.value=stateResponse.data.data;airSystemConfig.value=configResponse.data.data;ensureAllowedRoute()
  }catch(error){$q.notify({type:'negative',message:error.response?.data?.message||'No se pudo abrir el sistema de servicios de aire acondicionado.'});sessionStorage.setItem('viti-app-explicit-exit','1');router.replace(homePath.value)}
  finally{loading.value=false;ensureAllowedRoute()}
}
function toggleTheme(){theme.value=theme.value==='dark'?'light':'dark';localStorage.setItem('viti-electrofrio-theme',theme.value);syncTheme()}
function syncTheme(){document.body.classList.add('electrofrio-app-active');document.body.classList.toggle('electrofrio-local-dark',theme.value==='dark');document.body.classList.toggle('electrofrio-local-light',theme.value!=='dark')}
function routeModule(){if(route.meta.electroSection)return String(route.meta.electroSection);if(route.path.endsWith('/buzon'))return'buzon';return'inicio'}
function ensureAllowedRoute(){if(!loading.value&&!hasModule(routeModule()))router.replace(`${appBase.value}/inicio`)}
onMounted(()=>{theme.value=localStorage.getItem('viti-electrofrio-theme')==='dark'?'dark':'light';syncTheme();drawer.value=$q.screen.gt.sm;notifications.start();loadState()})
onBeforeUnmount(()=>{notifications.stop();document.body.classList.remove('electrofrio-app-active','electrofrio-local-dark','electrofrio-local-light')})
watch(()=>route.fullPath,ensureAllowedRoute)
</script>

<template>
  <q-layout view="hHh LpR fFf" class="air-shell" :class="{'air-dark':theme==='dark'}" :style="brandStyle">
    <q-header class="air-header">
      <q-toolbar class="q-px-md q-px-lg-xl">
        <q-btn flat round dense icon="menu" color="white" @click="drawer=!drawer"/>
        <q-avatar size="42px" class="brand-avatar q-ml-sm"><img v-if="brandLogo" :src="brandLogo" alt="Logo"/><q-icon v-else name="ac_unit" size="26px"/></q-avatar>
        <div class="q-ml-md min-width-0"><div class="text-h6 text-weight-bold ellipsis">{{systemName}}</div><div class="text-caption ellipsis">{{businessName}} · gestionado mediante VITI</div></div>
        <q-space/>
        <q-btn flat round :icon="themeIcon" color="white" @click="toggleTheme"/>
        <q-btn flat round icon="forum" color="white" @click="leaveTo(`${appBase}/buzon`)"><q-badge v-if="unreadCount" floating rounded color="negative" :label="unread"/></q-btn>
        <q-btn outline color="white" no-caps icon="apps" :label="$q.screen.gt.xs?'Volver a VITI':''" class="q-ml-sm" @click="leaveTo(homePath)"/>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" :width="285" bordered class="air-drawer">
      <div class="drawer-brand q-pa-lg">
        <div class="row items-center no-wrap"><q-avatar size="52px" class="brand-avatar"><img v-if="brandLogo" :src="brandLogo" alt="Logo"/><q-icon v-else name="ac_unit" size="30px"/></q-avatar><div class="q-ml-md min-width-0"><div class="text-overline">VITI · Solución configurable</div><div class="text-h6 text-weight-bold ellipsis">{{businessName}}</div><div class="text-caption ellipsis">{{systemName}}</div></div></div>
      </div>
      <q-scroll-area style="height:calc(100% - 175px)">
        <q-list padding class="menu-list">
          <template v-for="group in menuGroups" :key="group.title">
            <q-item-label header class="menu-title">{{group.title}}</q-item-label>
            <q-item v-for="item in group.items" :key="item.to" clickable v-ripple :to="item.to" active-class="menu-active" class="menu-item"><q-item-section avatar><q-icon :name="item.icon"/></q-item-section><q-item-section><q-item-label>{{item.label}}</q-item-label><q-item-label caption>{{item.caption}}</q-item-label></q-item-section></q-item>
          </template>
        </q-list>
      </q-scroll-area>
      <div class="absolute-bottom session-card q-pa-md"><div class="row items-center no-wrap"><q-avatar size="36px" color="primary" text-color="white" icon="person"/><div class="q-ml-sm min-width-0"><div class="text-caption text-weight-bold ellipsis">{{auth.user?.nombre}}</div><div class="text-caption ellipsis">{{roleLabel}}</div></div></div></div>
    </q-drawer>

    <q-page-container><q-inner-loading :showing="loading" :label="`Preparando ${fullSystemName}...`"/><router-view v-if="!loading"/></q-page-container>
  </q-layout>
</template>

<style scoped>
.air-shell{--electro-primary:#0b5f7a;--electro-secondary:#12b8c8;--viti-bg:#eef5fb;--viti-card:#fff;--viti-text:#123047;--viti-muted:#63798a;--viti-border:rgba(15,76,129,.12);min-height:100vh;background:var(--viti-bg);color:var(--viti-text)}.air-dark{--viti-bg:#071827;--viti-card:#102a43;--viti-text:#f4fbff;--viti-muted:#bed0dc;--viti-border:rgba(146,211,229,.25)}.air-header,.drawer-brand{background:linear-gradient(135deg,var(--electro-primary),var(--electro-secondary));color:#fff}.air-header{box-shadow:0 8px 24px rgba(8,44,74,.18)}.air-header .text-caption,.drawer-brand .text-caption,.drawer-brand .text-overline{color:rgba(255,255,255,.82)}.brand-avatar{background:#fff;color:var(--electro-primary);overflow:hidden}.brand-avatar img{width:100%;height:100%;object-fit:cover}.air-drawer{background:var(--viti-card);color:var(--viti-text)}.menu-list{padding:12px 10px 90px}.menu-title{padding:14px 10px 6px;color:var(--viti-muted);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.menu-item{margin:4px 0;border-radius:14px;color:var(--viti-text)}.menu-item :deep(.q-item__label--caption){color:var(--viti-muted)}.menu-active{color:var(--electro-primary)!important;background:color-mix(in srgb,var(--electro-primary) 12%,transparent)!important;font-weight:800;box-shadow:inset 3px 0 0 var(--electro-primary)}.session-card{background:var(--viti-card);border-top:1px solid var(--viti-border)}.air-shell :deep(.q-page-container),.air-shell :deep(.q-page){background:var(--viti-bg);color:var(--viti-text)}.air-shell :deep(.q-card),.air-shell :deep(.q-table){background:var(--viti-card);color:var(--viti-text);border-color:var(--viti-border)}.air-shell :deep(.text-grey-7),.air-shell :deep(.text-grey-6){color:var(--viti-muted)!important}.air-shell :deep(.text-primary){color:var(--electro-primary)!important}.air-shell :deep(.bg-primary),.air-shell :deep(.q-btn.bg-primary){background:var(--electro-primary)!important}.min-width-0{min-width:0}:global(body.electrofrio-local-dark) .q-dialog__inner .q-card,:global(body.electrofrio-local-dark) .q-menu{background:#102a43;color:#f4fbff}:global(body.electrofrio-local-dark) .q-dialog__inner .q-field__label,:global(body.electrofrio-local-dark) .q-dialog__inner .q-field__native,:global(body.electrofrio-local-dark) .q-dialog__inner .q-field__input{color:#f4fbff}@media(max-width:600px){.air-header :deep(.q-toolbar){min-height:58px;padding-left:8px;padding-right:8px}.air-header .text-h6{font-size:17px;max-width:170px}}
</style>
