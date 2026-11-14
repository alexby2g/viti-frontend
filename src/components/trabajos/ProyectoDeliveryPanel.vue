<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../../boot/axios'

const props = defineProps({
  proyecto: { type: Object, required: true },
})
const $q = useQuasar()
const loading = ref(false)
const saving = ref(false)
const publishing = ref(false)
const withdrawing = ref(false)
const error = ref('')
const delivery = ref(null)
const available = ref([])
const form = reactive({ titulo: 'Entrega del proyecto', instrucciones: '', archivo_ids: [] })
const published = computed(() => delivery.value?.estado === 'publicada')
const paid = computed(() => props.proyecto?.precio_acordado == null || props.proyecto.estado_pago === 'pagado')
const deliveredApp = computed(() => !!(props.proyecto?.aplicacion?.acceso_cliente && props.proyecto?.aplicacion?.entregado_at))
const ready = computed(() => !!(form.archivo_ids.length || deliveredApp.value))
const dirty = computed(() => {
  if (!delivery.value) return false
  return String(form.titulo || '').trim() !== String(delivery.value.titulo || '').trim()
    || String(form.instrucciones || '').trim() !== String(delivery.value.instrucciones || '').trim()
    || JSON.stringify([...form.archivo_ids].sort((a,b) => a-b))
      !== JSON.stringify([...(delivery.value.archivo_ids || [])].sort((a,b) => a-b))
})
const projectFilesLink = computed(() => '/archivos?proyecto=' + props.proyecto.id)
const paymentLink = computed(() => '/pagos?proyecto=' + props.proyecto.id)

function failure(e, fallback) {
  const field = Object.values(e?.response?.data?.errors || {})[0]
  return (Array.isArray(field) ? field[0] : null) || e?.response?.data?.message || fallback
}
async function load() {
  if (!props.proyecto?.id) return
  loading.value = true
  error.value = ''
  try {
    const result = await api.get('/proyectos/' + props.proyecto.id + '/entrega')
    delivery.value = result.data.data
    available.value = result.data.disponibles || []
    form.titulo = delivery.value?.titulo || 'Entrega del proyecto'
    form.instrucciones = delivery.value?.instrucciones || ''
    form.archivo_ids = (delivery.value?.archivo_ids || []).map(Number)
  } catch (e) {
    error.value = failure(e, 'No se pudo consultar la entrega del proyecto.')
  } finally {
    loading.value = false
  }
}
async function save() {
  if (published.value || saving.value) return
  saving.value = true
  try {
    await api.put('/proyectos/' + props.proyecto.id + '/entrega', {
      titulo: form.titulo.trim(),
      instrucciones: form.instrucciones.trim() || null,
      archivo_ids: form.archivo_ids.map(Number),
    })
    $q.notify({ type: 'positive', message: 'Borrador de entrega guardado. Aún no es visible para el cliente.' })
    await load()
  } catch (e) {
    $q.notify({ type: 'negative', message: failure(e, 'No se pudo guardar la entrega.') })
  } finally {
    saving.value = false
  }
}
function publish() {
  if (published.value || publishing.value || !paid.value || !ready.value || dirty.value || !delivery.value?.id) return
  $q.dialog({
    title: 'Publicar entrega al cliente',
    message: '¿Confirmas que el pago está verificado y que estos archivos e instrucciones están listos? El cliente podrá descargarlos desde Mi proyecto.',
    cancel: true,
    persistent: true,
    ok: { label: 'Publicar entrega', color: 'positive', noCaps: true },
  }).onOk(async () => {
    publishing.value = true
    try {
      await api.post('/proyectos/' + props.proyecto.id + '/entrega/publicar')
      $q.notify({ type: 'positive', message: 'Entrega publicada para el cliente.' })
      await load()
    } catch (e) {
      $q.notify({ type: 'negative', message: failure(e, 'No se pudo publicar la entrega.') })
    } finally {
      publishing.value = false
    }
  })
}
function withdraw() {
  if (!published.value || withdrawing.value) return
  $q.dialog({
    title: 'Retirar entrega',
    message: 'La entrega dejará de estar disponible para el cliente, pero los archivos permanecerán guardados. El acceso a una aplicación ya entregada se administra por separado en Sistemas.',
    cancel: true,
    persistent: true,
    ok: { label: 'Retirar acceso a archivos', color: 'warning', noCaps: true },
  }).onOk(async () => {
    withdrawing.value = true
    try {
      await api.post('/proyectos/' + props.proyecto.id + '/entrega/retirar')
      $q.notify({ type: 'positive', message: 'Paquete retirado sin eliminar archivos.' })
      await load()
    } catch (e) {
      $q.notify({ type: 'negative', message: failure(e, 'No se pudo retirar la entrega.') })
    } finally {
      withdrawing.value = false
    }
  })
}
onMounted(load)
watch(() => props.proyecto?.id, load)
</script>

