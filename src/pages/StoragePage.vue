<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const loading = ref(false)
const data = ref(null)
const error = ref('')

const publicStorage = computed(() => data.value?.publico || null)
const privateStorage = computed(() => data.value?.privado || null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await api.get('/almacenamiento/estado')
    data.value = response.data.data
  } catch (e) {
    data.value = null
    error.value = e.response?.data?.message || 'No pudimos comprobar el almacenamiento.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page">
    <PageHeader
      eyebrow="Administración"
      title="Almacenamiento"
      subtitle="Comprueba dónde se guardan las fotografías, logotipos y archivos privados de VITI."
    >
      <q-btn color="primary" unelevated no-caps icon="refresh" label="Comprobar" :loading="loading" @click="load" />
    </PageHeader>

    <q-banner v-if="error" rounded class="bg-red-1 text-negative q-mb-lg">
      <template #avatar><q-icon name="error_outline" /></template>
      {{ error }}
    </q-banner>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-6">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar :color="publicStorage?.ok ? 'positive' : 'negative'" text-color="white" :icon="publicStorage?.ok ? 'cloud_done' : 'cloud_off'" />
            <div>
              <div class="text-h6 text-weight-bold">Archivos públicos</div>
              <div class="text-caption text-grey-6">Fotos de clientes, foto del administrador y logotipos.</div>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="storage-row"><span>Estado</span><q-badge :color="publicStorage?.ok ? 'positive' : 'negative'">{{ publicStorage?.ok ? 'Conectado' : 'Sin conexión' }}</q-badge></div>
            <div class="storage-row"><span>Driver</span><strong>{{ publicStorage?.driver || '—' }}</strong></div>
            <div class="storage-row"><span>URL pública</span><span class="ellipsis">{{ publicStorage?.url_base || '—' }}</span></div>
            <div class="text-caption text-grey-6 q-mt-md">{{ publicStorage?.message || 'Pulsa Comprobar para verificar.' }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar :color="privateStorage?.ok ? 'positive' : 'negative'" text-color="white" :icon="privateStorage?.ok ? 'lock' : 'lock_open'" />
            <div>
              <div class="text-h6 text-weight-bold">Archivos privados</div>
              <div class="text-caption text-grey-6">Documentos, anexos, PDF, ZIP y archivos de proyectos.</div>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="storage-row"><span>Estado</span><q-badge :color="privateStorage?.ok ? 'positive' : 'negative'">{{ privateStorage?.ok ? 'Conectado' : 'Sin conexión' }}</q-badge></div>
            <div class="storage-row"><span>Driver</span><strong>{{ privateStorage?.driver || '—' }}</strong></div>
            <div class="storage-row"><span>Acceso público</span><strong>No</strong></div>
            <div class="text-caption text-grey-6 q-mt-md">{{ privateStorage?.message || 'Pulsa Comprobar para verificar.' }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-banner v-if="data?.listo" rounded class="bg-green-1 text-positive q-mt-lg">
      <template #avatar><q-icon name="verified" /></template>
      R2 está listo. Los próximos archivos de VITI se conservarán aunque Render vuelva a desplegarse.
    </q-banner>
  </q-page>
</template>

<style scoped>
.storage-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid rgba(127,127,127,.14)}
.storage-row:last-of-type{border-bottom:0}.ellipsis{max-width:68%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
</style>
