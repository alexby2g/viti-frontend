<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Dark, useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'
import { useNotificationsStore } from '../stores/notifications'
import { useTenantStore } from '../stores/tenant'
import { formatDateTime } from '../utils/date'
import AppBrand from '../components/AppBrand.vue'
import CallCenter from '../components/CallCenter.vue'

const adminPhotoInput=ref(null),uploadingPhoto=ref(false),router=useRouter(),$q=useQuasar(),drawer=ref(false)
const auth=useAuthStore(),notifications=useNotificationsStore(),tenant=useTenantStore()
const initials=computed(()=>`${auth.user?.nombre?.[0]||''}${auth.user?.apellido?.[0]||''}`.toUpperCase())
const isClient=computed(()=>auth.user?.rol==='cliente')
const accountRoleLabel=computed(()=>isClient.value?(tenant.active?.rol||'Cliente'):(auth.user?.rol==='superadmin'?'Superadministrador':auth.user?.rol||'Usuario interno'))
const hasClientProfile=computed(()=>!!auth.user?.cliente_id)
const isManager=computed(()=>['propietario','administrador'].includes(tenant.role))
const profilePhoto=computed(()=>isClient.value?auth.user?.cliente?.foto_url:auth.user?.foto_url)
const unreadLabel=computed(()=>notifications.unreadCount>99?'99+':String(notifications.unreadCount||''))
const businessOptions=computed(()=>tenant.businesses.map(b=>({label:b.nombre_comercial,value:b.id})))

const menu=computed(()=>{
  if(isClient.value){
    const items=[]
    if(hasClientProfile.value)items.push({label:'Mi cuenta',icon:'account_circle',to:'/mi-cuenta'})
    items.push({label:'Mi negocio',icon:'storefront',to:'/mi-negocio'},{label:'Mis aplicaciones',icon:'apps',to:'/mi-aplicaciones'})
    if(isManager.value)items.push({label:'Catálogo VITI',icon:'widgets',to:'/catalogo-viti'},{label:'Mi proyecto',icon:'account_tree',to:'/mi-proyecto'},{label:'Mis pagos',icon:'payments',to:'/mi-pagos'})
    if(hasClientProfile.value&&isManager.value)items.push({label:'Nueva solicitud',icon:'assignment_add',action:'request'})
    if(hasClientProfile.value)items.push({label:'Mi buzón',icon:'forum',to:'/mi-buzon',badge:notifications.unreadCount})
    return items
  }
  return [
    {label:'Inicio',icon:'dashboard',to:'/'},
    {label:'Plataforma',icon:'hub',children:[{label:'Centro SaaS VITI',icon:'cloud_circle',to:'/saas'}]},
    {label:'Clientes y empresas',icon:'groups',to:'/clientes'},
    {label:'Levantamiento',icon:'assignment',children:[{label:'Solicitudes de sistema',icon:'fact_check',to:'/solicitudes'}]},
    {label:'Desarrollo',icon:'terminal',children:[{label:'Proyectos',icon:'account_tree',to:'/proyectos'},{label:'Centro de aplicaciones',icon:'apps',to:'/aplicaciones'}]},
    {label:'Atención',icon:'forum',children:[{label:'Buzón de clientes',icon:'mark_chat_unread',to:'/buzon',badge:notifications.unreadCount}]},
    {label:'Soporte',icon:'support_agent',children:[{label:'Mantenimiento',icon:'build_circle',to:'/mantenimientos'},{label:'Archivos',icon:'folder',to:'/archivos'}]},
    {label:'Control',icon:'analytics',children:[{label:'Pagos y suscripciones',icon:'payments',to:'/pagos'},{label:'Reportes',icon:'picture_as_pdf',to:'/reportes'}]},
    {label:'Administración',icon:'admin_panel_settings',children:[{label:'Usuarios',icon:'manage_accounts',to:'/usuarios'},{label:'Auditoría',icon:'history',to:'/auditoria'},{label:'Almacenamiento',icon:'cloud',to:'/almacenamiento'}]},
  ]
})

