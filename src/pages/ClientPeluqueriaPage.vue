<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const loading = ref(true)
const item = ref(null)
const error = ref('')

const summary = computed(() => item.value?.resumen || {})
const project = computed(() => item.value?.proyecto || {})

function money(value) {
  return `${Number(value || 0).toFixed(2)} Bs`
}

function pretty(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function dateLabel(value) {
  if (!value) return '—'
  const raw = String(value).slice(0, 10)
  const [y, m, d] = raw.split('-')
  return y && m && d ? `${d}/${m}/${y}` : value
}

function timeLabel(value) {
  if (!value) return '—'
  return String(value).slice(0, 5)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    item.value = (await api.get('/mi/aplicaciones/peluqueria')).data.data
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo cargar la aplicación.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page client-hair-page">
    <q-inner-loading :showing="loading" />

    <template v-if="item">
      <PageHeader
        eyebrow="Mi aplicación"
        :title="item.aplicacion?.nombre || 'Peluquería VITI'"
        :subtitle="`${item.empresa?.nombre_comercial || 'Mi negocio'} · aplicación integrada en VITI`"
      >
        <q-badge color="positive" rounded class="q-pa-sm text-weight-bold">
          {{ pretty(item.aplicacion?.estado || 'activo') }}
        </q-badge>
      </PageHeader>

      <q-card flat class="viti-card q-mb-lg app-status-card">
        <q-card-section class="row items-center q-col-gutter-lg">
          <div class="col-12 col-md-8">
            <div class="text-overline text-primary">Estado del proyecto</div>
            <div class="text-h5 text-weight-bold">{{ project.nombre }}</div>
            <div class="text-body2 text-grey-7 q-mt-xs">
              {{ project.codigo }} · {{ pretty(project.fase) }} · {{ pretty(project.estado) }}
            </div>
            <q-linear-progress rounded size="12px" :value="Number(project.progreso || 0) / 100" color="primary" class="q-mt-md" />
          </div>
          <div class="col-12 col-md-4 text-md-right">
            <div class="text-h3 text-weight-bold text-primary">{{ project.progreso || 0 }}%</div>
            <div class="text-caption text-grey-6">Implementación completada</div>
          </div>
        </q-card-section>
      </q-card>

      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-6 col-md-2"><q-card flat class="viti-card metric"><q-card-section><q-icon name="groups" color="primary" size="28px"/><div class="metric-value">{{ summary.clientes || 0 }}</div><div class="metric-label">Clientes</div></q-card-section></q-card></div>
        <div class="col-6 col-md-2"><q-card flat class="viti-card metric"><q-card-section><q-icon name="content_cut" color="primary" size="28px"/><div class="metric-value">{{ summary.servicios || 0 }}</div><div class="metric-label">Servicios</div></q-card-section></q-card></div>
        <div class="col-6 col-md-2"><q-card flat class="viti-card metric"><q-card-section><q-icon name="badge" color="primary" size="28px"/><div class="metric-value">{{ summary.personal || 0 }}</div><div class="metric-label">Personal</div></q-card-section></q-card></div>
        <div class="col-6 col-md-2"><q-card flat class="viti-card metric"><q-card-section><q-icon name="event" color="primary" size="28px"/><div class="metric-value">{{ summary.citas_hoy || 0 }}</div><div class="metric-label">Citas hoy</div></q-card-section></q-card></div>
        <div class="col-6 col-md-2"><q-card flat class="viti-card metric"><q-card-section><q-icon name="check_circle" color="primary" size="28px"/><div class="metric-value">{{ summary.atenciones_mes || 0 }}</div><div class="metric-label">Atenciones mes</div></q-card-section></q-card></div>
        <div class="col-6 col-md-2"><q-card flat class="viti-card metric"><q-card-section><q-icon name="payments" color="primary" size="28px"/><div class="metric-value money-value">{{ money(summary.ingresos_mes) }}</div><div class="metric-label">Ingresos mes</div></q-card-section></q-card></div>
      </div>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-lg-7">
          <q-card flat class="viti-card">
            <q-card-section>
              <div class="text-h6 text-weight-bold">Agenda reciente</div>
              <div class="text-caption text-grey-6">Vista de las últimas citas registradas en tu peluquería.</div>
            </q-card-section>
            <q-separator />
            <q-list separator>
              <q-item v-for="c in item.citas" :key="c.id" class="q-py-md">
                <q-item-section avatar><q-avatar color="blue-1" text-color="primary" icon="event" /></q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ c.cliente?.nombre }}</q-item-label>
                  <q-item-label caption>{{ c.servicio?.nombre }} · {{ c.personal?.nombre || 'Sin asignar' }}</q-item-label>
                  <q-item-label caption>{{ dateLabel(c.fecha) }} · {{ timeLabel(c.hora_inicio) }} a {{ timeLabel(c.hora_fin) }}</q-item-label>
                </q-item-section>
                <q-item-section side><q-badge outline color="primary">{{ pretty(c.estado) }}</q-badge></q-item-section>
              </q-item>
              <div v-if="!item.citas?.length" class="empty-state q-pa-lg">Todavía no hay citas registradas.</div>
            </q-list>
          </q-card>
        </div>

        <div class="col-12 col-lg-5">
          <q-card flat class="viti-card">
            <q-card-section>
              <div class="text-h6 text-weight-bold">Últimas atenciones</div>
              <div class="text-caption text-grey-6">Servicios realizados y pagos registrados.</div>
            </q-card-section>
            <q-separator />
            <q-list separator>
              <q-item v-for="a in item.atenciones" :key="a.id" class="q-py-md">
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ a.cliente?.nombre }}</q-item-label>
                  <q-item-label caption>{{ a.servicio?.nombre }} · {{ a.personal?.nombre || 'Sin asignar' }}</q-item-label>
                  <q-item-label caption>{{ pretty(a.estado) }}</q-item-label>
                </q-item-section>
                <q-item-section side class="text-right">
                  <div class="text-weight-bold">{{ money(a.total) }}</div>
                  <div class="text-caption text-grey-6">Pagado: {{ money((a.pagos || []).reduce((s, p) => s + Number(p.monto || 0), 0)) }}</div>
                </q-item-section>
              </q-item>
              <div v-if="!item.atenciones?.length" class="empty-state q-pa-lg">Todavía no hay atenciones registradas.</div>
            </q-list>
          </q-card>
        </div>
      </div>

      <q-banner rounded class="bg-blue-1 text-primary q-mt-lg">
        <template #avatar><q-icon name="visibility" /></template>
        Esta es tu vista como cliente. Puedes consultar el estado y los datos de tu aplicación, mientras la administración operativa permanece protegida dentro de VITI.
      </q-banner>
    </template>

    <q-card v-else-if="!loading" flat class="viti-card">
      <q-card-section class="empty-state q-pa-xl">
        <q-icon name="apps" size="56px" />
        <div class="text-h6 q-mt-md">No pudimos abrir la aplicación</div>
        <div>{{ error }}</div>
        <q-btn color="primary" unelevated no-caps label="Reintentar" class="q-mt-md" @click="load" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.client-hair-page{max-width:1500px}.app-status-card{overflow:hidden}.metric{height:100%;text-align:center}.metric-value{font-size:28px;font-weight:800;line-height:1.1;margin-top:8px}.metric-label{font-size:12px;color:#7b8494;margin-top:5px}.money-value{font-size:20px}@media(max-width:600px){.metric-value{font-size:24px}.money-value{font-size:17px}}
</style>
