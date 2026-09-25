<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Dark, useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'
import { useBrandingStore } from '../stores/branding'
import { useNotificationsStore } from '../stores/notifications'
import { useTenantStore } from '../stores/tenant'
import { formatDateTime } from '../utils/date'
import { buildMainMenu } from '../navigation/mainMenu'
import AppBrand from '../components/AppBrand.vue'
import BrandingSettingsDialog from '../components/BrandingSettingsDialog.vue'
import CallCenter from '../components/CallCenter.vue'

const profilePhotoInput = ref(null)
const profileCameraInput = ref(null)
const profileDialog = ref(false)
const profilePhotoPreview = ref(false)
const uploadingPhoto = ref(false)
const router = useRouter()
const $q = useQuasar()
const drawer = ref(false)
const quickSearch = ref(false)
const quickTerm = ref('')
const brandingDialog = ref(false)
const auth = useAuthStore()
const branding = useBrandingStore()
const notifications = useNotificationsStore()
const tenant = useTenantStore()

const initials = computed(() => `${auth.user?.nombre?.[0] || ''}${auth.user?.apellido?.[0] || ''}`.toUpperCase())
const isClient = computed(() => auth.user?.rol === 'cliente')
const isSuperAdmin = computed(() => auth.user?.rol === 'superadmin')
const accountRoleLabel = computed(() => isClient.value
  ? (tenant.active?.rol || 'Cliente')
  : (isSuperAdmin.value ? 'Superadministrador' : auth.user?.rol === 'administrador' ? 'Administrador' : auth.user?.rol || 'Usuario interno'))
const hasClientProfile = computed(() => !!auth.user?.cliente_id)
const isManager = computed(() => ['propietario', 'administrador'].includes(tenant.role))
const profilePhoto = computed(() => isClient.value ? auth.user?.cliente?.foto_url : auth.user?.foto_url)
const canChangeProfilePhoto = computed(() => isClient.value || isSuperAdmin.value)
const unreadLabel = computed(() => notifications.unreadCount > 99 ? '99+' : String(notifications.unreadCount || ''))
const businessOptions = computed(() => tenant.businesses.map(b => ({ label: b.nombre_comercial, value: b.id })))

const menu = computed(() => buildMainMenu({
  isClient: isClient.value,
  isSuperAdmin: isSuperAdmin.value,
  hasClientProfile: hasClientProfile.value,
  hasBusiness: tenant.businesses.length > 0,
  isManager: isManager.value,
  unreadCount: notifications.unreadCount,
  productName: branding.product_name,
}))

const quickItems = computed(() => menu.value.flatMap(item => item.children
  ? item.children.filter(child => child.to).map(child => ({ ...child, group: item.label }))
  : item.to ? [{ ...item, group: null }] : []))
const filteredQuickItems = computed(() => {
  const term = quickTerm.value.trim().toLocaleLowerCase('es')
  return (term
    ? quickItems.value.filter(item => `${item.group || ''} ${item.label}`.toLocaleLowerCase('es').includes(term))
    : quickItems.value).slice(0, 12)
})

