<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../boot/axios'
import { useFormErrors } from '../composables/useFormErrors'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const canManageSource = inject('electrofrioCanManage', ref(false))
const modules = inject('electrofrioModules', ref([]))
const airConfig = inject('airSystemConfig', ref(null))
const fieldErrors = useFormErrors()

const loading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const clients = ref([])
const search = ref('')
const dialog = ref(false)
const accessDialog = ref(false)
const detailDialog = ref(false)
const equipmentDialog = ref(false)
const appointmentDialog = ref(false)
const editingId = ref(null)
const editingEquipmentId = ref(null)
const selected = ref(null)
const clientEquipment = ref([])
const clientOrders = ref([])
const scheduleAfterEquipmentSave = ref(false)

const form = reactive({ nombre:'', telefono:'', direccion:'', referencia:'', observaciones:'', activo:true })
const accessForm = reactive({ usuario:'', documento:'', telefono:'', password:'', password_confirmation:'' })
const equipmentForm = reactive(emptyEquipment())
const appointmentForm = reactive(emptyAppointment())

const clientMode = computed(() => route.path.startsWith('/mi-apps/electrofrio'))
const base = computed(() => clientMode.value ? '/mi/apps/electrofrio' : '/apps/electrofrio')
const appBase = computed(() => clientMode.value ? '/mi-apps/electrofrio' : '/apps/electrofrio')
const canManage = computed(() => Boolean(canManageSource?.value ?? canManageSource))
const hasModule = module => modules.value?.includes(module)
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const todayValue = () => new Date().toISOString().slice(0,10)
const defaultEquipmentTypes = ['Aire acondicionado Split','Aire acondicionado Piso Techo','Aire acondicionado Cassette','Aire acondicionado Ventana','Aire acondicionado Portátil','Sistema VRF / VRV','Chiller','Otro']
const equipmentTypes = computed(() => Array.isArray(airConfig.value?.tipos_equipo) && airConfig.value.tipos_equipo.length ? airConfig.value.tipos_equipo : defaultEquipmentTypes)
const serviceTypes = computed(() => Array.isArray(airConfig.value?.tipos_servicio) && airConfig.value.tipos_servicio.length ? airConfig.value.tipos_servicio : ['Diagnóstico','Mantenimiento preventivo','Mantenimiento correctivo','Reparación','Instalación'])

const rows = computed(() => {
  const term = normalize(search.value.trim())
  return [...clients.value]
    .sort((a,b) => Number(b.id) - Number(a.id))
    .filter(row => !term || normalize([row.nombre,row.telefono,row.direccion,row.referencia,row.observaciones].filter(Boolean).join(' ')).includes(term))
})
const orderedClientOrders = computed(() => [...clientOrders.value].sort((a,b)=>Number(b.id)-Number(a.id)))
const activeClientOrders = computed(() => orderedClientOrders.value.filter(row => !['finalizado','no_aprobado','cancelado'].includes(currentState(row))))
const clientSummary = computed(() => ({equipos:clientEquipment.value.length,citas:activeClientOrders.value.length,servicios:clientOrders.value.length}))
const equipmentOptions = computed(() => clientEquipment.value.filter(item=>item.activo).map(item=>({label:equipmentLabel(item),value:item.id})))

const columns = [
  {name:'nombre',label:'Cliente',field:'nombre',align:'left',sortable:true},
  {name:'telefono',label:'Teléfono',field:'telefono',align:'left'},
  {name:'direccion',label:'Dirección',field:'direccion',align:'left'},
  {name:'portal',label:'Portal',field:'acceso_estado',align:'center'},
  {name:'estado',label:'Estado',field:'activo',align:'center'},
  {name:'acciones',label:'Acciones',field:'id',align:'right'},
]

