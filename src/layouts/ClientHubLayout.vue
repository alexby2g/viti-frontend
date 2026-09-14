<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '../stores/auth'
import AppBrand from '../components/AppBrand.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const creating = ref(false)

const nav = [
  { label: 'Mi espacio', icon: 'home', to: '/mi-cuenta' },
  { label: 'Mi proyecto', icon: 'account_tree', to: '/mi-proyecto' },
  { label: 'Mis sistemas', icon: 'apps', to: '/mi-aplicaciones' },
  { label: 'Atención', icon: 'support_agent', to: '/mi-buzon' },
]

const initials = computed(() => `${auth.user?.nombre?.[0] || ''}${auth.user?.apellido?.[0] || ''}`.toUpperCase() || 'V')
const active = computed(() => route.path)

function go(path) {
  router.push(path)
}

async function newRequest() {
  if (creating.value) return
  creating.value = true
  try {
    const { data } = await (await import('../boot/axios')).api.post('/mi/solicitud')
    const link = data?.data?.enlace_publico
    if (link) window.location.href = link
    else throw new Error('missing_link')
  } catch (error) {
    const message = error?.response?.data?.message || 'No pudimos iniciar una nueva solicitud desde tu cuenta.'
    $q.notify({ type: 'negative', message })
  } finally {
    creating.value = false
  }
}

async function logout() {
  await auth.logout()
  router.replace('/login?tipo=cliente')
}

onMounted(() => { auth.initialize().catch(() => {}) })
</script>

<template>
  <q-layout view="hHh lpR fFf" class="client-hub-layout">
    <q-header class="hub-header">
      <q-toolbar class="hub-toolbar">
        <router-link to="/mi-cuenta" class="brand-link"><AppBrand /></router-link>
        <q-space />
        <q-btn flat round dense icon="support_agent" @click="go('/mi-buzon')">
          <q-tooltip>Atención</q-tooltip>
        </q-btn>
        <q-btn flat round dense class="profile-trigger">
          <q-avatar size="34px" color="primary" text-color="white">{{ initials }}</q-avatar>
          <q-menu anchor="bottom right" self="top right">
            <q-list style="min-width:200px">
              <q-item-label header>{{ auth.user?.nombre || 'Mi cuenta' }}</q-item-label>
              <q-item clickable v-close-popup @click="go('/mi-cuenta')">
                <q-item-section avatar><q-icon name="person" /></q-item-section>
                <q-item-section>Mi perfil</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="logout">
                <q-item-section avatar><q-icon name="logout" color="negative" /></q-item-section>
                <q-item-section class="text-negative">Cerrar sesión</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <div class="hub-shell">
        <aside class="hub-sidebar">
          <div class="hub-welcome">
            <div class="hub-kicker">Espacio VITI</div>
            <div class="hub-title">{{ auth.user?.nombre || 'Tu espacio' }}</div>
            <div class="hub-subtitle">Solicitudes, avances, entregas y atención en un solo lugar.</div>
          </div>

          <q-list class="hub-nav" padding>
            <q-item
              v-for="item in nav"
              :key="item.to"
              clickable
              :active="active === item.to"
              active-class="hub-nav-active"
              @click="go(item.to)"
            >
              <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
            </q-item>
          </q-list>

          <div class="hub-sidebar-bottom">
            <q-btn outline color="primary" no-caps icon="add" class="full-width" label="Nueva solicitud" :loading="creating" @click="newRequest" />
            <div class="hub-trust"><q-icon name="verified_user" /> Plataforma VITI · por AGR Studio</div>
          </div>
        </aside>

        <main class="hub-content">
          <router-view />
        </main>
      </div>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.client-hub-layout{background:#061425;color:#edf4fb}.hub-header{background:rgba(6,17,31,.94);border-bottom:1px solid rgba(95,128,158,.22);color:#edf4fb;backdrop-filter:blur(16px)}.hub-toolbar{min-height:70px;padding:0 22px}.brand-link{display:flex;text-decoration:none}.profile-trigger{margin-left:8px}.hub-shell{min-height:calc(100vh - 70px);display:grid;grid-template-columns:245px 1fr}.hub-sidebar{background:linear-gradient(180deg,#081a2d,#0a223a);border-right:1px solid rgba(95,128,158,.22);padding:28px 18px;display:flex;flex-direction:column}.hub-welcome{padding:6px 8px 24px}.hub-kicker{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;color:#f28b30}.hub-title{font-size:24px;font-weight:800;margin-top:7px;letter-spacing:-.03em;color:#f4f8fc}.hub-subtitle{font-size:12px;line-height:1.55;color:#97abba;margin-top:6px}.hub-nav{margin-top:2px}.hub-nav :deep(.q-item){border-radius:12px;min-height:48px;color:#b2c2cf;margin:3px 0;transition:.16s ease}.hub-nav :deep(.q-item:hover){background:rgba(255,255,255,.04);color:#fff}.hub-nav-active{background:rgba(242,139,48,.10)!important;color:#ffad62!important;font-weight:800;border:1px solid rgba(242,139,48,.14)}.hub-sidebar-bottom{margin-top:auto;padding:8px}.hub-sidebar-bottom :deep(.q-btn){border-color:rgba(242,139,48,.42)!important;color:#ffad62!important;background:rgba(242,139,48,.035)}.hub-trust{display:flex;gap:6px;align-items:center;justify-content:center;font-size:10px;color:#738ca1;margin-top:14px}.hub-content{min-width:0;padding:30px 34px;background:radial-gradient(circle at 95% 0,rgba(20,87,184,.09),transparent 25rem),#061425}@media(max-width:900px){.hub-shell{grid-template-columns:1fr}.hub-sidebar{display:none}.hub-content{padding:20px 16px}}@media(max-width:600px){.hub-toolbar{padding:0 14px;min-height:64px}}
</style>