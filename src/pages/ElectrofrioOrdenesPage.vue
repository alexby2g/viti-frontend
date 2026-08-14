<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const rows = ref([])
const clientes = ref([])
const equipos = ref([])
const tecnicos = ref([])
const serviceTypesFromApi = ref([])
const summary = ref({ total:0, cita:0, diagnostico:0, propuesta:0, servicio:0, cerrada:0 })
const dialog = ref(false)
const detailDialog = ref(false)
const finishDialog = ref(false)
const evidenceDialog = ref(false)
const editingId = ref(null)
const selected = ref(null)
const rejectionReason = ref('')
const evidenceFile = ref(null)

const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const base = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')

const filters = reactive({
  buscar:'',
  etapa:null,
  cliente_id:null,
  tecnico_id:null,
  tipo_servicio:null,
  prioridad:null,
  desde:'',
  hasta:'',
})

const form = reactive(emptyOrder())
const finishForm = reactive({ trabajo_realizado:'', recomendaciones:'', garantia_dias:0, condiciones_garantia:'' })
const evidenceForm = reactive({ categoria:'antes', descripcion:'' })

const stageOptions = [
  { label:'Todas las etapas', value:null },
  { label:'Cita', value:'cita' },
  { label:'Diagnóstico', value:'diagnostico' },
  { label:'Propuesta / esperando aprobación', value:'propuesta' },
  { label:'Servicio', value:'servicio' },
  { label:'Cerrada', value:'cerrada' },
]
const priorityOptions = [
  { label:'Todas las prioridades', value:null },
  { label:'Baja', value:'baja' },
  { label:'Normal', value:'normal' },
  { label:'Alta', value:'alta' },
  { label:'Urgente', value:'urgente' },
]
const evidenceCategories = [
  { label:'Antes del trabajo', value:'antes', icon:'photo_camera' },
  { label:'Durante el trabajo', value:'durante', icon:'engineering' },
  { label:'Después del trabajo', value:'despues', icon:'done_all' },
  { label:'Documento', value:'documento', icon:'description' },
  { label:'Comprobante', value:'comprobante', icon:'receipt_long' },
]
const presetTypes = [
  'Diagnóstico',
  'Mantenimiento preventivo',
  'Mantenimiento correctivo',
  'Reparación',
  'Instalación',
  'Desinstalación',
  'Limpieza profunda',
  'Carga de refrigerante',
]
const serviceTypeOptions = computed(() => [...new Set([...presetTypes, ...serviceTypesFromApi.value])].sort())
const activeClients = computed(() => clientes.value.filter(item => item.activo))
const activeTechnicians = computed(() => tecnicos.value.filter(item => item.activo))
const equipmentForForm = computed(() => equipos.value.filter(item => item.activo && Number(item.cliente_id) === Number(form.cliente_id)))

const columns = [
  { name:'codigo', label:'Orden', field:'codigo', align:'left', sortable:true },
  { name:'visita', label:'Visita', field:'fecha_cita', align:'left', sortable:true },
  { name:'cliente', label:'Cliente / equipo', field:'cliente_nombre', align:'left', sortable:true },
  { name:'servicio', label:'Servicio', field:'tipo_servicio', align:'left', sortable:true },
  { name:'tecnico', label:'Técnico', field:'tecnico_nombre', align:'left', sortable:true },
  { name:'etapa', label:'Etapa', field:'etapa', align:'center', sortable:true },
  { name:'saldo', label:'Total / saldo', field:'saldo', align:'right', sortable:true },
  { name:'acciones', label:'', field:'id', align:'right' },
]

const progressSteps = computed(() => {
  const order = selected.value
  if (!order) return []
  const rejected = order.decision_cliente === 'rechazado'
  const stageIndex = { cita:0, diagnostico:1, propuesta:2, servicio:3, cerrada:4 }[order.etapa] ?? 0
  return [
    { key:'cita', label:'Cita', icon:'event', done:stageIndex >= 0 },
    { key:'diagnostico', label:'Diagnóstico', icon:'troubleshoot', done:stageIndex >= 1 || Boolean(order.diagnostico) },
    { key:'propuesta', label:'Propuesta', icon:'request_quote', done:stageIndex >= 2 || Boolean(order.propuesta) },
    { key:'servicio', label:rejected ? 'No aceptado' : 'Servicio', icon:rejected ? 'block' : 'build', done:rejected || stageIndex >= 3 },
    { key:'cerrada', label:'Cierre', icon:'task_alt', done:stageIndex >= 4 },
  ]
})

function emptyOrder(){
  return {
    cliente_id:null,
    equipo_id:null,
    tecnico_id:null,
    tipo_servicio:'Mantenimiento preventivo',
    fecha_cita:new Date().toISOString().slice(0,10),
    hora_cita:'09:00',
    direccion_servicio:'',
    referencia_ubicacion:'',
    problema_reportado:'',
    prioridad:'normal',
    diagnostico:'',
    propuesta:'',
    trabajo_realizado:'',
    recomendaciones:'',
    costo_mano_obra:0,
    descuento:0,
  }
}

