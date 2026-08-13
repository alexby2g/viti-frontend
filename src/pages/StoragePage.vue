<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const loading = ref(false)
const backupLoading = ref(false)
const verifyingId = ref(null)
const storage = ref(null)
const health = ref(null)
const backups = ref([])
const backupPolicy = ref(null)
const errors = ref([])

const publicStorage = computed(() => storage.value?.publico || null)
const privateStorage = computed(() => storage.value?.privado || null)
const config = computed(() => storage.value?.configuracion || {})
const database = computed(() => health.value?.database || null)
const queue = computed(() => health.value?.queue || null)
const migrations = computed(() => health.value?.migrations || null)
const audit = computed(() => health.value?.audit || null)
const backup = computed(() => health.value?.backup || null)
const runtime = computed(() => health.value?.runtime || {})

const healthyChecks = computed(() => [
  database.value?.ok,
  queue.value?.ok,
  migrations.value?.ok,
  audit.value?.ok,
  backup.value?.ok,
  publicStorage.value?.ok,
  privateStorage.value?.ok,
].filter(value => value !== undefined && value !== null))

const readyCount = computed(() => healthyChecks.value.filter(Boolean).length)
const totalCount = computed(() => healthyChecks.value.length)
const overallReady = computed(() => totalCount.value > 0 && readyCount.value === totalCount.value)

function statusColor(ok) { return ok ? 'positive' : 'negative' }
function statusLabel(ok) { return ok ? 'Correcto' : 'Revisar' }
function valueOrDash(value) { return value === null || value === undefined || value === '' ? '—' : value }
function formatBytes(bytes) {
  const value = Number(bytes || 0)
  if (!value) return '—'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}
function backupStatusColor(status) {
  if (status === 'verified') return 'positive'
  if (status === 'running') return 'info'
  return 'negative'
}
function backupStatusLabel(status) {
  return ({ verified: 'Verificado', running: 'En proceso', failed: 'Falló' })[status] || status || 'Desconocido'
}

async function load() {
  loading.value = true
  errors.value = []

  const [healthResult, storageResult, backupResult] = await Promise.allSettled([
    api.get('/system/health'),
    api.get('/almacenamiento/estado'),
    api.get('/system/backups'),
  ])

  if (healthResult.status === 'fulfilled') health.value = healthResult.value.data.data
  else {
    health.value = null
    errors.value.push(healthResult.reason?.response?.data?.message || 'No pudimos consultar el diagnóstico interno de VITI.')
  }

  if (storageResult.status === 'fulfilled') storage.value = storageResult.value.data.data
  else {
    storage.value = null
    errors.value.push(storageResult.reason?.response?.data?.message || 'No pudimos comprobar el almacenamiento.')
  }

  if (backupResult.status === 'fulfilled') {
    backups.value = backupResult.value.data.data || []
    backupPolicy.value = backupResult.value.data.policy || null
  } else {
    backups.value = []
    backupPolicy.value = null
    errors.value.push(backupResult.reason?.response?.data?.message || 'No pudimos consultar el historial de respaldos.')
  }

  loading.value = false
}

function createBackup() {
  $q.dialog({
    title: 'Crear respaldo de PostgreSQL',
    message: 'VITI generará una copia lógica, la guardará en almacenamiento privado y comprobará su SHA-256. Puede tardar algunos minutos.',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Crear respaldo', color: 'primary' },
    persistent: true,
  }).onOk(async () => {
    backupLoading.value = true
    try {
      const { data } = await api.post('/system/backups', {}, { timeout: 240000 })
      $q.notify({ type: 'positive', message: data.message || 'Respaldo creado y verificado.' })
      await load()
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.message || 'No se pudo completar el respaldo.' })
      await load()
    } finally {
      backupLoading.value = false
    }
  })
}

