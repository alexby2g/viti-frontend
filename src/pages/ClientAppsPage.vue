<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const router = useRouter()
const loading = ref(true)
const apps = ref([])

const delivered = computed(() => apps.value.filter(app => app.acceso_cliente && app.estado === 'activo'))
const pending = computed(() => apps.value.filter(app => !app.acceso_cliente || app.estado !== 'activo'))

function pretty(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function openApp(app) {
  if (app.ruta) router.push(app.ruta)
}

onMounted(async () => {
  try {
    apps.value = (await api.get('/mi/aplicaciones')).data.data || []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <q-page class="viti-page">
    <q-inner-loading :showing="loading" />

    <PageHeader
      eyebrow="Mi espacio VITI"
      title="Mis aplicaciones"
      subtitle="Aquí están las aplicaciones que VITI ha preparado y habilitado para tu negocio."
    />

    <template v-if="!loading">
      <div v-if="delivered.length" class="apps-grid">
        <q-card v-for="app in delivered" :key="app.id" flat class="viti-card app-card">
          <q-card-section class="row items-start no-wrap q-gutter-md">
            <q-avatar size="58px" color="primary" text-color="white" :icon="app.nombre?.toLowerCase().includes('peluquer') ? 'content_cut' : 'apps'" />
            <div class="col">
              <div class="row items-center q-gutter-sm">
                <div class="text-h6 text-weight-bold">{{ app.nombre }}</div>
                <q-badge color="positive">Activa</q-badge>
              </div>
              <div class="text-body2 text-grey-7 q-mt-xs">{{ app.empresa?.nombre_comercial || 'Mi negocio' }}</div>
              <div class="text-caption text-grey-6 q-mt-sm">
                {{ app.version ? `Versión ${app.version} · ` : '' }}{{ pretty(app.entorno) }}
              </div>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-actions align="between" class="q-pa-md">
            <div class="text-caption text-grey-6">Entregada por VITI</div>
            <q-btn color="primary" unelevated no-caps icon-right="arrow_forward" label="Abrir aplicación" :disable="!app.ruta" @click="openApp(app)" />
          </q-card-actions>
        </q-card>
      </div>

      <q-card v-if="pending.length" flat class="viti-card q-mt-lg">
        <q-card-section>
          <div class="text-h6 text-weight-bold">En preparación</div>
          <div class="text-caption text-grey-6">Aplicaciones relacionadas con tus proyectos que todavía no están habilitadas para uso.</div>
        </q-card-section>
        <q-separator />
        <q-list separator>
          <q-item v-for="app in pending" :key="app.id">
            <q-item-section avatar><q-avatar color="grey-2" text-color="grey-7" icon="schedule" /></q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">{{ app.nombre }}</q-item-label>
              <q-item-label caption>{{ app.empresa?.nombre_comercial }} · {{ app.proyecto?.progreso || 0 }}% del proyecto</q-item-label>
            </q-item-section>
            <q-item-section side><q-badge outline color="grey-7">{{ app.acceso_cliente ? pretty(app.estado) : 'Pendiente de entrega' }}</q-badge></q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <div v-if="!apps.length" class="empty-state">
        <q-icon name="apps" size="58px" />
        <div class="text-h6 q-mt-md">Todavía no tienes aplicaciones</div>
        <div class="q-mt-xs">Cuando un proyecto esté listo y VITI lo entregue, aparecerá aquí.</div>
        <q-btn class="q-mt-lg" outline color="primary" no-caps icon="account_tree" label="Ver mi proyecto" to="/mi-proyecto" />
      </div>
    </template>
  </q-page>
</template>

<style scoped>
.apps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,460px));gap:18px}.app-card{overflow:hidden}.empty-state{min-height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--viti-muted);text-align:center}
</style>
