<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { formatDate } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const item = ref(null)
const loading = ref(true)
const actionLoading = ref(false)
const loadError = ref('')
const rejectDialog = ref(false)
const rejectForm = reactive({ motivo: '' })

const plan = computed(() => item.value?.plan_viti || null)
const canApprove = computed(() => item.value?.estado === 'en_revision' && !item.value?.proyecto)
const canReject = computed(() => ['borrador', 'en_revision'].includes(item.value?.estado) && !item.value?.proyecto)
const canCreateProject = computed(() => item.value?.estado === 'aprobada' && !item.value?.proyecto)
const answers = computed(() => item.value?.respuestas || [])

function normalize(response) {
  return response?.data?.data ?? response?.data ?? null
}

function pretty(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function money(value) {
  return value === null || value === undefined || value === '' ? 'A cotizar' : `${Number(value).toFixed(0)} Bs`
}

async function load() {
  loadError.value = ''
  loading.value = true
  const id = Number(route.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    loadError.value = 'La solicitud indicada no es válida.'
    loading.value = false
    return
  }
  try {
    const response = await api.get(`/solicitudes/${id}`)
    item.value = normalize(response)
    if (!item.value?.id) throw new Error('El servidor no devolvió una solicitud válida.')
  } catch (error) {
    loadError.value = error?.response?.data?.message || error?.message || 'No se pudo cargar la solicitud.'
  } finally {
    loading.value = false
  }
}

async function updateSolicitudEstado(id, estado) {
  const payload = { estado }

  try {
    return await api.patch(`/solicitudes/${id}`, payload)
  } catch (error) {
    const status = Number(error?.response?.status || 0)
    if (status !== 404 && status !== 405) throw error
    return await api.put(`/solicitudes/${id}`, payload)
  }
}

async function approveRequest() {
  if (!canApprove.value || !item.value?.id) return
  $q.dialog({
    title: 'Aprobar solicitud',
    message: '¿Confirmas que esta solicitud pasa a aprobada?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    actionLoading.value = true
    try {
      await updateSolicitudEstado(item.value.id, 'aprobada')
      $q.notify({ type: 'positive', message: 'Solicitud aprobada correctamente.' })
      await load()
    } catch (error) {
      $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No se pudo aprobar la solicitud.' })
    } finally {
      actionLoading.value = false
    }
  })
}

function openReject() {
  rejectForm.motivo = ''
  rejectDialog.value = true
}

async function rejectRequest() {
  if (!item.value?.id || String(rejectForm.motivo).trim().length < 5) {
    $q.notify({ type: 'warning', message: 'Escribe un motivo breve para registrar el rechazo.' })
    return
  }
  actionLoading.value = true
  try {
    await api.post(`/solicitudes/${item.value.id}/rechazar`, { motivo: String(rejectForm.motivo).trim() })
    rejectDialog.value = false
    $q.notify({ type: 'positive', message: 'Solicitud rechazada y registrada.' })
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No se pudo rechazar la solicitud.' })
  } finally {
    actionLoading.value = false
  }
}

async function createProject() {
  if (!canCreateProject.value || !item.value?.id) return
  actionLoading.value = true
  try {
    const payload = {
      solicitud_id: item.value.id,
      empresa_id: item.value.empresa_id,
      cliente_id: item.value.cliente_id,
      nombre: item.value.titulo || 'Proyecto VITI',
      descripcion: item.value.resumen || '',
      fase: 'levantamiento',
      estado: 'activo',
      progreso: 0,
      fecha_inicio: new Date().toISOString().slice(0, 10),
    }
    const created = normalize(await api.post('/proyectos', payload))
    if (!created?.id) throw new Error('El servidor no devolvió el proyecto creado.')
    await router.push(`/proyectos/${created.id}`)
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || error?.message || 'No se pudo crear el proyecto.' })
  } finally {
    actionLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="viti-page request-review-page">
    <q-inner-loading :showing="loading" />

    <q-banner v-if="loadError" rounded class="bg-red-1 text-negative q-mb-lg">
      <template #avatar><q-icon name="error_outline" /></template>
      {{ loadError }}
      <template #action><q-btn flat color="negative" label="Volver" to="/solicitudes" /></template>
    </q-banner>

    <template v-if="item">
      <PageHeader
        eyebrow="Revisión AGR Studio"
        :title="`${item.codigo || 'SOL'} · ${item.titulo || 'Solicitud VITI'}`"
        :subtitle="`${item.empresa?.nombre_comercial || 'Sin empresa'} · ${item.cliente?.nombre || 'Sin responsable'}`"
      >
        <div class="row q-gutter-sm">
          <q-btn v-if="canApprove" color="positive" unelevated no-caps icon="verified" label="Aprobar solicitud" :loading="actionLoading" @click="approveRequest" />
          <q-btn v-if="canReject" outline color="negative" no-caps icon="block" label="Rechazar" :loading="actionLoading" @click="openReject" />
          <q-btn v-if="canCreateProject" color="primary" unelevated no-caps icon="rocket_launch" label="Crear proyecto" :loading="actionLoading" @click="createProject" />
          <q-btn v-if="item.proyecto?.id" outline color="primary" no-caps icon="open_in_new" label="Abrir proyecto" :to="`/proyectos/${item.proyecto.id}`" />
        </div>
      </PageHeader>

      <div class="row q-col-gutter-lg q-mb-lg">
        <div class="col-12 col-xl-7">
          <q-card flat class="viti-card full-height">
            <q-card-section>
              <div class="section-label">Decisión actual</div>
              <div class="row items-center q-gutter-md q-mt-sm">
                <q-icon name="fact_check" :color="item.estado === 'en_revision' ? 'warning' : 'primary'" size="38px" />
                <div>
                  <div class="text-h6 text-weight-bold">{{ pretty(item.estado) }}</div>
                  <div class="text-body2 text-grey-7">Revisa la información antes de aprobar, rechazar o iniciar el proyecto.</div>
                </div>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row q-col-gutter-md">
              <div class="col-6 col-md-3"><div class="detail-label">Estado</div><q-badge color="orange">{{ pretty(item.estado) }}</q-badge></div>
              <div class="col-6 col-md-3"><div class="detail-label">Prioridad</div><strong>{{ pretty(item.prioridad || 'normal') }}</strong></div>
              <div class="col-6 col-md-3"><div class="detail-label">Recibida</div><span>{{ formatDate(item.created_at) }}</span></div>
              <div class="col-6 col-md-3"><div class="detail-label">Respuestas</div><strong>{{ answers.length }}</strong></div>
              <div class="col-12"><div class="detail-label">Necesidad</div><div class="request-text">{{ item.resumen || 'Sin resumen adicional.' }}</div></div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-xl-5">
          <q-card flat class="viti-card full-height">
            <q-card-section>
              <div class="section-label">Plan y presupuesto</div>
              <div class="text-h6 text-weight-bold">{{ plan?.nombre || 'Plan no disponible' }}</div>
              <div class="commercial-prices q-mt-md" v-if="plan">
                <div><span>Implementación</span><strong>{{ money(plan.precio_proyecto) }}</strong></div>
                <div><span>Mensual</span><strong>{{ money(plan.precio_mensual) }}</strong></div>
                <div><span>Anual</span><strong>{{ money(plan.precio_anual) }}</strong></div>
              </div>
              <q-separator class="q-my-md" />
              <div class="detail-label">Forma de pago</div>
              <div class="text-weight-bold">{{ pretty(item.forma_pago_preferida || 'por_definir') }}</div>
              <div class="detail-label q-mt-md">Suscripción</div>
              <div class="text-weight-bold">{{ pretty(item.frecuencia_suscripcion_preferida || 'por_definir') }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-card flat class="viti-card q-mb-lg">
        <q-card-section>
          <div class="section-label">Responsable y negocio</div>
          <div class="row q-col-gutter-lg q-mt-sm">
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-6">Responsable</div>
              <div class="text-weight-bold">{{ item.cliente?.nombre || 'Sin nombre' }}</div>
              <div class="text-caption">{{ item.cliente?.correo || 'Sin correo' }}</div>
              <div class="text-caption">{{ item.cliente?.telefono || 'Sin teléfono' }}</div>
              <div class="text-caption">{{ item.cliente?.ciudad || 'Sin ciudad' }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-caption text-grey-6">Empresa / proyecto</div>
              <div class="text-weight-bold">{{ item.empresa?.nombre_comercial || 'Sin empresa' }}</div>
              <div class="text-caption">{{ item.empresa?.actividad || 'Actividad no especificada' }}</div>
              <div class="text-caption">{{ item.empresa?.ciudad || 'Sin ciudad' }}</div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat class="viti-card q-mb-lg">
        <q-card-section>
          <div class="row items-center justify-between">
            <div>
              <div class="section-label">Respuestas del cliente</div>
              <div class="text-h6 text-weight-bold">Cuestionario de evaluación</div>
            </div>
            <q-badge outline color="primary">{{ answers.length }} respondidas</q-badge>
          </div>
        </q-card-section>
        <q-separator />
        <q-list separator>
          <q-item v-for="response in answers" :key="response.id">
            <q-item-section>
              <q-item-label overline>Pregunta {{ response.pregunta?.numero || response.pregunta_id }}</q-item-label>
              <q-item-label class="text-weight-medium">{{ response.pregunta?.enunciado || response.pregunta?.pregunta || 'Pregunta' }}</q-item-label>
              <q-item-label caption class="q-mt-sm response-value">{{ Array.isArray(response.respuesta_json) ? response.respuesta_json.join(', ') : (response.respuesta_texto || 'Sin respuesta') }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="!answers.length"><q-item-section class="text-grey-6">No hay respuestas registradas.</q-item-section></q-item>
        </q-list>
      </q-card>

      <q-card flat class="viti-card q-mb-lg">
        <q-card-section>
          <div class="section-label">Acceso y trazabilidad</div>
          <div class="row q-col-gutter-lg q-mt-md">
            <div class="col-12 col-md-6">
              <div class="text-weight-bold">{{ item.acceso_cliente?.tiene_cuenta ? 'Cuenta creada' : 'Acceso pendiente' }}</div>
              <div class="text-caption text-grey-7">{{ item.acceso_cliente?.correo || item.cliente?.correo || 'Sin correo' }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="text-weight-bold">Proyecto</div>
              <div class="text-caption text-grey-7">{{ item.proyecto?.nombre || 'Todavía no creado' }}</div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </template>

    <q-dialog v-model="rejectDialog">
      <q-card style="width:560px;max-width:94vw">
        <q-card-section>
          <div class="section-label text-negative">Decisión administrativa</div>
          <div class="text-h5 text-weight-bold">Rechazar solicitud</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-input v-model="rejectForm.motivo" outlined type="textarea" autogrow maxlength="1000" counter label="Motivo del rechazo *" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="negative" unelevated no-caps label="Confirmar rechazo" :loading="actionLoading" @click="rejectRequest" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.request-review-page{padding-bottom:40px}.detail-label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--viti-muted);margin-bottom:5px}.commercial-prices{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.commercial-prices>div{padding:10px;border:1px solid var(--viti-border);border-radius:12px}.commercial-prices span{display:block;font-size:10px;text-transform:uppercase;color:var(--viti-muted);font-weight:700}.commercial-prices strong{display:block;margin-top:3px;font-size:16px}.request-text,.response-value{white-space:pre-wrap;line-height:1.6}@media(max-width:600px){.commercial-prices{grid-template-columns:1fr}}
</style>