function emptyEquipment(){ return {tipo:'Aire acondicionado Split',marca:'',modelo:'',serie:'',capacidad:'',ubicacion:'',observaciones:'',activo:true} }
function emptyAppointment(){ return {equipo_id:null,tipo_servicio:'Diagnóstico',fecha_cita:new Date().toISOString().slice(0,10),hora_cita:'09:00',direccion_servicio:'',referencia_ubicacion:'',problema_reportado:'',prioridad:'normal'} }
function clean(source){ return Object.fromEntries(Object.entries(source).map(([key,value])=>[key,value===''?null:value])) }
function equipmentLabel(row){ return [row.tipo||row.equipo_tipo,row.marca||row.equipo_marca,row.modelo||row.equipo_modelo].filter(Boolean).join(' · ') || 'Equipo' }
function date(value){ return value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('es-BO') : '—' }
function time(value){ return value ? String(value).slice(0,5) : 'Sin hora' }
function pretty(value){ return String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) }
function currentState(row){
  if(row?.estado_actual)return row.estado_actual
  if(row?.etapa==='cerrada'&&row?.decision_cliente==='rechazado')return 'no_aprobado'
  return ({cita:'cita_programada',diagnostico:'diagnostico_realizado',propuesta:'esperando_aprobacion',servicio:'servicio_en_proceso',cerrada:'finalizado'})[row?.etapa]||'cita_programada'
}
function stateColor(row){ return ({cita_programada:'blue',en_visita:'indigo',diagnostico_realizado:'purple',propuesta_enviada:'deep-orange',esperando_aprobacion:'orange',aprobado:'positive',no_aprobado:'negative',servicio_en_proceso:'teal',servicio_terminado:'cyan-8',pendiente_pago:'amber-9',finalizado:'positive',cancelado:'grey-7'})[currentState(row)]||'grey-7' }
function notifyError(error,fallback,inline=false){
  const message=inline?fieldErrors.fromResponse(error,fallback):(error.response?.data?.message||fallback)
  if(inline)fieldErrors.scrollToFirst()
  $q.notify({type:'negative',message})
}
function clearField(field){fieldErrors.clear(field)}

function resetForm(){ editingId.value=null;fieldErrors.clear();Object.assign(form,{nombre:'',telefono:'',direccion:'',referencia:'',observaciones:'',activo:true}) }
function openForm(row=null){ resetForm();if(row){editingId.value=row.id;Object.assign(form,{nombre:row.nombre||'',telefono:row.telefono||'',direccion:row.direccion||'',referencia:row.referencia||'',observaciones:row.observaciones||'',activo:Boolean(row.activo)})}dialog.value=true }

async function load(){
  loading.value=true
  try{const response=await api.get(`${base.value}/clientes`);clients.value=response.data.data||[]}
  catch(error){notifyError(error,'No se pudieron cargar los clientes del sistema.')}
  finally{loading.value=false}
}

async function save(){
  fieldErrors.clear()
  if(!form.nombre.trim())fieldErrors.set('nombre','Ingresa el nombre del cliente.')
  if(fieldErrors.has('nombre')){fieldErrors.scrollToFirst();return}
  const wasNew=!editingId.value
  saving.value=true
  try{
    const response=editingId.value?await api.put(`${base.value}/clientes/${editingId.value}`,clean({...form})):await api.post(`${base.value}/clientes`,clean({...form}))
    dialog.value=false
    await load()
    const savedId=Number(response.data?.data?.id||editingId.value||0)
    const savedClient=clients.value.find(item=>Number(item.id)===savedId)
    $q.notify({type:'positive',message:wasNew?'Cliente registrado. Ahora agrega su equipo y agenda la visita.':'Cliente actualizado.'})
    if(wasNew&&savedClient)await openClient(savedClient)
    else if(selected.value&&savedClient&&Number(selected.value.id)===savedId)selected.value=savedClient
  }catch(error){notifyError(error,'No se pudo guardar el cliente. Revisa los campos marcados.',true)}finally{saving.value=false}
}

function remove(row){$q.dialog({title:'Eliminar cliente',message:`¿Eliminar a ${row.nombre}? Si tiene equipos u órdenes, el sistema protegerá su historial.`,cancel:true,persistent:true}).onOk(async()=>{try{await api.delete(`${base.value}/clientes/${row.id}`);await load();$q.notify({type:'positive',message:'Cliente eliminado.'})}catch(error){notifyError(error,'No se pudo eliminar el cliente.')}})}

async function openClient(row){selected.value=row;detailDialog.value=true;await loadClientContext()}
async function loadClientContext(){
  if(!selected.value)return
  detailLoading.value=true
  try{
    const requests=[];const indexes={}
    if(hasModule('equipos')){indexes.equipment=requests.length;requests.push(api.get(`${base.value}/equipos`,{params:{cliente_id:selected.value.id}}))}
    if(hasModule('ordenes')){indexes.orders=requests.length;requests.push(api.get(`${base.value}/ordenes-operativas`,{params:{cliente_id:selected.value.id}}))}
    const responses=await Promise.all(requests)
    clientEquipment.value=indexes.equipment===undefined?[]:(responses[indexes.equipment].data.data||[]).sort((a,b)=>Number(b.id)-Number(a.id))
    clientOrders.value=indexes.orders===undefined?[]:responses[indexes.orders].data.data||[]
  }catch(error){notifyError(error,'No se pudo cargar la ficha completa del cliente.')}finally{detailLoading.value=false}
}