async function verifyBackup(item) {
  verifyingId.value = item.id
  try {
    const { data } = await api.post(`/system/backups/${item.id}/verify`, {}, { timeout: 120000 })
    $q.notify({ type: 'positive', message: data.message || 'Integridad confirmada.' })
    await load()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.message || 'El respaldo no superó la verificación.' })
    await load()
  } finally {
    verifyingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page">
    <PageHeader
      eyebrow="Administración técnica"
      title="Salud del sistema"
      subtitle="Comprueba base de datos, cola, migraciones, auditoría, respaldos y almacenamiento desde un solo lugar."
    >
      <div class="row q-gutter-sm">
        <q-btn outline color="primary" no-caps icon="backup" label="Crear respaldo" :loading="backupLoading" @click="createBackup" />
        <q-btn color="primary" unelevated no-caps icon="health_and_safety" label="Comprobar ahora" :loading="loading" @click="load" />
      </div>
    </PageHeader>

    <q-banner v-for="message in errors" :key="message" rounded class="bg-red-1 text-negative q-mb-md">
      <template #avatar><q-icon name="error_outline" /></template>
      {{ message }}
    </q-banner>

    <q-card flat class="viti-card q-mb-lg">
      <q-card-section class="row items-center q-col-gutter-lg">
        <div class="col-auto">
          <q-avatar size="58px" :color="overallReady ? 'positive' : 'warning'" text-color="white" :icon="overallReady ? 'verified' : 'monitor_heart'" />
        </div>
        <div class="col">
          <div class="text-h5 text-weight-bold">{{ overallReady ? 'Servicios principales correctos' : 'Hay controles que requieren atención' }}</div>
          <div class="text-body2 text-grey-6 q-mt-xs">
            {{ readyCount }} de {{ totalCount || 0 }} comprobaciones técnicas están correctas.
            <span v-if="health?.checked_at"> Último chequeo: {{ new Date(health.checked_at).toLocaleString() }}.</span>
          </div>
        </div>
        <div class="col-12 col-sm-auto">
          <q-badge :color="overallReady ? 'positive' : 'warning'" class="health-badge">
            {{ overallReady ? 'OPERATIVO' : 'REVISAR' }}
          </q-badge>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-6 col-xl-4">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar :color="statusColor(database?.ok)" text-color="white" :icon="database?.ok ? 'storage' : 'database'" />
            <div><div class="text-h6 text-weight-bold">Base de datos</div><div class="text-caption text-grey-6">Conectividad y tiempo de respuesta.</div></div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="health-row"><span>Estado</span><q-badge :color="statusColor(database?.ok)">{{ statusLabel(database?.ok) }}</q-badge></div>
            <div class="health-row"><span>Driver</span><strong>{{ valueOrDash(database?.driver) }}</strong></div>
            <div class="health-row"><span>Latencia interna</span><strong>{{ database?.latency_ms !== undefined ? `${database.latency_ms} ms` : '—' }}</strong></div>
            <div class="text-caption text-grey-6 q-mt-md">{{ database?.message || 'Pulsa Comprobar ahora para ejecutar el diagnóstico.' }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6 col-xl-4">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar :color="statusColor(queue?.ok)" text-color="white" icon="sync_alt" />
            <div><div class="text-h6 text-weight-bold">Cola de trabajos</div><div class="text-caption text-grey-6">Procesos pendientes y fallidos.</div></div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="health-row"><span>Estado</span><q-badge :color="statusColor(queue?.ok)">{{ statusLabel(queue?.ok) }}</q-badge></div>
            <div class="health-row"><span>Conexión</span><strong>{{ valueOrDash(queue?.connection) }}</strong></div>
            <div class="health-row"><span>Pendientes</span><strong>{{ valueOrDash(queue?.pending) }}</strong></div>
            <div class="health-row"><span>Fallidos</span><strong>{{ valueOrDash(queue?.failed) }}</strong></div>
            <div class="text-caption text-grey-6 q-mt-md">{{ queue?.message || 'Sin diagnóstico.' }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6 col-xl-4">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar :color="statusColor(migrations?.ok)" text-color="white" icon="schema" />
            <div><div class="text-h6 text-weight-bold">Base estructural</div><div class="text-caption text-grey-6">Última migración aplicada.</div></div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="health-row"><span>Estado</span><q-badge :color="statusColor(migrations?.ok)">{{ statusLabel(migrations?.ok) }}</q-badge></div>
            <div class="health-row"><span>Batch</span><strong>{{ valueOrDash(migrations?.batch) }}</strong></div>
            <div class="health-row column-row"><span>Última migración</span><strong>{{ valueOrDash(migrations?.latest) }}</strong></div>
            <div class="text-caption text-grey-6 q-mt-md">{{ migrations?.message || 'Sin diagnóstico.' }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6 col-xl-4">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar :color="statusColor(audit?.ok)" text-color="white" icon="history" />
            <div><div class="text-h6 text-weight-bold">Auditoría</div><div class="text-caption text-grey-6">Trazabilidad de actividad interna.</div></div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="health-row"><span>Estado</span><q-badge :color="statusColor(audit?.ok)">{{ statusLabel(audit?.ok) }}</q-badge></div>
            <div class="health-row"><span>Eventos últimas 24 h</span><strong>{{ valueOrDash(audit?.events_last_24h) }}</strong></div>
            <div class="health-row"><span>Última acción</span><strong>{{ valueOrDash(audit?.last_action) }}</strong></div>
            <div class="text-caption text-grey-6 q-mt-md">{{ audit?.message || 'Sin diagnóstico.' }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6 col-xl-4">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar :color="backup?.ok ? 'positive' : 'warning'" text-color="white" icon="backup" />
            <div><div class="text-h6 text-weight-bold">Respaldos</div><div class="text-caption text-grey-6">Protección verificable de PostgreSQL.</div></div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="health-row"><span>Estado</span><q-badge :color="backup?.ok ? 'positive' : 'warning'">{{ backup?.status === 'verified' ? 'Verificado' : backup?.status === 'stale' ? 'Desactualizado' : 'Revisar' }}</q-badge></div>
            <div class="health-row"><span>Copias verificadas</span><strong>{{ valueOrDash(backup?.verified_count) }}</strong></div>
            <div class="health-row"><span>Última verificación</span><strong>{{ backup?.last_verified_at ? new Date(backup.last_verified_at).toLocaleString() : '—' }}</strong></div>
            <div class="health-row"><span>Tamaño</span><strong>{{ formatBytes(backup?.size_bytes) }}</strong></div>
            <div class="text-body2 q-mt-md">{{ backup?.message || 'Todavía no hay información de respaldo.' }}</div>
            <q-banner v-if="backup?.failure_reason" dense rounded class="bg-red-1 text-negative q-mt-md">{{ backup.failure_reason }}</q-banner>
            <q-banner v-else-if="backup && !backup.ok" dense rounded class="bg-orange-1 text-orange-10 q-mt-md">Crea y verifica un respaldo para dejar este control en verde.</q-banner>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6 col-xl-4">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar color="primary" text-color="white" icon="terminal" />
            <div><div class="text-h6 text-weight-bold">Runtime</div><div class="text-caption text-grey-6">Entorno de ejecución del backend.</div></div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="health-row"><span>Entorno</span><strong>{{ valueOrDash(runtime.environment) }}</strong></div>
            <div class="health-row"><span>PHP</span><strong>{{ valueOrDash(runtime.php) }}</strong></div>
            <div class="health-row"><span>Laravel</span><strong>{{ valueOrDash(runtime.laravel) }}</strong></div>
            <div class="health-row"><span>Cache</span><strong>{{ valueOrDash(runtime.cache_store) }}</strong></div>
            <div class="health-row"><span>Sesión</span><strong>{{ valueOrDash(runtime.session_driver) }}</strong></div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat class="viti-card q-mt-xl">
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col">
          <div class="text-h5 text-weight-bold">Historial de respaldos</div>
          <div class="text-caption text-grey-6">Las copias viven en almacenamiento privado. La restauración no está disponible desde la interfaz.</div>
        </div>
        <div class="col-12 col-sm-auto"><q-btn color="primary" unelevated no-caps icon="backup" label="Crear respaldo ahora" :loading="backupLoading" @click="createBackup" /></div>
      </q-card-section>
      <q-separator />
      <q-list v-if="backups.length" separator>
        <q-item v-for="item in backups" :key="item.id">
          <q-item-section avatar><q-avatar :color="backupStatusColor(item.status)" text-color="white" :icon="item.status === 'verified' ? 'verified' : item.status === 'running' ? 'hourglass_top' : 'error_outline'" /></q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-bold">Respaldo #{{ item.id }} · {{ backupStatusLabel(item.status) }}</q-item-label>
            <q-item-label caption>Inicio: {{ item.started_at ? new Date(item.started_at).toLocaleString() : '—' }} · Tamaño: {{ formatBytes(item.size_bytes) }}</q-item-label>
            <q-item-label v-if="item.checksum_sha256" caption class="backup-checksum">SHA-256: {{ item.checksum_sha256 }}</q-item-label>
            <q-item-label v-if="item.failure_reason" caption class="text-negative">{{ item.failure_reason }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn v-if="item.checksum_sha256" flat dense no-caps color="primary" icon="fact_check" label="Verificar" :loading="verifyingId === item.id" @click="verifyBackup(item)" />
          </q-item-section>
        </q-item>
      </q-list>
      <q-card-section v-else class="text-center text-grey-6 q-pa-xl"><q-icon name="backup" size="36px" class="q-mb-sm" /><div>Todavía no hay respaldos registrados.</div></q-card-section>
      <q-separator />
      <q-card-section v-if="backupPolicy" class="text-caption text-grey-6">{{ backupPolicy.message }}</q-card-section>
    </q-card>

    <div class="text-h5 text-weight-bold q-mt-xl q-mb-md">Almacenamiento de archivos</div>
    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-6">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar :color="statusColor(publicStorage?.ok)" text-color="white" :icon="publicStorage?.ok ? 'cloud_done' : 'cloud_off'" />
            <div><div class="text-h6 text-weight-bold">Archivos públicos</div><div class="text-caption text-grey-6">Fotos y logotipos.</div></div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="health-row"><span>Estado</span><q-badge :color="statusColor(publicStorage?.ok)">{{ publicStorage?.ok ? 'Conectado' : 'Sin conexión' }}</q-badge></div>
            <div class="health-row"><span>Driver</span><strong>{{ valueOrDash(publicStorage?.driver) }}</strong></div>
            <div class="health-row"><span>URL pública</span><span class="ellipsis">{{ publicStorage?.url_base || config.public_url || '—' }}</span></div>
            <div class="text-caption text-grey-6 q-mt-md">{{ publicStorage?.message || 'Sin diagnóstico.' }}</div>
            <q-banner v-if="publicStorage?.diagnostico" dense rounded class="bg-red-1 text-negative q-mt-md"><b>Diagnóstico:</b> {{ publicStorage.diagnostico }}</q-banner>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat class="viti-card full-height">
          <q-card-section class="row items-center q-gutter-md">
            <q-avatar :color="statusColor(privateStorage?.ok)" text-color="white" :icon="privateStorage?.ok ? 'lock' : 'lock_open'" />
            <div><div class="text-h6 text-weight-bold">Archivos privados</div><div class="text-caption text-grey-6">Documentos y archivos de proyectos.</div></div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="health-row"><span>Estado</span><q-badge :color="statusColor(privateStorage?.ok)">{{ privateStorage?.ok ? 'Conectado' : 'Sin conexión' }}</q-badge></div>
            <div class="health-row"><span>Driver</span><strong>{{ valueOrDash(privateStorage?.driver) }}</strong></div>
            <div class="health-row"><span>Acceso público</span><strong>No</strong></div>
            <div class="text-caption text-grey-6 q-mt-md">{{ privateStorage?.message || 'Sin diagnóstico.' }}</div>
            <q-banner v-if="privateStorage?.diagnostico" dense rounded class="bg-red-1 text-negative q-mt-md"><b>Diagnóstico:</b> {{ privateStorage.diagnostico }}</q-banner>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card v-if="storage && !storage.listo" flat class="viti-card q-mt-lg">
      <q-card-section>
        <div class="text-h6 text-weight-bold">Configuración de almacenamiento detectada</div>
        <div class="text-caption text-grey-6">Solo mostramos si existe cada dato. Las claves secretas nunca se exponen.</div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="health-row"><span>Access Key</span><q-badge :color="config.access_key ? 'positive' : 'negative'">{{ config.access_key ? 'Configurada' : 'Falta' }}</q-badge></div>
        <div class="health-row"><span>Secret Key</span><q-badge :color="config.secret_key ? 'positive' : 'negative'">{{ config.secret_key ? 'Configurada' : 'Falta' }}</q-badge></div>
        <div class="health-row"><span>Endpoint</span><strong>{{ config.endpoint || 'Falta' }}</strong></div>
        <div class="health-row"><span>Región</span><strong>{{ config.region || 'Falta' }}</strong></div>
        <div class="health-row"><span>Bucket público</span><strong>{{ config.public_bucket || 'Falta' }}</strong></div>
        <div class="health-row"><span>Bucket privado</span><strong>{{ config.private_bucket || 'Falta' }}</strong></div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.health-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid rgba(127,127,127,.14)}
.health-row:last-of-type{border-bottom:0}.column-row{align-items:flex-start}.column-row strong{max-width:62%;text-align:right;overflow-wrap:anywhere}.ellipsis{max-width:68%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}.health-badge{font-size:12px;padding:7px 10px;letter-spacing:.05em}.backup-checksum{font-family:monospace;overflow-wrap:anywhere}
</style>
