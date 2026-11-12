<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const loading = ref(false)
const saving = ref(false)
const revokingId = ref(null)
const devices = ref([])
const newName = ref('')
const secret = ref('')
const secretDialog = ref(false)
const error = ref('')
const activeCount = computed(() => devices.value.filter(isActive).length)

function isActive(device) {
  return !device.revocado_at && new Date(device.expira_at).getTime() > Date.now()
}

function status(device) {
  if (device.revocado_at) return 'Revocado'
  return isActive(device) ? 'Activo' : 'Vencido'
}

function timestamp(date) {
  if (!date) return 'Sin registro'
  const value = new Date(date)
  return Number.isNaN(value.getTime()) ? 'Fecha no disponible' : value.toLocaleString('es-BO')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/irenet/dispositivos')
    devices.value = Array.isArray(data?.data) ? data.data : []
  } catch (e) {
    error.value = e?.response?.data?.message || 'No se pudo consultar la lista de dispositivos.'
  } finally {
    loading.value = false
  }
}

async function pair() {
  const nombre = newName.value.trim()
  if (nombre.length < 3) {
    $q.notify({ type: 'warning', message: 'Escribe un nombre de al menos tres caracteres para identificar tu computadora.' })
    return
  }
  saving.value = true
  try {
    const { data } = await api.post('/irenet/dispositivos', { nombre })
    secret.value = data?.data?.token || ''
    if (!secret.value) throw new Error('VITI no devolvió la credencial del dispositivo.')
    newName.value = ''
    secretDialog.value = true
    await load()
  } catch (e) {
    $q.notify({ type: 'negative', message: e?.response?.data?.message || e?.message || 'No se pudo vincular el dispositivo.' })
  } finally {
    saving.value = false
  }
}

function clearSecret() {
  secret.value = ''
}

async function copySecret() {
  if (!secret.value) return
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Portapapeles no disponible')
    await navigator.clipboard.writeText(secret.value)
    $q.notify({ type: 'positive', message: 'Token copiado. Guárdalo en un lugar seguro y no lo compartas.' })
  } catch {
    $q.notify({ type: 'warning', message: 'No fue posible copiarlo automáticamente. Selecciona y copia el texto manualmente.' })
  }
}

function askRevoke(device) {
  $q.dialog({
    title: 'Revocar dispositivo IRENET',
    message: 'El equipo dejará de consultar VITI inmediatamente. ¿Revocar "' + device.nombre + '"?',
    cancel: true,
    persistent: true,
  }).onOk(() => revoke(device.id))
}

async function revoke(id) {
  revokingId.value = id
  try {
    await api.delete('/irenet/dispositivos/' + id)
    $q.notify({ type: 'positive', message: 'Acceso IRENET revocado.' })
    await load()
  } catch (e) {
    $q.notify({ type: 'negative', message: e?.response?.data?.message || 'No se pudo revocar el dispositivo.' })
  } finally {
    revokingId.value = null
  }
}

onMounted(load)
onBeforeUnmount(clearSecret)
</script>

