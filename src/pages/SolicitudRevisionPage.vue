<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { downloadFile } from '../utils/download'
import { formatDate, formatDateTime, todayInput } from '../utils/date'
import PageHeader from '../components/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const item = ref(null)
const loading = ref(true)
const actionLoading = ref(false)
const timelineLoading = ref(false)
const rejectDialog = ref(false)
const projectDialog = ref(false)
const timeline = ref([])
const loadError = ref('')

const rejectForm = reactive({ motivo: '' })
const project = reactive({
  solicitud_id: null,
  empresa_id: null,
  cliente_id: null,
  nombre: '',
  descripcion: '',
  fase: 'levantamiento',
  estado: 'activo',
  progreso: 0,
  fecha_inicio: todayInput(),
})

const plan = computed(() => item.value?.plan_viti || null)
const access = computed(() => item.value?.acceso_cliente || {})
const hasAccount = computed(() => Boolean(access.value?.tiene_cuenta) || access.value?.estado === 'cuenta_creada')
const canApprove = computed(() => item.value?.estado === 'en_revision' && !item.value?.proyecto)
const canReject = computed(() => ['borrador', 'en_revision'].includes(item.value?.estado) && !item.value?.proyecto)
const canInvite = computed(() => item.value?.estado === 'aprobada' && !hasAccount.value && !access.value?.id)
const canCreateProject = computed(() => item.value?.estado === 'aprobada' && !item.value?.proyecto)
const canGenerateAgain = computed(() => item.value?.estado === 'aprobada' && ['vencida', 'revocada'].includes(access.value?.estado))

const answeredCount = computed(() => {
  let total = 0
  for (const response of item.value?.respuestas || []) {
    const value = response.respuesta_json ?? response.respuesta_texto
    if (Array.isArray(value) ? value.length : String(value ?? '').trim()) total += 1
  }
  return total
})

const nextAction = computed(() => {
  if (item.value?.proyecto) {
    return { icon: 'task_alt', color: 'positive', title: 'Solicitud convertida en proyecto', text: 'El desarrollo ya tiene un proyecto asociado y conserva toda la trazabilidad.' }
  }
  if (item.value?.estado === 'en_revision') {
    return { icon: 'fact_check', color: 'warning', title: 'Evaluar solicitud', text: 'Revisa alcance, plan, presupuesto y respuestas. Después decide si la propuesta es viable.' }
  }
  if (item.value?.estado === 'aprobada' && !hasAccount.value) {
    if (access.value?.estado === 'enviada') {
      return { icon: 'mark_email_read', color: 'positive', title: 'Invitación enviada', text: 'El cliente ya recibió la invitación. Espera a que complete su acceso.' }
    }
    return { icon: 'vpn_key', color: 'primary', title: 'Habilitar acceso', text: 'La solicitud está aprobada. Genera una invitación personal para el responsable.' }
  }
  if (item.value?.estado === 'aprobada') {
    return { icon: 'school', color: 'primary', title: 'Preparar el inicio', text: 'El acceso está habilitado. Ahora puedes orientar al cliente y comenzar el proyecto.' }
  }
  if (item.value?.estado === 'rechazada') {
    return { icon: 'block', color: 'negative', title: 'Solicitud rechazada', text: 'La decisión quedó registrada. El cliente puede corregir información y volver a revisión.' }
  }
  return { icon: 'schedule', color: 'grey-7', title: 'Seguimiento', text: 'Continúa el flujo desde el estado actual de la solicitud.' }
})

function normalize(response) {
  return response?.data?.data ?? response?.data ?? null
}

