<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { downloadFile } from '../utils/download'
import PageHeader from '../components/PageHeader.vue'
import { formatDateTime } from '../utils/date'

const $q = useQuasar()
const rows = ref([])
const loading = ref(false)
const dialog = ref(false)
const type = ref('empresa')
const entityId = ref(null)
const category = ref('general')
const description = ref('')
const selectedFiles = ref([])
const fileInput = ref(null)
const uploading = ref(false)
const uploadedCount = ref(0)
const previewDialog = ref(false)
const previewUrl = ref('')
const previewName = ref('')
const previewRow = ref(null)
const catalogs = ref({ cliente: [], empresa: [], solicitud: [], proyecto: [], aplicacion: [] })

const typeOptions = [
  { label: 'Cliente', value: 'cliente' },
  { label: 'Empresa', value: 'empresa' },
  { label: 'Solicitud', value: 'solicitud' },
  { label: 'Proyecto', value: 'proyecto' },
  { label: 'Aplicación', value: 'aplicacion' },
]

const entityOptions = computed(() => catalogs.value[type.value].map(x => ({ label: x.label, value: x.id })))
const selectedCount = computed(() => selectedFiles.value.length)
const selectedImages = computed(() => selectedFiles.value.filter(item => item.file.type.startsWith('image/')).length)
const totalSelectedSize = computed(() => selectedFiles.value.reduce((total, item) => total + item.file.size, 0))
const columns = [
  { name: 'nombre_original', label: 'Archivo', field: 'nombre_original', align: 'left' },
  { name: 'categoria', label: 'Categoría', field: 'categoria', align: 'left' },
  { name: 'descripcion', label: 'Descripción', field: 'descripcion', align: 'left' },
  { name: 'usuario', label: 'Subido por', field: r => r.usuario ? `${r.usuario.nombre} ${r.usuario.apellido || ''}` : '', align: 'left' },
  { name: 'created_at', label: 'Fecha', field: r => formatDateTime(r.created_at), align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

function humanSize(bytes) {
  if (!Number(bytes)) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageName(name = '') {
  return /\.(jpe?g|png|webp|gif)$/i.test(String(name))
}

function revokeSelectedPreviews() {
  selectedFiles.value.forEach(item => {
    if (item.preview) URL.revokeObjectURL(item.preview)
  })
}

function resetSelection() {
  revokeSelectedPreviews()
  selectedFiles.value = []
  uploadedCount.value = 0
  if (fileInput.value) fileInput.value.value = ''
}

async function load() {
  loading.value = true
  try {
    const [a, c, e, s, p, apps] = await Promise.all([
      api.get('/archivos', { params: { per_page: 100 } }),
      api.get('/clientes', { params: { per_page: 100 } }),
      api.get('/empresas', { params: { per_page: 100 } }),
      api.get('/solicitudes', { params: { per_page: 100 } }),
      api.get('/proyectos', { params: { per_page: 100 } }),
      api.get('/aplicaciones', { params: { per_page: 100 } }),
    ])
    rows.value = a.data.data
    catalogs.value = {
      cliente: c.data.data.map(x => ({ id: x.id, label: x.nombre })),
      empresa: e.data.data.map(x => ({ id: x.id, label: x.nombre_comercial })),
      solicitud: s.data.data.map(x => ({ id: x.id, label: `${x.codigo} · ${x.titulo}` })),
      proyecto: p.data.data.map(x => ({ id: x.id, label: `${x.codigo} · ${x.nombre}` })),
      aplicacion: apps.data.data.map(x => ({ id: x.id, label: x.nombre })),
    }
  } finally {
    loading.value = false
  }
}

function open() {
  type.value = 'empresa'
  entityId.value = null
  category.value = 'general'
  description.value = ''
  resetSelection()
  dialog.value = true
}

function pickFiles() {
  fileInput.value?.click()
}

function onFilesSelected(event) {
  const incoming = Array.from(event.target.files || [])
  if (!incoming.length) return

  const known = new Set(selectedFiles.value.map(item => `${item.file.name}-${item.file.size}-${item.file.lastModified}`))
  incoming.forEach(file => {
    const key = `${file.name}-${file.size}-${file.lastModified}`
    if (known.has(key)) return
    known.add(key)
    selectedFiles.value.push({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    })
  })
  event.target.value = ''
}

function removeSelected(index) {
  const item = selectedFiles.value[index]
  if (item?.preview) URL.revokeObjectURL(item.preview)
  selectedFiles.value.splice(index, 1)
}

async function upload() {
  if (!entityId.value || !selectedFiles.value.length) return
  uploading.value = true
  uploadedCount.value = 0
  const total = selectedFiles.value.length
  let failed = 0

  for (const item of selectedFiles.value) {
    try {
      const fd = new FormData()
      fd.append('tipo', type.value)
      fd.append('id', entityId.value)
      fd.append('categoria', category.value)
      fd.append('descripcion', description.value || '')
      fd.append('archivo', item.file)
      await api.post('/archivos', fd)
      uploadedCount.value += 1
    } catch {
      failed += 1
    }
  }

  uploading.value = false
  if (uploadedCount.value) {
    $q.notify({
      type: failed ? 'warning' : 'positive',
      message: failed
        ? `${uploadedCount.value} de ${total} archivos se subieron correctamente.`
        : `${uploadedCount.value} ${uploadedCount.value === 1 ? 'archivo subido' : 'archivos subidos'} correctamente.`,
    })
    dialog.value = false
    resetSelection()
    await load()
  } else {
    $q.notify({ type: 'negative', message: 'No se pudo subir ningún archivo.' })
  }
}

function remove(row) {
  $q.dialog({ title: 'Eliminar archivo', message: `¿Eliminar ${row.nombre_original}?`, cancel: true }).onOk(async () => {
    await api.delete(`/archivos/${row.id}`)
    load()
  })
}

async function preview(row) {
  try {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    const response = await api.get(`/archivos/${row.id}/descargar`, { responseType: 'blob' })
    previewUrl.value = URL.createObjectURL(response.data)
    previewName.value = row.nombre_original
    previewRow.value = row
    previewDialog.value = true
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo abrir la imagen.' })
  }
}

function closePreview() {
  previewDialog.value = false
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  previewName.value = ''
  previewRow.value = null
}

onMounted(load)
onBeforeUnmount(() => {
  revokeSelectedPreviews()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <q-page class="viti-page files-page">
    <PageHeader eyebrow="Soporte documental" title="Archivos e imágenes" subtitle="Adjunta logotipos, capturas, documentos, referencias, actas y evidencias a cualquier proceso.">
      <q-btn color="primary" unelevated icon="upload_file" label="Subir archivos" no-caps @click="open" />
    </PageHeader>

    <q-table flat class="viti-table files-table" :rows="rows" :columns="columns" row-key="id" :loading="loading" :pagination="{ rowsPerPage: 20, sortBy: 'id', descending: true }">
      <template #body-cell-nombre_original="p">
        <q-td :props="p">
          <button v-if="isImageName(p.row.nombre_original)" type="button" class="file-name image-file" @click="preview(p.row)">
            <span class="file-type-icon"><q-icon name="image" /></span>
            <span><b>{{ p.row.nombre_original }}</b><small>Ver dentro de VITI</small></span>
          </button>
          <div v-else class="file-name">
            <span class="file-type-icon"><q-icon name="description" /></span>
            <span><b>{{ p.row.nombre_original }}</b><small>Documento</small></span>
          </div>
        </q-td>
      </template>

      <template #body-cell-actions="p">
        <q-td :props="p">
          <q-btn v-if="isImageName(p.row.nombre_original)" flat round dense icon="visibility" color="primary" @click="preview(p.row)"><q-tooltip>Ver imagen</q-tooltip></q-btn>
          <q-btn flat round dense icon="download" color="orange" @click="downloadFile(`/archivos/${p.row.id}/descargar`, p.row.nombre_original)"><q-tooltip>Descargar</q-tooltip></q-btn>
          <q-btn flat round dense icon="delete_outline" color="negative" @click="remove(p.row)"><q-tooltip>Eliminar</q-tooltip></q-btn>
        </q-td>
      </template>

      <template #no-data>
        <div class="empty-state full-width">
          <q-icon name="folder_open" size="52px" />
          <div class="text-h6 q-mt-sm">No hay archivos</div>
          <div>Sube una o varias imágenes, PDFs o documentos relacionados con tus clientes y proyectos.</div>
        </div>
      </template>
    </q-table>

    <q-dialog v-model="dialog" persistent>
      <q-card class="upload-card">
        <q-card-section class="upload-head">
          <div>
            <div class="section-label">Nuevo material</div>
            <div class="text-h5 text-weight-bold">Adjuntar archivos o imágenes</div>
            <p>Selecciona uno o varios archivos y VITI los subirá al mismo registro.</p>
          </div>
          <q-btn flat round icon="close" :disable="uploading" v-close-popup />
        </q-card-section>

        <q-card-section class="upload-body">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-5"><q-select v-model="type" outlined emit-value map-options :options="typeOptions" label="Relacionado con *" @update:model-value="entityId = null" /></div>
            <div class="col-12 col-sm-7"><q-select v-model="entityId" outlined emit-value map-options :options="entityOptions" label="Registro *" /></div>
            <div class="col-12 col-sm-5"><q-select v-model="category" outlined :options="['general','logo','referencia','requerimiento','diseño','captura','contrato','entrega','respaldo']" label="Categoría" /></div>
            <div class="col-12 col-sm-7"><q-input v-model="description" outlined label="Descripción común (opcional)" /></div>
          </div>

          <input ref="fileInput" class="native-file-input" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" @change="onFilesSelected" />

          <button type="button" class="upload-dropzone" :disabled="uploading" @click="pickFiles">
            <span class="dropzone-icon"><q-icon name="add_photo_alternate" /></span>
            <span class="dropzone-copy">
              <b>{{ selectedCount ? 'Agregar más archivos' : 'Seleccionar archivos' }}</b>
              <span>Una o muchas imágenes, PDF, Word, Excel, TXT o ZIP.</span>
            </span>
            <q-icon name="chevron_right" class="dropzone-arrow" />
          </button>

          <div v-if="selectedCount" class="selection-summary">
            <div><b>{{ selectedCount }}</b><span>{{ selectedCount === 1 ? 'archivo seleccionado' : 'archivos seleccionados' }}</span></div>
            <div><b>{{ selectedImages }}</b><span>imágenes</span></div>
            <div><b>{{ humanSize(totalSelectedSize) }}</b><span>peso total</span></div>
            <q-btn flat dense no-caps color="negative" icon="delete_sweep" label="Quitar todos" :disable="uploading" @click="resetSelection" />
          </div>

          <div v-if="selectedCount" class="selected-files-grid">
            <article v-for="(item, index) in selectedFiles" :key="`${item.file.name}-${item.file.size}-${index}`" class="selected-file-card">
              <div class="selected-preview">
                <img v-if="item.preview" :src="item.preview" :alt="item.file.name" />
                <q-icon v-else name="description" />
              </div>
              <div class="selected-copy"><b>{{ item.file.name }}</b><small>{{ humanSize(item.file.size) }}</small></div>
              <q-btn flat round dense icon="close" size="sm" :disable="uploading" @click="removeSelected(index)" />
            </article>
          </div>

          <div v-if="uploading" class="upload-progress">
            <div><span>Subiendo archivos</span><b>{{ uploadedCount }} / {{ selectedCount }}</b></div>
            <q-linear-progress indeterminate rounded color="primary" track-color="blue-grey-10" size="7px" />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="upload-actions">
          <q-btn flat label="Cancelar" no-caps :disable="uploading" v-close-popup />
          <q-btn color="primary" unelevated :label="selectedCount > 1 ? `Subir ${selectedCount} archivos` : 'Subir archivo'" no-caps :loading="uploading" :disable="!entityId || !selectedCount" @click="upload" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="previewDialog" maximized transition-show="fade" transition-hide="fade" @hide="closePreview">
      <q-card class="image-preview-dialog">
        <header class="preview-toolbar">
          <div><small>VISTA PREVIA</small><b>{{ previewName }}</b></div>
          <div class="preview-actions">
            <q-btn outline color="primary" no-caps icon="download" label="Descargar" @click="previewRow && downloadFile(`/archivos/${previewRow.id}/descargar`, previewName)" />
            <q-btn flat round icon="close" @click="closePreview" />
          </div>
        </header>
        <div class="preview-stage"><img v-if="previewUrl" :src="previewUrl" :alt="previewName" /></div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.files-page{max-width:1580px}.files-table{overflow:hidden}.file-name{display:flex;align-items:center;gap:10px;min-width:0;color:inherit}.file-name.image-file{border:0;background:transparent;padding:0;cursor:pointer;text-align:left}.file-type-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:rgba(55,126,214,.12);color:#78b4ff;font-size:18px}.file-name b,.file-name small{display:block}.file-name b{max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.file-name small{font-size:9px;color:#7590a7;margin-top:2px}.image-file:hover b{color:#8fc1ff}.upload-card{width:760px;max-width:94vw;background:#0b1e33;color:#edf4fb;border:1px solid #294761;border-radius:20px;overflow:hidden}.upload-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:22px 24px 18px;border-bottom:1px solid rgba(100,133,164,.16)}.upload-head p{margin:6px 0 0;color:#8fa7bb;font-size:11px}.upload-body{padding:22px 24px}.upload-card :deep(.q-field--outlined .q-field__control){background:#07192a!important;border-radius:12px}.native-file-input{display:none}.upload-dropzone{width:100%;display:flex;align-items:center;gap:14px;margin-top:18px;padding:17px;border:1px dashed rgba(97,145,195,.52);border-radius:16px;background:linear-gradient(135deg,rgba(18,58,96,.55),rgba(10,35,61,.72));color:#e9f2fa;text-align:left;cursor:pointer;transition:.18s ease}.upload-dropzone:hover{border-color:#f28b30;background:linear-gradient(135deg,rgba(23,70,116,.7),rgba(12,42,72,.86))}.dropzone-icon{display:grid;place-items:center;width:50px;height:50px;flex:0 0 50px;border-radius:14px;background:rgba(31,104,190,.18);border:1px solid rgba(92,151,216,.23);color:#82b9ff;font-size:25px}.dropzone-copy{display:grid;gap:3px;flex:1}.dropzone-copy b{font-size:14px}.dropzone-copy span{font-size:10px;color:#8fa7ba}.dropzone-arrow{color:#7190aa;font-size:23px}.selection-summary{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;padding:10px 12px;border:1px solid rgba(88,123,154,.2);border-radius:13px;background:#081a2c}.selection-summary>div{display:flex;align-items:baseline;gap:5px;padding-right:10px;border-right:1px solid rgba(100,133,164,.16)}.selection-summary b{color:#fff}.selection-summary span{font-size:9px;color:#8199ad}.selection-summary .q-btn{margin-left:auto}.selected-files-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.selected-file-card{display:grid;grid-template-columns:46px minmax(0,1fr) 30px;gap:10px;align-items:center;padding:9px;border:1px solid rgba(94,130,163,.18);border-radius:13px;background:#081a2c}.selected-preview{width:46px;height:46px;border-radius:10px;display:grid;place-items:center;overflow:hidden;background:#102a44;color:#75adf3;font-size:23px}.selected-preview img{width:100%;height:100%;object-fit:cover}.selected-copy{min-width:0}.selected-copy b,.selected-copy small{display:block}.selected-copy b{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.selected-copy small{font-size:9px;color:#748da2;margin-top:3px}.upload-progress{margin-top:15px;padding:12px;border-radius:13px;background:rgba(24,76,132,.12);border:1px solid rgba(70,129,193,.18)}.upload-progress>div{display:flex;justify-content:space-between;color:#9bb0c2;font-size:10px;margin-bottom:8px}.upload-progress b{color:#fff}.upload-actions{padding:15px 22px;border-top:1px solid rgba(100,133,164,.16)}.image-preview-dialog{background:rgba(3,10,18,.98);color:#edf4fb}.preview-toolbar{height:72px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 22px;border-bottom:1px solid rgba(100,133,164,.18);background:#071522}.preview-toolbar small,.preview-toolbar b{display:block}.preview-toolbar small{font-size:8px;letter-spacing:.16em;color:#f28b30}.preview-toolbar b{font-size:12px;margin-top:3px;max-width:70vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.preview-actions{display:flex;align-items:center;gap:6px}.preview-stage{height:calc(100vh - 72px);display:grid;place-items:center;padding:24px;overflow:auto;background:radial-gradient(circle at center,rgba(34,91,154,.12),transparent 45rem)}.preview-stage img{max-width:min(1100px,95vw);max-height:calc(100vh - 120px);object-fit:contain;border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.4)}
@media(max-width:700px){.selected-files-grid{grid-template-columns:1fr}.selection-summary>div{border-right:0}.selection-summary .q-btn{width:100%;margin-left:0}.upload-body{padding:18px}.upload-head{padding:19px}.preview-toolbar .q-btn[outline]{display:none}}
</style>
