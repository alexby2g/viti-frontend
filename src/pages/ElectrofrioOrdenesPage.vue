<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'

const $q = useQuasar()
const route = useRoute()
const modules = inject('electrofrioModules', ref([]))
const airConfig = inject('airSystemConfig', ref(null))

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const clientes = ref([])
const equipos = ref([])
const tecnicos = ref([])
const materiales = ref([])
const stateCatalog = ref([])
const flowMeta = ref({ estado_actual:'cita_programada', estado:null, siguientes:[], puede_corregir:false, saldo:0 })
const history = ref([])
const selected = ref(null)
const serviceDialog = ref(false)
const formDialog = ref(false)
const paymentDialog = ref(false)
const evidenceDialog = ref(false)
const correctionDialog = ref(false)
const activeTab = ref('resumen')
const editingId = ref(null)
const evidenceFile = ref(null)

const clientMode = computed(() => route.path.startsWith('/mi-apps/'))
const base = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const hasModule = module => modules.value?.includes(module)
const currency = computed(() => airConfig.value?.moneda || 'BOB')
const serviceTypes = computed(() => airConfig.value?.tipos_servicio || ['Diagnóstico','Mantenimiento preventivo','Mantenimiento correctivo','Reparación','Instalación'])
const paymentMethods = computed(() => airConfig.value?.metodos_pago || ['efectivo','qr','transferencia','tarjeta','otro'])
const warrantyDefault = computed(() => Number(airConfig.value?.garantia_dias_default || 0))

const filters = reactive({ buscar:'', estado:null })
const form = reactive(emptyOrder())
const detailForm = reactive(emptyOrder())
const workForm = reactive({ trabajo_realizado:'', recomendaciones:'', garantia_dias:0, condiciones_garantia:'' })
const paymentForm = reactive({ tipo:'abono', monto:null, metodo:'qr', referencia:'', notas:'' })
const materialForm = reactive({ material_id:null, cantidad:1 })
const evidenceForm = reactive({ categoria:'antes', descripcion:'' })
const correctionForm = reactive({ estado:null, observacion:'' })

const evidenceCategories = [
  {label:'Antes del trabajo',value:'antes'},
  {label:'Durante el trabajo',value:'durante'},
  {label:'Después del trabajo',value:'despues'},
  {label:'Documento',value:'documento'},
  {label:'Comprobante',value:'comprobante'},
]

const stateMap = computed(() => Object.fromEntries(stateCatalog.value.map(item => [item.value,item])))
const stateOptions = computed(() => stateCatalog.value.map(item => ({label:item.label,value:item.value})))
const visibleRows = computed(() => {
  const term = filters.buscar.trim().toLowerCase()
  return rows.value.filter(row => {
    if (filters.estado && currentState(row) !== filters.estado) return false
    if (!term) return true
    return [row.codigo,row.cliente_nombre,row.cliente_telefono,row.tipo_servicio,row.equipo_tipo,row.equipo_marca,row.equipo_modelo,row.tecnico_nombre,row.problema_reportado]
      .filter(Boolean).join(' ').toLowerCase().includes(term)
  })
})
const stateSummary = computed(() => {
  const counts = {}
  rows.value.forEach(row => { const key=currentState(row); counts[key]=(counts[key]||0)+1 })
  return counts
})
const activeClients = computed(() => clientes.value.filter(item => item.activo))
const activeTechnicians = computed(() => tecnicos.value.filter(item => item.activo))
const equipmentForForm = computed(() => equipos.value.filter(item => item.activo && Number(item.cliente_id) === Number(form.cliente_id)))
const selectedMaterials = computed(() => selected.value?.materiales || [])
const selectedPayments = computed(() => selected.value?.pagos || [])
const selectedEvidence = computed(() => selected.value?.evidencias || [])
const isClosed = computed(() => ['finalizado','no_aprobado','cancelado'].includes(currentState(selected.value || {})))