function pretty(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function money(value) {
  return value === null || value === undefined || value === '' ? 'A cotizar' : `${Number(value).toFixed(0)} Bs`
}

function paymentLabel(value) {
  return ({
    contado: 'Pago completo',
    '50_50': '50% al iniciar / 50% al entregar',
    tres_partes: '40% al iniciar / 30% en avance / 30% al entregar',
    por_definir: 'Por acordar con AGR Studio',
  })[value] || pretty(value) || 'No definido'
}

async function loadTimeline() {
  if (!item.value?.id) return
  timelineLoading.value = true
  try {
    const response = await api.get(`/solicitudes/${item.value.id}/historial`)
    timeline.value = Array.isArray(response.data?.data) ? response.data.data : []
  } catch {
    timeline.value = []
  } finally {
    timelineLoading.value = false
  }
}

async function load() {
  loadError.value = ''
  loading.value = true
  item.value = null
  const id = Number(route.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    loadError.value = 'La solicitud indicada no es válida.'
    loading.value = false
    return
  }
  try {
    item.value = normalize(await api.get(`/solicitudes/${id}`))
    if (!item.value?.id) throw new Error('El servidor no devolvió una solicitud válida.')
    await loadTimeline()
  } catch (error) {
    loadError.value = error?.response?.data?.message || error?.message || 'No se pudo cargar la solicitud.'
  } finally {
    loading.value = false
  }
}

async function approveRequest() {
  if (!item.value?.id || !canApprove.value) return
  $q.dialog({
    title: 'Aprobar solicitud',
    message: 'La solicitud quedará aprobada y recién entonces podrás habilitar el acceso del cliente. ¿Continuar?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    actionLoading.value = true
    try {
      await api.post(`/solicitudes/${item.value.id}/aprobar`)
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
  if (!item.value?.id) return
  if (String(rejectForm.motivo || '').trim().length < 5) {
    $q.notify({ type: 'warning', message: 'Escribe un motivo breve para registrar la decisión.' })
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

async function createInvitation() {
  if (!item.value?.id || (!canInvite.value && !canGenerateAgain.value)) return
  actionLoading.value = true
  try {
    const response = await api.post(`/solicitudes/${item.value.id}/invitacion`, { dias_vigencia: 7 })
    const sent = Boolean(response.data?.data?.email_enviado)
    $q.notify({
      type: sent ? 'positive' : 'warning',
      message: response.data?.message || (sent ? 'Invitación enviada.' : 'Invitación generada; revisa la entrega de correo.'),
    })
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No se pudo generar la invitación.' })
  } finally {
    actionLoading.value = false
  }
}

async function resendInvitation() {
  if (!item.value?.id || !access.value?.puede_reenviar || item.value.estado !== 'aprobada') return
  actionLoading.value = true
  try {
    const response = await api.post(`/solicitudes/${item.value.id}/invitacion/reenviar`)
    const sent = Boolean(response.data?.data?.email_enviado)
    $q.notify({ type: sent ? 'positive' : 'warning', message: response.data?.message || 'Reenvío procesado.' })
    await load()
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No se pudo reenviar la invitación.' })
  } finally {
    actionLoading.value = false
  }
}

async function revokeInvitation() {
  if (!item.value?.id || !access.value?.puede_revocar) return
  $q.dialog({
    title: 'Revocar invitación',
    message: 'El enlace dejará de funcionar inmediatamente. ¿Continuar?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    actionLoading.value = true
    try {
      await api.delete(`/solicitudes/${item.value.id}/invitacion`)
      $q.notify({ type: 'positive', message: 'Invitación revocada.' })
      await load()
    } catch (error) {
      $q.notify({ type: 'negative', message: error?.response?.data?.message || 'No se pudo revocar la invitación.' })
    } finally {
      actionLoading.value = false
    }
  })
}

async function copyInvitation() {
  if (!access.value?.url) return
  try {
    await navigator.clipboard.writeText(access.value.url)
    $q.notify({ type: 'positive', message: 'Enlace de invitación copiado.' })
  } catch {
    $q.notify({ type: 'info', message: 'No se pudo copiar automáticamente. Usa el enlace disponible en la ficha.' })
  }
}

function openProject() {
  if (!item.value?.id || !canCreateProject.value) return
  Object.assign(project, {
    solicitud_id: item.value.id,
    empresa_id: item.value.empresa_id,
    cliente_id: item.value.cliente_id,
    nombre: item.value.titulo || '',
    descripcion: item.value.resumen || '',
    fase: 'levantamiento',
    estado: 'activo',
    progreso: 0,
    fecha_inicio: todayInput(),
  })
  projectDialog.value = true
}

async function createProject() {
  if (!item.value?.id || !canCreateProject.value) return
  actionLoading.value = true
  try {
    const created = normalize(await api.post('/proyectos', project))
    if (!created?.id) throw new Error('El servidor no devolvió el proyecto creado.')
    projectDialog.value = false
    await router.push(`/proyectos/${created.id}`)
  } catch (error) {
    $q.notify({ type: 'negative', message: error?.response?.data?.message || error?.message || 'No se pudo crear el proyecto.' })
  } finally {
    actionLoading.value = false
  }
}

function openPublic() {
  if (item.value?.enlace_publico) window.open(item.value.enlace_publico, '_blank', 'noopener')
}

async function copyPublic() {
  if (!item.value?.enlace_publico) return
  try {
    await navigator.clipboard.writeText(item.value.enlace_publico)
    $q.notify({ type: 'positive', message: 'Enlace público copiado.' })
  } catch {
    $q.notify({ type: 'info', message: 'Copia el enlace desde el navegador.' })
  }
}

function eventIcon(event) {
  return ({
    solicitud_viti_unificada_enviada: 'send',
    solicitud_aprobada: 'verified',
    solicitud_rechazada: 'block',
    invitacion_cliente_creada: 'mail',
    invitacion_cliente_reenviada: 'forward_to_inbox',
    invitacion_cliente_revocada: 'link_off',
    cuenta_cliente_creada: 'person_add',
  })[event?.accion] || 'history'
}

function eventTitle(event) {
  return ({
    solicitud_viti_unificada_enviada: 'Solicitud recibida',
    solicitud_aprobada: 'Solicitud aprobada',
    solicitud_rechazada: 'Solicitud rechazada',
    invitacion_cliente_creada: 'Invitación generada',
    invitacion_cliente_reenviada: 'Invitación reenviada',
    invitacion_cliente_revocada: 'Invitación revocada',
    cuenta_cliente_creada: 'Cuenta VITI creada',
  })[event?.accion] || pretty(event?.accion || 'Actividad')
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page request-review-page">
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
          <q-btn v-if="canCreateProject" color="primary" unelevated no-caps icon="rocket_launch" label="Crear proyecto" :loading="actionLoading" @click="openProject" />
          <q-btn v-else-if="item.proyecto?.id" outline color="primary" no-caps icon="open_in_new" label="Abrir proyecto" :to="`/proyectos/${item.proyecto.id}`" />
        </div>
      </PageHeader>

      <div class="row q-col-gutter-lg q-mb-lg">
        <div class="col-12 col-xl-7">
          <q-card flat class="viti-card full-height">
            <q-card-section>
              <div class="section-label">Decisión actual</div>
              <div class="row items-center q-gutter-md q-mt-sm">
                <q-icon :name="nextAction.icon" :color="nextAction.color" size="38px" />
                <div>
                  <div class="text-h6 text-weight-bold">{{ nextAction.title }}</div>
                  <div class="text-body2 text-grey-7">{{ nextAction.text }}</div>
                </div>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="row q-col-gutter-md">
              <div class="col-6 col-md-3"><div class="detail-label">Estado</div><q-badge :color="item.estado === 'en_revision' ? 'orange' : item.estado === 'aprobada' ? 'positive' : item.estado === 'rechazada' ? 'negative' : 'primary'">{{ pretty(item.estado) }}</q-badge></div>
              <div class="col-6 col-md-3"><div class="detail-label">Prioridad</div><strong>{{ pretty(item.prioridad || 'normal') }}</strong></div>
              <div class="col-6 col-md-3"><div class="detail-label">Recibida</div><span>{{ formatDate(item.created_at) }}</span></div>
              <div class="col-6 col-md-3"><div class="detail-label">Respuestas</div><strong>{{ answeredCount }}</strong></div>
              <div class="col-12"><div class="detail-label">Necesidad</div><div class="request-text">{{ item.resumen || 'Sin resumen adicional.' }}</div></div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12 col-xl-5">
          <q-card flat class="viti-card full-height commercial-card">
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
              <div class="text-weight-bold">{{ paymentLabel(item.forma_pago_preferida) }}</div>
              <div class="detail-label q-mt-md">Suscripción</div>
              <div class="text-weight-bold">{{ pretty(item.frecuencia_suscripcion_preferida || 'por definir') }}</div>
              <div class="q-mt-md"><q-badge outline :color="item.acuerdo_comercial_aceptado ? 'positive' : 'orange'">{{ item.acuerdo_comercial_aceptado ? 'Acuerdo aceptado' : 'Acuerdo pendiente' }}</q-badge></div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-card flat class="viti-card q-mb-lg">
        <q-card-section>
          <div class="section-label">Responsable y negocio</div>
          <div class="row q-col-gutter-lg q-mt-sm">
            <div class="col-12 col-md-6"><div class="text-caption text-grey-6">Responsable</div><div class="text-weight-bold">{{ item.cliente?.nombre || 'Sin nombre' }}</div><div class="text-caption">{{ item.cliente?.correo || 'Sin correo' }} · {{ item.cliente?.telefono || 'Sin teléfono' }}</div><div class="text-caption">{{ item.cliente?.ciudad || 'Sin ciudad' }}</div></div>
            <div class="col-12 col-md-6"><div class="text-caption text-grey-6">Empresa / proyecto</div><div class="text-weight-bold">{{ item.empresa?.nombre_comercial || 'Sin empresa' }}</div><div class="text-caption">{{ item.empresa?.actividad || 'Actividad no especificada' }}</div><div class="text-caption">{{ item.empresa?.ciudad || 'Sin ciudad' }}</div></div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat class="viti-card q-mb-lg access-card">
        <q-card-section>
          <div class="section-label">Acceso del cliente</div>
          <div class="row items-start justify-between q-gutter-md">
            <div>
              <div class="text-h6 text-weight-bold">{{ hasAccount ? 'Cuenta creada' : 'Acceso controlado por aprobación' }}</div>
              <div class="text-body2 text-grey-7 q-mt-xs">
                <template v-if="item.estado !== 'aprobada'">Primero debe aprobarse la solicitud. No se genera ningún código de acceso durante la revisión.</template>
                <template v-else-if="hasAccount">El responsable ya creó su cuenta mediante la invitación de esta solicitud.</template>
                <template v-else>Correo destino: <strong>{{ access.correo || item.cliente?.correo || 'Sin correo' }}</strong></template>
              </div>
            </div>
            <q-badge v-if="access.estado" outline color="primary">{{ pretty(access.estado) }}</q-badge>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div v-if="item.estado !== 'aprobada'" class="row items-center q-gutter-sm">
            <q-icon name="lock" color="orange" size="26px" />
            <span>No disponible todavía. La aprobación es obligatoria antes de crear el acceso.</span>
          </div>
          <div v-else-if="hasAccount" class="row items-center q-gutter-sm">
            <q-icon name="verified_user" color="positive" size="28px" />
            <span>Cuenta vinculada correctamente a la solicitud.</span>
          </div>
          <div v-else class="row q-gutter-sm">
            <q-btn v-if="canInvite || canGenerateAgain" color="primary" unelevated no-caps icon="mark_email_read" label="Generar invitación" :loading="actionLoading" @click="createInvitation" />
            <q-btn v-if="access.puede_reenviar && item.estado === 'aprobada'" outline color="primary" no-caps icon="forward_to_inbox" label="Reenviar" :loading="actionLoading" @click="resendInvitation" />
            <q-btn v-if="access.url" outline color="primary" no-caps icon="content_copy" label="Copiar invitación" @click="copyInvitation" />
            <q-btn v-if="access.puede_revocar" flat color="negative" no-caps icon="link_off" label="Revocar" :loading="actionLoading" @click="revokeInvitation" />
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
            <q-badge outline color="primary">{{ answeredCount }} respondidas</q-badge>
          </div>
        </q-card-section>
        <q-separator />
        <q-list separator>
          <q-item v-for="response in item.respuestas || []" :key="response.id">
            <q-item-section>
              <q-item-label overline>Pregunta {{ response.pregunta?.numero || response.pregunta_id }}</q-item-label>
              <q-item-label class="text-weight-medium">{{ response.pregunta?.enunciado || response.pregunta?.pregunta || 'Pregunta' }}</q-item-label>
              <q-item-label caption class="q-mt-sm response-value">{{ Array.isArray(response.respuesta_json) ? response.respuesta_json.join(', ') : (response.respuesta_texto || 'Sin respuesta') }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <q-card flat class="viti-card q-mb-lg">
        <q-card-section>
          <div class="row items-center justify-between">
            <div><div class="section-label">Trazabilidad</div><div class="text-h6 text-weight-bold">Historial de la solicitud</div></div>
            <q-btn flat round icon="refresh" color="primary" :loading="timelineLoading" @click="loadTimeline" />
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-inner-loading :showing="timelineLoading" />
          <div v-if="!timelineLoading && !timeline.length" class="text-grey-6">Todavía no hay eventos.</div>
          <q-timeline v-else color="primary" layout="comfortable">
            <q-timeline-entry v-for="event in timeline" :key="event.id" :icon="eventIcon(event)" :title="eventTitle(event)" :subtitle="formatDateTime(event.created_at)">
              <div>{{ event.descripcion || 'Actividad registrada.' }}</div>
              <div v-if="event.datos?.motivo" class="text-caption text-grey-7 q-mt-xs"><strong>Motivo:</strong> {{ event.datos.motivo }}</div>
            </q-timeline-entry>
          </q-timeline>
        </q-card-section>
      </q-card>

      <div class="row justify-end q-gutter-sm q-mb-xl">
        <q-btn outline color="primary" icon="open_in_new" label="Ver formulario" no-caps @click="openPublic" v-if="item.enlace_publico" />
        <q-btn outline color="primary" icon="content_copy" label="Copiar enlace" no-caps @click="copyPublic" v-if="item.enlace_publico" />
        <q-btn outline color="primary" icon="picture_as_pdf" label="PDF" no-caps @click="downloadFile(`/reportes/solicitudes/${item.id}.pdf`, `${item.codigo || 'solicitud'}-solicitud.pdf`)">PDF</q-btn>
      </div>
    </template>

    <q-dialog v-model="rejectDialog">
      <q-card style="width: 560px; max-width: 94vw">
        <q-card-section>
          <div class="section-label text-negative">Decisión administrativa</div>
          <div class="text-h5 text-weight-bold">Rechazar solicitud</div>
          <div class="text-body2 text-grey-7 q-mt-sm">El motivo se guardará en la trazabilidad para poder orientar al cliente posteriormente.</div>
        </q-card-section>
        <q-separator />
        <q-card-section><q-input v-model="rejectForm.motivo" outlined type="textarea" autogrow counter maxlength="1000" label="Motivo del rechazo *" /></q-card-section>
        <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /><q-btn color="negative" unelevated label="Confirmar rechazo" no-caps :loading="actionLoading" @click="rejectRequest" /></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="projectDialog">
      <q-card style="width: 700px; max-width: 94vw">
        <q-card-section>
          <div class="section-label">Proyecto</div>
          <div class="text-h5 text-weight-bold">Iniciar trabajo con VITI</div>
          <div class="text-caption text-grey-6 q-mt-xs">{{ plan?.nombre || 'Plan' }} · implementación {{ money(plan?.precio_proyecto) }}</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-input v-model="project.nombre" outlined label="Nombre del proyecto *" />
          <q-input v-model="project.descripcion" outlined type="textarea" autogrow label="Descripción" class="q-mt-md" />
          <div class="row q-col-gutter-md q-mt-xs">
            <div class="col-6"><q-select v-model="project.fase" outlined :options="['levantamiento','analisis','diseno','desarrollo','beta','pruebas','ajustes','implementacion']" label="Fase inicial" /></div>
            <div class="col-6"><q-input v-model="project.fecha_inicio" outlined type="date" stack-label label="Fecha de inicio" /></div>
          </div>
        </q-card-section>
        <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /><q-btn color="primary" unelevated label="Crear proyecto" no-caps :loading="actionLoading" @click="createProject" /></q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.request-review-page{padding-bottom:40px}.detail-label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--viti-muted);margin-bottom:5px}.commercial-card,.access-card{border:1px solid color-mix(in srgb,var(--q-primary) 18%,var(--viti-border))}.commercial-prices{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.commercial-prices>div{padding:10px;border:1px solid var(--viti-border);border-radius:12px}.commercial-prices span{display:block;font-size:10px;text-transform:uppercase;color:var(--viti-muted);font-weight:700}.commercial-prices strong{display:block;margin-top:3px;font-size:16px}.request-text,.response-value{white-space:pre-wrap;line-height:1.6}@media(max-width:600px){.commercial-prices{grid-template-columns:1fr}}
</style>
