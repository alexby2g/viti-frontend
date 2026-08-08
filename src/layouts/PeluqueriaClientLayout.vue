<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const drawer = ref(false)
const loading = ref(true)
const appInfo = ref(null)

const businessName = computed(() => appInfo.value?.empresa?.nombre_comercial || 'Mi peluquería')
const menu = [
  { label:'Inicio', icon:'dashboard', to:'/mi-apps/peluqueria/inicio' },
  { label:'Agenda', icon:'event', to:'/mi-apps/peluqueria/agenda' },
  { label:'Clientes', icon:'groups', to:'/mi-apps/peluqueria/clientes' },
  { label:'Servicios', icon:'content_cut', to:'/mi-apps/peluqueria/servicios' },
  { label:'Personal', icon:'badge', to:'/mi-apps/peluqueria/personal' },
  { label:'Atenciones', icon:'point_of_sale', to:'/mi-apps/peluqueria/atenciones' },
  { label:'Caja', icon:'payments', to:'/mi-apps/peluqueria/caja' },
  { label:'Historial', icon:'history', to:'/mi-apps/peluqueria/historial' },
]

function leaveTo(path) {
  sessionStorage.setItem('viti-app-explicit-exit','1')
  router.push(path)
}

async function loadState() {
  loading.value = true
  try {
    appInfo.value = (await api.get('/mi/apps/peluqueria/estado')).data.data
  } catch (e) {
    $q.notify({ type:'negative', message:e.response?.data?.message || 'No se pudo abrir Peluquería.' })
    sessionStorage.setItem('viti-app-explicit-exit','1')
    router.replace('/mi-proyecto')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  drawer.value = $q.screen.gt.sm
  loadState()
})
</script>

<template>
  <q-layout view="hHh LpR fFf" class="hair-app-shell">
    <q-header class="hair-header text-dark">
      <q-toolbar class="q-px-md q-px-lg-xl">
        <q-btn flat round dense icon="menu" @click="drawer=!drawer" />
        <q-avatar size="38px" color="primary" text-color="white" icon="content_cut" class="q-ml-sm" />
        <div class="q-ml-md">
          <div class="text-weight-bold">Peluquería</div>
          <div class="text-caption text-grey-7">{{ businessName }}</div>
        </div>
        <q-space />
        <q-btn flat no-caps icon="support_agent" label="Atención VITI" class="gt-xs" @click="leaveTo('/mi-buzon')" />
        <q-btn outline color="primary" no-caps icon="apps" label="Volver a VITI" class="q-ml-sm" @click="leaveTo('/mi-proyecto')" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" :width="250" bordered class="hair-drawer">
      <div class="q-pa-lg">
        <div class="text-overline text-primary">Aplicación entregada</div>
        <div class="text-h6 text-weight-bold ellipsis">{{ businessName }}</div>
        <div class="text-caption text-grey-6 q-mt-xs">Tu espacio de trabajo</div>
      </div>
      <q-separator />
      <q-list padding>
        <q-item v-for="item in menu" :key="item.to" clickable v-ripple :to="item.to" active-class="hair-active" class="q-mx-sm rounded-borders">
          <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
      </q-list>
      <div class="absolute-bottom q-pa-md">
        <q-separator class="q-mb-md" />
        <div class="text-caption text-grey-6">Sesión de {{ auth.user?.nombre }}</div>
        <q-btn flat dense no-caps icon="support_agent" label="Atención al cliente" color="primary" class="q-mt-xs full-width" @click="leaveTo('/mi-buzon')" />
      </div>
    </q-drawer>

    <q-page-container>
      <q-inner-loading :showing="loading" />
      <router-view v-if="!loading" />
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.hair-app-shell{background:#f6f7fb;min-height:100vh}.hair-header{background:rgba(255,255,255,.96);border-bottom:1px solid #e7e9ef;backdrop-filter:blur(12px)}.hair-drawer{background:#fff}.hair-active{background:#eef3ff;color:var(--q-primary);font-weight:700}.rounded-borders{border-radius:10px}
</style>