function emptyOrder(){
  return {
    cliente_id:null,equipo_id:null,tecnico_id:null,tipo_servicio:'Mantenimiento preventivo',
    fecha_cita:new Date().toISOString().slice(0,10),hora_cita:'09:00',direccion_servicio:'',referencia_ubicacion:'',
    problema_reportado:'',prioridad:'normal',diagnostico:'',propuesta:'',trabajo_realizado:'',recomendaciones:'',costo_mano_obra:0,descuento:0,
  }
}
function currentState(row){
  if (row?.estado_actual) return row.estado_actual
  if (row?.etapa === 'cerrada' && row?.decision_cliente === 'rechazado') return 'no_aprobado'
  return ({cita:'cita_programada',diagnostico:'diagnostico_realizado',propuesta:'esperando_aprobacion',servicio:'servicio_en_proceso',cerrada:'finalizado'})[row?.etapa] || 'cita_programada'
}
function stateMeta(value){ return stateMap.value[value] || {label:pretty(value),color:'grey-7',icon:'radio_button_checked'} }
function pretty(value){ return String(value || '').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) }
function date(value){ return value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('es-BO') : '—' }
function dateTime(value){ return value ? new Date(value).toLocaleString('es-BO') : '—' }
function time(value){ return value ? String(value).slice(0,5) : '' }
function money(value){ return `${Number(value || 0).toFixed(2)} ${currency.value}` }
function equipmentLabel(row){ return [row.equipo_tipo||row.tipo,row.equipo_marca||row.marca,row.equipo_modelo||row.modelo].filter(Boolean).join(' · ') || 'Sin equipo' }
function clean(source){ return Object.fromEntries(Object.entries(source).map(([k,v])=>[k,v===''?null:v])) }
function notifyError(error,fallback){ const errors=error.response?.data?.errors; const first=errors?Object.values(errors).flat()[0]:null; $q.notify({type:'negative',message:first||error.response?.data?.message||fallback}) }
function orderPayload(source, overrides={}){
  return clean({
    cliente_id:source.cliente_id,equipo_id:source.equipo_id,tecnico_id:source.tecnico_id,tipo_servicio:source.tipo_servicio,
    fecha_cita:String(source.fecha_cita||'').slice(0,10),hora_cita:time(source.hora_cita),direccion_servicio:source.direccion_servicio,
    referencia_ubicacion:source.referencia_ubicacion,problema_reportado:source.problema_reportado,prioridad:source.prioridad||'normal',
    diagnostico:source.diagnostico,propuesta:source.propuesta,trabajo_realizado:source.trabajo_realizado,recomendaciones:source.recomendaciones,
    costo_mano_obra:Number(source.costo_mano_obra||0),descuento:Number(source.descuento||0),...overrides,
  })
}

async function loadAll(){
  loading.value=true
  try{
    const requests=[
      api.get(`${base.value}/ordenes-operativas`),api.get(`${base.value}/clientes`),api.get(`${base.value}/equipos`),api.get(`${base.value}/tecnicos`),api.get(`${base.value}/flujo-estados`),
    ]
    if(hasModule('inventario')) requests.push(api.get(`${base.value}/materiales`))
    const responses=await Promise.all(requests)
    rows.value=responses[0].data.data||[]
    clientes.value=responses[1].data.data||[]
    equipos.value=responses[2].data.data||[]
    tecnicos.value=responses[3].data.data||[]
    stateCatalog.value=responses[4].data.data||[]
    if(hasModule('inventario')) materiales.value=responses[5]?.data?.data||[]
  }catch(error){notifyError(error,'No se pudo cargar la gestión de servicios.')}finally{loading.value=false}
}

function openNew(){ editingId.value=null; Object.assign(form,emptyOrder()); form.tipo_servicio=serviceTypes.value[0]||'Diagnóstico'; formDialog.value=true }
function openEdit(){ if(!selected.value)return; editingId.value=selected.value.id; Object.assign(form,orderPayload(selected.value)); formDialog.value=true }
async function saveForm(){
  if(!form.cliente_id||!form.fecha_cita||!String(form.direccion_servicio||'').trim()||!String(form.problema_reportado||'').trim()){
    $q.notify({type:'warning',message:'Completa cliente, fecha, dirección y problema reportado.'});return
  }
  saving.value=true
  try{
    const response=editingId.value
      ? await api.put(`${base.value}/ordenes-operativas/${editingId.value}`,orderPayload(form))
      : await api.post(`${base.value}/ordenes-operativas`,orderPayload(form))
    formDialog.value=false
    await loadAll()
    await openService(response.data.data)
    $q.notify({type:'positive',message:editingId.value?'Servicio actualizado.':'Servicio registrado.'})
  }catch(error){notifyError(error,'No se pudo guardar el servicio.')}finally{saving.value=false}
}

