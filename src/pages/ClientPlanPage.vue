<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const loading = ref(true)
const data = ref(null)

const moduleLabels = {
  inicio:'Panel principal', agenda:'Agenda', ordenes:'Órdenes de servicio', clientes:'Clientes', equipos:'Equipos',
  tecnicos:'Técnicos', inventario:'Inventario', pagos:'Pagos', garantias:'Garantías', historial:'Historial', buzon:'Buzón y soporte',
}

const statusMeta = {
  activa:{label:'Activa',color:'positive',icon:'verified'},
  gracia:{label:'Periodo de gracia',color:'warning',icon:'schedule'},
  suspendida:{label:'Suspendida',color:'negative',icon:'lock'},
  cancelada:{label:'Cancelada',color:'grey',icon:'cancel'},
}

async function load() {
  loading.value = true
  try {
    data.value = (await api.get('/mi/plan')).data?.data || null
  } catch (error) {
    $q.notify({ type:'negative', message:error.response?.data?.message || 'No se pudo cargar tu plan VITI.' })
  } finally {
    loading.value = false
  }
}

function usageText(item) {
  if (!item || item.sin_limite) return `${item?.usados ?? 0} usados · Sin límite`
  return `${item.usados} / ${item.maximo}`
}

function moduleLabel(code) { return moduleLabels[code] || code }
function meta(status) { return statusMeta[status] || { label:status || 'Sin suscripción', color:'grey', icon:'help' } }

onMounted(load)
</script>