function openEquipment(row=null,schedule=false){
  if(!selected.value)return
  fieldErrors.clear()
  editingEquipmentId.value=row?.id||null;scheduleAfterEquipmentSave.value=Boolean(schedule)
  Object.assign(equipmentForm,emptyEquipment(),{tipo:equipmentTypes.value[0]||'Aire acondicionado Split'})
  if(row)Object.assign(equipmentForm,{tipo:row.tipo||equipmentTypes.value[0]||'Aire acondicionado Split',marca:row.marca||'',modelo:row.modelo||'',serie:row.serie||'',capacidad:row.capacidad||'',ubicacion:row.ubicacion||'',observaciones:row.observaciones||'',activo:Boolean(row.activo)})
  equipmentDialog.value=true
}
async function saveEquipment(forceSchedule=false){
  fieldErrors.clear()
  if(!selected.value||!String(equipmentForm.tipo||'').trim())fieldErrors.set('tipo','Selecciona o escribe el tipo de equipo.')
  if(fieldErrors.has('tipo')){fieldErrors.scrollToFirst();return}
  saving.value=true
  try{
    const payload=clean({...equipmentForm,cliente_id:selected.value.id})
    const response=editingEquipmentId.value?await api.put(`${base.value}/equipos/${editingEquipmentId.value}`,payload):await api.post(`${base.value}/equipos`,payload)
    const equipmentId=Number(response.data?.data?.id||editingEquipmentId.value||0)
    const shouldSchedule=Boolean(forceSchedule||scheduleAfterEquipmentSave.value)
    equipmentDialog.value=false
    await loadClientContext()
    $q.notify({type:'positive',message:editingEquipmentId.value?'Equipo actualizado.':'Equipo registrado dentro de la ficha del cliente.'})
    if(shouldSchedule&&equipmentId>0)scheduleAppointment(equipmentId)
  }catch(error){notifyError(error,'No se pudo guardar el equipo. Revisa los campos marcados.',true)}finally{saving.value=false;scheduleAfterEquipmentSave.value=false}
}

function scheduleAppointment(equipmentId=null){
  if(!selected.value||!hasModule('ordenes'))return
  if(!equipmentId&&hasModule('equipos')&&clientEquipment.value.length===0){openEquipment(null,true);return}
  fieldErrors.clear()
  const resolvedEquipment=equipmentId||(clientEquipment.value.filter(item=>item.activo).length===1?clientEquipment.value.find(item=>item.activo)?.id:null)
  Object.assign(appointmentForm,emptyAppointment(),{
    equipo_id:resolvedEquipment||null,
    tipo_servicio:serviceTypes.value[0]||'Diagnóstico',
    direccion_servicio:selected.value.direccion||'',
    referencia_ubicacion:selected.value.referencia||'',
  })
  appointmentDialog.value=true
}
async function saveAppointment(){
  fieldErrors.clear()
  if(!appointmentForm.fecha_cita)fieldErrors.set('fecha_cita','Selecciona la fecha de la visita.')
  if(!String(appointmentForm.direccion_servicio||'').trim())fieldErrors.set('direccion_servicio','Indica la dirección donde se realizará la visita.')
  if(!String(appointmentForm.problema_reportado||'').trim())fieldErrors.set('problema_reportado','Describe brevemente el problema reportado por el cliente.')
  if(Object.keys(fieldErrors.errors).length){fieldErrors.scrollToFirst();return}
  saving.value=true
  try{
    const response=await api.post(`${base.value}/ordenes-operativas`,clean({
      cliente_id:selected.value.id,equipo_id:appointmentForm.equipo_id,tecnico_id:null,tipo_servicio:appointmentForm.tipo_servicio,
      fecha_cita:appointmentForm.fecha_cita,hora_cita:appointmentForm.hora_cita,direccion_servicio:appointmentForm.direccion_servicio,
      referencia_ubicacion:appointmentForm.referencia_ubicacion,problema_reportado:appointmentForm.problema_reportado,prioridad:appointmentForm.prioridad,
      diagnostico:null,propuesta:null,trabajo_realizado:null,recomendaciones:null,costo_mano_obra:0,descuento:0,
    }))
    appointmentDialog.value=false
    await loadClientContext()
    const created=response.data?.data
    $q.notify({type:'positive',message:'Cita registrada. Ya aparece en Agenda y en la ficha del cliente.',timeout:4500,actions:created?.id?[{label:'Abrir servicio',color:'white',handler:()=>openService(created)}]:[]})
  }catch(error){notifyError(error,'No se pudo agendar la cita. Revisa los campos marcados.',true)}finally{saving.value=false}
}
function openService(row){detailDialog.value=false;router.push({path:`${appBase.value}/ordenes`,query:{servicio:String(row.id)}})}