async function openService(row){
  serviceDialog.value=true; activeTab.value='resumen'; selected.value=row
  await refreshService(row.id)
}
async function refreshService(id=selected.value?.id){
  if(!id)return
  try{
    const [orderResponse,flowResponse]=await Promise.all([
      api.get(`${base.value}/ordenes-operativas/${id}`),api.get(`${base.value}/ordenes/${id}/estados`),
    ])
    selected.value=orderResponse.data.data
    history.value=flowResponse.data.data||[]
    flowMeta.value=flowResponse.data.meta||flowMeta.value
    Object.assign(detailForm,orderPayload(selected.value))
    Object.assign(workForm,{
      trabajo_realizado:selected.value.trabajo_realizado||'',recomendaciones:selected.value.recomendaciones||'',
      garantia_dias:Number(selected.value.garantia_dias||selected.value.garantia_dias_default||warrantyDefault.value||0),
      condiciones_garantia:selected.value.condiciones_garantia||'',
    })
  }catch(error){notifyError(error,'No se pudo actualizar la ficha del servicio.')}
}
async function saveSection(section){
  if(!selected.value||isClosed.value)return
  saving.value=true
  try{
    const overrides=section==='diagnostico'
      ? {diagnostico:detailForm.diagnostico}
      : section==='propuesta'
        ? {propuesta:detailForm.propuesta,costo_mano_obra:detailForm.costo_mano_obra,descuento:detailForm.descuento}
        : {trabajo_realizado:workForm.trabajo_realizado,recomendaciones:workForm.recomendaciones}
    await api.put(`${base.value}/ordenes-operativas/${selected.value.id}`,orderPayload(selected.value,overrides))
    await refreshService(); await loadAll(); $q.notify({type:'positive',message:'Cambios guardados.'})
  }catch(error){notifyError(error,'No se pudieron guardar los cambios.')}finally{saving.value=false}
}

async function changeState(target, options={}){
  if(!selected.value)return
  const state=stateMeta(target)
  const proceed=async observation=>{
    saving.value=true
    try{
      const payload={estado:target,observacion:observation||null,...options}
      if(target==='servicio_terminado') Object.assign(payload,workForm)
      await api.post(`${base.value}/ordenes/${selected.value.id}/estado`,clean(payload))
      await refreshService(); await loadAll(); $q.notify({type:'positive',message:`Estado: ${state.label}`})
    }catch(error){notifyError(error,'No se pudo cambiar el estado.')}finally{saving.value=false}
  }
  if(['no_aprobado','cancelado'].includes(target)){
    $q.dialog({title:state.label,message:'Indica el motivo. Quedará registrado en el historial.',prompt:{model:'',type:'textarea',isValid:v=>String(v||'').trim().length>=3},cancel:true,persistent:true}).onOk(proceed)
  }else if(target==='servicio_terminado'&&!String(workForm.trabajo_realizado||'').trim()){
    activeTab.value='trabajo'; $q.notify({type:'warning',message:'Describe el trabajo realizado antes de terminar el servicio.'})
  }else proceed(null)
}
function openCorrection(){ Object.assign(correctionForm,{estado:currentState(selected.value),observacion:''}); correctionDialog.value=true }
async function correctState(){
  if(!correctionForm.estado||!correctionForm.observacion.trim()){$q.notify({type:'warning',message:'Selecciona el estado correcto e indica el motivo.'});return}
  correctionDialog.value=false
  await changeState(correctionForm.estado,{correccion:true,observacion:correctionForm.observacion})
}