function toggleDark(){Dark.toggle();localStorage.setItem('viti-theme',Dark.isActive?'dark':'light')}
function closeMobileDrawer(){if($q.screen.lt.md)drawer.value=false}
function chooseAdminPhoto(){if(!isClient.value&&!uploadingPhoto.value)adminPhotoInput.value?.click()}
function switchBusiness(id){if(!id||Number(id)===Number(tenant.activeId))return;tenant.select(id);window.location.assign('/mi-aplicaciones')}
async function uploadAdminPhoto(event){const file=event.target?.files?.[0];if(!file)return;uploadingPhoto.value=true;try{const payload=new FormData();payload.append('foto',file);const{data}=await api.post('/auth/perfil/foto',payload,{headers:{'Content-Type':'multipart/form-data'}});auth.user=data.usuario;$q.notify({type:'positive',message:'Fotografía de perfil actualizada.'})}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo actualizar la fotografía.'})}finally{uploadingPhoto.value=false;if(event.target)event.target.value=''}}
async function logout(){notifications.clear();tenant.clear();await auth.logout();router.replace('/login')}
async function handleItem(item){closeMobileDrawer();if(item.action==='request'){try{const{data}=await api.post('/mi/solicitud');window.location.href=data.data.enlace_publico}catch{return}}if(item.to)router.push(item.to)}
function openNotification(item){if(item.path){router.push(item.path);return}router.push(isClient.value?'/mi-buzon':'/buzon')}
async function markAllRead(){try{await notifications.markAllRead()}catch{/* conserva estado */}}
function refreshWhenVisible(){if(document.visibilityState==='visible')notifications.refresh()}
onMounted(async()=>{drawer.value=$q.screen.gt.sm;if(isClient.value){try{await tenant.load()}catch{/* mantiene acceso básico */}}notifications.start();document.addEventListener('visibilitychange',refreshWhenVisible)})
onBeforeUnmount(()=>{notifications.stop();document.removeEventListener('visibilitychange',refreshWhenVisible)})
</script>

<template><q-layout view="lHh Lpr lFf"><q-header bordered class="viti-header"><q-toolbar class="viti-toolbar"><q-btn flat round dense icon="menu" @click="drawer=!drawer"/><div class="q-ml-md text-weight-bold gt-xs">{{isClient?(tenant.active?.nombre_comercial||'Mi espacio VITI'):'Panel VITI'}}</div><q-space/><q-btn flat round :icon="$q.dark.isActive?'light_mode':'dark_mode'" @click="toggleDark"><q-tooltip>Cambiar tema</q-tooltip></q-btn><q-btn flat round :icon="notifications.unreadCount?'notifications_active':'notifications_none'"><q-badge v-if="notifications.unreadCount" floating rounded color="negative" :label="unreadLabel"/><q-tooltip>Notificaciones internas</q-tooltip><q-menu anchor="bottom right" self="top right" class="notifications-menu"><q-card flat style="width:390px;max-width:92vw"><q-card-section class="row items-center q-pb-sm"><div><div class="text-subtitle1 text-weight-bold">Notificaciones</div><div class="text-caption text-grey-6">{{notifications.unreadCount?`${notifications.unreadCount} sin leer`:'Todo está al día'}}</div></div><q-space/><q-btn v-if="notifications.unreadCount" flat dense no-caps color="primary" label="Marcar leído" @click.stop="markAllRead"/></q-card-section><q-separator/><q-list v-if="notifications.items.length" separator><q-item v-for="item in notifications.items" :key="item.id" clickable v-close-popup @click="openNotification(item)"><q-item-section avatar><q-avatar color="primary" text-color="white" :icon="item.tipo==='pago'?'payments':item.tipo==='entrega'?'key':'chat_bubble'"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{item.titulo}}</q-item-label><q-item-label caption lines="1">{{item.asunto}}</q-item-label><q-item-label caption lines="2">{{item.mensaje}}</q-item-label><q-item-label caption>{{formatDateTime(item.created_at)}}</q-item-label></q-item-section></q-item></q-list><div v-else class="q-pa-lg text-center text-grey-6"><q-icon name="notifications_none" size="32px" class="q-mb-sm"/><div>No tienes notificaciones nuevas.</div></div></q-card></q-menu></q-btn></q-toolbar></q-header>
<q-drawer v-model="drawer" show-if-above :breakpoint="900" :overlay="$q.screen.lt.md" :width="272" class="viti-drawer"><div class="column fit no-wrap"><div class="q-pa-lg"><AppBrand/></div><div v-if="!isClient" class="q-px-md q-pb-md"><q-btn unelevated color="primary" icon="add" label="Nueva solicitud" no-caps class="full-width" to="/solicitudes?new=1" @click="closeMobileDrawer"/></div><div v-else class="q-px-md q-pb-md"><div class="client-badge"><div class="text-caption">Negocio activo</div><q-select v-if="tenant.businesses.length>1" dark borderless dense :model-value="tenant.activeId" :options="businessOptions" emit-value map-options @update:model-value="switchBusiness"/><div v-else class="text-weight-bold ellipsis">{{tenant.active?.nombre_comercial||'Mi espacio VITI'}}</div><div v-if="tenant.active?.rol" class="text-caption q-mt-xs">{{tenant.active.rol}}</div></div></div><q-scroll-area class="col"><q-list padding><template v-for="item in menu" :key="item.label"><q-item v-if="!item.children" clickable v-ripple :to="item.action?undefined:item.to" exact @click="handleItem(item)"><q-item-section avatar><q-icon :name="item.icon"/></q-item-section><q-item-section>{{item.label}}</q-item-section><q-item-section v-if="item.badge" side><q-badge rounded color="negative" :label="item.badge>99?'99+':item.badge"/></q-item-section></q-item><q-expansion-item v-else :icon="item.icon" :label="item.label" group="menu"><q-item v-for="sub in item.children" :key="sub.to" clickable v-ripple :to="sub.to" class="q-ml-sm" @click="closeMobileDrawer"><q-item-section avatar><q-icon :name="sub.icon"/></q-item-section><q-item-section>{{sub.label}}</q-item-section><q-item-section v-if="sub.badge" side><q-badge rounded color="negative" :label="sub.badge>99?'99+':sub.badge"/></q-item-section></q-item></q-expansion-item></template></q-list></q-scroll-area><q-separator/><q-item class="q-ma-sm q-py-md"><q-item-section avatar><q-avatar color="accent" text-color="white" :class="{'cursor-pointer':!isClient}" @click="chooseAdminPhoto"><img v-if="profilePhoto" :src="profilePhoto" alt="Foto de perfil"/><span v-else>{{initials||'VT'}}</span><q-tooltip v-if="!isClient">Cambiar fotografía</q-tooltip></q-avatar><input ref="adminPhotoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="uploadAdminPhoto"/></q-item-section><q-item-section><q-item-label>{{auth.user?.nombre}} {{auth.user?.apellido}}</q-item-label><q-item-label caption>{{accountRoleLabel}}</q-item-label></q-item-section><q-item-section side><q-spinner v-if="uploadingPhoto" size="20px" color="primary"/><q-btn v-else flat round dense icon="logout" @click="logout"><q-tooltip>Cerrar sesión</q-tooltip></q-btn></q-item-section></q-item></div></q-drawer><q-page-container><router-view/></q-page-container><CallCenter/></q-layout></template>
<style scoped>.client-badge{padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.08)}.viti-toolbar{min-height:64px}@media(max-width:600px){.viti-toolbar{min-height:58px;padding-left:10px;padding-right:10px}}</style>