function openAccess(row){fieldErrors.clear();selected.value=row;Object.assign(accessForm,{usuario:row.acceso_usuario||'',documento:row.acceso_documento||'',telefono:row.acceso_telefono||row.telefono||'',password:'',password_confirmation:''});accessDialog.value=true}
async function saveAccess(){
  if(!selected.value)return
  fieldErrors.clear()
  if(!String(accessForm.usuario||'').trim())fieldErrors.set('usuario','Ingresa el usuario que utilizará el cliente.')
  if(!selected.value?.acceso_usuario_id&&!accessForm.password)fieldErrors.set('password','Crea una contraseña para habilitar el acceso.')
  if(accessForm.password&&accessForm.password!==accessForm.password_confirmation)fieldErrors.set('password_confirmation','Las contraseñas no coinciden.')
  if(Object.keys(fieldErrors.errors).length){fieldErrors.scrollToFirst();return}
  saving.value=true
  try{await api.post(`${base.value}/clientes/${selected.value.id}/acceso`,{...accessForm});accessDialog.value=false;$q.notify({type:'positive',message:'Acceso del cliente guardado.'});await load()}
  catch(error){notifyError(error,'No se pudo guardar el acceso. Revisa los campos marcados.',true)}finally{saving.value=false}
}
function revokeAccess(row){$q.dialog({title:'Revocar acceso',message:`${row.nombre} ya no podrá entrar al portal, pero su historial se conservará.`,cancel:true,persistent:true}).onOk(async()=>{try{await api.delete(`${base.value}/clientes/${row.id}/acceso`);await load();$q.notify({type:'positive',message:'Acceso revocado.'})}catch(error){notifyError(error,'No se pudo revocar el acceso.')}})}

onMounted(load)
</script>

