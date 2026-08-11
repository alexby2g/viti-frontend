<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Dark, useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppBrand from '../components/AppBrand.vue'

const $q=useQuasar(),router=useRouter(),auth=useAuthStore(),drawer=ref($q.screen.gt.sm)
const initials=computed(()=>`${auth.user?.nombre?.[0]||''}${auth.user?.apellido?.[0]||''}`.toUpperCase())
const items=[
  {label:'Mi trabajo',icon:'support_agent',to:'/soporte'},
  {label:'Mensajes asignados',icon:'forum',to:'/soporte/buzon'},
]
function toggleDark(){Dark.toggle();localStorage.setItem('viti-theme',Dark.isActive?'dark':'light')}
async function logout(){await auth.logout();router.replace('/login')}
onMounted(()=>document.body.classList.add('viti-main-active'))
onBeforeUnmount(()=>document.body.classList.remove('viti-main-active'))
</script>

<template>
<q-layout view="lHh Lpr lFf" class="support-internal-shell">
  <q-header bordered class="viti-header">
    <q-toolbar>
      <q-btn flat round dense icon="menu" @click="drawer=!drawer"/>
      <div class="q-ml-md"><strong>Soporte AGR Studio</strong><div class="text-caption">Espacio interno · acceso limitado</div></div>
      <q-space/>
      <q-btn flat round dense :icon="$q.dark.isActive?'light_mode':'dark_mode'" @click="toggleDark"/>
    </q-toolbar>
  </q-header>

  <q-drawer v-model="drawer" show-if-above :breakpoint="900" :overlay="$q.screen.lt.md" :width="270" class="viti-drawer">
    <div class="column fit no-wrap">
      <div class="q-pa-lg"><AppBrand/></div>
      <q-banner dense rounded class="q-mx-md q-mb-md support-scope"><template #avatar><q-icon name="shield"/></template>Solo ves trabajo asignado a tu cuenta.</q-banner>
      <q-list padding class="col">
        <q-item v-for="item in items" :key="item.to" clickable v-ripple :to="item.to" exact @click="()=>{$q.screen.lt.md&&(drawer=false)}">
          <q-item-section avatar><q-icon :name="item.icon"/></q-item-section><q-item-section>{{item.label}}</q-item-section>
        </q-item>
      </q-list>
      <q-separator/>
      <q-item class="q-ma-sm q-py-md">
        <q-item-section avatar><q-avatar color="primary" text-color="white">{{initials||'SP'}}</q-avatar></q-item-section>
        <q-item-section><q-item-label>{{auth.user?.nombre}} {{auth.user?.apellido}}</q-item-label><q-item-label caption>Soporte interno</q-item-label></q-item-section>
        <q-item-section side><q-btn flat round dense icon="logout" @click="logout"><q-tooltip>Cerrar sesión</q-tooltip></q-btn></q-item-section>
      </q-item>
    </div>
  </q-drawer>
  <q-page-container><router-view/></q-page-container>
</q-layout>
</template>

<style scoped>
.support-internal-shell{background:var(--viti-bg)}.support-scope{background:rgba(138,43,226,.12);color:inherit;border:1px solid rgba(138,43,226,.25)}
</style>
