<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Dark, useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const previousDark = ref(false)

function leaveToViti(){
  sessionStorage.setItem('viti-app-explicit-exit','1')
  router.push('/aplicaciones')
}

onMounted(() => {
  previousDark.value = Dark.isActive
  Dark.set(false)
  document.body.classList.add('peluqueria-admin-active')
})

onBeforeUnmount(() => {
  Dark.set(previousDark.value)
  document.body.classList.remove('peluqueria-admin-active')
})
</script>

<template>
  <q-layout view="hHh lpR fFf" class="hair-admin-shell">
    <q-header class="hair-admin-header">
      <q-toolbar class="q-px-md q-px-lg-xl">
        <q-avatar size="42px" color="primary" text-color="white" icon="content_cut"/>
        <div class="q-ml-md">
          <div class="text-h6 text-weight-bold">Peluquería</div>
          <div class="text-caption text-grey-7">Aplicación de gestión · VITI Apps</div>
        </div>
        <q-space/>
        <div class="text-caption text-grey-7 gt-sm q-mr-md">{{auth.user?.nombre}} · Administración</div>
        <q-btn outline color="primary" no-caps icon="apps" :label="$q.screen.gt.xs?'Volver a VITI':''" @click="leaveToViti"/>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view/>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.hair-admin-shell{--viti-bg:#f6f7fb;--viti-card:#fff;--viti-text:#172033;--viti-muted:#667085;--viti-border:#e4e7ec;background:var(--viti-bg);color:var(--viti-text);min-height:100vh}
.hair-admin-shell :deep(.q-page-container),.hair-admin-shell :deep(.q-page){background:var(--viti-bg);color:var(--viti-text)}
.hair-admin-shell :deep(.q-card),.hair-admin-shell :deep(.q-table),.hair-admin-shell :deep(.viti-card),.hair-admin-shell :deep(.viti-table){background:var(--viti-card);color:var(--viti-text);border-color:var(--viti-border)}
.hair-admin-shell :deep(.text-grey-6),.hair-admin-shell :deep(.text-grey-7){color:var(--viti-muted)!important}
.hair-admin-header{background:rgba(255,255,255,.97);color:#172033!important;border-bottom:1px solid #e7e9ef;box-shadow:0 6px 22px rgba(18,45,78,.08);backdrop-filter:blur(12px)}
.hair-admin-header :deep(.q-toolbar){min-height:66px}
</style>
