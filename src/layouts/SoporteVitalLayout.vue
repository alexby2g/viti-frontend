<script setup>
import { computed,onMounted,provide,ref,watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute,useRouter } from 'vue-router'
import { api } from '../boot/axios'

const $q=useQuasar(),route=useRoute(),router=useRouter()
const drawer=ref($q.screen.gt.sm),loading=ref(true),appState=ref(null)
const allModules=['inicio','agenda','ordenes','clientes','equipos','tecnicos','pagos','garantias','historial']
const clientMode=computed(()=>route.path.startsWith('/mi-apps/servicio-tecnico'))
const appBase=computed(()=>clientMode.value?'/mi-apps/servicio-tecnico':'/apps/servicio-tecnico')
const apiBase=computed(()=>clientMode.value?'/mi/apps/servicio-tecnico':'/apps/servicio-tecnico')
const homePath=computed(()=>clientMode.value?'/mi-aplicaciones':'/aplicaciones')
const modules=computed(()=>Array.isArray(appState.value?.modulos)?appState.value.modulos:allModules)
const canManage=computed(()=>!clientMode.value||Boolean(appState.value?.puede_administrar))
const has=module=>modules.value.includes(module)
provide('serviceTechnicalModules',modules)
provide('serviceTechnicalCanManage',canManage)
provide('serviceTechnicalApiBase',apiBase)

const menuGroups=computed(()=>[
  {
    title:'Trabajo técnico',
    items:[
      {module:'inicio',label:'Inicio',caption:'Resumen del negocio',icon:'dashboard',to:`${appBase.value}/inicio`},
      {module:'agenda',label:'Agenda',caption:'Trabajos programados',icon:'calendar_month',to:`${appBase.value}/agenda`},
      {module:'ordenes',label:'Órdenes de servicio',caption:'Diagnóstico, reparación y entrega',icon:'fact_check',to:`${appBase.value}/ordenes`},
    ],
  },
  {
    title:'Personas y equipos',
    items:[
      {module:'clientes',label:'Clientes',icon:'people',to:`${appBase.value}/clientes`},
      {module:'equipos',label:'Computadoras',icon:'computer',to:`${appBase.value}/equipos`},
      {module:'tecnicos',label:'Técnicos',icon:'engineering',to:`${appBase.value}/tecnicos`},
    ],
  },
  {
    title:'Control y seguimiento',
    items:[
      {module:'pagos',label:'Pagos',icon:'payments',to:`${appBase.value}/pagos`},
      {module:'garantias',label:'Garantías',icon:'verified',to:`${appBase.value}/garantias`},
      {module:'historial',label:'Historial y reportes',icon:'history',to:`${appBase.value}/historial`},
    ],
  },
].map(group=>({...group,items:group.items.filter(item=>has(item.module))})).filter(group=>group.items.length))

const version=computed(()=>appState.value?.aplicacion?.version||'1.0.0')
const businessName=computed(()=>appState.value?.empresa?.nombre_comercial||'Soporte Vital PC')
const roleLabel=computed(()=>({propietario:'Propietario',administrador:'Administrador',empleado:'Técnico / empleado',superadmin:'Superadministración VITI',administrador_viti:'Administración VITI'}[appState.value?.rol]||'Servicio Técnico'))
const deliveryLabel=computed(()=>clientMode.value?roleLabel.value:(appState.value?.aplicacion?.acceso_cliente?'Entregada':'Pendiente de entrega'))

function leaveTo(path){
  if(!String(path).startsWith(appBase.value))sessionStorage.setItem('viti-app-explicit-exit','1')
  router.push(path)
}
function ensureAllowedRoute(){
  if(loading.value||!appState.value)return
  const module=String(route.meta.supportSection||'inicio')
  if(!has(module))router.replace(`${appBase.value}/inicio`)
}
async function loadState(){
  loading.value=true
  try{appState.value=(await api.get(`${apiBase.value}/estado`)).data.data;ensureAllowedRoute()}
  catch(e){
    $q.notify({type:'negative',message:e.response?.data?.message||'No se pudo abrir Servicio Técnico VITI.'})
    sessionStorage.setItem('viti-app-explicit-exit','1')
    router.replace(homePath.value)
  }finally{loading.value=false;ensureAllowedRoute()}
}
onMounted(loadState)
watch(()=>route.fullPath,ensureAllowedRoute)
</script>