function refreshApp() { window.location.reload() }
function closeMobileDrawer() { if ($q.screen.lt.md) drawer.value = false }
function openProfile() { profileDialog.value = true }
function chooseProfilePhoto() { if (canChangeProfilePhoto.value && !uploadingPhoto.value) profilePhotoInput.value?.click() }
function takeProfilePhoto() { if (canChangeProfilePhoto.value && !uploadingPhoto.value) profileCameraInput.value?.click() }
function editProfile() {
  profileDialog.value = false
  closeMobileDrawer()
  if (isClient.value && hasClientProfile.value) router.push('/mi-cuenta')
}
function switchBusiness(id) { if (!id || Number(id) === Number(tenant.activeId)) return; tenant.select(id); window.location.assign('/mi-aplicaciones') }
async function uploadProfilePhoto(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  uploadingPhoto.value = true
  try {
    const payload = new FormData()
    payload.append('foto', file)
    const endpoint = isClient.value ? '/mi/perfil/foto' : '/auth/perfil/foto'
    const { data } = await api.post(endpoint, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (isClient.value) {
      const client = data.data || {}
      auth.user = {
        ...auth.user,
        nombre: client.nombre || auth.user?.nombre,
        cliente: {
          ...(auth.user?.cliente || {}),
          ...client,
          foto_url: data.foto_url || client.foto_url || auth.user?.cliente?.foto_url,
        },
      }
    } else if (data.usuario) {
      auth.user = data.usuario
    }
    $q.notify({ type: 'positive', message: 'Fotografía de perfil actualizada.' })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'No se pudo actualizar la fotografía.' })
  } finally {
    uploadingPhoto.value = false
    if (event.target) event.target.value = ''
  }
}
async function logout() { profileDialog.value = false; profilePhotoPreview.value = false; notifications.clear(); tenant.clear(); await auth.logout(); router.replace('/login') }
async function handleItem(item) {
  closeMobileDrawer()
  if (item.action === 'branding') {
    brandingDialog.value = true
    return
  }
  if (item.action === 'request') {
    // El formulario oficial crea el negocio cuando hace falta y reutiliza la cuenta
    // existente. No exigimos un negocio previo para solicitar un sistema.
    window.location.href = '/solicitud'
    return
  }
  if (item.to) router.push(item.to)
}
function openNotification(item) { if (item.path) { router.push(item.path); return } router.push(isClient.value ? '/mi-buzon' : '/buzon') }
async function markAllRead() { try { await notifications.markAllRead() } catch { /* conserva estado */ } }
function refreshWhenVisible() { if (document.visibilityState === 'visible') notifications.refresh() }
function openQuickSearch() { quickTerm.value = ''; quickSearch.value = true }
function goQuick(item) { quickSearch.value = false; router.push(item.to) }
function handleGlobalShortcut(event) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openQuickSearch() } }

