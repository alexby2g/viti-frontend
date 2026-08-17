<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const loading = ref(true)
const rows = ref([])
const status = ref('pendiente')
const generated = ref(null)
const siteOrigin = window.location.origin

const statusOptions = [
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'En revisión', value: 'en_revision' },
  { label: 'Aprobadas', value: 'aprobada' },
  { label: 'Rechazadas', value: 'rechazada' },
]

const statusColor = value => ({ pendiente: 'orange', en_revision: 'primary', aprobada: 'positive', rechazada: 'negative' }[value] || 'grey')
const statusLabel = value => ({ pendiente: 'Pendiente', en_revision: 'En revisión', aprobada: 'Aprobada', rechazada: 'Rechazada' }[value] || value)
const invitationColor = value => ({ pendiente:'orange', usada:'positive', deshabilitada:'grey' }[value] || 'grey')
const invitationLabel = value => ({ pendiente:'Disponible', usada:'Utilizada', deshabilitada:'Deshabilitada' }[value] || value || 'Sin acceso')
const planLabel = row => row.plan?.nombre || row.plan_codigo || 'Sin plan seleccionado'
const billingLabel = row => row.modalidad === 'anual' ? 'Anual' : row.modalidad === 'mensual' ? 'Mensual' : 'Por definir'

async function load() {
  loading.value = true
  try {
    const response = await api.get('/accesos', { params: { estado: status.value, per_page: 100 } })
    rows.value = response.data?.data?.data || []
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'No se pudieron cargar las solicitudes de acceso.' })
  } finally {
    loading.value = false
  }
}