function cleanPayload(source){
  return Object.fromEntries(Object.entries(source).map(([key,value]) => [key, value === '' ? null : value]))
}
function money(value){ return `${Number(value || 0).toFixed(2)} Bs` }
function date(value){ return value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('es-BO') : '—' }
function time(value){ return value ? String(value).slice(0,5) : '' }
function pretty(value){ return String(value || '').replaceAll('_',' ').replace(/\b\w/g, char => char.toUpperCase()) }
function equipmentLabel(row){ return [row.equipo_tipo || row.tipo, row.equipo_marca || row.marca, row.equipo_modelo || row.modelo].filter(Boolean).join(' · ') || 'Sin equipo' }
function stageColor(stage){ return ({ cita:'blue', diagnostico:'purple', propuesta:'orange', servicio:'teal', cerrada:'grey-7' }[stage] || 'grey') }
function priorityColor(priority){ return ({ baja:'grey', normal:'blue', alta:'orange', urgente:'negative' }[priority] || 'grey') }
function evidenceCategory(item){ return evidenceCategories.find(option => option.value === item?.categoria) || { label:pretty(item?.categoria), icon:'attach_file' } }
function evidenceIcon(item){ return item?.mime === 'application/pdf' ? 'picture_as_pdf' : evidenceCategory(item).icon }
function formatBytes(value){
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
function saveBlob(blob, filename){
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

async function loadLookups(){
  try{
    const [clientResponse, equipmentResponse, technicianResponse] = await Promise.all([
      api.get(`${base.value}/clientes`),
      api.get(`${base.value}/equipos`),
      api.get(`${base.value}/tecnicos`),
    ])
    clientes.value = clientResponse.data.data || []
    equipos.value = equipmentResponse.data.data || []
    tecnicos.value = technicianResponse.data.data || []
  }catch(error){
    notifyError(error, 'No se pudieron cargar los datos auxiliares de Electrofrío.')
  }
}

async function loadOrders(){
  loading.value = true
  try{
    const params = Object.fromEntries(Object.entries(filters).filter(([,value]) => value !== null && value !== ''))
    const response = await api.get(`${base.value}/ordenes-operativas`, { params })
    rows.value = response.data.data || []
    summary.value = response.data.meta?.resumen || summary.value
    serviceTypesFromApi.value = response.data.meta?.tipos_servicio || []
    if (selected.value) {
      const refreshed = rows.value.find(item => Number(item.id) === Number(selected.value.id))
      if (refreshed) selected.value = refreshed
    }
  }catch(error){
    notifyError(error, 'No se pudieron cargar las órdenes de Electrofrío.')
  }finally{
    loading.value = false
  }
}

async function reload(){
  await Promise.all([loadLookups(), loadOrders()])
}

function clearFilters(){
  Object.assign(filters, { buscar:'', etapa:null, cliente_id:null, tecnico_id:null, tipo_servicio:null, prioridad:null, desde:'', hasta:'' })
  loadOrders()
}

function filterStage(stage){
  filters.etapa = filters.etapa === stage ? null : stage
  loadOrders()
}

async function openForm(row=null){
  if (!clientes.value.length || !equipos.value.length || !tecnicos.value.length) await loadLookups()
  editingId.value = row?.id || null
  Object.assign(form, emptyOrder())
  if (row) {
    Object.assign(form, {
      cliente_id:row.cliente_id,
      equipo_id:row.equipo_id,
      tecnico_id:row.tecnico_id,
      tipo_servicio:row.tipo_servicio || 'Diagnóstico',
      fecha_cita:String(row.fecha_cita || '').slice(0,10),
      hora_cita:time(row.hora_cita),
      direccion_servicio:row.direccion_servicio || '',
      referencia_ubicacion:row.referencia_ubicacion || '',
      problema_reportado:row.problema_reportado || '',
      prioridad:row.prioridad || 'normal',
      diagnostico:row.diagnostico || '',
      propuesta:row.propuesta || '',
      trabajo_realizado:row.trabajo_realizado || '',
      recomendaciones:row.recomendaciones || '',
      costo_mano_obra:Number(row.costo_mano_obra || 0),
      descuento:Number(row.descuento || 0),
    })
  }
  dialog.value = true
}

async function saveOrder(){
  if (!form.cliente_id || !form.fecha_cita || !form.direccion_servicio.trim() || !form.problema_reportado.trim()) {
    $q.notify({ type:'warning', message:'Completa cliente, fecha, dirección y problema reportado.' })
    return
  }
  saving.value = true
  try{
    const payload = cleanPayload({ ...form })
    const response = editingId.value
      ? await api.put(`${base.value}/ordenes-operativas/${editingId.value}`, payload)
      : await api.post(`${base.value}/ordenes-operativas`, payload)
    dialog.value = false
    selected.value = response.data.data
    detailDialog.value = true
    $q.notify({ type:'positive', message:editingId.value ? 'Orden actualizada.' : 'Orden creada.' })
    await loadOrders()
  }catch(error){
    notifyError(error, 'No se pudo guardar la orden.')
  }finally{
    saving.value = false
  }
}

async function openDetail(row){
  selected.value = row
  detailDialog.value = true
  try{
    const response = await api.get(`${base.value}/ordenes-operativas/${row.id}`)
    selected.value = response.data.data
  }catch(error){
    notifyError(error, 'No se pudo actualizar el detalle de la orden.')
  }
}

function acceptProposal(){
  if (!selected.value) return
  $q.dialog({
    title:'Autorizar servicio',
    message:'Confirma que el cliente aceptó la propuesta y autoriza continuar con el trabajo.',
    cancel:true,
    persistent:true,
  }).onOk(async () => {
    try{
      await api.post(`${base.value}/ordenes/${selected.value.id}/decision`, { decision:'aceptado' })
      $q.notify({ type:'positive', message:'Propuesta aceptada. La orden pasó a Servicio.' })
      await refreshSelected()
    }catch(error){ notifyError(error, 'No se pudo registrar la aceptación.') }
  })
}

function rejectProposal(){
  if (!selected.value) return
  rejectionReason.value = ''
  $q.dialog({
    title:'Cerrar sin servicio',
    message:'Indica por qué el cliente no aceptó la propuesta.',
    prompt:{ model:'', type:'textarea', isValid:value => String(value || '').trim().length >= 3 },
    cancel:true,
    persistent:true,
  }).onOk(async reason => {
    try{
      await api.post(`${base.value}/ordenes/${selected.value.id}/decision`, { decision:'rechazado', motivo_rechazo:reason })
      $q.notify({ type:'info', message:'Orden cerrada sin realizar el servicio.' })
      await refreshSelected()
    }catch(error){ notifyError(error, 'No se pudo registrar el rechazo.') }
  })
}

function openFinish(){
  if (!selected.value) return
  Object.assign(finishForm, {
    trabajo_realizado:selected.value.trabajo_realizado || '',
    recomendaciones:selected.value.recomendaciones || '',
    garantia_dias:Number(selected.value.garantia_dias || 0),
    condiciones_garantia:selected.value.condiciones_garantia || '',
  })
  finishDialog.value = true
}

async function finishOrder(){
  if (!finishForm.trabajo_realizado.trim()) {
    $q.notify({ type:'warning', message:'Describe el trabajo realizado antes de cerrar la orden.' })
    return
  }
  saving.value = true
  try{
    await api.post(`${base.value}/ordenes/${selected.value.id}/finalizar`, cleanPayload({ ...finishForm }))
    finishDialog.value = false
    $q.notify({ type:'positive', message:'Servicio finalizado y enviado al historial.' })
    await refreshSelected()
  }catch(error){
    notifyError(error, 'No se pudo finalizar la orden.')
  }finally{
    saving.value = false
  }
}

function openEvidenceUpload(){
  if (!selected.value || selected.value.etapa === 'cerrada') return
  evidenceFile.value = null
  Object.assign(evidenceForm, { categoria:selected.value.etapa === 'servicio' ? 'durante' : 'antes', descripcion:'' })
  evidenceDialog.value = true
}

async function uploadEvidence(){
  if (!selected.value || !evidenceFile.value) {
    $q.notify({ type:'warning', message:'Selecciona una fotografía o PDF.' })
    return
  }
  if (Number(evidenceFile.value.size || 0) > 12 * 1024 * 1024) {
    $q.notify({ type:'warning', message:'El archivo no puede superar 12 MB.' })
    return
  }
  uploading.value = true
  try{
    const body = new FormData()
    body.append('archivo', evidenceFile.value)
    body.append('categoria', evidenceForm.categoria)
    if (evidenceForm.descripcion.trim()) body.append('descripcion', evidenceForm.descripcion.trim())
    await api.post(`${base.value}/ordenes/${selected.value.id}/evidencias`, body)
    evidenceDialog.value = false
    $q.notify({ type:'positive', message:'Evidencia guardada de forma privada.' })
    await refreshSelected()
  }catch(error){
    notifyError(error, 'No se pudo subir la evidencia.')
  }finally{
    uploading.value = false
  }
}

async function downloadEvidence(item){
  try{
    const response = await api.get(`${base.value}/evidencias/${item.id}/descargar`, { responseType:'blob' })
    saveBlob(response.data, item.nombre_original || `evidencia-${item.id}`)
  }catch(error){
    notifyError(error, 'No se pudo descargar la evidencia.')
  }
}

function deleteEvidence(item){
  if (!selected.value || selected.value.etapa === 'cerrada') return
  $q.dialog({
    title:'Eliminar evidencia',
    message:`¿Eliminar ${item.nombre_original}? Esta acción solo está permitida mientras la orden siga abierta.`,
    cancel:true,
    persistent:true,
  }).onOk(async () => {
    try{
      await api.delete(`${base.value}/evidencias/${item.id}`)
      $q.notify({ type:'positive', message:'Evidencia eliminada.' })
      await refreshSelected()
    }catch(error){
      notifyError(error, 'No se pudo eliminar la evidencia.')
    }
  })
}

async function downloadPdf(){
  if (!selected.value) return
  try{
    const response = await api.get(`${base.value}/ordenes/${selected.value.id}/pdf`, { responseType:'blob' })
    saveBlob(response.data, `${selected.value.codigo}-electrofrio.pdf`)
  }catch(error){
    notifyError(error, 'No se pudo generar el PDF de la orden.')
  }
}

async function refreshSelected(){
  const id = selected.value?.id
  await loadOrders()
  if (id) {
    try{
      const response = await api.get(`${base.value}/ordenes-operativas/${id}`)
      selected.value = response.data.data
    }catch{
      selected.value = rows.value.find(item => Number(item.id) === Number(id)) || selected.value
    }
  }
}

function notifyError(error, fallback){
  const errors = error.response?.data?.errors
  const first = errors ? Object.values(errors).flat()[0] : null
  $q.notify({ type:'negative', message:first || error.response?.data?.message || fallback })
}

onMounted(reload)
</script>

<template>
  <q-page padding class="orders-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-overline text-primary text-weight-bold">Trabajo</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Órdenes de servicio</h1>
        <div class="text-body2 text-grey-7">Cita, diagnóstico, propuesta, decisión del cliente, ejecución y cierre en un solo flujo.</div>
      </div>
      <div class="col-12 col-md-auto row q-gutter-sm">
        <q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="reload"/>
        <q-btn color="primary" icon="add" label="Nueva orden" no-caps @click="openForm()"/>
      </div>
    </div>

    <div class="row q-col-gutter-sm q-mb-lg">
      <div v-for="card in [
        {key:'cita',label:'Citas',icon:'event',value:summary.cita,color:'blue'},
        {key:'diagnostico',label:'Diagnóstico',icon:'troubleshoot',value:summary.diagnostico,color:'purple'},
        {key:'propuesta',label:'Esperando aprobación',icon:'request_quote',value:summary.propuesta,color:'orange'},
        {key:'servicio',label:'En servicio',icon:'build',value:summary.servicio,color:'teal'},
        {key:'cerrada',label:'Cerradas',icon:'task_alt',value:summary.cerrada,color:'grey-7'},
      ]" :key="card.key" class="col-6 col-md">
        <q-card flat bordered class="summary-card cursor-pointer" :class="{'summary-card--active':filters.etapa===card.key}" @click="filterStage(card.key)">
          <q-card-section class="row items-center no-wrap">
            <q-avatar :color="card.color" text-color="white" :icon="card.icon"/>
            <div class="q-ml-md min-width-0"><div class="text-h5 text-weight-bold">{{card.value}}</div><div class="text-caption text-grey-7 ellipsis">{{card.label}}</div></div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="filter-card q-mb-lg">
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4"><q-input v-model="filters.buscar" outlined dense clearable debounce="250" label="Buscar cliente, técnico, equipo, orden..." @keyup.enter="loadOrders"><template #prepend><q-icon name="search"/></template></q-input></div>
          <div class="col-6 col-md-2"><q-select v-model="filters.etapa" outlined dense emit-value map-options :options="stageOptions" label="Etapa"/></div>
          <div class="col-6 col-md-2"><q-select v-model="filters.tipo_servicio" outlined dense clearable :options="serviceTypeOptions" label="Tipo de servicio"/></div>
          <div class="col-6 col-md-2"><q-select v-model="filters.tecnico_id" outlined dense clearable emit-value map-options :options="activeTechnicians.map(item=>({label:item.nombre,value:item.id}))" label="Técnico"/></div>
          <div class="col-6 col-md-2"><q-select v-model="filters.prioridad" outlined dense emit-value map-options :options="priorityOptions" label="Prioridad"/></div>
          <div class="col-6 col-md-3"><q-select v-model="filters.cliente_id" outlined dense clearable emit-value map-options :options="activeClients.map(item=>({label:item.nombre,value:item.id}))" label="Cliente"/></div>
          <div class="col-6 col-md-2"><q-input v-model="filters.desde" type="date" stack-label outlined dense label="Desde"/></div>
          <div class="col-6 col-md-2"><q-input v-model="filters.hasta" type="date" stack-label outlined dense label="Hasta"/></div>
          <div class="col-12 col-md-5 row justify-end items-center q-gutter-sm"><q-btn flat color="grey-7" icon="filter_alt_off" label="Limpiar" no-caps @click="clearFilters"/><q-btn color="primary" icon="filter_alt" label="Aplicar filtros" no-caps @click="loadOrders"/></div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table flat :rows="rows" :columns="columns" row-key="id" :loading="loading" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}" no-data-label="No hay órdenes que coincidan con los filtros.">
        <template #body-cell-codigo="props"><q-td :props="props"><div class="text-weight-bold text-primary">{{props.row.codigo}}</div><q-badge :color="priorityColor(props.row.prioridad)" :label="pretty(props.row.prioridad)" class="q-mt-xs"/></q-td></template>
        <template #body-cell-visita="props"><q-td :props="props"><div>{{date(props.row.fecha_cita)}}</div><div class="text-caption text-grey-7">{{time(props.row.hora_cita)||'Sin hora'}}</div></q-td></template>
        <template #body-cell-cliente="props"><q-td :props="props"><div class="text-weight-bold">{{props.row.cliente_nombre}}</div><div class="text-caption text-grey-7">{{equipmentLabel(props.row)}}</div></q-td></template>
        <template #body-cell-servicio="props"><q-td :props="props"><div>{{props.row.tipo_servicio||'Sin clasificar'}}</div><div class="text-caption text-grey-7 ellipsis" style="max-width:220px">{{props.row.problema_reportado}}</div></q-td></template>
        <template #body-cell-tecnico="props"><q-td :props="props">{{props.row.tecnico_nombre||'Sin asignar'}}</q-td></template>
        <template #body-cell-etapa="props"><q-td :props="props"><q-badge :color="stageColor(props.row.etapa)" :label="props.row.decision_cliente==='rechazado'?'No aceptado':pretty(props.row.etapa)"/></q-td></template>
        <template #body-cell-saldo="props"><q-td :props="props"><div class="text-weight-bold">{{money(props.row.total)}}</div><div class="text-caption" :class="Number(props.row.saldo)>0?'text-orange':'text-positive'">Saldo {{money(props.row.saldo)}}</div></q-td></template>
        <template #body-cell-acciones="props"><q-td :props="props"><q-btn flat round color="primary" icon="visibility" @click="openDetail(props.row)"><q-tooltip>Abrir orden</q-tooltip></q-btn></q-td></template>

        <template #item="props">
          <div class="q-pa-xs col-12 col-sm-6">
            <q-card flat bordered class="mobile-order-card" @click="openDetail(props.row)">
              <q-card-section>
                <div class="row items-start no-wrap"><div class="col"><div class="text-weight-bold text-primary">{{props.row.codigo}}</div><div class="text-subtitle1 text-weight-bold">{{props.row.cliente_nombre}}</div><div class="text-caption text-grey-7">{{equipmentLabel(props.row)}}</div></div><q-badge :color="stageColor(props.row.etapa)" :label="props.row.decision_cliente==='rechazado'?'No aceptado':pretty(props.row.etapa)"/></div>
                <q-separator class="q-my-md"/>
                <div class="row q-col-gutter-sm text-body2"><div class="col-6"><span class="text-grey-7">Servicio:</span><br>{{props.row.tipo_servicio||'Sin clasificar'}}</div><div class="col-6"><span class="text-grey-7">Visita:</span><br>{{date(props.row.fecha_cita)}} {{time(props.row.hora_cita)}}</div><div class="col-6"><span class="text-grey-7">Técnico:</span><br>{{props.row.tecnico_nombre||'Sin asignar'}}</div><div class="col-6"><span class="text-grey-7">Saldo:</span><br>{{money(props.row.saldo)}}</div></div>
              </q-card-section>
            </q-card>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="dialog" persistent>
      <q-card class="order-form-dialog">
        <q-card-section class="row items-start"><div><div class="text-overline text-primary">Orden de servicio</div><div class="text-h5 text-weight-bold">{{editingId?'Editar orden':'Nueva orden'}}</div></div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section>
        <q-separator/>
        <q-card-section class="dialog-scroll q-gutter-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6"><q-select v-model="form.cliente_id" outlined emit-value map-options :options="activeClients.map(item=>({label:item.nombre,value:item.id}))" label="Cliente *" @update:model-value="form.equipo_id=null"/></div>
            <div class="col-12 col-sm-6"><q-select v-model="form.equipo_id" outlined clearable emit-value map-options :options="equipmentForForm.map(item=>({label:[item.tipo,item.marca,item.modelo].filter(Boolean).join(' · '),value:item.id}))" label="Equipo del cliente"/></div>
            <div class="col-12 col-sm-6"><q-select v-model="form.tecnico_id" outlined clearable emit-value map-options :options="activeTechnicians.map(item=>({label:item.nombre,value:item.id}))" label="Técnico asignado"/></div>
            <div class="col-12 col-sm-6"><q-select v-model="form.tipo_servicio" outlined use-input fill-input hide-selected new-value-mode="add-unique" :options="serviceTypeOptions" label="Tipo de servicio"/></div>
            <div class="col-7 col-sm-4"><q-input v-model="form.fecha_cita" type="date" stack-label outlined label="Fecha de visita *"/></div>
            <div class="col-5 col-sm-3"><q-input v-model="form.hora_cita" type="time" stack-label outlined label="Hora"/></div>
            <div class="col-12 col-sm-5"><q-select v-model="form.prioridad" outlined :options="['baja','normal','alta','urgente']" label="Prioridad"/></div>
          </div>
          <q-input v-model="form.direccion_servicio" outlined label="Dirección de la visita *"/>
          <q-input v-model="form.referencia_ubicacion" outlined label="Referencia de ubicación"/>
          <q-input v-model="form.problema_reportado" outlined type="textarea" autogrow label="Problema reportado *"/>
          <template v-if="editingId">
            <q-separator/>
            <div><div class="text-subtitle1 text-weight-bold">Diagnóstico</div><div class="text-caption text-grey-7">Al guardar el diagnóstico, la orden avanza automáticamente desde Cita.</div></div>
            <q-input v-model="form.diagnostico" outlined type="textarea" autogrow label="Diagnóstico técnico"/>
            <div><div class="text-subtitle1 text-weight-bold">Propuesta</div><div class="text-caption text-grey-7">La propuesta debe quedar registrada antes de que el cliente pueda aceptar el servicio.</div></div>
            <q-input v-model="form.propuesta" outlined type="textarea" autogrow label="Propuesta para el cliente"/>
            <div class="row q-col-gutter-md"><div class="col-6"><q-input v-model.number="form.costo_mano_obra" type="number" min="0" step="0.5" outlined label="Mano de obra (Bs)"/></div><div class="col-6"><q-input v-model.number="form.descuento" type="number" min="0" step="0.5" outlined label="Descuento (Bs)"/></div></div>
          </template>
        </q-card-section>
        <q-separator/>
        <q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" icon="save" :label="editingId?'Actualizar orden':'Crear orden'" no-caps :loading="saving" @click="saveOrder"/></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="detailDialog">
      <q-card v-if="selected" class="order-detail-dialog">
        <q-card-section class="row items-start no-wrap">
          <div class="col"><div class="text-overline text-primary">Orden de servicio</div><div class="text-h5 text-weight-bold">{{selected.codigo}}</div><div class="text-caption text-grey-7">{{selected.cliente_nombre}} · {{equipmentLabel(selected)}}</div></div>
          <q-btn flat round icon="picture_as_pdf" color="negative" @click="downloadPdf"><q-tooltip>Descargar PDF</q-tooltip></q-btn>
          <q-btn flat round icon="close" v-close-popup/>
        </q-card-section>
        <q-separator/>
        <q-card-section>
          <div class="progress-line">
            <div v-for="step in progressSteps" :key="step.key" class="progress-step" :class="{'progress-step--done':step.done}"><q-avatar size="34px" :color="step.done?'primary':'grey-4'" :text-color="step.done?'white':'grey-7'" :icon="step.icon"/><div class="text-caption text-weight-medium">{{step.label}}</div></div>
          </div>
        </q-card-section>
        <q-separator/>
        <q-card-section class="detail-grid">
          <div><span>Tipo</span><strong>{{selected.tipo_servicio||'Sin clasificar'}}</strong></div>
          <div><span>Visita</span><strong>{{date(selected.fecha_cita)}} {{time(selected.hora_cita)}}</strong></div>
          <div><span>Técnico</span><strong>{{selected.tecnico_nombre||'Sin asignar'}}</strong></div>
          <div><span>Prioridad</span><q-badge :color="priorityColor(selected.prioridad)" :label="pretty(selected.prioridad)"/></div>
          <div class="span-2"><span>Dirección</span><strong>{{selected.direccion_servicio}}</strong></div>
        </q-card-section>
        <q-separator/>
        <q-card-section class="q-gutter-md">
          <section><div class="detail-label">Problema reportado</div><div>{{selected.problema_reportado}}</div></section>
          <section v-if="selected.diagnostico"><div class="detail-label">Diagnóstico</div><div>{{selected.diagnostico}}</div></section>
          <section v-if="selected.propuesta"><div class="detail-label">Propuesta</div><div>{{selected.propuesta}}</div></section>
          <section v-if="selected.motivo_rechazo"><div class="detail-label">Motivo de no aceptación</div><div>{{selected.motivo_rechazo}}</div></section>
          <section v-if="selected.trabajo_realizado"><div class="detail-label">Trabajo realizado</div><div>{{selected.trabajo_realizado}}</div></section>
          <section v-if="selected.recomendaciones"><div class="detail-label">Recomendaciones</div><div>{{selected.recomendaciones}}</div></section>

          <div v-if="selected.materiales?.length"><div class="detail-label">Materiales utilizados</div><q-list bordered separator class="rounded-borders q-mt-sm"><q-item v-for="material in selected.materiales" :key="material.id"><q-item-section><q-item-label>{{material.material_nombre}}</q-item-label><q-item-label caption>{{material.cantidad}} {{material.material_unidad}} · {{money(material.subtotal)}}</q-item-label></q-item-section></q-item></q-list></div>

          <div class="amount-box"><div><span>Mano de obra</span><strong>{{money(selected.costo_mano_obra)}}</strong></div><div><span>Materiales</span><strong>{{money(selected.costo_materiales)}}</strong></div><div><span>Descuento</span><strong>- {{money(selected.descuento)}}</strong></div><q-separator/><div class="amount-total"><span>Total</span><strong>{{money(selected.total)}}</strong></div><div><span>Pagado</span><strong class="text-positive">{{money(selected.pagado)}}</strong></div><div><span>Saldo</span><strong :class="Number(selected.saldo)>0?'text-orange':'text-positive'">{{money(selected.saldo)}}</strong></div></div>

          <q-banner v-if="selected.garantia_fin" rounded class="warranty-banner"><template #avatar><q-icon name="verified" color="positive"/></template><div class="text-weight-bold">Garantía hasta {{date(selected.garantia_fin)}}</div><div class="text-caption">{{selected.condiciones_garantia||`${selected.garantia_dias} días de garantía`}}</div></q-banner>

          <div class="evidence-panel">
            <div class="row items-center q-col-gutter-sm">
              <div class="col"><div class="detail-label">Evidencias y documentos</div><div class="text-caption text-grey-7">{{selected.evidencias?.length||0}} archivo(s) privado(s) en esta orden.</div></div>
              <div class="col-auto"><q-btn v-if="selected.etapa!=='cerrada'" outline color="primary" icon="add_photo_alternate" label="Agregar evidencia" no-caps @click="openEvidenceUpload"/></div>
            </div>
            <q-list v-if="selected.evidencias?.length" bordered separator class="rounded-borders q-mt-md">
              <q-item v-for="item in selected.evidencias" :key="item.id">
                <q-item-section avatar><q-avatar color="blue-1" text-color="primary" :icon="evidenceIcon(item)"/></q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{item.nombre_original}}</q-item-label>
                  <q-item-label caption>{{evidenceCategory(item).label}} · {{formatBytes(item.tamano)}}<span v-if="item.descripcion"> · {{item.descripcion}}</span></q-item-label>
                </q-item-section>
                <q-item-section side><div class="row no-wrap"><q-btn flat round dense color="primary" icon="download" @click="downloadEvidence(item)"><q-tooltip>Descargar</q-tooltip></q-btn><q-btn v-if="selected.etapa!=='cerrada'" flat round dense color="negative" icon="delete_outline" @click="deleteEvidence(item)"><q-tooltip>Eliminar</q-tooltip></q-btn></div></q-item-section>
              </q-item>
            </q-list>
            <q-banner v-else rounded class="empty-evidence q-mt-md"><template #avatar><q-icon name="photo_library" color="grey-6"/></template>Todavía no hay fotografías, documentos o comprobantes adjuntos.</q-banner>
            <div v-if="selected.etapa==='cerrada'&&selected.evidencias?.length" class="text-caption text-grey-7 q-mt-sm"><q-icon name="lock" size="15px"/> La orden está cerrada. Sus evidencias quedan protegidas como parte del historial.</div>
          </div>
        </q-card-section>
        <q-separator/>
        <q-card-actions class="detail-actions q-pa-md">
          <q-btn outline color="negative" icon="picture_as_pdf" label="Descargar PDF" no-caps @click="downloadPdf"/>
          <q-btn v-if="selected.etapa!=='cerrada'" outline color="primary" icon="edit" label="Editar" no-caps @click="detailDialog=false;openForm(selected)"/>
          <q-space/>
          <q-btn v-if="selected.etapa!=='cerrada'&&selected.decision_cliente==='pendiente'&&selected.diagnostico&&selected.propuesta" outline color="negative" icon="close" label="No aceptó" no-caps @click="rejectProposal"/>
          <q-btn v-if="selected.etapa!=='cerrada'&&selected.decision_cliente==='pendiente'&&selected.diagnostico&&selected.propuesta" color="positive" icon="thumb_up" label="Aceptó propuesta" no-caps @click="acceptProposal"/>
          <q-btn v-if="selected.etapa==='servicio'&&selected.decision_cliente==='aceptado'" color="primary" icon="task_alt" label="Finalizar servicio" no-caps @click="openFinish"/>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="evidenceDialog" persistent>
      <q-card class="evidence-dialog">
        <q-card-section><div class="text-overline text-primary">Documentación técnica</div><div class="text-h6 text-weight-bold">Agregar evidencia a {{selected?.codigo}}</div><div class="text-caption text-grey-7">JPG, PNG, WEBP o PDF. Máximo 12 MB.</div></q-card-section>
        <q-separator/>
        <q-card-section class="q-gutter-md">
          <q-select v-model="evidenceForm.categoria" outlined emit-value map-options :options="evidenceCategories" label="Categoría"/>
          <q-file v-model="evidenceFile" outlined clearable accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" label="Fotografía o PDF" max-file-size="12582912" @rejected="$q.notify({type:'warning',message:'Usa JPG, PNG, WEBP o PDF de hasta 12 MB.'})"><template #prepend><q-icon name="attach_file"/></template></q-file>
          <q-input v-model="evidenceForm.descripcion" outlined type="textarea" autogrow maxlength="1000" label="Descripción opcional"/>
        </q-card-section>
        <q-separator/>
        <q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" icon="cloud_upload" label="Guardar evidencia" no-caps :loading="uploading" @click="uploadEvidence"/></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="finishDialog" persistent>
      <q-card class="finish-dialog"><q-card-section><div class="text-overline text-primary">Cierre del servicio</div><div class="text-h6 text-weight-bold">Finalizar {{selected?.codigo}}</div></q-card-section><q-separator/><q-card-section class="q-gutter-md"><q-input v-model="finishForm.trabajo_realizado" outlined type="textarea" autogrow label="Trabajo realizado *"/><q-input v-model="finishForm.recomendaciones" outlined type="textarea" autogrow label="Recomendaciones"/><div class="row q-col-gutter-md"><div class="col-12 col-sm-4"><q-input v-model.number="finishForm.garantia_dias" type="number" min="0" max="3650" outlined label="Garantía (días)"/></div><div class="col-12 col-sm-8"><q-input v-model="finishForm.condiciones_garantia" outlined label="Condiciones de garantía"/></div></div></q-card-section><q-separator/><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" icon="task_alt" label="Finalizar servicio" no-caps :loading="saving" @click="finishOrder"/></q-card-actions></q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.orders-page{max-width:1580px;margin:0 auto}.orders-page h1{color:var(--viti-text)}.min-width-0{min-width:0}
