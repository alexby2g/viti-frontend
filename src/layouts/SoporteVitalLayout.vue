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

const menu=computed(()=>[
  {module:'inicio',label:'Inicio',icon:'dashboard',to:`${appBase.value}/inicio`},
  {module:'clientes',label:'Clientes',icon:'people',to:`${appBase.value}/clientes`},
  {module:'equipos',label:'Computadoras',icon:'computer',to:`${appBase.value}/equipos`},
  {module:'tecnicos',label:'Técnicos',icon:'engineering',to:`${appBase.value}/tecnicos`},
  {module:'ordenes',label:'Órdenes de servicio',icon:'fact_check',to:`${appBase.value}/ordenes`},
  {module:'agenda',label:'Agenda',icon:'calendar_month',to:`${appBase.value}/agenda`},
  {module:'pagos',label:'Pagos',icon:'payments',to:`${appBase.value}/pagos`},
  {module:'garantias',label:'Garantías',icon:'verified',to:`${appBase.value}/garantias`},
  {module:'historial',label:'Historial y reportes',icon:'history',to:`${appBase.value}/historial`},
].filter(item=>has(item.module)))

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
      <div class="q-ml-md header-copy">
        <div class="row items-center q-gutter-sm"><strong>{{businessName}}</strong><q-badge color="positive" :label="`V${version} · 100%`"/></div>
        <div class="text-caption gt-xs">Gestión de reparación y mantenimiento de computadoras</div>
      </div>
      <q-space/>
      <q-btn flat no-caps icon="arrow_back" :label="$q.screen.gt.xs?'Volver a VITI':''" aria-label="Volver a VITI" @click="leaveTo(homePath)"/>
    </q-toolbar>
  </q-header>

  <q-drawer v-model="drawer" show-if-above :overlay="$q.screen.lt.md" :breakpoint="900" :width="275" class="support-drawer">
    <div class="column fit no-wrap">
      <div class="q-pa-lg">
        <div class="row items-center q-gutter-md"><q-avatar color="primary" text-color="white" icon="computer"/><div class="col min-width-0"><div class="text-weight-bold ellipsis">{{businessName}}</div><div class="text-caption">{{deliveryLabel}}</div></div></div>
        <q-linear-progress :value="1" rounded size="8px" color="positive" class="q-mt-md"/>
        <div class="text-caption q-mt-xs">Desarrollo técnico: 100%</div>
      </div>
      <q-separator/>
      <q-scroll-area class="col"><q-list padding>
        <q-item v-for="item in menu" :key="item.to" clickable v-ripple :to="item.to" exact @click="()=>{if($q.screen.lt.md)drawer=false}">
          <q-item-section avatar><q-icon :name="item.icon"/></q-item-section><q-item-section>{{item.label}}</q-item-section>
        </q-item>
        <q-separator class="q-my-md"/>
        <div class="q-px-md q-pb-md">
          <q-banner rounded class="release-box">
            <div class="text-overline">V1.0 finalizada</div>
            <div class="text-caption">{{clientMode?'Acceso según tu rol del negocio.':'Lista para que AGR Studio realice la entrega cuando corresponda.'}}</div>
          </q-banner>
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
.support-shell{background:var(--viti-bg)}.support-header{background:#0d315b;color:#fff}.support-header :deep(.q-toolbar){min-height:64px}.support-drawer{background:#102f54;color:#fff}.support-drawer :deep(.q-item.q-router-link--active){background:rgba(255,255,255,.12);color:#fff}.release-box{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.14)}.min-width-0{min-width:0}@media(max-width:600px){.support-header :deep(.q-toolbar){min-height:58px}.header-copy{max-width:68vw}.header-copy strong{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
</style>