function markReview(row) {
  $q.dialog({
    title: 'Tomar solicitud en revisión',
    message: `¿Quieres marcar la solicitud de ${row.nombre} (${row.negocio}) como en revisión?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.post(`/accesos/${row.id}/revision`)
      $q.notify({ type: 'positive', message: 'La solicitud quedó en revisión.' })
      await load()
    } catch (error) {
      $q.notify({ type: 'negative', message: error.response?.data?.message || 'No se pudo actualizar la solicitud.' })
    }
  })
}

function approve(row) {
  $q.dialog({
    title: 'Aprobar solicitud',
    message: `¿Crear un acceso personal para ${row.nombre} (${row.negocio})?`,
    prompt: { model: '7', type: 'number', label: 'Vigencia del código en días' },
    cancel: true,
    persistent: true,
  }).onOk(async days => {
    try {
      const response = await api.post(`/accesos/${row.id}/aprobar`, { dias_vigencia: Number(days) || 7 })
      generated.value = response.data?.data || null
      $q.notify({ type: 'positive', message: response.data?.message || 'Acceso generado.' })
      await load()
    } catch (error) {
      $q.notify({ type: 'negative', message: error.response?.data?.message || 'No se pudo aprobar la solicitud.' })
    }
  })
}

function reject(row) {
  $q.dialog({
    title: 'Rechazar solicitud',
    message: `Indica por qué no se aprueba la solicitud de ${row.nombre}.`,
    prompt: { model: '', type: 'textarea', isValid: value => String(value || '').trim().length >= 5 },
    cancel: true,
    persistent: true,
  }).onOk(async reason => {
    try {
      await api.post(`/accesos/${row.id}/rechazar`, { notas: reason })
      $q.notify({ type: 'positive', message: 'Solicitud rechazada.' })
      await load()
    } catch (error) {
      $q.notify({ type: 'negative', message: error.response?.data?.message || 'No se pudo rechazar la solicitud.' })
    }
  })
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text)
    $q.notify({ type: 'positive', message: `${label} copiado.` })
  } catch {
    $q.notify({ type: 'warning', message: 'No se pudo copiar automáticamente. Puedes seleccionarlo manualmente.' })
  }
}

function invitationLink(row) {
  return row.invitacion?.codigo ? `${siteOrigin}/registro-cliente/${row.invitacion.codigo}` : ''
}

onMounted(load)
</script>

<template>
  <q-page class="viti-page q-pa-lg">
    <PageHeader title="Solicitudes de acceso" subtitle="Revisa quién solicita entrar a VITI, qué plan le interesa y genera una invitación personal solamente cuando corresponda." />

    <div class="row items-center q-col-gutter-md q-mt-lg">
      <div class="col-12 col-md-5">
        <q-select v-model="status" outlined emit-value map-options :options="statusOptions" label="Estado" @update:model-value="load" />
      </div>
      <div class="col-12 col-md-auto q-ml-auto">
        <q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps @click="load" />
      </div>
    </div>

    <q-card v-if="generated" flat bordered class="generated-card q-mt-lg">
      <q-card-section>
        <div class="row items-start no-wrap">
          <q-avatar color="green-1" text-color="positive" icon="verified" />
          <div class="q-ml-md col">
            <div class="text-subtitle1 text-weight-bold">Acceso generado correctamente</div>
            <div class="text-body2 text-grey-7">Comparte este código o el enlace personal. El código expira en la fecha indicada y el registro seguirá usando el onboarding actual de VITI.</div>
            <div v-if="generated.solicitud?.plan" class="text-caption text-grey-7 q-mt-sm">Plan solicitado: <strong>{{ generated.solicitud.plan.nombre }}</strong> · Modalidad: {{ billingLabel(generated.solicitud) }}</div>
            <div class="generated-code q-mt-md">{{ generated.codigo }}</div>
            <div class="text-caption text-grey-6 q-mt-xs">Vence: {{ generated.expira_at ? new Date(generated.expira_at).toLocaleString('es-BO') : '—' }}</div>
            <div class="row q-gutter-sm q-mt-md">
              <q-btn unelevated color="primary" no-caps icon="content_copy" label="Copiar código" @click="copy(generated.codigo, 'Código')" />
              <q-btn flat color="primary" no-caps icon="link" label="Copiar enlace" @click="copy(`${siteOrigin}${generated.ruta}`, 'Enlace')" />
            </div>
          </div>
          <q-btn flat round dense icon="close" @click="generated = null" />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="q-mt-lg">
      <q-table
        :rows="rows"
        :columns="[
          { name:'persona', label:'Solicitante', field:'nombre', align:'left' },
          { name:'negocio', label:'Negocio', field:'negocio', align:'left' },
          { name:'plan', label:'Preferencia comercial', field:'plan_codigo', align:'left' },
          { name:'contacto', label:'Contacto', field:'telefono', align:'left' },
          { name:'acceso', label:'Acceso', field:'invitacion_id', align:'left' },
          { name:'estado', label:'Estado', field:'estado', align:'left' },
          { name:'fecha', label:'Fecha', field:'created_at', align:'left' },
          { name:'acciones', label:'', field:'id', align:'right' },
        ]"
        :loading="loading"
        row-key="id"
        flat
        no-data-label="No hay solicitudes en este estado."
      >
        <template #body-cell-persona="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.nombre }}</div>
            <div class="text-caption text-grey-6">{{ props.row.actividad || 'Actividad no indicada' }}</div>
          </q-td>
        </template>
        <template #body-cell-plan="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ planLabel(props.row) }}</div>
            <div class="text-caption text-grey-6">{{ billingLabel(props.row) }}</div>
          </q-td>
        </template>
        <template #body-cell-contacto="props">
          <q-td :props="props">
            <div>{{ props.row.telefono }}</div>
            <div v-if="props.row.whatsapp" class="text-caption text-grey-6">WhatsApp: {{ props.row.whatsapp }}</div>
          </q-td>
        </template>
        <template #body-cell-acceso="props">
          <q-td :props="props">
            <template v-if="props.row.invitacion">
              <q-badge rounded :color="invitationColor(props.row.invitacion.estado)" :label="invitationLabel(props.row.invitacion.estado)" />
              <div class="text-caption text-weight-bold q-mt-xs">{{ props.row.invitacion.codigo }}</div>
              <div class="text-caption text-grey-6">Vence: {{ props.row.invitacion.expira_at ? new Date(props.row.invitacion.expira_at).toLocaleDateString('es-BO') : '—' }}</div>
            </template>
            <span v-else class="text-caption text-grey-6">Sin invitación</span>
          </q-td>
        </template>
        <template #body-cell-estado="props">
          <q-td :props="props"><q-badge rounded :color="statusColor(props.row.estado)" :label="statusLabel(props.row.estado)" /></q-td>
        </template>
        <template #body-cell-fecha="props">
          <q-td :props="props">{{ new Date(props.row.created_at).toLocaleString('es-BO') }}</q-td>
        </template>
        <template #body-cell-acciones="props">
          <q-td :props="props">
            <div v-if="['pendiente','en_revision'].includes(props.row.estado)" class="row justify-end q-gutter-xs">
              <q-btn v-if="props.row.estado === 'pendiente'" flat round dense color="primary" icon="visibility" @click="markReview(props.row)"><q-tooltip>Marcar en revisión</q-tooltip></q-btn>
              <q-btn flat round dense color="positive" icon="check" @click="approve(props.row)"><q-tooltip>Aprobar y generar acceso</q-tooltip></q-btn>
              <q-btn flat round dense color="negative" icon="close" @click="reject(props.row)"><q-tooltip>Rechazar</q-tooltip></q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<style scoped>
.generated-card{border-color:color-mix(in srgb,#21ba45 35%,var(--viti-border));background:var(--viti-card)}
.generated-code{display:inline-block;padding:12px 16px;border-radius:12px;background:#0b2436;color:#fff;font-size:22px;font-weight:900;letter-spacing:.08em}
</style>