.summary-card,.filter-card,.mobile-order-card{border-radius:18px}.summary-card{transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}.summary-card:hover{transform:translateY(-2px)}.summary-card--active{border-color:var(--electro-primary)!important;box-shadow:0 0 0 1px var(--electro-primary)}
.order-form-dialog,.order-detail-dialog{width:860px;max-width:96vw;max-height:94vh}.order-form-dialog .dialog-scroll{max-height:68vh;overflow:auto}.finish-dialog{width:650px;max-width:96vw}.evidence-dialog{width:620px;max-width:96vw}.mobile-order-card{height:100%}
.progress-line{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;position:relative}.progress-step{text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--viti-muted);position:relative}.progress-step:after{content:'';position:absolute;height:2px;background:var(--viti-border);left:58%;right:-42%;top:16px}.progress-step:last-child:after{display:none}.progress-step--done{color:var(--viti-text)}.progress-step--done:after{background:var(--electro-primary)}
.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.detail-grid>div{display:flex;flex-direction:column;gap:4px}.detail-grid span,.detail-label{font-size:12px;color:var(--viti-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em}.detail-grid .span-2{grid-column:1/-1}.amount-box{border:1px solid var(--viti-border);border-radius:16px;padding:14px;display:grid;gap:8px}.amount-box>div{display:flex;justify-content:space-between;gap:16px}.amount-total{font-size:18px;font-weight:800}.warranty-banner{background:color-mix(in srgb,#21ba45 10%,var(--viti-card));border:1px solid color-mix(in srgb,#21ba45 35%,transparent)}.detail-actions{gap:8px;flex-wrap:wrap}.rounded-borders{border-radius:12px}
.evidence-panel{border:1px solid var(--viti-border);border-radius:16px;padding:14px}.empty-evidence{background:color-mix(in srgb,var(--viti-muted) 7%,var(--viti-card));color:var(--viti-muted)}
@media(max-width:700px){.orders-page{padding:12px}.orders-page h1{font-size:25px;line-height:1.2}.progress-line{grid-template-columns:repeat(5,minmax(56px,1fr));overflow-x:auto;padding-bottom:6px}.progress-step{min-width:58px}.detail-grid{grid-template-columns:1fr}.detail-grid .span-2{grid-column:auto}.detail-actions .q-btn{flex:1 1 auto}.order-form-dialog .dialog-scroll{max-height:72vh}.evidence-panel{padding:12px}}
</style>