async function addMaterial(){
  if(!selected.value||!materialForm.material_id||Number(materialForm.cantidad)<=0)return
  saving.value=true
  try{
    await api.post(`${base.value}/ordenes/${selected.value.id}/materiales`,{material_id:materialForm.material_id,cantidad:Number(materialForm.cantidad)})
    Object.assign(materialForm,{material_id:null,cantidad:1});await refreshService();$q.notify({type:'positive',message:'Material registrado en el servicio.'})
  }catch(error){notifyError(error,'No se pudo registrar el material.')}finally{saving.value=false}
}
async function removeMaterial(item){
  try{await api.delete(`${base.value}/ordenes/${selected.value.id}/materiales/${item.material_id}`);await refreshService()}catch(error){notifyError(error,'No se pudo quitar el material.')}
}
function openPayment(){
  const remaining=Number(flowMeta.value.saldo??selected.value?.saldo??0)
  Object.assign(paymentForm,{tipo:selectedPayments.value.length?'abono':'anticipo',monto:remaining>0?remaining:null,metodo:paymentMethods.value[0]||'efectivo',referencia:'',notas:''});paymentDialog.value=true
}
async function savePayment(){
  if(!selected.value||Number(paymentForm.monto)<=0)return
  saving.value=true
  try{
    const key=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}-viti-payment`
    await api.post(`${base.value}/ordenes/${selected.value.id}/pagos-operativos`,{...paymentForm,monto:Number(paymentForm.monto),idempotency_key:key})
    paymentDialog.value=false;await refreshService();$q.notify({type:'positive',message:'Pago registrado.'})
  }catch(error){notifyError(error,'No se pudo registrar el pago.')}finally{saving.value=false}
}
function openEvidence(){ evidenceFile.value=null;Object.assign(evidenceForm,{categoria:currentState(selected.value)==='servicio_en_proceso'?'durante':'antes',descripcion:''});evidenceDialog.value=true }
async function uploadEvidence(){
  if(!selected.value||!evidenceFile.value){$q.notify({type:'warning',message:'Selecciona una fotografía o PDF.'});return}
  saving.value=true
  try{
    const body=new FormData();body.append('archivo',evidenceFile.value);body.append('categoria',evidenceForm.categoria);if(evidenceForm.descripcion.trim())body.append('descripcion',evidenceForm.descripcion.trim())
    await api.post(`${base.value}/ordenes/${selected.value.id}/evidencias`,body);evidenceDialog.value=false;await refreshService();$q.notify({type:'positive',message:'Evidencia guardada.'})
  }catch(error){notifyError(error,'No se pudo subir la evidencia.')}finally{saving.value=false}
}
async function downloadEvidence(item){
  try{const response=await api.get(`${base.value}/evidencias/${item.id}/descargar`,{responseType:'blob'});saveBlob(response.data,item.nombre_original||`evidencia-${item.id}`)}catch(error){notifyError(error,'No se pudo descargar la evidencia.')}
}
async function downloadPdf(){
  if(!selected.value)return
  try{const response=await api.get(`${base.value}/ordenes/${selected.value.id}/pdf`,{responseType:'blob'});saveBlob(response.data,`${selected.value.codigo}-servicio.pdf`)}catch(error){notifyError(error,'No se pudo generar el PDF.')}
}
function saveBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}

onMounted(loadAll)
</script>

<template>
  <q-page padding class="services-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-overline text-primary text-weight-bold">Trabajo técnico</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Servicios</h1>
        <div class="text-body2 text-grey-7">Cada atención vive en una sola ficha: cita, diagnóstico, propuesta, trabajo, pago, evidencias e historial.</div>
      </div>
      <div class="col-12 col-md-auto row q-gutter-sm">
        <q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="loadAll"/>
        <q-btn color="primary" icon="add" label="Nuevo servicio" no-caps @click="openNew"/>
      </div>
    </div>

    <div class="status-strip q-mb-lg">
      <q-chip v-for="state in stateCatalog.filter(s=>(stateSummary[s.value]||0)>0)" :key="state.value" clickable :color="filters.estado===state.value?state.color:'grey-2'" :text-color="filters.estado===state.value?'white':'grey-8'" :icon="state.icon" @click="filters.estado=filters.estado===state.value?null:state.value">
        {{state.label}} · {{stateSummary[state.value]||0}}
      </q-chip>
    </div>

    <q-card flat bordered class="filters-card q-mb-lg">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md"><q-input v-model="filters.buscar" outlined dense clearable label="Buscar cliente, equipo, técnico o servicio"><template #prepend><q-icon name="search"/></template></q-input></div>
        <div class="col-12 col-md-4"><q-select v-model="filters.estado" outlined dense clearable emit-value map-options :options="stateOptions" label="Estado actual"/></div>
        <div class="col-auto"><q-badge color="primary" :label="`${visibleRows.length} servicio(s)`"/></div>
      </q-card-section>
    </q-card>

    <div class="service-list">
      <q-card v-for="row in visibleRows" :key="row.id" flat bordered class="service-row cursor-pointer" @click="openService(row)">
        <q-card-section class="row items-center q-col-gutter-md">
          <div class="col-12 col-sm-auto"><q-avatar :color="stateMeta(currentState(row)).color" text-color="white" :icon="stateMeta(currentState(row)).icon"/></div>
          <div class="col-12 col-sm">
            <div class="row items-center q-gutter-sm"><div class="text-subtitle1 text-weight-bold text-primary">{{row.codigo}}</div><q-badge :color="stateMeta(currentState(row)).color" :label="stateMeta(currentState(row)).label"/></div>
            <div class="text-weight-bold q-mt-xs">{{row.cliente_nombre}} · {{row.tipo_servicio||'Servicio técnico'}}</div>
            <div class="text-caption text-grey-7">{{equipmentLabel(row)}} · {{date(row.fecha_cita)}} {{time(row.hora_cita)}} · {{row.tecnico_nombre||'Sin técnico asignado'}}</div>
          </div>
          <div class="col-6 col-sm-auto text-right"><div class="text-caption text-grey-7">Total</div><div class="text-weight-bold">{{money(row.total)}}</div></div>
          <div class="col-6 col-sm-auto text-right"><div class="text-caption text-grey-7">Saldo</div><div class="text-weight-bold" :class="Number(row.saldo)>0?'text-orange':'text-positive'">{{money(row.saldo)}}</div></div>
          <div class="col-auto"><q-icon name="chevron_right" size="26px" color="grey-5"/></div>
        </q-card-section>
      </q-card>
      <q-banner v-if="!loading&&!visibleRows.length" rounded class="bg-grey-2 text-grey-7">No hay servicios con esos filtros.</q-banner>
    </div>

    <q-dialog v-model="formDialog" persistent>
      <q-card class="form-dialog">
        <q-card-section class="row items-start"><div><div class="text-overline text-primary">Servicio técnico</div><div class="text-h5 text-weight-bold">{{editingId?'Editar servicio':'Nuevo servicio'}}</div></div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section>
        <q-separator/>
        <q-card-section class="form-scroll">
          <div class="row q-col-gutter-md q-gutter-y-md">
            <div class="col-12 col-md-6"><q-select v-model="form.cliente_id" outlined emit-value map-options :options="activeClients.map(x=>({label:x.nombre,value:x.id}))" label="Cliente *" @update:model-value="form.equipo_id=null"/></div>
            <div class="col-12 col-md-6"><q-select v-model="form.equipo_id" outlined clearable emit-value map-options :options="equipmentForForm.map(x=>({label:[x.tipo,x.marca,x.modelo].filter(Boolean).join(' · '),value:x.id}))" label="Equipo"/></div>
            <div class="col-12 col-md-6"><q-select v-model="form.tecnico_id" outlined clearable emit-value map-options :options="activeTechnicians.map(x=>({label:x.nombre,value:x.id}))" label="Técnico"/></div>
            <div class="col-12 col-md-6"><q-select v-model="form.tipo_servicio" outlined use-input fill-input new-value-mode="add-unique" :options="serviceTypes" label="Tipo de servicio"/></div>
            <div class="col-7 col-md-4"><q-input v-model="form.fecha_cita" outlined type="date" stack-label label="Fecha *"/></div>
            <div class="col-5 col-md-3"><q-input v-model="form.hora_cita" outlined type="time" stack-label label="Hora"/></div>
            <div class="col-12 col-md-5"><q-select v-model="form.prioridad" outlined :options="['baja','normal','alta','urgente']" label="Prioridad"/></div>
            <div class="col-12"><q-input v-model="form.direccion_servicio" outlined label="Dirección de la visita *"/></div>
            <div class="col-12"><q-input v-model="form.referencia_ubicacion" outlined label="Referencia de ubicación"/></div>
            <div class="col-12"><q-input v-model="form.problema_reportado" outlined type="textarea" autogrow label="Problema reportado *"/></div>
          </div>
        </q-card-section>
        <q-separator/><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" icon="save" label="Guardar" no-caps :loading="saving" @click="saveForm"/></q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="serviceDialog" :maximized="$q.screen.lt.md">
      <q-card v-if="selected" class="service-dialog">
        <q-card-section class="service-header">
          <div class="row items-start q-col-gutter-md">
            <div class="col"><div class="text-overline">{{selected.codigo}}</div><div class="text-h5 text-weight-bold">{{selected.cliente_nombre}}</div><div class="text-caption">{{equipmentLabel(selected)}} · {{selected.tipo_servicio||'Servicio técnico'}}</div></div>
            <div class="col-auto text-right"><q-badge :color="stateMeta(currentState(selected)).color" :label="stateMeta(currentState(selected)).label" class="text-body2 q-pa-sm"/><div class="text-caption q-mt-xs">Actualizado {{dateTime(selected.estado_actualizado_at||selected.updated_at)}}</div></div>
            <div class="col-auto"><q-btn flat round icon="close" color="white" v-close-popup/></div>
          </div>
        </q-card-section>

        <q-card-section class="next-actions">
          <div class="row items-center q-col-gutter-sm">
            <div class="col-12 col-md"><div class="text-caption text-grey-7">Siguiente paso</div><div class="row q-gutter-sm q-mt-xs"><q-btn v-for="next in flowMeta.siguientes||[]" :key="next.value" :color="next.color" :icon="next.icon" :label="next.label" no-caps :loading="saving" @click="changeState(next.value)"/></div><div v-if="!(flowMeta.siguientes||[]).length" class="text-weight-medium q-mt-xs">Este flujo ya no tiene pasos pendientes.</div></div>
            <div class="col-auto row q-gutter-xs"><q-btn outline color="primary" icon="edit" label="Datos" no-caps :disable="isClosed" @click="openEdit"/><q-btn outline color="negative" icon="picture_as_pdf" label="PDF" no-caps @click="downloadPdf"/><q-btn v-if="flowMeta.puede_corregir" flat color="grey-7" icon="history" label="Corregir estado" no-caps @click="openCorrection"/></div>
          </div>
        </q-card-section>

        <q-tabs v-model="activeTab" dense no-caps align="left" class="service-tabs" active-color="primary" indicator-color="primary">
          <q-tab name="resumen" icon="dashboard" label="Resumen"/>
          <q-tab name="diagnostico" icon="troubleshoot" label="Diagnóstico"/>
          <q-tab name="propuesta" icon="request_quote" label="Propuesta"/>
          <q-tab name="trabajo" icon="build" label="Trabajo"/>
          <q-tab v-if="hasModule('inventario')" name="materiales" icon="inventory_2" label="Materiales"/>
          <q-tab v-if="hasModule('pagos')" name="pagos" icon="payments" label="Pagos"/>
          <q-tab name="evidencias" icon="photo_library" label="Evidencias"/>
          <q-tab name="historial" icon="history" label="Historial"/>
        </q-tabs>
        <q-separator/>

        <q-card-section class="tab-content">
          <div v-if="activeTab==='resumen'" class="row q-col-gutter-lg">
            <div class="col-12 col-lg-7"><q-card flat bordered class="inner-card"><q-card-section><div class="text-h6 text-weight-bold">Atención</div><div class="detail-grid q-mt-md"><div><span>Visita</span><strong>{{date(selected.fecha_cita)}} {{time(selected.hora_cita)}}</strong></div><div><span>Técnico</span><strong>{{selected.tecnico_nombre||'Sin asignar'}}</strong></div><div><span>Prioridad</span><strong>{{pretty(selected.prioridad)}}</strong></div><div><span>Dirección</span><strong>{{selected.direccion_servicio}}</strong></div><div class="span-2"><span>Problema reportado</span><strong>{{selected.problema_reportado}}</strong></div></div></q-card-section></q-card></div>
            <div class="col-12 col-lg-5"><q-card flat bordered class="inner-card"><q-card-section><div class="text-h6 text-weight-bold">Control económico</div><div class="amount-row"><span>Total</span><strong>{{money(selected.total)}}</strong></div><div class="amount-row"><span>Pagado</span><strong class="text-positive">{{money(selected.pagado)}}</strong></div><div class="amount-row"><span>Saldo</span><strong :class="Number(selected.saldo)>0?'text-orange':'text-positive'">{{money(selected.saldo)}}</strong></div><q-btn v-if="hasModule('pagos')&&Number(selected.saldo)>0&&!isClosed" color="primary" outline icon="payments" label="Registrar pago" no-caps class="full-width q-mt-md" @click="openPayment"/></q-card-section></q-card></div>
          </div>

          <div v-else-if="activeTab==='diagnostico'" class="section-editor"><div><div class="text-h6 text-weight-bold">Diagnóstico técnico</div><div class="text-caption text-grey-7">Describe qué se encontró durante la revisión.</div></div><q-input v-model="detailForm.diagnostico" outlined type="textarea" autogrow label="Diagnóstico" :readonly="isClosed"/><q-btn v-if="!isClosed" color="primary" icon="save" label="Guardar diagnóstico" no-caps :loading="saving" @click="saveSection('diagnostico')"/></div>

          <div v-else-if="activeTab==='propuesta'" class="section-editor"><div><div class="text-h6 text-weight-bold">Propuesta para el cliente</div><div class="text-caption text-grey-7">Solución recomendada y costo del servicio.</div></div><q-input v-model="detailForm.propuesta" outlined type="textarea" autogrow label="Propuesta" :readonly="isClosed"/><div class="row q-col-gutter-md"><div class="col-6"><q-input v-model.number="detailForm.costo_mano_obra" outlined type="number" min="0" label="Mano de obra" :readonly="isClosed"/></div><div class="col-6"><q-input v-model.number="detailForm.descuento" outlined type="number" min="0" label="Descuento" :readonly="isClosed"/></div></div><q-btn v-if="!isClosed" color="primary" icon="save" label="Guardar propuesta" no-caps :loading="saving" @click="saveSection('propuesta')"/></div>

          <div v-else-if="activeTab==='trabajo'" class="section-editor"><div><div class="text-h6 text-weight-bold">Trabajo realizado</div><div class="text-caption text-grey-7">Registra lo ejecutado y las recomendaciones antes de terminar el servicio.</div></div><q-input v-model="workForm.trabajo_realizado" outlined type="textarea" autogrow label="Trabajo realizado" :readonly="isClosed"/><q-input v-model="workForm.recomendaciones" outlined type="textarea" autogrow label="Recomendaciones" :readonly="isClosed"/><div v-if="hasModule('garantias')" class="row q-col-gutter-md"><div class="col-12 col-sm-4"><q-input v-model.number="workForm.garantia_dias" outlined type="number" min="0" max="3650" label="Garantía (días)" :readonly="isClosed"/></div><div class="col-12 col-sm-8"><q-input v-model="workForm.condiciones_garantia" outlined label="Condiciones de garantía" :readonly="isClosed"/></div></div><q-btn v-if="!isClosed" color="primary" icon="save" label="Guardar trabajo" no-caps :loading="saving" @click="saveSection('trabajo')"/></div>

          <div v-else-if="activeTab==='materiales'" class="section-editor"><div class="row items-center"><div><div class="text-h6 text-weight-bold">Materiales utilizados</div><div class="text-caption text-grey-7">El stock se descuenta automáticamente.</div></div></div><div v-if="!isClosed" class="row q-col-gutter-md"><div class="col-12 col-md-7"><q-select v-model="materialForm.material_id" outlined emit-value map-options :options="materiales.filter(x=>x.activo).map(x=>({label:`${x.nombre} · stock ${x.stock} ${x.unidad}`,value:x.id}))" label="Material"/></div><div class="col-6 col-md-3"><q-input v-model.number="materialForm.cantidad" outlined type="number" min="0.01" step="0.01" label="Cantidad"/></div><div class="col-6 col-md-2"><q-btn color="primary" label="Agregar" no-caps class="full-width full-height" :loading="saving" @click="addMaterial"/></div></div><q-list v-if="selectedMaterials.length" bordered separator class="rounded-borders"><q-item v-for="item in selectedMaterials" :key="item.id"><q-item-section><q-item-label>{{item.material_nombre}}</q-item-label><q-item-label caption>{{item.cantidad}} {{item.material_unidad}} · {{money(item.subtotal)}}</q-item-label></q-item-section><q-item-section v-if="!isClosed" side><q-btn flat round dense color="negative" icon="delete_outline" @click="removeMaterial(item)"/></q-item-section></q-item></q-list><q-banner v-else rounded class="bg-grey-2 text-grey-7">No se registraron materiales en este servicio.</q-banner></div>

          <div v-else-if="activeTab==='pagos'" class="section-editor"><div class="row items-center"><div><div class="text-h6 text-weight-bold">Pagos</div><div class="text-caption text-grey-7">Anticipo, abonos y saldo vinculados a esta atención.</div></div><q-space/><q-btn v-if="Number(selected.saldo)>0&&!isClosed" color="primary" icon="add" label="Registrar pago" no-caps @click="openPayment"/></div><q-list v-if="selectedPayments.length" bordered separator class="rounded-borders"><q-item v-for="item in selectedPayments" :key="item.id"><q-item-section avatar><q-avatar color="green-1" text-color="positive" icon="payments"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{money(item.monto)}} · {{pretty(item.tipo)}}</q-item-label><q-item-label caption>{{pretty(item.metodo)}} · {{dateTime(item.pagado_at)}}<span v-if="item.referencia"> · Ref. {{item.referencia}}</span></q-item-label></q-item-section></q-item></q-list><q-banner v-else rounded class="bg-grey-2 text-grey-7">Todavía no hay pagos registrados.</q-banner></div>

          <div v-else-if="activeTab==='evidencias'" class="section-editor"><div class="row items-center"><div><div class="text-h6 text-weight-bold">Evidencias y documentos</div><div class="text-caption text-grey-7">Fotos antes, durante y después; documentos y comprobantes.</div></div><q-space/><q-btn v-if="!isClosed" color="primary" outline icon="add_photo_alternate" label="Agregar" no-caps @click="openEvidence"/></div><div class="evidence-grid"><q-card v-for="item in selectedEvidence" :key="item.id" flat bordered class="evidence-card"><q-card-section><q-icon :name="item.mime==='application/pdf'?'picture_as_pdf':'image'" color="primary" size="28px"/><div class="text-weight-bold ellipsis q-mt-sm">{{item.nombre_original}}</div><div class="text-caption text-grey-7">{{pretty(item.categoria)}}</div></q-card-section><q-card-actions><q-btn flat color="primary" icon="download" label="Descargar" no-caps @click="downloadEvidence(item)"/></q-card-actions></q-card></div><q-banner v-if="!selectedEvidence.length" rounded class="bg-grey-2 text-grey-7">No hay evidencias adjuntas.</q-banner></div>

          <div v-else-if="activeTab==='historial'" class="history-panel"><div class="text-h6 text-weight-bold">Historial de estados</div><div class="text-caption text-grey-7 q-mb-lg">Nada se borra: cada avance o corrección conserva fecha, usuario y observación.</div><q-timeline color="primary" layout="comfortable"><q-timeline-entry v-for="item in history" :key="item.id" :title="item.estado_label" :subtitle="dateTime(item.cambiado_at)" :icon="stateMeta(item.estado).icon" :color="item.tipo_cambio==='correccion'?'orange':stateMeta(item.estado).color"><div><span v-if="item.estado_anterior_label" class="text-caption text-grey-7">Desde {{item.estado_anterior_label}}</span><div v-if="item.observacion" class="q-mt-xs">{{item.observacion}}</div><div class="text-caption text-grey-7 q-mt-xs">{{[item.cambiado_por_nombre,item.cambiado_por_apellido].filter(Boolean).join(' ')||'Sistema'}} · {{pretty(item.tipo_cambio)}}</div></div></q-timeline-entry></q-timeline></div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="paymentDialog" persistent><q-card style="width:560px;max-width:96vw"><q-card-section><div class="text-h6 text-weight-bold">Registrar pago</div><div class="text-caption text-grey-7">Saldo actual {{money(flowMeta.saldo)}}</div></q-card-section><q-separator/><q-card-section class="q-gutter-md"><q-select v-model="paymentForm.tipo" outlined :options="['anticipo','abono','saldo']" label="Tipo"/><q-input v-model.number="paymentForm.monto" outlined type="number" min="0.01" step="0.01" label="Monto"/><q-select v-model="paymentForm.metodo" outlined :options="paymentMethods" label="Método"/><q-input v-model="paymentForm.referencia" outlined label="Referencia"/><q-input v-model="paymentForm.notas" outlined type="textarea" autogrow label="Notas"/></q-card-section><q-separator/><q-card-actions align="right"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" label="Guardar pago" no-caps :loading="saving" @click="savePayment"/></q-card-actions></q-card></q-dialog>

    <q-dialog v-model="evidenceDialog" persistent><q-card style="width:580px;max-width:96vw"><q-card-section><div class="text-h6 text-weight-bold">Agregar evidencia</div></q-card-section><q-separator/><q-card-section class="q-gutter-md"><q-select v-model="evidenceForm.categoria" outlined emit-value map-options :options="evidenceCategories" label="Categoría"/><q-file v-model="evidenceFile" outlined accept=".jpg,.jpeg,.png,.webp,.pdf" label="Imagen o PDF"/><q-input v-model="evidenceForm.descripcion" outlined type="textarea" autogrow label="Descripción"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" label="Subir" no-caps :loading="saving" @click="uploadEvidence"/></q-card-actions></q-card></q-dialog>

    <q-dialog v-model="correctionDialog" persistent><q-card style="width:560px;max-width:96vw"><q-card-section><div class="text-h6 text-weight-bold">Corregir estado actual</div><div class="text-caption text-grey-7">No se elimina el estado anterior. La corrección quedará registrada en el historial.</div></q-card-section><q-separator/><q-card-section class="q-gutter-md"><q-select v-model="correctionForm.estado" outlined emit-value map-options :options="stateOptions" label="Estado correcto"/><q-input v-model="correctionForm.observacion" outlined type="textarea" autogrow label="Motivo de la corrección *"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="orange" label="Registrar corrección" no-caps :loading="saving" @click="correctState"/></q-card-actions></q-card></q-dialog>
  </q-page>
</template>

<style scoped>
.services-page{max-width:1550px;margin:0 auto}.services-page h1{color:var(--viti-text)}.status-strip{display:flex;gap:6px;overflow:auto;padding-bottom:4px}.filters-card,.service-row,.inner-card{border-radius:16px}.service-list{display:grid;gap:10px}.service-row{transition:transform .15s ease,box-shadow .15s ease}.service-row:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(20,55,87,.08)}.form-dialog{width:820px;max-width:96vw}.form-scroll{max-height:70vh;overflow:auto}.service-dialog{width:1220px;max-width:98vw;max-height:96vh}.service-header{background:linear-gradient(135deg,var(--electro-primary),var(--electro-secondary));color:#fff}.service-header .text-caption{color:rgba(255,255,255,.8)}.next-actions{background:color-mix(in srgb,var(--electro-primary) 5%,var(--viti-card))}.service-tabs{overflow:auto}.tab-content{min-height:420px;max-height:62vh;overflow:auto}.section-editor{max-width:850px;display:grid;gap:16px}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.detail-grid>div{display:flex;flex-direction:column;gap:4px}.detail-grid span{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--viti-muted);font-weight:700}.detail-grid .span-2{grid-column:1/-1}.amount-row{display:flex;justify-content:space-between;gap:20px;padding:10px 0;border-bottom:1px solid var(--viti-border)}.evidence-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}.evidence-card{border-radius:14px}.history-panel{max-width:900px}.rounded-borders{border-radius:14px}@media(max-width:700px){.services-page{padding:12px}.services-page h1{font-size:26px}.service-dialog{width:100%;max-width:100%;max-height:none}.tab-content{max-height:none}.detail-grid{grid-template-columns:1fr}.detail-grid .span-2{grid-column:auto}}
</style>