<template>
  <q-card flat class="viti-card delivery-panel q-mt-lg">
    <q-card-section class="row items-center q-gutter-sm">
      <div class="col">
        <div class="section-label">ENTREGA AL CLIENTE</div>
        <div class="text-h6 text-weight-bold">Paquete de entrega</div>
        <div class="text-caption text-grey-5">Archivos e instrucciones, organizados en el mismo trabajo.</div>
      </div>
      <q-badge outline :color="published ? 'positive' : 'warning'">{{ published ? 'Publicada' : 'Borrador privado' }}</q-badge>
      <q-btn flat round dense icon="refresh" :loading="loading" aria-label="Actualizar entrega" @click="load"/>
    </q-card-section>
    <q-separator/>
    <q-card-section>
      <q-banner v-if="error" rounded class="bg-red-10 text-white q-mb-md">{{ error }}</q-banner>
      <template v-if="!error">
        <q-banner v-if="published" rounded class="bg-green-10 text-white q-mb-md">
          <q-icon name="verified"/> El cliente ya puede ver este paquete en «Mi proyecto».
          <div v-if="delivery.publicado_at" class="text-caption q-mt-xs">Publicado: {{ new Date(delivery.publicado_at).toLocaleDateString('es-BO') }}</div>
        </q-banner>
        <q-banner v-else-if="!paid" rounded class="bg-blue-grey-10 text-white q-mb-md">
          La publicación está bloqueada hasta confirmar el pago completo del proyecto.
          <q-btn flat dense no-caps color="orange" label="Ver cobros" :to="paymentLink"/>
        </q-banner>
        <div class="row q-col-gutter-md">
          <div class="col-12">
            <q-input v-model="form.titulo" outlined label="Nombre de la entrega" maxlength="180" :readonly="published"/>
          </div>
          <div class="col-12">
            <q-input v-model="form.instrucciones" outlined autogrow type="textarea" label="Instrucciones para el cliente" maxlength="5000" :readonly="published"
              hint="Explica cómo instalar, ingresar o usar el sistema. No incluyas contraseñas, claves ni información privada."/>
          </div>
        </div>
        <div class="delivery-file-title">
          <div>
            <div class="text-subtitle1 text-weight-bold">Archivos de entrega</div>
            <div class="text-caption text-grey-5">Solo se compartirán los archivos que selecciones y publiques.</div>
          </div>
          <q-btn v-if="!published" outline no-caps icon="upload_file" label="Subir archivos" :to="projectFilesLink"/>
        </div>
        <q-list v-if="available.length" separator bordered class="delivery-files rounded-borders">
          <q-item v-for="file in available" :key="file.id">
            <q-item-section avatar>
              <q-checkbox v-model="form.archivo_ids" :val="Number(file.id)" :disable="published"/>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ file.nombre_original }}</q-item-label>
              <q-item-label caption>{{ file.descripcion || 'Archivo adjunto al trabajo' }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="description"/>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-else class="delivery-empty">
          <q-icon name="cloud_upload" size="28px"/>
          <span>No hay entregables cargados. Sube un manual, un documento o un archivo ZIP desde este trabajo.</span>
        </div>
        <div v-if="deliveredApp" class="text-caption text-grey-5 q-mt-md">
          <q-icon name="devices"/> La aplicación ya está habilitada para el cliente en «Mis sistemas». Su acceso se administra por separado.
        </div>
        <div class="delivery-actions q-mt-lg">
          <span class="text-caption text-grey-5 col">Guardar es privado. Publicar es una decisión independiente y requiere el pago verificado cuando existe precio acordado.</span>
          <q-btn v-if="published" outline color="warning" no-caps icon="visibility_off" label="Retirar paquete" :loading="withdrawing" @click="withdraw"/>
          <template v-else>
            <q-btn outline color="primary" no-caps icon="save" label="Guardar borrador" :loading="saving" :disable="!form.titulo.trim()" @click="save"/>
            <q-btn color="positive" unelevated no-caps icon="publish" label="Publicar al cliente"
              :loading="publishing" :disable="!paid || !ready || !delivery?.id || dirty" @click="publish"/>
          </template>
        </div>
        <div v-if="dirty && !published" class="text-caption text-orange q-mt-sm">Guarda los últimos cambios antes de publicar.</div>
      </template>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.delivery-panel{overflow:hidden}
.delivery-file-title{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:19px 0 13px}
.delivery-files{border-color:rgba(102,149,187,.24)}
.delivery-files :deep(.q-item){min-height:66px}
.delivery-empty{padding:18px;border:1px dashed rgba(102,149,187,.28);border-radius:12px;display:flex;gap:10px;color:#aac0d4;align-items:center;font-size:12px}
.delivery-actions{display:flex;align-items:center;gap:10px;justify-content:flex-end;flex-wrap:wrap}
.delivery-actions .col{min-width:215px}
@media(max-width:600px){.delivery-actions .q-btn{flex:1 1 160px}.delivery-file-title .q-btn{width:100%}}
</style>