<template>
  <q-page padding class="clients-page">
    <div class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md"><div class="text-overline text-primary text-weight-bold">Clientes</div><h1 class="text-h4 text-weight-bold q-my-xs">Clientes y atención</h1><div class="text-body2 text-grey-7">Cada cliente concentra sus datos, equipos y citas. Entra a su ficha para agregar otro equipo o programar una nueva visita sin volver a registrar la misma información.</div></div>
      <div class="col-12 col-md-auto row q-gutter-sm"><q-btn outline color="primary" icon="refresh" label="Actualizar" no-caps :loading="loading" @click="load"/><q-btn color="primary" icon="person_add" label="Nuevo cliente" no-caps @click="openForm()"/></div>
    </div>

    <q-banner rounded class="flow-banner q-mb-lg"><template #avatar><q-icon name="account_tree" color="primary"/></template><strong>Flujo rápido:</strong> registra al cliente una sola vez → agrega uno o varios equipos → agenda las visitas desde esa misma ficha.</q-banner>

    <q-card flat bordered>
      <q-card-section><q-input v-model="search" outlined dense clearable debounce="180" label="Buscar cliente"><template #prepend><q-icon name="search"/></template></q-input></q-card-section><q-separator/>
      <q-table flat :rows="rows" :columns="columns" row-key="id" :loading="loading" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}" no-data-label="Aún no hay clientes registrados.">
        <template #body-cell-nombre="props"><q-td :props="props"><div class="text-weight-bold">{{props.row.nombre}}</div><div class="text-caption text-grey-7">Registro #{{props.row.id}}</div></q-td></template>
        <template #body-cell-portal="props"><q-td :props="props"><q-badge outline :color="props.row.acceso_usuario_id&&props.row.acceso_estado==='activo'?'positive':'grey'" :label="props.row.acceso_usuario_id?(props.row.acceso_estado==='activo'?'Habilitado':'Revocado'):'Sin acceso'"/></q-td></template>
        <template #body-cell-estado="props"><q-td :props="props"><q-badge :color="props.row.activo?'positive':'grey'" :label="props.row.activo?'Activo':'Inactivo'"/></q-td></template>
        <template #body-cell-acciones="props"><q-td :props="props"><q-btn flat round dense color="primary" icon="folder_shared" @click="openClient(props.row)"><q-tooltip>Abrir ficha: equipos y citas</q-tooltip></q-btn><q-btn v-if="canManage" flat round dense color="primary" icon="manage_accounts" @click="openAccess(props.row)"><q-tooltip>Acceso al portal</q-tooltip></q-btn><q-btn v-if="canManage&&props.row.acceso_usuario_id&&props.row.acceso_estado==='activo'" flat round dense color="orange" icon="person_off" @click="revokeAccess(props.row)"><q-tooltip>Revocar acceso</q-tooltip></q-btn><q-btn flat round dense icon="edit" @click="openForm(props.row)"/><q-btn flat round dense color="negative" icon="delete" @click="remove(props.row)"/></q-td></template>
        <template #item="props"><div class="q-pa-xs col-12 col-sm-6"><q-card flat bordered class="client-card cursor-pointer" @click="openClient(props.row)"><q-card-section><div class="row items-start no-wrap"><q-avatar color="primary" text-color="white" icon="person"/><div class="col q-ml-md"><div class="text-weight-bold">{{props.row.nombre}}</div><div class="text-caption text-grey-7">{{props.row.telefono||'Sin teléfono'}}</div><div class="text-body2 q-mt-xs">{{props.row.direccion||'Sin dirección'}}</div><div class="text-caption text-primary q-mt-sm">Abrir equipos y citas</div></div><q-icon name="chevron_right" color="grey-5" size="28px"/></div></q-card-section></q-card></div></template>
      </q-table>
    </q-card>

    <q-dialog v-model="detailDialog" :maximized="$q.screen.lt.md">
      <q-card v-if="selected" class="client-detail-card">
        <q-card-section class="client-detail-header"><div class="row items-start q-col-gutter-md"><div class="col-auto"><q-avatar size="52px" color="primary" text-color="white" icon="person"/></div><div class="col"><div class="text-overline">Ficha del cliente</div><div class="text-h5 text-weight-bold">{{selected.nombre}}</div><div class="text-caption">{{selected.telefono||'Sin teléfono'}} · {{selected.direccion||'Sin dirección registrada'}}</div></div><div class="col-auto row q-gutter-xs"><q-btn flat round color="white" icon="edit" @click="openForm(selected)"><q-tooltip>Editar cliente</q-tooltip></q-btn><q-btn flat round color="white" icon="close" v-close-popup/></div></div></q-card-section>
        <q-linear-progress v-if="detailLoading" indeterminate color="primary"/>
        <q-card-section class="q-pa-lg">
          <div class="row q-col-gutter-sm q-mb-lg"><div class="col-4"><q-card flat bordered class="summary-card"><q-card-section><div class="text-h5 text-weight-bold">{{clientSummary.equipos}}</div><div class="text-caption text-grey-7">Equipos</div></q-card-section></q-card></div><div class="col-4"><q-card flat bordered class="summary-card"><q-card-section><div class="text-h5 text-weight-bold">{{clientSummary.citas}}</div><div class="text-caption text-grey-7">Atenciones abiertas</div></q-card-section></q-card></div><div class="col-4"><q-card flat bordered class="summary-card"><q-card-section><div class="text-h5 text-weight-bold">{{clientSummary.servicios}}</div><div class="text-caption text-grey-7">Servicios totales</div></q-card-section></q-card></div></div>
          <div class="row q-col-gutter-sm q-mb-xl"><div v-if="hasModule('equipos')" class="col-12 col-sm-auto"><q-btn color="primary" icon="add_circle" label="Agregar equipo" no-caps @click="openEquipment()"/></div><div v-if="hasModule('ordenes')" class="col-12 col-sm-auto"><q-btn outline color="primary" icon="event_available" label="Agendar cita" no-caps @click="scheduleAppointment()"/></div></div>

          <section v-if="hasModule('equipos')" class="detail-section q-mb-xl">
            <div class="row items-center q-mb-md"><div><div class="text-h6 text-weight-bold">Equipos del cliente</div><div class="text-caption text-grey-7">Agrega todos los equipos del mismo cliente y agenda cada visita sobre el equipo correcto.</div></div><q-space/><q-btn flat color="primary" icon="add" label="Otro equipo" no-caps @click="openEquipment()"/></div>
            <div v-if="clientEquipment.length" class="equipment-grid"><q-card v-for="item in clientEquipment" :key="item.id" flat bordered class="equipment-card"><q-card-section><div class="row items-start no-wrap"><q-avatar color="blue-1" text-color="primary" icon="ac_unit"/><div class="col q-ml-md"><div class="text-weight-bold">{{equipmentLabel(item)}}</div><div class="text-caption text-grey-7">{{item.serie?`Serie ${item.serie}`:'Sin serie'}} · {{item.capacidad||'Capacidad sin registrar'}}</div><div class="text-caption q-mt-xs">{{item.ubicacion||'Ubicación sin registrar'}}</div></div><q-badge :color="item.activo?'positive':'grey'" :label="item.activo?'Activo':'Inactivo'"/></div></q-card-section><q-separator/><q-card-actions align="right"><q-btn flat icon="edit" label="Editar" no-caps @click="openEquipment(item)"/><q-btn v-if="hasModule('ordenes')&&item.activo" flat color="primary" icon="event_available" label="Agendar cita" no-caps @click="scheduleAppointment(item.id)"/></q-card-actions></q-card></div>
            <q-banner v-else rounded class="empty-banner"><template #avatar><q-icon name="ac_unit" color="primary"/></template>Este cliente todavía no tiene equipos registrados.<template #action><q-btn color="primary" flat label="Registrar equipo" no-caps @click="openEquipment()"/><q-btn v-if="hasModule('ordenes')" color="primary" label="Registrar y agendar" no-caps @click="openEquipment(null,true)"/></template></q-banner>
          </section>

          <section v-if="hasModule('ordenes')" class="detail-section">
            <div class="row items-center q-mb-md"><div><div class="text-h6 text-weight-bold">Citas y servicios</div><div class="text-caption text-grey-7">Todas las atenciones del mismo cliente, vinculadas a su equipo.</div></div><q-space/><q-btn flat color="primary" icon="event_available" label="Nueva cita" no-caps @click="scheduleAppointment()"/></div>
            <q-list v-if="orderedClientOrders.length" bordered separator class="rounded-borders"><q-item v-for="order in orderedClientOrders.slice(0,20)" :key="order.id" clickable @click="openService(order)"><q-item-section avatar><q-avatar :color="stateColor(order)" text-color="white" icon="event"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{order.codigo}} · {{equipmentLabel(order)}}</q-item-label><q-item-label caption>{{date(order.fecha_cita)}} {{time(order.hora_cita)}} · {{order.tipo_servicio||'Servicio técnico'}} · {{order.problema_reportado}}</q-item-label></q-item-section><q-item-section side><q-badge :color="stateColor(order)" :label="pretty(currentState(order))"/><q-icon name="chevron_right" class="q-mt-xs"/></q-item-section></q-item></q-list>
            <q-banner v-else rounded class="empty-banner"><template #avatar><q-icon name="event_available" color="primary"/></template>Todavía no hay citas ni servicios para este cliente.<template #action><q-btn color="primary" flat label="Agendar primera cita" no-caps @click="scheduleAppointment()"/></template></q-banner>
          </section>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="equipmentDialog" persistent><q-card class="equipment-dialog"><q-card-section class="row items-start"><div><div class="text-overline text-primary">{{selected?.nombre}}</div><div class="text-h5 text-weight-bold">{{editingEquipmentId?'Editar equipo':'Registrar equipo'}}</div><div class="text-caption text-grey-7">Quedará vinculado automáticamente a este cliente.</div></div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section><q-separator/><q-card-section class="row q-col-gutter-md q-gutter-y-md"><div class="col-12 col-sm-6" data-error-field="tipo"><q-select v-model="equipmentForm.tipo" outlined use-input fill-input hide-selected new-value-mode="add-unique" :options="equipmentTypes" label="Tipo de equipo *" :error="fieldErrors.has('tipo')" :error-message="fieldErrors.message('tipo')" @update:model-value="clearField('tipo')"/></div><div class="col-12 col-sm-6" data-error-field="marca"><q-input v-model="equipmentForm.marca" outlined label="Marca" :error="fieldErrors.has('marca')" :error-message="fieldErrors.message('marca')" @update:model-value="clearField('marca')"/></div><div class="col-12 col-sm-6" data-error-field="modelo"><q-input v-model="equipmentForm.modelo" outlined label="Modelo" :error="fieldErrors.has('modelo')" :error-message="fieldErrors.message('modelo')" @update:model-value="clearField('modelo')"/></div><div class="col-12 col-sm-6" data-error-field="serie"><q-input v-model="equipmentForm.serie" outlined label="Serie" :error="fieldErrors.has('serie')" :error-message="fieldErrors.message('serie')" @update:model-value="clearField('serie')"/></div><div class="col-12 col-sm-6" data-error-field="capacidad"><q-input v-model="equipmentForm.capacidad" outlined label="Capacidad" :error="fieldErrors.has('capacidad')" :error-message="fieldErrors.message('capacidad')" @update:model-value="clearField('capacidad')"/></div><div class="col-12 col-sm-6" data-error-field="ubicacion"><q-input v-model="equipmentForm.ubicacion" outlined label="Ubicación dentro del inmueble" :error="fieldErrors.has('ubicacion')" :error-message="fieldErrors.message('ubicacion')" @update:model-value="clearField('ubicacion')"/></div><div class="col-12" data-error-field="observaciones"><q-input v-model="equipmentForm.observaciones" type="textarea" autogrow outlined label="Observaciones" :error="fieldErrors.has('observaciones')" :error-message="fieldErrors.message('observaciones')" @update:model-value="clearField('observaciones')"/></div><div class="col-12"><q-toggle v-model="equipmentForm.activo" label="Equipo activo"/></div></q-card-section><q-separator/><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn v-if="!editingEquipmentId&&hasModule('ordenes')" outline color="primary" icon="event_available" label="Guardar y agendar" no-caps :loading="saving" @click="saveEquipment(true)"/><q-btn color="primary" icon="save" :label="editingEquipmentId?'Guardar cambios':'Guardar equipo'" no-caps :loading="saving" @click="saveEquipment(false)"/></q-card-actions></q-card></q-dialog>

    <q-dialog v-model="appointmentDialog" persistent><q-card class="appointment-dialog"><q-card-section class="row items-start"><div><div class="text-overline text-primary">{{selected?.nombre}}</div><div class="text-h5 text-weight-bold">Agendar cita</div><div class="text-caption text-grey-7">La cita se convertirá en la ficha de servicio donde después se registra diagnóstico, propuesta, trabajo, pagos y garantía.</div></div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section><q-separator/><q-card-section class="row q-col-gutter-md q-gutter-y-md"><div v-if="hasModule('equipos')" class="col-12" data-error-field="equipo_id"><q-select v-model="appointmentForm.equipo_id" outlined clearable emit-value map-options :options="equipmentOptions" label="Equipo" hint="Puedes elegir otro equipo del mismo cliente." :error="fieldErrors.has('equipo_id')" :error-message="fieldErrors.message('equipo_id')" @update:model-value="clearField('equipo_id')"/></div><div class="col-12 col-md-6" data-error-field="tipo_servicio"><q-select v-model="appointmentForm.tipo_servicio" outlined use-input fill-input new-value-mode="add-unique" :options="serviceTypes" label="Tipo de servicio" :error="fieldErrors.has('tipo_servicio')" :error-message="fieldErrors.message('tipo_servicio')" @update:model-value="clearField('tipo_servicio')"/></div><div class="col-6 col-md-3" data-error-field="fecha_cita"><q-input v-model="appointmentForm.fecha_cita" outlined type="date" stack-label label="Fecha *" :min="todayValue()" :error="fieldErrors.has('fecha_cita')" :error-message="fieldErrors.message('fecha_cita')" @update:model-value="clearField('fecha_cita')"/></div><div class="col-6 col-md-3" data-error-field="hora_cita"><q-input v-model="appointmentForm.hora_cita" outlined type="time" stack-label label="Hora" :error="fieldErrors.has('hora_cita')" :error-message="fieldErrors.message('hora_cita')" @update:model-value="clearField('hora_cita')"/></div><div class="col-12 col-md-4" data-error-field="prioridad"><q-select v-model="appointmentForm.prioridad" outlined :options="['baja','normal','alta','urgente']" label="Prioridad" :error="fieldErrors.has('prioridad')" :error-message="fieldErrors.message('prioridad')" @update:model-value="clearField('prioridad')"/></div><div class="col-12 col-md-8" data-error-field="direccion_servicio"><q-input v-model="appointmentForm.direccion_servicio" outlined label="Dirección de la visita *" :error="fieldErrors.has('direccion_servicio')" :error-message="fieldErrors.message('direccion_servicio')" @update:model-value="clearField('direccion_servicio')"/></div><div class="col-12" data-error-field="referencia_ubicacion"><q-input v-model="appointmentForm.referencia_ubicacion" outlined label="Referencia de ubicación" :error="fieldErrors.has('referencia_ubicacion')" :error-message="fieldErrors.message('referencia_ubicacion')" @update:model-value="clearField('referencia_ubicacion')"/></div><div class="col-12" data-error-field="problema_reportado"><q-input v-model="appointmentForm.problema_reportado" outlined type="textarea" autogrow label="¿Qué problema reporta el cliente? *" :error="fieldErrors.has('problema_reportado')" :error-message="fieldErrors.message('problema_reportado')" @update:model-value="clearField('problema_reportado')"/></div></q-card-section><q-separator/><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" icon="event_available" label="Guardar cita" no-caps :loading="saving" @click="saveAppointment"/></q-card-actions></q-card></q-dialog>

    <q-dialog v-model="dialog" persistent><q-card style="width:720px;max-width:96vw"><q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">{{editingId?'Editar cliente':'Nuevo cliente'}}</div><div class="text-caption text-grey-7">Los campos con * son obligatorios. Si algún dato no es válido, VITI marcará exactamente dónde corregirlo.</div></div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section><q-separator/><q-card-section class="row q-col-gutter-md"><div class="col-12 col-sm-6" data-error-field="nombre"><q-input v-model="form.nombre" outlined label="Nombre *" :error="fieldErrors.has('nombre')" :error-message="fieldErrors.message('nombre')" @update:model-value="clearField('nombre')"/></div><div class="col-12 col-sm-6" data-error-field="telefono"><q-input v-model="form.telefono" outlined label="Teléfono" :error="fieldErrors.has('telefono')" :error-message="fieldErrors.message('telefono')" @update:model-value="clearField('telefono')"/></div><div class="col-12" data-error-field="direccion"><q-input v-model="form.direccion" outlined label="Dirección" :error="fieldErrors.has('direccion')" :error-message="fieldErrors.message('direccion')" @update:model-value="clearField('direccion')"/></div><div class="col-12" data-error-field="referencia"><q-input v-model="form.referencia" outlined label="Referencia" :error="fieldErrors.has('referencia')" :error-message="fieldErrors.message('referencia')" @update:model-value="clearField('referencia')"/></div><div class="col-12" data-error-field="observaciones"><q-input v-model="form.observaciones" type="textarea" autogrow outlined label="Observaciones" :error="fieldErrors.has('observaciones')" :error-message="fieldErrors.message('observaciones')" @update:model-value="clearField('observaciones')"/></div><div v-if="editingId" class="col-12"><q-toggle v-model="form.activo" label="Cliente activo"/></div></q-card-section><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" icon="save" :label="editingId?'Guardar cambios':'Guardar y continuar'" no-caps :loading="saving" @click="save"/></q-card-actions></q-card></q-dialog>

    <q-dialog v-model="accessDialog" persistent><q-card style="width:650px;max-width:96vw"><q-card-section class="row items-center"><div><div class="text-h6 text-weight-bold">Acceso al portal</div><div class="text-caption text-grey-7">{{selected?.nombre}}</div></div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section><q-separator/><q-card-section class="row q-col-gutter-md"><div class="col-12 col-sm-6" data-error-field="usuario"><q-input v-model="accessForm.usuario" outlined label="Usuario *" :error="fieldErrors.has('usuario')" :error-message="fieldErrors.message('usuario')" @update:model-value="clearField('usuario')"/></div><div class="col-12 col-sm-6" data-error-field="documento"><q-input v-model="accessForm.documento" outlined label="CI / documento" :error="fieldErrors.has('documento')" :error-message="fieldErrors.message('documento')" @update:model-value="clearField('documento')"/></div><div class="col-12" data-error-field="telefono"><q-input v-model="accessForm.telefono" outlined label="Teléfono" :error="fieldErrors.has('telefono')" :error-message="fieldErrors.message('telefono')" @update:model-value="clearField('telefono')"/></div><div class="col-12 col-sm-6" data-error-field="password"><q-input v-model="accessForm.password" type="password" outlined :label="selected?.acceso_usuario_id?'Nueva contraseña (opcional)':'Contraseña *'" :error="fieldErrors.has('password')" :error-message="fieldErrors.message('password')" @update:model-value="clearField('password')"/></div><div class="col-12 col-sm-6" data-error-field="password_confirmation"><q-input v-model="accessForm.password_confirmation" type="password" outlined label="Confirmar contraseña" :error="fieldErrors.has('password_confirmation')" :error-message="fieldErrors.message('password_confirmation')" @update:model-value="clearField('password_confirmation')"/></div></q-card-section><q-card-actions align="right" class="q-pa-md"><q-btn flat label="Cancelar" no-caps v-close-popup/><q-btn color="primary" icon="save" label="Guardar acceso" no-caps :loading="saving" @click="saveAccess"/></q-card-actions></q-card></q-dialog>
  </q-page>