onMounted(async () => {
  Dark.set(true)
  localStorage.setItem('viti-theme', 'dark')
  document.body.classList.add('viti-main-active')
  drawer.value = $q.screen.gt.sm
  branding.load().catch(() => {})
  if (isClient.value) { try { await tenant.load() } catch { /* mantiene acceso básico */ } }
  notifications.start()
  document.addEventListener('visibilitychange', refreshWhenVisible)
  window.addEventListener('keydown', handleGlobalShortcut)
})
onBeforeUnmount(() => {
  document.body.classList.remove('viti-main-active')
  notifications.stop()
  document.removeEventListener('visibilitychange', refreshWhenVisible)
  window.removeEventListener('keydown', handleGlobalShortcut)
})
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header bordered class="viti-header">
      <q-toolbar class="viti-toolbar">
        <q-btn flat round dense icon="menu" @click="drawer = !drawer" />
        <div class="q-ml-md text-weight-bold gt-xs">{{ isClient ? (tenant.active?.nombre_comercial || `Mi espacio ${branding.product_name}`) : `Panel ${branding.product_name}` }}</div>
        <q-space />
        <q-btn flat round dense icon="refresh" @click="refreshApp"><q-tooltip>Actualizar {{ branding.product_name }}</q-tooltip></q-btn>
        <q-btn flat round icon="search" @click="openQuickSearch"><q-tooltip>Buscar en {{ branding.product_name }} · Ctrl K</q-tooltip></q-btn>
        <q-btn flat round :icon="notifications.unreadCount ? 'notifications_active' : 'notifications_none'">
          <q-badge v-if="notifications.unreadCount" floating rounded color="negative" :label="unreadLabel" />
          <q-tooltip>Notificaciones internas</q-tooltip>
          <q-menu anchor="bottom right" self="top right" class="notifications-menu">
            <q-card flat style="width:390px;max-width:92vw">
              <q-card-section class="row items-center q-pb-sm">
                <div>
                  <div class="text-subtitle1 text-weight-bold">Notificaciones</div>
                  <div class="text-caption text-grey-6">{{ notifications.unreadCount ? `${notifications.unreadCount} sin leer` : 'Todo está al día' }}</div>
                </div>
                <q-space />
                <q-btn v-if="notifications.unreadCount" flat dense no-caps color="primary" label="Marcar leído" @click.stop="markAllRead" />
              </q-card-section>
              <q-separator />
              <q-list v-if="notifications.items.length" separator>
                <q-item v-for="item in notifications.items" :key="item.id" clickable v-close-popup @click="openNotification(item)">
                  <q-item-section avatar><q-avatar color="primary" text-color="white" :icon="item.tipo === 'pago' ? 'payments' : item.tipo === 'entrega' ? 'key' : 'chat_bubble'" /></q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-bold">{{ item.titulo }}</q-item-label>
                    <q-item-label caption lines="1">{{ item.asunto }}</q-item-label>
                    <q-item-label caption lines="2">{{ item.mensaje }}</q-item-label>
                    <q-item-label caption>{{ formatDateTime(item.created_at) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-else class="q-pa-lg text-center text-grey-6"><q-icon name="notifications_none" size="32px" class="q-mb-sm" /><div>No tienes notificaciones nuevas.</div></div>
            </q-card>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" show-if-above :breakpoint="900" :overlay="$q.screen.lt.md" :width="272" class="viti-drawer" :style="{ background: branding.drawer_color }">
      <div class="column fit no-wrap">
        <div class="q-pa-lg"><AppBrand /></div>
        <div v-if="!isClient" class="q-px-md q-pb-md">
          <q-btn unelevated color="primary" icon="add" label="Nueva solicitud" no-caps class="full-width drawer-primary-action" to="/solicitud" @click="closeMobileDrawer" />
        </div>
        <div v-else class="q-px-md q-pb-md">
          <div class="client-badge">
            <div class="text-caption">Negocio activo</div>
            <q-select v-if="tenant.businesses.length > 1" dark borderless dense :model-value="tenant.activeId" :options="businessOptions" emit-value map-options @update:model-value="switchBusiness" />
            <div v-else class="text-weight-bold ellipsis">{{ tenant.active?.nombre_comercial || `Mi espacio ${branding.product_name}` }}</div>
            <div v-if="tenant.active?.rol" class="text-caption q-mt-xs">{{ tenant.active.rol }}</div>
          </div>
        </div>

        <q-scroll-area class="col">
          <q-list padding>
            <template v-for="item in menu" :key="`${item.type || 'item'}-${item.label}`">
              <div v-if="item.type === 'section'" class="drawer-section-label">{{ item.label }}</div>
              <q-item v-else-if="!item.children" clickable v-ripple :to="item.action ? undefined : item.to" exact @click="handleItem(item)">
                <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
                <q-item-section>{{ item.label }}</q-item-section>
                <q-item-section v-if="item.badge" side><q-badge rounded color="negative" :label="item.badge > 99 ? '99+' : item.badge" /></q-item-section>
              </q-item>
              <q-expansion-item v-else :icon="item.icon" :label="item.label" group="menu">
                <q-item v-for="sub in item.children" :key="sub.to || sub.action" clickable v-ripple :to="sub.to" class="q-ml-sm" @click="handleItem(sub)">
                  <q-item-section avatar><q-icon :name="sub.icon" /></q-item-section>
                  <q-item-section>{{ sub.label }}</q-item-section>
                  <q-item-section v-if="sub.badge" side><q-badge rounded color="negative" :label="sub.badge > 99 ? '99+' : sub.badge" /></q-item-section>
                </q-item>
              </q-expansion-item>
            </template>
          </q-list>
        </q-scroll-area>

        <q-separator />
        <q-item clickable v-ripple class="q-ma-sm q-py-md profile-footer" @click="openProfile">
          <q-item-section avatar>
            <q-avatar color="accent" text-color="white">
              <img v-if="profilePhoto" :src="profilePhoto" alt="Foto de perfil" />
              <span v-else>{{ initials || 'VT' }}</span>
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ auth.user?.nombre }} {{ auth.user?.apellido }}</q-item-label>
            <q-item-label caption>{{ accountRoleLabel }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-spinner v-if="uploadingPhoto" size="20px" color="primary" />
            <q-btn v-else flat round dense icon="logout" @click.stop="logout"><q-tooltip>Cerrar sesión</q-tooltip></q-btn>
          </q-item-section>
        </q-item>
        <input ref="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="uploadProfilePhoto" />
        <input ref="profileCameraInput" type="file" accept="image/*" capture="user" hidden @change="uploadProfilePhoto" />
      </div>
    </q-drawer>

    <q-page-container><router-view /></q-page-container>
    <CallCenter />


    <BrandingSettingsDialog v-if="isSuperAdmin" v-model="brandingDialog" />

    <q-dialog v-model="profileDialog">
      <q-card class="profile-card">
        <q-card-section class="row items-start">
          <div>
            <div class="text-overline text-primary text-weight-bold">MI PERFIL</div>
            <div class="text-h6 text-weight-bold">{{ auth.user?.nombre }} {{ auth.user?.apellido }}</div>
            <div class="text-caption text-grey-6">{{ accountRoleLabel }}</div>
          </div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section class="column items-center q-py-xl">
          <div class="profile-photo-wrap">
            <q-avatar size="132px" color="accent" text-color="white" class="profile-photo-large">
              <img v-if="profilePhoto" :src="profilePhoto" alt="Fotografía de perfil" />
              <span v-else class="text-h4 text-weight-bold">{{ initials || 'VT' }}</span>
            </q-avatar>
            <q-btn
              v-if="profilePhoto"
              round
              dense
              unelevated
              color="primary"
              icon="zoom_in"
              class="profile-photo-zoom-btn"
              aria-label="Ampliar fotografía"
              @click.stop="profilePhotoPreview = true"
            >
              <q-tooltip>Ampliar foto</q-tooltip>
            </q-btn>
          </div>
          <div class="text-subtitle1 text-weight-bold q-mt-md">{{ auth.user?.nombre }} {{ auth.user?.apellido }}</div>
          <div class="text-caption text-grey-6">{{ accountRoleLabel }}</div>
          <div v-if="isClient && tenant.active?.nombre_comercial" class="text-caption text-grey-6 q-mt-xs">{{ tenant.active.nombre_comercial }}</div>

          <q-spinner v-if="uploadingPhoto" size="32px" color="primary" class="q-mt-lg" />

          <div v-if="canChangeProfilePhoto" class="row q-col-gutter-sm q-mt-lg full-width">
            <div class="col-12 col-sm-6">
              <q-btn outline color="primary" icon="photo_library" label="Cambiar foto" no-caps class="full-width" :disable="uploadingPhoto" @click="chooseProfilePhoto" />
            </div>
            <div class="col-12 col-sm-6">
              <q-btn unelevated color="primary" icon="photo_camera" label="Tomar foto" no-caps class="full-width" :disable="uploadingPhoto" @click="takeProfilePhoto" />
            </div>
          </div>

          <q-banner v-else rounded class="bg-grey-2 text-grey-8 q-mt-lg full-width">
            Tu fotografía de usuario es administrada por el Superadministrador.
          </q-banner>
        </q-card-section>

        <q-separator />

        <q-card-actions class="q-pa-md">
          <q-btn v-if="isClient && hasClientProfile" flat color="primary" icon="manage_accounts" label="Editar mis datos" no-caps @click="editProfile" />
          <q-space />
          <q-btn flat color="negative" icon="logout" label="Cerrar sesión" no-caps @click="logout" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="profilePhotoPreview">
      <q-card class="profile-photo-preview-card">
        <q-card-section class="row items-center q-pb-sm">
          <div>
            <div class="text-overline text-primary text-weight-bold">FOTOGRAFÍA DE PERFIL</div>
            <div class="text-subtitle1 text-weight-bold">{{ auth.user?.nombre }} {{ auth.user?.apellido }}</div>
          </div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="profile-photo-preview-body">
          <img :src="profilePhoto" :alt="`Fotografía ampliada de ${auth.user?.nombre || 'perfil'}`" class="profile-photo-preview-image" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="quickSearch" position="top">
      <q-card class="quick-search-card">
        <q-card-section>
          <q-input v-model="quickTerm" autofocus borderless clearable placeholder="¿A dónde quieres ir?">
            <template #prepend><q-icon name="search" /></template>
            <template #append><q-badge outline color="grey" label="Ctrl K" /></template>
          </q-input>
        </q-card-section>
        <q-separator />
        <q-list padding>
          <q-item v-for="item in filteredQuickItems" :key="item.to" clickable v-close-popup @click="goQuick(item)">
            <q-item-section avatar><q-icon :name="item.icon" color="primary" /></q-item-section>
            <q-item-section>
              <q-item-label>{{ item.label }}</q-item-label>
              <q-item-label v-if="item.group" caption>{{ item.group }}</q-item-label>
            </q-item-section>
            <q-item-section side><q-icon name="arrow_forward" /></q-item-section>
          </q-item>
          <div v-if="!filteredQuickItems.length" class="q-pa-lg text-center text-grey-6">No encontramos una sección con ese nombre.</div>
        </q-list>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<style scoped>
.client-badge{padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.08)}

