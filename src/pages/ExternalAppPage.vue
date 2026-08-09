<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useAuthStore } from '../stores/auth'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const frameLoaded = ref(false)
const application = ref(null)
const error = ref('')

const isAdmin = computed(() => auth.user?.rol === 'superadmin')
const backPath = computed(() => isAdmin.value ? '/aplicaciones' : '/mi-aplicaciones')
const safeUrl = computed(() => {
  const value = application.value?.url_externa || application.value?.url
  if (!value) return ''
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.toString() : ''
  } catch {
    return ''
  }
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const id = Number(route.params.id)
    if (!Number.isInteger(id) || id < 1) throw new Error('La aplicación solicitada no es válida.')

    if (isAdmin.value) {
      application.value = (await api.get(`/aplicaciones/${id}`)).data.data
    } else {
      const apps = (await api.get('/mi/aplicaciones')).data.data || []
      application.value = apps.find(item => Number(item.id) === id) || null
      if (!application.value?.url_externa || !application.value?.ruta) {
        throw new Error('Esta aplicación no está disponible para el negocio seleccionado.')
      }
    }

    if (!safeUrl.value) throw new Error('La aplicación no tiene un enlace HTTPS válido.')
  } catch (requestError) {
    application.value = null
    error.value = requestError.response?.data?.message || requestError.message || 'No se pudo abrir la aplicación.'
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push(backPath.value)
}

onMounted(load)
</script>

<template>
  <q-page class="external-app-page">
    <div class="external-app-toolbar">
      <PageHeader
        eyebrow="Aplicación integrada"
        :title="application?.nombre || 'Sistema externo'"
        :subtitle="application?.empresa?.nombre_comercial || 'Administrado desde VITI'"
      >
        <div class="row q-gutter-sm toolbar-actions">
          <q-btn outline color="primary" icon="arrow_back" label="Volver a VITI" no-caps @click="goBack"/>
          <q-btn v-if="safeUrl" flat color="primary" icon="open_in_new" label="Pantalla completa" no-caps :href="safeUrl" target="_blank" rel="noopener noreferrer"/>
        </div>
      </PageHeader>
    </div>

    <q-inner-loading :showing="loading" label="Preparando la aplicación..."/>

    <q-banner v-if="error && !loading" rounded class="bg-red-1 text-negative q-ma-md">
      <template #avatar><q-icon name="error_outline"/></template>
      {{error}}
      <template #action><q-btn flat color="negative" label="Volver" no-caps @click="goBack"/></template>
    </q-banner>

    <div v-if="safeUrl && !loading" class="external-frame-shell">
      <div v-if="!frameLoaded" class="frame-loading">
        <q-spinner color="primary" size="42px"/>
        <div class="q-mt-md text-grey-7">Cargando {{application?.nombre}}…</div>
      </div>
      <iframe
        :src="safeUrl"
        :title="application?.nombre || 'Aplicación integrada'"
        class="external-frame"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        referrerpolicy="no-referrer"
        @load="frameLoaded=true"
      />
    </div>
  </q-page>
</template>

<style scoped>
.external-app-page{padding:0;min-height:calc(100vh - 64px);min-height:calc(100dvh - 64px);display:flex;flex-direction:column;background:var(--viti-bg)}
.external-app-toolbar{padding:18px 22px 4px}
.external-frame-shell{position:relative;flex:1;min-height:640px;margin:0 22px 22px;border:1px solid var(--viti-border);border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 16px 42px rgba(26,42,68,.12)}
.external-frame{display:block;width:100%;height:100%;min-height:640px;border:0;background:#fff}
.frame-loading{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff}
@media(max-width:600px){.external-app-page{min-height:calc(100dvh - 58px)}.external-app-toolbar{padding:12px 12px 2px}.toolbar-actions{width:100%}.toolbar-actions :deep(.q-btn){flex:1}.external-frame-shell{min-height:calc(100dvh - 208px);margin:0;border-left:0;border-right:0;border-bottom:0;border-radius:14px 14px 0 0}.external-frame{min-height:calc(100dvh - 208px)}}
</style>