<template>
<q-layout view="lHh Lpr lFf" class="support-shell">
  <q-header bordered class="support-header">
    <q-toolbar class="q-px-md">
      <q-btn flat round dense icon="menu" aria-label="Abrir menú" @click="drawer=!drawer"/>
      <q-avatar size="38px" class="support-header-avatar q-ml-sm"><q-icon name="computer" size="22px"/></q-avatar>
      <div class="q-ml-md header-copy">
        <div class="row items-center q-gutter-sm"><strong>{{businessName}}</strong><q-badge color="positive" :label="`V${version} · 100%`"/></div>
        <div class="text-caption gt-xs">Gestión de reparación y mantenimiento de computadoras</div>
      </div>
      <q-space/>
      <q-btn flat no-caps icon="arrow_back" :label="$q.screen.gt.xs?'Volver a VITI':''" aria-label="Volver a VITI" @click="leaveTo(homePath)"/>
    </q-toolbar>
  </q-header>

  <q-drawer v-model="drawer" show-if-above :overlay="$q.screen.lt.md" :breakpoint="900" :width="292" class="support-drawer">
    <div class="column fit no-wrap">
      <div class="support-brand q-pa-lg">
        <div class="row items-center q-gutter-md"><q-avatar size="52px" class="support-brand-avatar" icon="computer"/><div class="col min-width-0"><div class="text-overline">VITI App</div><div class="text-weight-bold text-h6 ellipsis">{{businessName}}</div><div class="text-caption">{{deliveryLabel}}</div></div></div>
        <q-linear-progress :value="1" rounded size="7px" color="positive" class="q-mt-md"/>
        <div class="text-caption q-mt-xs">Desarrollo técnico: 100% · V{{version}}</div>
      </div>
      <q-separator/>
      <q-scroll-area class="col"><q-list padding class="support-menu">
        <template v-for="group in menuGroups" :key="group.title">
          <q-item-label header class="support-menu-title">{{group.title}}</q-item-label>
          <q-item v-for="item in group.items" :key="item.to" clickable v-ripple :to="item.to" exact active-class="support-active" class="support-menu-item" @click="()=>{if($q.screen.lt.md)drawer=false}">
            <q-item-section avatar><q-icon :name="item.icon"/></q-item-section>
            <q-item-section><q-item-label>{{item.label}}</q-item-label><q-item-label v-if="item.caption" caption>{{item.caption}}</q-item-label></q-item-section>
          </q-item>
        </template>
        <q-separator class="q-my-md"/>
        <div class="q-px-sm q-pb-md">
          <q-banner rounded class="release-box"><div class="text-overline">V1.0 finalizada</div><div class="text-caption">{{clientMode?'Acceso según tu rol del negocio.':'Lista para que AGR Studio realice la entrega cuando corresponda.'}}</div></q-banner>
        </div>
      </q-list></q-scroll-area>
    </div>
  </q-drawer>

  <q-page-container>
    <q-inner-loading :showing="loading" label="Preparando Servicio Técnico..."/>
    <router-view v-if="!loading"/>
  </q-page-container>
</q-layout>
</template>

<style scoped>
.support-shell{--support-primary:#0d5e94;--support-deep:#092b4e;--support-accent:#2f91d7;background:var(--viti-bg);color:var(--viti-text)}.support-header{background:linear-gradient(135deg,#092b4e,#0d4b7a 62%,#136da5);color:#fff;box-shadow:0 7px 22px rgba(5,31,54,.18)}.support-header :deep(.q-toolbar){min-height:64px}.support-header .text-caption{color:rgba(255,255,255,.74)}.support-header-avatar{background:rgba(255,255,255,.95);color:#0d5e94}.support-drawer{background:color-mix(in srgb,var(--viti-card) 96%,#0d5e94 4%);color:var(--viti-text)}.support-brand{background:linear-gradient(145deg,#0b355d,#0f5e91);color:#fff}.support-brand .text-overline{color:#a8d9f7}.support-brand .text-caption{color:rgba(255,255,255,.76)}.support-brand-avatar{background:rgba(255,255,255,.94);color:#0d5e94}.support-menu{padding:10px 10px 90px}.support-menu-title{padding:14px 10px 5px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--viti-muted)}.support-menu-item{min-height:48px;margin:3px 0;border-radius:13px;color:inherit}.support-menu-item :deep(.q-item__label--caption){color:var(--viti-muted)}.support-active{color:#0d5e94!important;background:rgba(13,94,148,.11)!important;font-weight:800;box-shadow:inset 3px 0 0 #1687c8}.release-box{background:color-mix(in srgb,var(--viti-card) 92%,#0d5e94 8%);color:var(--viti-text);border:1px solid var(--viti-border)}.min-width-0{min-width:0}@media(max-width:600px){.support-header :deep(.q-toolbar){min-height:58px}.header-copy{max-width:62vw}.header-copy strong{max-width:165px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
</style>