.viti-toolbar{min-height:68px;padding-inline:16px;background:rgba(7,14,24,.82);backdrop-filter:blur(14px)}
.viti-toolbar :deep(.q-btn){border-radius:11px;transition:background .18s ease,transform .18s ease}.viti-toolbar :deep(.q-btn:hover){background:rgba(255,255,255,.06);transform:translateY(-1px)}
.drawer-primary-action{min-height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(20,87,184,.92),rgba(26,105,207,.92))!important;border:1px solid rgba(116,170,244,.2);box-shadow:0 12px 28px rgba(4,17,33,.18)}
.viti-drawer :deep(.q-list){padding-top:4px}.viti-drawer :deep(.q-item){position:relative}.viti-drawer :deep(.q-item.q-router-link--active:before){content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:999px;background:#f28b30}.viti-drawer :deep(.q-item.q-router-link--active){background:linear-gradient(90deg,rgba(242,139,48,.09),rgba(255,255,255,.025))!important}.viti-drawer :deep(.q-item.q-router-link--active .q-icon){color:#ff9a3c!important}.viti-drawer :deep(.q-expansion-item__container>.q-item:hover),.viti-drawer :deep(.q-item:hover){background:rgba(255,255,255,.045)!important}
.drawer-section-label{padding:18px 18px 7px;font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(210,226,242,.5)}
.viti-toolbar{min-height:68px}
.quick-search-card{width:620px;max-width:94vw;margin-top:9vh;border-radius:18px}
.profile-footer{border-radius:14px;transition:background .18s ease}.profile-footer:hover{background:rgba(255,255,255,.07)}
.profile-card{width:520px;max-width:94vw;border-radius:20px;overflow:hidden}.profile-photo-wrap{position:relative;display:inline-flex}.profile-photo-large{box-shadow:0 12px 34px rgba(5,20,40,.22);border:4px solid rgba(255,255,255,.22)}.profile-photo-zoom-btn{position:absolute;right:-14px;bottom:7px;box-shadow:0 8px 20px rgba(5,20,40,.28)}.profile-photo-preview-card{width:min(560px,92vw);border-radius:20px;overflow:hidden}.profile-photo-preview-body{padding:18px;display:flex;justify-content:center;align-items:center;min-height:300px}.profile-photo-preview-image{display:block;max-width:100%;max-height:68vh;object-fit:contain;border-radius:16px;box-shadow:0 16px 44px rgba(5,20,40,.26)}
@media(max-width:600px){.viti-toolbar{min-height:58px;padding-left:10px;padding-right:10px}.quick-search-card{margin-top:4vh}.profile-card{width:94vw}.profile-photo-large{font-size:1.1rem}.profile-photo-preview-card{width:92vw}}
</style>