</template>

<style scoped>
.clients-page{max-width:1500px;margin:0 auto}.clients-page h1{color:var(--viti-text)}.client-card,.summary-card,.equipment-card{height:100%;border-radius:16px}.q-card{border-color:var(--viti-border)}.flow-banner,.empty-banner{background:color-mix(in srgb,var(--electro-primary) 7%,var(--viti-card));border:1px solid color-mix(in srgb,var(--electro-primary) 20%,var(--viti-border));color:var(--viti-text)}.client-detail-card{width:min(1050px,97vw);max-width:97vw;border-radius:22px;overflow:hidden}.client-detail-header{background:linear-gradient(135deg,var(--electro-primary),color-mix(in srgb,var(--electro-primary) 72%,black));color:white}.summary-card{text-align:center}.equipment-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.equipment-dialog,.appointment-dialog{width:min(760px,96vw);border-radius:20px}.detail-section{scroll-margin-top:20px}
@media(max-width:700px){.clients-page{padding:12px}.clients-page h1{font-size:25px;line-height:1.2}.client-detail-card{width:100%;max-width:100%;border-radius:0}.equipment-grid{grid-template-columns:1fr}.summary-card .q-card__section{padding:12px 6px}.summary-card .text-h5{font-size:20px}.client-detail-header{padding-top:18px}}
</style>