<template>
  <q-page class="irenet-devices q-pa-md q-pa-lg-lg">
    <PageHeader
      eyebrow="Seguridad e integraciones"
      title="Dispositivos IRENET"
      subtitle="Autoriza equipos Windows para consultar un resumen operativo de VITI. El acceso es de solo lectura."
    />

    <q-banner class="irenet-banner q-mb-lg" rounded>
      <template #avatar><q-icon name="shield" color="orange" size="md" /></template>
      <strong>Acceso limitado.</strong> Cada credencial dura 14 días, se muestra una sola vez y puede revocarse.
      IRENET no podrá modificar proyectos, pagos, clientes ni controlar otros equipos desde este acceso.
    </q-banner>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-5">
        <q-card flat class="irenet-card">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Vincular una computadora</div>
            <p class="irenet-muted q-mt-sm">Ponle un nombre fácil de reconocer, como «IRENET - PC oficina».</p>
            <q-input v-model="newName" outlined label="Nombre del dispositivo" maxlength="80" counter class="q-mt-lg" @keyup.enter="pair" />
            <q-btn
              color="primary"
              unelevated
              no-caps
              class="q-mt-md full-width"
              icon="add_link"
              label="Generar token de vinculación"
              :loading="saving"
              :disable="activeCount >= 5"
              @click="pair"
            />
            <p class="irenet-muted q-mt-md">Se permiten hasta cinco dispositivos activos. La nueva credencial solo se mostrará después de generarla.</p>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-7">
        <q-card flat class="irenet-card">
          <q-card-section class="row items-center q-gutter-sm">
            <div class="col">
              <div class="text-h6 text-weight-bold">Dispositivos vinculados</div>
              <div class="irenet-muted">{{ activeCount }} de 5 activos</div>
            </div>
            <q-btn outline no-caps color="primary" icon="refresh" label="Actualizar" :loading="loading" @click="load" />
          </q-card-section>
          <q-separator dark />
          <q-card-section>
            <q-banner v-if="error" class="bg-red-1 text-negative q-mb-md" rounded>{{ error }}</q-banner>
            <q-inner-loading :showing="loading" />
            <div v-if="!loading && !devices.length" class="irenet-empty">
              <q-icon name="devices" size="42px" />
              <div>Todavía no hay dispositivos vinculados.</div>
            </div>
            <q-list v-else separator dark>
              <q-item v-for="device in devices" :key="device.id" class="q-px-none q-py-md">
                <q-item-section avatar><q-avatar color="blue-9" text-color="white" icon="desktop_windows" /></q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ device.nombre }}</q-item-label>
                  <q-item-label caption class="irenet-muted">Vence: {{ timestamp(device.expira_at) }}</q-item-label>
                  <q-item-label caption class="irenet-muted">Último acceso: {{ timestamp(device.ultimo_acceso_at) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge :color="isActive(device) ? 'positive' : 'grey-7'">{{ status(device) }}</q-badge>
                  <q-btn
                    v-if="!device.revocado_at"
                    flat
                    dense
                    no-caps
                    color="negative"
                    class="q-mt-sm"
                    label="Revocar"
                    :loading="revokingId === device.id"
                    @click="askRevoke(device)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="secretDialog" persistent @hide="clearSecret">
      <q-card class="token-card">
        <q-card-section class="row items-center no-wrap">
          <q-icon name="vpn_key" size="lg" color="orange" class="q-mr-md" />
          <div>
            <div class="text-h6 text-weight-bold">Credencial IRENET creada</div>
            <div class="irenet-muted">Este token no volverá a mostrarse.</div>
          </div>
        </q-card-section>
        <q-separator dark />
        <q-card-section>
          <q-input :model-value="secret" readonly outlined type="text" label="Token de dispositivo">
            <template #append>
              <q-btn flat dense round icon="content_copy" aria-label="Copiar token IRENET" @click="copySecret" />
            </template>
          </q-input>
          <p class="irenet-muted q-mt-md">Pega este token únicamente en el conector IRENET de tu computadora. No lo envíes por mensajes ni lo publiques en GitHub.</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="primary" unelevated no-caps label="Ya guardé el token" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.irenet-devices{max-width:1320px;margin:0 auto;color:#edf4fb}
.irenet-banner{background:rgba(10,34,55,.9);color:#dce7f1;border:1px solid rgba(108,151,187,.28);line-height:1.55}
.irenet-card,.token-card{background:linear-gradient(180deg,#0b1e32,#09182a);color:#edf4fb;border:1px solid rgba(110,148,182,.25);border-radius:18px}
.irenet-muted{color:#91a7b9;font-size:12px;line-height:1.6;margin-bottom:0}
.irenet-empty{min-height:190px;display:grid;place-items:center;align-content:center;gap:12px;color:#91a7b9;text-align:center}
.token-card{width:560px;max-width:94vw}
:deep(.q-field--outlined .q-field__control){background:rgba(4,16,28,.65)}
:deep(.q-field__native),:deep(.q-field__input){color:#edf4fb!important}
</style>