<template>
  <q-page class="viti-page q-pa-lg">
    <q-inner-loading :showing="loading" />
    <template v-if="data">
      <PageHeader eyebrow="Mi espacio VITI" title="Mi plan" subtitle="Consulta tu plan actual, consumo, módulos habilitados y estado de tus suscripciones." />

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-lg-7">
          <q-card flat class="viti-card plan-card">
            <q-card-section class="row items-start q-col-gutter-md">
              <div class="col">
                <div class="section-label">Plan actual</div>
                <div class="text-h4 text-weight-bold q-mt-xs">{{ data.plan?.nombre || 'Sin plan asignado' }}</div>
                <div v-if="data.plan?.descripcion" class="text-body1 text-grey-7 q-mt-sm">{{ data.plan.descripcion }}</div>
              </div>
              <div class="col-auto">
                <q-badge v-if="data.plan" color="primary" :label="data.plan.codigo" />
              </div>
            </q-card-section>
            <q-separator />
            <q-card-section v-if="data.plan">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <div class="metric-label">Suscripción mensual</div>
                  <div class="metric-value">{{ data.plan.precio_mensual == null ? 'Cotizar' : `${data.plan.precio_mensual} Bs` }}</div>
                </div>
                <div class="col-12 col-sm-6">
                  <div class="metric-label">Suscripción anual</div>
                  <div class="metric-value">{{ data.plan.precio_anual == null ? 'Cotizar' : `${data.plan.precio_anual} Bs` }}</div>
                </div>
                <div class="col-12 col-sm-6">
                  <div class="metric-label">Periodo de prueba</div>
                  <div class="metric-value">{{ data.plan.dias_prueba ?? 0 }} días</div>
                </div>
              </div>
            </q-card-section>
            <q-card-section v-else>
              <q-banner rounded class="empty-banner">
                <template #avatar><q-icon name="info" color="primary" /></template>
                Tu empresa todavía no tiene un plan VITI asignado. La contratación se define después de revisar la necesidad y el alcance de la solución.
              </q-banner>
              <q-btn color="primary" unelevated no-caps icon="payments" label="Ver planes" to="/viti/planes" class="q-mt-md" />
            </q-card-section>
          </q-card>

          <q-card flat class="viti-card q-mt-lg">
            <q-card-section>
              <div class="section-label">Capacidad</div>
              <div class="text-h6 text-weight-bold">Uso de tu plan</div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row q-col-gutter-lg">
              <div class="col-12 col-md-6">
                <div class="usage-head"><span>Usuarios</span><strong>{{ usageText(data.uso?.usuarios) }}</strong></div>
                <q-linear-progress rounded size="10px" :value="data.uso?.usuarios?.sin_limite ? 0 : Math.min(1, (data.uso?.usuarios?.usados || 0) / Math.max(1, data.uso?.usuarios?.maximo || 1))" color="primary" class="q-mt-sm" />
              </div>
              <div class="col-12 col-md-6">
                <div class="usage-head"><span>Aplicaciones</span><strong>{{ usageText(data.uso?.aplicaciones) }}</strong></div>
                <q-linear-progress rounded size="10px" :value="data.uso?.aplicaciones?.sin_limite ? 0 : Math.min(1, (data.uso?.aplicaciones?.usados || 0) / Math.max(1, data.uso?.aplicaciones?.maximo || 1))" color="primary" class="q-mt-sm" />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-lg-5">
          <q-card flat class="viti-card">
            <q-card-section>
              <div class="section-label">Módulos</div>
              <div class="text-h6 text-weight-bold">Lo que tienes habilitado</div>
              <div class="text-caption text-grey-6 q-mt-xs">Las funcionalidades disponibles dependen del plan asignado a tu empresa.</div>
            </q-card-section>
            <q-separator />
            <q-list v-if="data.uso?.modulos?.length" separator>
              <q-item v-for="module in data.uso.modulos" :key="module">
                <q-item-section avatar><q-icon name="check_circle" color="positive" /></q-item-section>
                <q-item-section>{{ moduleLabel(module) }}</q-item-section>
              </q-item>
            </q-list>
            <q-card-section v-else class="text-grey-6">No hay módulos comerciales restringidos para esta empresa.</q-card-section>
          </q-card>

          <q-card flat class="viti-card q-mt-lg">
            <q-card-section>
              <div class="section-label">Suscripciones</div>
              <div class="text-h6 text-weight-bold">Estado de tus aplicaciones</div>
            </q-card-section>
            <q-separator />
            <q-list v-if="data.suscripciones?.length" separator>
              <q-item v-for="row in data.suscripciones" :key="row.aplicacion_id">
                <q-item-section avatar><q-avatar color="blue-1" text-color="primary" icon="apps" /></q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ row.aplicacion }}</q-item-label>
                  <q-item-label caption>{{ row.suscripcion?.mensaje_cobro || 'Sin información de cobro.' }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-chip dense :color="meta(row.suscripcion?.estado).color" text-color="white" :icon="meta(row.suscripcion?.estado).icon">{{ meta(row.suscripcion?.estado).label }}</q-chip>
                </q-item-section>
              </q-item>
            </q-list>
            <q-card-section v-else class="text-grey-6">Todavía no hay suscripciones asociadas a aplicaciones entregadas.</q-card-section>
          </q-card>
        </div>
      </div>

      <q-banner rounded class="q-mt-lg plan-note">
        <template #avatar><q-icon name="info" color="primary" /></template>
        La contratación final no se activa solamente por elegir una tarjeta de precios. AGR Studio valida el alcance, la implementación y las condiciones antes de asignar el plan y habilitar la solución.
      </q-banner>

      <div class="row q-gutter-sm q-mt-lg">
        <q-btn outline color="primary" no-caps icon="payments" label="Ver planes" to="/viti/planes" />
        <q-btn flat color="primary" no-caps icon="credit_card" label="Ver pagos" to="/mi-pagos" />
        <q-btn flat color="primary" no-caps icon="forum" label="Hablar con AGR Studio" to="/mi-buzon" />
      </div>
    </template>
  </q-page>
</template>

<style scoped>
.plan-card{overflow:hidden}.metric-label,.section-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:850;color:var(--viti-muted)}.metric-value{font-size:24px;font-weight:900;margin-top:4px}.usage-head{display:flex;justify-content:space-between;gap:12px;font-size:14px}.empty-banner,.plan-note{background:color-mix(in srgb,var(--viti-card) 90%,var(--agr-purple) 10%);border:1px solid var(--viti-border)}
</style>
