<script setup>
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { formatDateTime } from '../utils/date'

const $q=useQuasar(),route=useRoute()
const allModules=['inicio','agenda','ordenes','clientes','equipos','tecnicos','inventario','pagos','garantias','historial','buzon']
const planModules=inject('electrofrioModules',computed(()=>allModules))
const canManage=inject('electrofrioCanManage',computed(()=>true))
const enabled=module=>planModules.value.includes(module)
const base=computed(()=>route.path.startsWith('/mi-apps/electrofrio')?'/mi/apps/electrofrio':'/apps/electrofrio')
const loading=ref(false),resumen=ref({clientes:0,equipos:0,citas_hoy:0,ordenes_abiertas:0,por_cobrar:0,ingresos_mes:0,garantias_vigentes:0,stock_bajo:0,agenda_hoy:[]})
const clientes=ref([]),equipos=ref([]),tecnicos=ref([]),usuariosNegocio=ref([]),materiales=ref([]),ordenes=ref([]),pagos=ref([]),garantias=ref([]),historial=ref([])
const dialog=ref(false),dialogType=ref(''),editingId=ref(null),detailDialog=ref(false),selectedOrder=ref(null)
const paymentDialog=ref(false),paymentOrder=ref(null),materialDialog=ref(false),materialOrder=ref(null),finishDialog=ref(false),finishOrder=ref(null)
const accessDialog=ref(false),accessClient=ref(null),search=ref('')
const loaded=new Set()

const clienteForm=reactive({nombre:'',telefono:'',direccion:'',referencia:'',observaciones:'',activo:true})
const equipoForm=reactive({cliente_id:null,tipo:'Aire acondicionado',marca:'',modelo:'',serie:'',capacidad:'',ubicacion:'',observaciones:'',activo:true})
const tecnicoForm=reactive({usuario_id:null,nombre:'',telefono:'',especialidad:'',activo:true})
const materialForm=reactive({nombre:'',unidad:'unidad',stock:0,stock_minimo:0,costo_unitario:0,activo:true})
const ordenForm=reactive({cliente_id:null,equipo_id:null,tecnico_id:null,fecha_cita:'',hora_cita:'',direccion_servicio:'',referencia_ubicacion:'',problema_reportado:'',prioridad:'normal',diagnostico:'',propuesta:'',trabajo_realizado:'',recomendaciones:'',costo_mano_obra:0,descuento:0})
const pagoForm=reactive({monto:0,metodo:'efectivo',referencia:''})
const usoForm=reactive({material_id:null,cantidad:1})
const finishForm=reactive({trabajo_realizado:'',recomendaciones:'',garantia_dias:0,condiciones_garantia:''})
const accessForm=reactive({usuario:'',documento:'',telefono:'',password:'',password_confirmation:''})

const section=computed(()=>route.meta.electroSection||'inicio')
const title=computed(()=>({inicio:'Inicio',agenda:'Agenda',ordenes:'Órdenes de servicio',clientes:'Clientes y equipos',equipos:'Clientes y equipos',tecnicos:'Técnicos',inventario:'Inventario técnico',pagos:'Pagos',garantias:'Garantías',historial:'Historial y reportes'}[section.value]||'Electrofrío'))
const activeClientes=computed(()=>clientes.value.filter(x=>x.activo))
const activeTecnicos=computed(()=>tecnicos.value.filter(x=>x.activo))
const activeMaterials=computed(()=>materiales.value.filter(x=>x.activo&&Number(x.stock)>0))
const clientEquipment=computed(()=>equipos.value.filter(x=>x.activo&&Number(x.cliente_id)===Number(ordenForm.cliente_id)))
const openOrders=computed(()=>ordenes.value.filter(x=>x.etapa!=='cerrada'))
const agendaOrders=computed(()=>[...openOrders.value].sort((a,b)=>`${a.fecha_cita} ${a.hora_cita||''}`.localeCompare(`${b.fecha_cita} ${b.hora_cita||''}`)))
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const matches=row=>!search.value||normalize(Object.values(row||{}).join(' ')).includes(normalize(search.value.trim()))
const filteredClientes=computed(()=>clientes.value.filter(matches))
const filteredEquipos=computed(()=>equipos.value.filter(matches))
const filteredTecnicos=computed(()=>tecnicos.value.filter(matches))
const filteredMateriales=computed(()=>materiales.value.filter(matches))
const filteredPagos=computed(()=>pagos.value.filter(matches))
const filteredGarantias=computed(()=>garantias.value.filter(matches))
const filteredHistorial=computed(()=>historial.value.filter(matches))
const filteredOpenOrders=computed(()=>openOrders.value.filter(matches))
const filteredAgendaOrders=computed(()=>agendaOrders.value.filter(matches))

const orderColumns=[
  {name:'codigo',label:'Orden',field:'codigo',align:'left'},
  {name:'fecha',label:'Cita',field:r=>`${date(r.fecha_cita)} ${shortTime(r.hora_cita)}`,align:'left'},
  {name:'cliente',label:'Cliente',field:'cliente_nombre',align:'left'},
  {name:'equipo',label:'Equipo',field:r=>equipmentLabel(r),align:'left'},
  {name:'etapa',label:'Etapa',field:'etapa',align:'left'},
  {name:'total',label:'Total',field:'total',align:'right'},
  {name:'actions',label:'',field:'actions',align:'right'},
]
const clientColumns=[{name:'nombre',label:'Cliente',field:'nombre',align:'left'},{name:'telefono',label:'Teléfono',field:'telefono',align:'left'},{name:'direccion',label:'Dirección',field:'direccion',align:'left'},{name:'acceso',label:'Portal',field:'acceso_usuario',align:'left'},{name:'activo',label:'Estado',field:'activo',align:'left'},{name:'actions',label:'',field:'actions',align:'right'}]
const equipmentColumns=[{name:'tipo',label:'Equipo',field:r=>`${r.tipo}${r.marca?` · ${r.marca}`:''}`,align:'left'},{name:'cliente',label:'Cliente',field:'cliente_nombre',align:'left'},{name:'modelo',label:'Modelo / Capacidad',field:r=>[r.modelo,r.capacidad].filter(Boolean).join(' · '),align:'left'},{name:'ubicacion',label:'Ubicación',field:'ubicacion',align:'left'},{name:'actions',label:'',field:'actions',align:'right'}]
const technicianColumns=[{name:'nombre',label:'Técnico',field:'nombre',align:'left'},{name:'telefono',label:'Teléfono',field:'telefono',align:'left'},{name:'especialidad',label:'Especialidad',field:'especialidad',align:'left'},{name:'activo',label:'Estado',field:'activo',align:'left'},{name:'actions',label:'',field:'actions',align:'right'}]
const materialColumns=[{name:'nombre',label:'Material',field:'nombre',align:'left'},{name:'stock',label:'Stock',field:r=>`${number(r.stock)} ${r.unidad}`,align:'left'},{name:'minimo',label:'Mínimo',field:r=>`${number(r.stock_minimo)} ${r.unidad}`,align:'left'},{name:'costo',label:'Costo unitario',field:'costo_unitario',align:'right'},{name:'actions',label:'',field:'actions',align:'right'}]
const paymentColumns=[{name:'fecha',label:'Fecha',field:'pagado_at',align:'left'},{name:'orden',label:'Orden',field:'orden_codigo',align:'left'},{name:'cliente',label:'Cliente',field:'cliente_nombre',align:'left'},{name:'metodo',label:'Método',field:'metodo',align:'left'},{name:'monto',label:'Monto',field:'monto',align:'right'}]
const warrantyColumns=[{name:'codigo',label:'Orden',field:'codigo',align:'left'},{name:'cliente',label:'Cliente',field:'cliente_nombre',align:'left'},{name:'equipo',label:'Equipo',field:r=>equipmentLabel(r),align:'left'},{name:'inicio',label:'Inicio',field:'garantia_inicio',align:'left'},{name:'fin',label:'Vence',field:'garantia_fin',align:'left'},{name:'estado',label:'Estado',field:r=>warrantyState(r),align:'left'},{name:'actions',label:'',field:'actions',align:'right'}]

const money=v=>`${Number(v||0).toFixed(2)} Bs`
const number=v=>Number(v||0).toLocaleString('es-BO',{maximumFractionDigits:2})
const pretty=v=>String(v||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const date=v=>v?new Date(`${String(v).slice(0,10)}T12:00:00`).toLocaleDateString('es-BO'):'—'
const shortTime=v=>v?String(v).slice(0,5):''
const equipmentLabel=r=>[r.equipo_tipo,r.equipo_marca,r.equipo_modelo].filter(Boolean).join(' · ')||'Sin equipo'
const stageColor=v=>({cita:'blue',diagnostico:'purple',propuesta:'orange',servicio:'teal',cerrada:'grey'}[v]||'grey')
const priorityColor=v=>({baja:'grey',normal:'blue',alta:'orange',urgente:'negative'}[v]||'grey')
const warrantyState=r=>String(r.garantia_fin||'')>=new Date().toISOString().slice(0,10)?'Vigente':'Vencida'
const clean=data=>Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v===''?null:v]))
const notifyError=(e,msg='No se pudo completar la operación.')=>$q.notify({type:'negative',message:e.response?.data?.message||msg})

const dataStores={resumen,clientes,equipos,tecnicos,usuarios:usuariosNegocio,materiales,ordenes,pagos,garantias,historial}
const datasets={
  inicio:[['resumen','inicio','resumen'],['ordenes','ordenes','ordenes']],
  agenda:[['ordenes','ordenes','ordenes']],ordenes:[['ordenes','ordenes','ordenes']],
  clientes:[['clientes','clientes','clientes'],['equipos','equipos','equipos']],equipos:[['clientes','clientes','clientes'],['equipos','equipos','equipos']],
  tecnicos:[['tecnicos','tecnicos','tecnicos'],['usuarios','tecnicos','usuarios-negocio']],
  inventario:[['materiales','inventario','materiales'],['resumen','inicio','resumen']],
  pagos:[['pagos','pagos','pagos'],['resumen','inicio','resumen']],garantias:[['garantias','garantias','garantias']],historial:[['historial','historial','historial']],
}
const datasetByKey=new Map(Object.values(datasets).flat().map(item=>[item[0],item]))
async function fetchDatasets(items,{force=false}={}){
  const pending=items.filter(([key,module])=>enabled(module)&&(force||!loaded.has(key)))
  if(!pending.length)return
  loading.value=true
  try{
    const responses=await Promise.all(pending.map(([, ,endpoint])=>api.get(`${base.value}/${endpoint}`)))
    pending.forEach(([key],index)=>{dataStores[key].value=responses[index].data.data;loaded.add(key)})
  }catch(e){notifyError(e,'No se pudieron cargar los datos de Electrofrío.')}finally{loading.value=false}
}
const loadSection=force=>fetchDatasets(datasets[section.value]||[],{force})
const ensureDatasets=keys=>fetchDatasets(keys.map(key=>datasetByKey.get(key)).filter(Boolean))

function reset(type){
  editingId.value=null;dialogType.value=type
  if(type==='cliente')Object.assign(clienteForm,{nombre:'',telefono:'',direccion:'',referencia:'',observaciones:'',activo:true})
  if(type==='equipo')Object.assign(equipoForm,{cliente_id:null,tipo:'Aire acondicionado',marca:'',modelo:'',serie:'',capacidad:'',ubicacion:'',observaciones:'',activo:true})
  if(type==='tecnico')Object.assign(tecnicoForm,{usuario_id:null,nombre:'',telefono:'',especialidad:'',activo:true})
  if(type==='material')Object.assign(materialForm,{nombre:'',unidad:'unidad',stock:0,stock_minimo:0,costo_unitario:0,activo:true})
  if(type==='orden')Object.assign(ordenForm,{cliente_id:null,equipo_id:null,tecnico_id:null,fecha_cita:new Date().toISOString().slice(0,10),hora_cita:'09:00',direccion_servicio:'',referencia_ubicacion:'',problema_reportado:'',prioridad:'normal',diagnostico:'',propuesta:'',trabajo_realizado:'',recomendaciones:'',costo_mano_obra:0,descuento:0})
}
async function open(type,row=null){
  const dependencies={orden:['clientes','equipos','tecnicos'],equipo:['clientes'],tecnico:['usuarios'],material:['materiales']}
  if(dependencies[type])await ensureDatasets(dependencies[type])
  reset(type)
  if(row){
    editingId.value=row.id
    if(type==='cliente')Object.assign(clienteForm,row)
    if(type==='equipo')Object.assign(equipoForm,row)
    if(type==='tecnico')Object.assign(tecnicoForm,row)
    if(type==='material')Object.assign(materialForm,row)
    if(type==='orden')Object.assign(ordenForm,row,{fecha_cita:String(row.fecha_cita||'').slice(0,10),hora_cita:shortTime(row.hora_cita)})
  }
  dialog.value=true
}
async function saveDialog(){
  try{
    const forms={cliente:clienteForm,equipo:equipoForm,tecnico:tecnicoForm,material:materialForm,orden:ordenForm}
    const endpoints={cliente:'clientes',equipo:'equipos',tecnico:'tecnicos',material:'materiales',orden:'ordenes'}
    const endpoint=endpoints[dialogType.value],body=clean({...forms[dialogType.value]})
    if(editingId.value)await api.put(`${base.value}/${endpoint}/${editingId.value}`,body);else await api.post(`${base.value}/${endpoint}`,body)
    dialog.value=false;$q.notify({type:'positive',message:'Datos guardados correctamente.'});await loadSection(true)
  }catch(e){notifyError(e)}
}
function remove(type,row){
  const endpoints={cliente:'clientes',equipo:'equipos',tecnico:'tecnicos',material:'materiales',orden:'ordenes'}
  $q.dialog({title:'Confirmar eliminación',message:'¿Eliminar este registro? El historial protegido no se borrará.',cancel:true,persistent:true}).onOk(async()=>{try{await api.delete(`${base.value}/${endpoints[type]}/${row.id}`);await loadSection(true)}catch(e){notifyError(e)}})
}
function showOrder(row){selectedOrder.value=row;detailDialog.value=true}
function decide(row,decision){
  if(decision==='aceptado')$q.dialog({title:'Confirmar servicio',message:'¿El cliente aceptó la propuesta y autoriza continuar con el trabajo?',cancel:true,persistent:true}).onOk(()=>saveDecision(row,'aceptado'))
  else $q.dialog({title:'Cerrar sin servicio',message:'Indica por qué el cliente no aceptó la propuesta.',prompt:{model:'',type:'textarea',isValid:v=>String(v||'').trim().length>=3},cancel:true,persistent:true}).onOk(reason=>saveDecision(row,'rechazado',reason))
}
async function saveDecision(row,decision,motivo_rechazo=null){try{await api.post(`${base.value}/ordenes/${row.id}/decision`,{decision,motivo_rechazo});detailDialog.value=false;$q.notify({type:'positive',message:decision==='aceptado'?'Servicio autorizado.':'Orden cerrada sin servicio.'});await loadSection(true)}catch(e){notifyError(e)}}
function openFinish(row){finishOrder.value=row;Object.assign(finishForm,{trabajo_realizado:row.trabajo_realizado||'',recomendaciones:row.recomendaciones||'',garantia_dias:enabled('garantias')?Number(row.garantia_dias||0):0,condiciones_garantia:enabled('garantias')?(row.condiciones_garantia||''):''});finishDialog.value=true}
async function saveFinish(){try{const payload=clean({...finishForm});if(!enabled('garantias'))Object.assign(payload,{garantia_dias:0,condiciones_garantia:null});await api.post(`${base.value}/ordenes/${finishOrder.value.id}/finalizar`,payload);finishDialog.value=false;detailDialog.value=false;$q.notify({type:'positive',message:'Servicio finalizado y guardado en el historial.'});await loadSection(true)}catch(e){notifyError(e)}}
function openMaterial(row){materialOrder.value=row;Object.assign(usoForm,{material_id:null,cantidad:1});materialDialog.value=true}
async function saveMaterial(){try{await api.post(`${base.value}/ordenes/${materialOrder.value.id}/materiales`,{...usoForm});materialDialog.value=false;detailDialog.value=false;$q.notify({type:'positive',message:'Material registrado en la orden.'});await loadSection(true)}catch(e){notifyError(e)}}
async function removeMaterial(row,usage){try{await api.delete(`${base.value}/ordenes/${row.id}/materiales/${usage.material_id}`);detailDialog.value=false;await loadSection(true)}catch(e){notifyError(e)}}
function openPayment(row){paymentOrder.value=row;Object.assign(pagoForm,{monto:Number(row.saldo||0),metodo:'efectivo',referencia:''});paymentDialog.value=true}
async function savePayment(){try{await api.post(`${base.value}/ordenes/${paymentOrder.value.id}/pagos`,clean({...pagoForm}));paymentDialog.value=false;detailDialog.value=false;$q.notify({type:'positive',message:'Pago registrado.'});await loadSection(true)}catch(e){notifyError(e)}}
function mobileEdit(type,row){open(type,row)}

function openAccess(row){
  accessClient.value=row
  const suggested=normalize(row.nombre).replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'')
  Object.assign(accessForm,{usuario:row.acceso_usuario||(suggested.length>=4?suggested:`${suggested}.cliente`),documento:row.acceso_documento||'',telefono:row.acceso_telefono||row.telefono||'',password:'',password_confirmation:''})
  accessDialog.value=true
}
async function saveAccess(){
  try{await api.post(`${base.value}/clientes/${accessClient.value.id}/acceso`,clean({...accessForm}));accessDialog.value=false;$q.notify({type:'positive',message:'Acceso del cliente habilitado.'});await loadSection(true)}catch(e){notifyError(e)}
}
function revokeAccess(row){
  $q.dialog({title:'Revocar acceso',message:`${row.nombre} ya no podrá ingresar al portal, pero su historial y mensajes se conservarán.`,cancel:true,persistent:true}).onOk(async()=>{try{await api.delete(`${base.value}/clientes/${row.id}/acceso`);$q.notify({type:'positive',message:'Acceso revocado.'});await loadSection(true)}catch(e){notifyError(e)}})
}
function exportHistory(){
  const headers=['Orden','Fecha','Cliente','Equipo','Técnico','Estado','Total Bs','Trabajo realizado']
  const rows=filteredHistorial.value.map(row=>[row.codigo,String(row.fecha_cita||'').slice(0,10),row.cliente_nombre,equipmentLabel(row),row.tecnico_nombre||'',row.decision_cliente==='rechazado'?'No aceptado':'Finalizado',Number(row.total||0).toFixed(2),row.trabajo_realizado||row.motivo_rechazo||''])
  const csv=[headers,...rows].map(values=>values.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\n')
  const url=URL.createObjectURL(new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'})),link=document.createElement('a')
  link.href=url;link.download=`electrofrio-historial-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url)
}

onMounted(loadSection)
watch(()=>route.fullPath,()=>{search.value='';window.scrollTo({top:0,behavior:'smooth'});loadSection()})
</script>

<template>
<q-page class="electro-page q-pa-md q-pa-lg-xl">
  <q-inner-loading :showing="loading"/>
  <div class="page-heading" :class="{'page-heading--hero':section==='inicio'}">
    <div class="heading-copy"><div class="text-overline text-primary">Electrofrío · VITI App</div><div class="text-h4 text-weight-bold">{{title}}</div><div class="text-body2 text-grey-7">Citas, diagnóstico, servicio y control en un solo lugar.</div></div>
    <div class="heading-actions">
      <q-btn v-if="['inicio','agenda','ordenes'].includes(section)" color="primary" unelevated no-caps icon="add" label="Nueva orden" @click="open('orden')"/>
      <q-btn v-if="section==='clientes'" color="primary" unelevated no-caps icon="person_add" label="Nuevo cliente" @click="open('cliente')"/>
      <q-btn v-if="section==='clientes'&&enabled('equipos')" outline color="primary" no-caps icon="ac_unit" label="Nuevo equipo" @click="open('equipo')"/>
      <q-btn v-if="section==='tecnicos'" color="primary" unelevated no-caps icon="engineering" label="Nuevo técnico" @click="open('tecnico')"/>
      <q-btn v-if="section==='inventario'" color="primary" unelevated no-caps icon="add_box" label="Nuevo material" @click="open('material')"/>
      <q-btn v-if="section==='historial'" outline color="primary" no-caps icon="download" label="Exportar CSV" @click="exportHistory"/>
    </div>
  </div>

  <q-input v-if="section!=='inicio'" v-model="search" outlined clearable debounce="120" class="module-search q-mb-md" placeholder="Buscar en esta sección">
    <template #prepend><q-icon name="search"/></template>
  </q-input>

  <template v-if="section==='inicio'">
    <div class="metrics-grid">
      <q-card flat class="app-card metric-card"><q-card-section><div class="metric-icon"><q-icon name="groups" size="28px"/></div><div class="metric">{{resumen.clientes}}</div><div class="text-caption text-grey-6">Clientes activos</div></q-card-section></q-card>
      <q-card flat class="app-card metric-card"><q-card-section><div class="metric-icon"><q-icon name="event_available" size="28px"/></div><div class="metric">{{resumen.citas_hoy}}</div><div class="text-caption text-grey-6">Citas hoy</div></q-card-section></q-card>
      <q-card flat class="app-card metric-card"><q-card-section><div class="metric-icon"><q-icon name="assignment" size="28px"/></div><div class="metric">{{resumen.ordenes_abiertas}}</div><div class="text-caption text-grey-6">Órdenes abiertas</div></q-card-section></q-card>
      <q-card v-if="enabled('equipos')" flat class="app-card metric-card"><q-card-section><div class="metric-icon"><q-icon name="ac_unit" size="28px"/></div><div class="metric">{{resumen.equipos}}</div><div class="text-caption text-grey-6">Equipos registrados</div></q-card-section></q-card>
      <q-card v-if="enabled('pagos')" flat class="app-card metric-card metric-card--accent"><q-card-section><div class="metric-icon"><q-icon name="payments" size="28px"/></div><div class="metric money-metric">{{money(resumen.por_cobrar)}}</div><div class="text-caption text-grey-6">Por cobrar</div></q-card-section></q-card>
      <q-card v-if="enabled('garantias')" flat class="app-card metric-card metric-card--positive"><q-card-section><div class="metric-icon"><q-icon name="verified" size="28px"/></div><div class="metric">{{resumen.garantias_vigentes}}</div><div class="text-caption text-grey-6">Garantías vigentes</div></q-card-section></q-card>
      <q-card v-if="enabled('inventario')" flat class="app-card metric-card" :class="resumen.stock_bajo?'metric-card--warning':'metric-card--positive'"><q-card-section><div class="metric-icon"><q-icon name="inventory_2" size="28px"/></div><div class="metric">{{resumen.stock_bajo}}</div><div class="text-caption text-grey-6">Materiales con stock bajo</div></q-card-section></q-card>
    </div>
    <q-card flat class="app-card q-mt-lg"><q-card-section><div class="text-h6 text-weight-bold">Agenda de hoy</div><div class="text-caption text-grey-6">Visitas pendientes ordenadas por hora.</div></q-card-section><q-list separator><q-item v-for="row in resumen.agenda_hoy||[]" :key="row.id" clickable @click="showOrder(ordenes.find(x=>x.id===row.id)||row)"><q-item-section avatar><q-avatar color="primary" text-color="white" icon="event"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{shortTime(row.hora_cita)||'Sin hora'}} · {{row.cliente_nombre}}</q-item-label><q-item-label caption>{{row.direccion_servicio}} · {{row.problema_reportado}}</q-item-label></q-item-section><q-item-section side><q-badge :color="stageColor(row.etapa)">{{pretty(row.etapa)}}</q-badge></q-item-section></q-item><div v-if="!(resumen.agenda_hoy||[]).length" class="empty">No hay visitas programadas para hoy.</div></q-list></q-card>
  </template>

  <template v-else-if="section==='agenda'||section==='ordenes'">
    <q-table flat class="app-table" :rows="section==='agenda'?filteredAgendaOrders:filteredOpenOrders" :columns="orderColumns" row-key="id" :loading="loading" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}">
      <template #body-cell-etapa="p"><q-td :props="p"><q-badge :color="stageColor(p.value)">{{pretty(p.value)}}</q-badge><q-badge outline :color="priorityColor(p.row.prioridad)" class="q-ml-xs">{{pretty(p.row.prioridad)}}</q-badge></q-td></template>
      <template #body-cell-total="p"><q-td :props="p">{{money(p.value)}}</q-td></template>
      <template #body-cell-actions="p"><q-td :props="p"><q-btn flat round dense icon="visibility" color="primary" @click="showOrder(p.row)"/><q-btn flat round dense icon="edit" @click="open('orden',p.row)"/></q-td></template>
      <template #item="p"><div class="q-pa-xs col-12"><q-card flat class="mobile-card" @click="showOrder(p.row)"><q-card-section><div class="row items-start no-wrap"><q-avatar color="primary" text-color="white" icon="assignment"/><div class="col q-ml-md min-width-0"><div class="row items-center q-gutter-xs"><div class="text-subtitle1 text-weight-bold">{{p.row.codigo}}</div><q-badge :color="stageColor(p.row.etapa)">{{pretty(p.row.etapa)}}</q-badge></div><div class="text-weight-medium q-mt-xs">{{p.row.cliente_nombre}}</div><div class="text-caption text-grey-6">{{date(p.row.fecha_cita)}} {{shortTime(p.row.hora_cita)}} · {{equipmentLabel(p.row)}}</div><div class="text-caption ellipsis-2-lines q-mt-sm">{{p.row.problema_reportado}}</div><div class="row items-center q-mt-md"><div class="text-weight-bold text-primary">{{money(p.row.total)}}</div><q-space/><q-btn flat dense round icon="edit" @click.stop="open('orden',p.row)"/></div></div></div></q-card-section></q-card></div></template>
      <template #no-data><div class="empty full-width">No hay órdenes en esta sección.</div></template>
    </q-table>
  </template>

  <template v-else-if="section==='clientes'">
    <div class="section-caption"><div><div class="text-h6 text-weight-bold">Clientes</div><div class="text-caption text-grey-6">Datos de contacto y acceso al portal de seguimiento.</div></div></div>
    <q-table flat class="app-table" :rows="filteredClientes" :columns="clientColumns" row-key="id" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}">
      <template #body-cell-acceso="p"><q-td :props="p"><q-badge :color="p.row.acceso_usuario_id&&p.row.acceso_estado==='activo'?'positive':'grey'" outline>{{p.row.acceso_usuario_id?(p.row.acceso_estado==='activo'?'Habilitado':'Revocado'):'Sin acceso'}}</q-badge></q-td></template>
      <template #body-cell-activo="p"><q-td :props="p"><q-badge :color="p.value?'positive':'grey'">{{p.value?'Activo':'Inactivo'}}</q-badge></q-td></template>
      <template #body-cell-actions="p"><q-td :props="p"><q-btn v-if="canManage" flat round dense color="primary" :icon="p.row.acceso_usuario_id&&p.row.acceso_estado==='activo'?'manage_accounts':'person_add'" @click="openAccess(p.row)"><q-tooltip>{{p.row.acceso_usuario_id?'Editar acceso':'Habilitar portal'}}</q-tooltip></q-btn><q-btn v-if="canManage&&p.row.acceso_usuario_id&&p.row.acceso_estado==='activo'" flat round dense icon="person_off" color="orange" @click="revokeAccess(p.row)"><q-tooltip>Revocar acceso</q-tooltip></q-btn><q-btn flat round dense icon="edit" @click="open('cliente',p.row)"/><q-btn flat round dense icon="delete" color="negative" @click="remove('cliente',p.row)"/></q-td></template>
      <template #item="p"><div class="q-pa-xs col-12"><q-card flat class="mobile-card"><q-card-section class="row items-start no-wrap"><q-avatar color="primary" text-color="white" icon="person"/><div class="col q-ml-md min-width-0"><div class="text-subtitle1 text-weight-bold">{{p.row.nombre}}</div><div class="text-caption text-grey-6">{{p.row.telefono||'Sin teléfono'}}</div><div class="text-body2 q-mt-xs">{{p.row.direccion||'Sin dirección'}}</div><q-badge class="q-mt-sm" :color="p.row.acceso_usuario_id&&p.row.acceso_estado==='activo'?'positive':'grey'" outline>{{p.row.acceso_usuario_id&&p.row.acceso_estado==='activo'?'Portal habilitado':'Sin portal'}}</q-badge></div><q-btn flat round dense icon="more_vert"><q-menu><q-list><q-item v-if="canManage" clickable v-close-popup @click="openAccess(p.row)"><q-item-section>{{p.row.acceso_usuario_id?'Editar acceso':'Habilitar portal'}}</q-item-section></q-item><q-item v-if="canManage&&p.row.acceso_usuario_id&&p.row.acceso_estado==='activo'" clickable v-close-popup @click="revokeAccess(p.row)"><q-item-section>Revocar acceso</q-item-section></q-item><q-item clickable v-close-popup @click="mobileEdit('cliente',p.row)"><q-item-section>Editar</q-item-section></q-item><q-item clickable v-close-popup class="text-negative" @click="remove('cliente',p.row)"><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn></q-card-section></q-card></div></template>
      <template #no-data><div class="empty full-width">Registra el primer cliente de Electrofrío.</div></template>
    </q-table>
    <div v-if="enabled('equipos')" class="section-caption q-mt-xl"><div><div class="text-h6 text-weight-bold">Equipos</div><div class="text-caption text-grey-6">Equipos asociados a los clientes anteriores.</div></div><q-btn flat no-caps color="primary" icon="add" label="Registrar equipo" @click="open('equipo')"/></div>
    <q-table v-if="enabled('equipos')" flat class="app-table" :rows="filteredEquipos" :columns="equipmentColumns" row-key="id" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}">
      <template #body-cell-actions="p"><q-td :props="p"><q-btn flat round dense icon="edit" @click="open('equipo',p.row)"/><q-btn flat round dense icon="delete" color="negative" @click="remove('equipo',p.row)"/></q-td></template>
      <template #item="p"><div class="q-pa-xs col-12"><q-card flat class="mobile-card"><q-card-section class="row items-start no-wrap"><q-avatar color="primary" text-color="white" icon="ac_unit"/><div class="col q-ml-md min-width-0"><div class="text-subtitle1 text-weight-bold">{{p.row.tipo}} · {{p.row.marca||'Sin marca'}}</div><div class="text-caption text-grey-6">{{p.row.cliente_nombre}}</div><div class="text-body2 q-mt-xs">{{[p.row.modelo,p.row.capacidad,p.row.ubicacion].filter(Boolean).join(' · ')}}</div></div><q-btn flat round dense icon="edit" @click="open('equipo',p.row)"/></q-card-section></q-card></div></template>
      <template #no-data><div class="empty full-width">Aún no hay equipos registrados.</div></template>
    </q-table>
  </template>

  <template v-else-if="section==='tecnicos'">
    <q-banner rounded class="bg-blue-1 text-blue-10 q-mb-md"><template #avatar><q-icon name="badge"/></template>Vincula cada técnico con una cuenta del equipo para que sus permisos y acciones sean identificables.</q-banner>
    <q-table flat class="app-table" :rows="filteredTecnicos" :columns="technicianColumns" row-key="id" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}">
      <template #body-cell-activo="p"><q-td :props="p"><q-badge :color="p.value?'positive':'grey'">{{p.value?'Activo':'Inactivo'}}</q-badge></q-td></template>
      <template #body-cell-actions="p"><q-td :props="p"><q-btn flat round dense icon="edit" @click="open('tecnico',p.row)"/><q-btn flat round dense icon="delete" color="negative" @click="remove('tecnico',p.row)"/></q-td></template>
      <template #item="p"><div class="q-pa-xs col-12"><q-card flat class="mobile-card"><q-card-section class="row items-center no-wrap"><q-avatar color="primary" text-color="white" icon="engineering"/><div class="col q-ml-md"><div class="text-subtitle1 text-weight-bold">{{p.row.nombre}}</div><div class="text-caption text-grey-6">{{p.row.especialidad||'Sin especialidad'}} · {{p.row.telefono||'Sin teléfono'}}</div></div><q-btn flat round dense icon="edit" @click="open('tecnico',p.row)"/></q-card-section></q-card></div></template>
      <template #no-data><div class="empty full-width">Aún no hay técnicos registrados.</div></template>
    </q-table>
  </template>

  <template v-else-if="section==='inventario'">
    <q-banner v-if="resumen.stock_bajo" rounded class="bg-orange-1 text-orange-10 q-mb-md"><template #avatar><q-icon name="warning_amber"/></template>{{resumen.stock_bajo}} material(es) llegaron al stock mínimo.</q-banner>
    <q-table flat class="app-table" :rows="filteredMateriales" :columns="materialColumns" row-key="id" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}">
      <template #body-cell-stock="p"><q-td :props="p"><span :class="Number(p.row.stock)<=Number(p.row.stock_minimo)?'text-negative text-weight-bold':''">{{p.value}}</span></q-td></template>
      <template #body-cell-costo="p"><q-td :props="p">{{money(p.value)}}</q-td></template>
      <template #body-cell-actions="p"><q-td :props="p"><q-btn flat round dense icon="edit" @click="open('material',p.row)"/><q-btn flat round dense icon="delete" color="negative" @click="remove('material',p.row)"/></q-td></template>
      <template #item="p"><div class="q-pa-xs col-12"><q-card flat class="mobile-card"><q-card-section class="row items-center no-wrap"><q-avatar :color="Number(p.row.stock)<=Number(p.row.stock_minimo)?'negative':'primary'" text-color="white" icon="inventory_2"/><div class="col q-ml-md"><div class="text-subtitle1 text-weight-bold">{{p.row.nombre}}</div><div class="text-caption" :class="Number(p.row.stock)<=Number(p.row.stock_minimo)?'text-negative':'text-grey-6'">Stock: {{number(p.row.stock)}} {{p.row.unidad}} · mínimo {{number(p.row.stock_minimo)}}</div><div class="text-body2">{{money(p.row.costo_unitario)}} por {{p.row.unidad}}</div></div><q-btn flat round dense icon="edit" @click="open('material',p.row)"/></q-card-section></q-card></div></template>
      <template #no-data><div class="empty full-width">El inventario está limpio. Registra materiales cuando los tengas.</div></template>
    </q-table>
  </template>

  <template v-else-if="section==='pagos'">
    <div class="metrics-grid payments-summary"><q-card flat class="app-card"><q-card-section><div class="text-caption text-grey-6">Ingresos del mes</div><div class="metric money-metric text-positive">{{money(resumen.ingresos_mes)}}</div></q-card-section></q-card><q-card flat class="app-card"><q-card-section><div class="text-caption text-grey-6">Saldo total por cobrar</div><div class="metric money-metric text-orange">{{money(resumen.por_cobrar)}}</div></q-card-section></q-card></div>
    <q-table flat class="app-table q-mt-lg" :rows="filteredPagos" :columns="paymentColumns" row-key="id" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}">
      <template #body-cell-fecha="p"><q-td :props="p">{{formatDateTime(p.value)}}</q-td></template><template #body-cell-metodo="p"><q-td :props="p">{{pretty(p.value)}}</q-td></template><template #body-cell-monto="p"><q-td :props="p" class="text-positive text-weight-bold">{{money(p.value)}}</q-td></template>
      <template #item="p"><div class="q-pa-xs col-12"><q-card flat class="mobile-card"><q-card-section class="row items-center no-wrap"><q-avatar color="positive" text-color="white" icon="payments"/><div class="col q-ml-md"><div class="text-subtitle1 text-weight-bold">{{money(p.row.monto)}}</div><div class="text-caption text-grey-6">{{p.row.orden_codigo}} · {{p.row.cliente_nombre}}</div><div class="text-caption">{{pretty(p.row.metodo)}} · {{formatDateTime(p.row.pagado_at)}}</div></div></q-card-section></q-card></div></template>
      <template #no-data><div class="empty full-width">Todavía no se registraron pagos.</div></template>
    </q-table>
  </template>

  <template v-else-if="section==='garantias'">
    <q-table flat class="app-table" :rows="filteredGarantias" :columns="warrantyColumns" row-key="id" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}">
      <template #body-cell-inicio="p"><q-td :props="p">{{date(p.value)}}</q-td></template><template #body-cell-fin="p"><q-td :props="p">{{date(p.value)}}</q-td></template><template #body-cell-estado="p"><q-td :props="p"><q-badge :color="p.value==='Vigente'?'positive':'grey'">{{p.value}}</q-badge></q-td></template><template #body-cell-actions="p"><q-td :props="p"><q-btn flat round dense icon="visibility" @click="showOrder(p.row)"/></q-td></template>
      <template #item="p"><div class="q-pa-xs col-12"><q-card flat class="mobile-card" @click="showOrder(p.row)"><q-card-section class="row items-center no-wrap"><q-avatar :color="warrantyState(p.row)==='Vigente'?'positive':'grey'" text-color="white" icon="verified"/><div class="col q-ml-md"><div class="text-subtitle1 text-weight-bold">{{p.row.codigo}} · {{p.row.cliente_nombre}}</div><div class="text-caption text-grey-6">{{equipmentLabel(p.row)}}</div><div class="text-body2">{{date(p.row.garantia_inicio)}} – {{date(p.row.garantia_fin)}}</div></div></q-card-section></q-card></div></template>
      <template #no-data><div class="empty full-width">No hay garantías registradas.</div></template>
    </q-table>
  </template>

  <template v-else-if="section==='historial'">
    <q-table flat class="app-table" :rows="filteredHistorial" :columns="orderColumns" row-key="id" :grid="$q.screen.lt.md" :pagination="{rowsPerPage:20}">
      <template #body-cell-etapa="p"><q-td :props="p"><q-badge :color="p.row.decision_cliente==='rechazado'?'grey':'positive'">{{p.row.decision_cliente==='rechazado'?'No aceptado':'Finalizado'}}</q-badge></q-td></template><template #body-cell-total="p"><q-td :props="p">{{money(p.value)}}</q-td></template><template #body-cell-actions="p"><q-td :props="p"><q-btn flat round dense icon="visibility" @click="showOrder(p.row)"/></q-td></template>
      <template #item="p"><div class="q-pa-xs col-12"><q-card flat class="mobile-card" @click="showOrder(p.row)"><q-card-section><div class="row items-center"><div><div class="text-subtitle1 text-weight-bold">{{p.row.codigo}} · {{p.row.cliente_nombre}}</div><div class="text-caption text-grey-6">{{date(p.row.fecha_cita)}} · {{equipmentLabel(p.row)}}</div></div><q-space/><q-badge :color="p.row.decision_cliente==='rechazado'?'grey':'positive'">{{p.row.decision_cliente==='rechazado'?'No aceptado':'Finalizado'}}</q-badge></div><div class="text-body2 q-mt-md">{{p.row.trabajo_realizado||p.row.motivo_rechazo||p.row.diagnostico}}</div></q-card-section></q-card></div></template>
      <template #no-data><div class="empty full-width">El historial está vacío.</div></template>
    </q-table>
  </template>

  <q-dialog v-model="dialog" persistent><q-card class="form-dialog"><q-card-section><div class="text-overline text-primary">Electrofrío</div><div class="text-h5 text-weight-bold">{{editingId?'Editar':'Registrar'}} {{pretty(dialogType)}}</div></q-card-section><q-separator/><q-card-section class="dialog-body q-gutter-md">
    <template v-if="dialogType==='cliente'"><q-input v-model="clienteForm.nombre" outlined label="Nombre completo *"/><q-input v-model="clienteForm.telefono" outlined label="Teléfono" inputmode="tel"/><q-input v-model="clienteForm.direccion" outlined label="Dirección"/><q-input v-model="clienteForm.referencia" outlined label="Referencia de ubicación"/><q-input v-model="clienteForm.observaciones" outlined type="textarea" autogrow label="Observaciones"/><q-toggle v-model="clienteForm.activo" label="Cliente activo"/></template>
    <template v-if="dialogType==='equipo'"><q-select v-model="equipoForm.cliente_id" outlined emit-value map-options :options="activeClientes.map(x=>({label:x.nombre,value:x.id}))" label="Cliente *"/><div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model="equipoForm.tipo" outlined label="Tipo de equipo *"/></div><div class="col-12 col-sm-6"><q-input v-model="equipoForm.marca" outlined label="Marca"/></div><div class="col-12 col-sm-6"><q-input v-model="equipoForm.modelo" outlined label="Modelo"/></div><div class="col-12 col-sm-6"><q-input v-model="equipoForm.serie" outlined label="Número de serie"/></div><div class="col-12 col-sm-6"><q-input v-model="equipoForm.capacidad" outlined label="Capacidad"/></div><div class="col-12 col-sm-6"><q-input v-model="equipoForm.ubicacion" outlined label="Ubicación del equipo"/></div></div><q-input v-model="equipoForm.observaciones" outlined type="textarea" autogrow label="Observaciones"/><q-toggle v-model="equipoForm.activo" label="Equipo activo"/></template>
    <template v-if="dialogType==='tecnico'"><q-select v-model="tecnicoForm.usuario_id" outlined clearable emit-value map-options :options="usuariosNegocio.map(x=>({label:`${x.nombre} ${x.apellido||''} · @${x.usuario}`.trim(),value:x.id}))" label="Cuenta del equipo" hint="Recomendado: vincula el técnico con la persona que ingresará a VITI."/><q-input v-model="tecnicoForm.nombre" outlined label="Nombre *"/><q-input v-model="tecnicoForm.telefono" outlined label="Teléfono" inputmode="tel"/><q-input v-model="tecnicoForm.especialidad" outlined label="Especialidad"/><q-toggle v-model="tecnicoForm.activo" label="Técnico activo"/></template>
    <template v-if="dialogType==='material'"><q-input v-model="materialForm.nombre" outlined label="Material o repuesto *"/><div class="row q-col-gutter-md"><div class="col-12 col-sm-4"><q-input v-model="materialForm.unidad" outlined label="Unidad *"/></div><div class="col-6 col-sm-4"><q-input v-model.number="materialForm.stock" type="number" min="0" outlined label="Stock"/></div><div class="col-6 col-sm-4"><q-input v-model.number="materialForm.stock_minimo" type="number" min="0" outlined label="Stock mínimo"/></div></div><q-input v-model.number="materialForm.costo_unitario" type="number" min="0" step="0.5" outlined label="Costo unitario (Bs)"/><q-toggle v-model="materialForm.activo" label="Material activo"/></template>
    <template v-if="dialogType==='orden'"><q-select v-model="ordenForm.cliente_id" outlined emit-value map-options :options="activeClientes.map(x=>({label:x.nombre,value:x.id}))" label="Cliente *" @update:model-value="ordenForm.equipo_id=null"/><q-select v-model="ordenForm.equipo_id" outlined clearable emit-value map-options :options="clientEquipment.map(x=>({label:[x.tipo,x.marca,x.modelo].filter(Boolean).join(' · '),value:x.id}))" label="Equipo"/><q-select v-model="ordenForm.tecnico_id" outlined clearable emit-value map-options :options="activeTecnicos.map(x=>({label:x.nombre,value:x.id}))" label="Técnico asignado"/><div class="row q-col-gutter-md"><div class="col-12 col-sm-5"><q-input v-model="ordenForm.fecha_cita" type="date" stack-label outlined label="Fecha de visita *"/></div><div class="col-6 col-sm-3"><q-input v-model="ordenForm.hora_cita" type="time" stack-label outlined label="Hora"/></div><div class="col-6 col-sm-4"><q-select v-model="ordenForm.prioridad" outlined :options="['baja','normal','alta','urgente']" label="Prioridad"/></div></div><q-input v-model="ordenForm.direccion_servicio" outlined label="Dirección de la visita *"/><q-input v-model="ordenForm.referencia_ubicacion" outlined label="Referencia"/><q-input v-model="ordenForm.problema_reportado" outlined type="textarea" autogrow label="Problema reportado *"/><q-separator v-if="editingId"/><template v-if="editingId"><div class="text-subtitle1 text-weight-bold">Diagnóstico y propuesta</div><q-input v-model="ordenForm.diagnostico" outlined type="textarea" autogrow label="Diagnóstico técnico"/><q-input v-model="ordenForm.propuesta" outlined type="textarea" autogrow label="Propuesta para el cliente"/><div class="row q-col-gutter-md"><div class="col-6"><q-input v-model.number="ordenForm.costo_mano_obra" type="number" min="0" outlined label="Mano de obra (Bs)"/></div><div class="col-6"><q-input v-model.number="ordenForm.descuento" type="number" min="0" outlined label="Descuento (Bs)"/></div></div></template></template>
  </q-card-section><q-separator/><q-card-actions align="right" class="dialog-actions"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Guardar" @click="saveDialog"/></q-card-actions></q-card></q-dialog>

  <q-dialog v-model="accessDialog" persistent>
    <q-card class="small-dialog">
      <q-card-section><div class="text-overline text-primary">Portal del cliente</div><div class="text-h6 text-weight-bold">Acceso de {{accessClient?.nombre}}</div><div class="text-caption text-grey-6">Podrá consultar sus equipos y órdenes, y conversar directamente con el negocio.</div></q-card-section>
      <q-separator/>
      <q-card-section class="q-gutter-md"><q-input v-model="accessForm.usuario" outlined label="Usuario *" prefix="@"/><q-input v-model="accessForm.documento" outlined label="CI (opcional)" inputmode="numeric"/><q-input v-model="accessForm.telefono" outlined label="Teléfono" inputmode="tel"/><q-input v-model="accessForm.password" outlined type="password" :label="accessClient?.acceso_usuario_id?'Nueva contraseña (opcional)':'Contraseña *'" hint="Mínimo 8 caracteres, con letras y números."/><q-input v-model="accessForm.password_confirmation" outlined type="password" label="Confirmar contraseña"/></q-card-section>
      <q-separator/>
      <q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps icon="how_to_reg" label="Guardar acceso" @click="saveAccess"/></q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="detailDialog">
    <q-card v-if="selectedOrder" class="detail-dialog">
      <q-card-section class="row items-start no-wrap"><div><div class="text-overline text-primary">Orden de servicio</div><div class="text-h5 text-weight-bold">{{selectedOrder.codigo}}</div><div class="text-caption text-grey-6">{{selectedOrder.cliente_nombre}} · {{equipmentLabel(selectedOrder)}}</div></div><q-space/><q-btn flat round icon="close" v-close-popup/></q-card-section>
      <q-separator/>
      <q-card-section class="detail-grid"><div><span>Visita</span><strong>{{date(selectedOrder.fecha_cita)}} {{shortTime(selectedOrder.hora_cita)}}</strong></div><div><span>Etapa</span><q-badge :color="stageColor(selectedOrder.etapa)">{{pretty(selectedOrder.etapa)}}</q-badge></div><div><span>Dirección</span><strong>{{selectedOrder.direccion_servicio}}</strong></div><div><span>Técnico</span><strong>{{selectedOrder.tecnico_nombre||'Sin asignar'}}</strong></div></q-card-section>
      <q-separator/>
      <q-card-section class="q-gutter-md">
        <div><div class="detail-label">Problema reportado</div><div>{{selectedOrder.problema_reportado}}</div></div>
        <div v-if="selectedOrder.diagnostico"><div class="detail-label">Diagnóstico</div><div>{{selectedOrder.diagnostico}}</div></div>
        <div v-if="selectedOrder.propuesta"><div class="detail-label">Propuesta</div><div>{{selectedOrder.propuesta}}</div></div>
        <div v-if="selectedOrder.motivo_rechazo"><div class="detail-label">Motivo de cierre</div><div>{{selectedOrder.motivo_rechazo}}</div></div>
        <div v-if="selectedOrder.trabajo_realizado"><div class="detail-label">Trabajo realizado</div><div>{{selectedOrder.trabajo_realizado}}</div></div>
        <div v-if="selectedOrder.recomendaciones"><div class="detail-label">Recomendaciones</div><div>{{selectedOrder.recomendaciones}}</div></div>
        <div v-if="enabled('inventario')&&selectedOrder.materiales?.length"><div class="detail-label">Materiales utilizados</div><q-list bordered separator class="rounded-borders q-mt-sm"><q-item v-for="u in selectedOrder.materiales" :key="u.id"><q-item-section><q-item-label>{{u.material_nombre}}</q-item-label><q-item-label caption>{{number(u.cantidad)}} {{u.material_unidad}} · {{money(u.subtotal)}}</q-item-label></q-item-section><q-item-section v-if="selectedOrder.etapa!=='cerrada'" side><q-btn flat round dense color="negative" icon="delete" @click="removeMaterial(selectedOrder,u)"/></q-item-section></q-item></q-list></div>
        <div class="amount-box"><div><span>Mano de obra</span><strong>{{money(selectedOrder.costo_mano_obra)}}</strong></div><div v-if="enabled('inventario')"><span>Materiales</span><strong>{{money(selectedOrder.costo_materiales)}}</strong></div><div><span>Descuento</span><strong>- {{money(selectedOrder.descuento)}}</strong></div><q-separator/><div class="total"><span>Total</span><strong>{{money(selectedOrder.total)}}</strong></div><div v-if="enabled('pagos')"><span>Pagado</span><strong class="text-positive">{{money(selectedOrder.pagado)}}</strong></div><div v-if="enabled('pagos')"><span>Saldo</span><strong :class="Number(selectedOrder.saldo)>0?'text-orange':'text-positive'">{{money(selectedOrder.saldo)}}</strong></div></div>
        <div v-if="enabled('garantias')&&selectedOrder.garantia_fin" class="warranty-box"><q-icon name="verified" color="positive" size="28px"/><div><div class="text-weight-bold">Garantía hasta {{date(selectedOrder.garantia_fin)}}</div><div class="text-caption">{{selectedOrder.condiciones_garantia||`${selectedOrder.garantia_dias} días de garantía`}}</div></div></div>
      </q-card-section>
      <q-separator/>
      <q-card-actions class="detail-actions"><q-btn v-if="selectedOrder.etapa!=='cerrada'" outline color="primary" no-caps icon="edit" label="Editar" @click="detailDialog=false;open('orden',selectedOrder)"/><q-btn v-if="selectedOrder.etapa!=='cerrada'&&selectedOrder.decision_cliente==='pendiente'&&selectedOrder.diagnostico" outline color="negative" no-caps icon="close" label="No aceptó" @click="decide(selectedOrder,'rechazado')"/><q-btn v-if="selectedOrder.etapa!=='cerrada'&&selectedOrder.decision_cliente==='pendiente'&&selectedOrder.diagnostico" color="positive" unelevated no-caps icon="check" label="Aceptó propuesta" @click="decide(selectedOrder,'aceptado')"/><q-btn v-if="enabled('inventario')&&selectedOrder.etapa==='servicio'" outline color="primary" no-caps icon="inventory_2" label="Usar material" @click="openMaterial(selectedOrder)"/><q-btn v-if="selectedOrder.etapa==='servicio'" color="primary" unelevated no-caps icon="task_alt" label="Finalizar servicio" @click="openFinish(selectedOrder)"/><q-space/><q-btn v-if="enabled('pagos')&&Number(selectedOrder.saldo)>0&&Number(selectedOrder.total)>0" color="positive" unelevated no-caps icon="payments" label="Registrar pago" @click="openPayment(selectedOrder)"/></q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="materialDialog"><q-card class="small-dialog"><q-card-section><div class="text-overline text-primary">Inventario</div><div class="text-h6 text-weight-bold">Material utilizado</div></q-card-section><q-card-section class="q-gutter-md"><q-select v-model="usoForm.material_id" outlined emit-value map-options :options="activeMaterials.map(x=>({label:`${x.nombre} · stock ${number(x.stock)} ${x.unidad}`,value:x.id}))" label="Material *"/><q-input v-model.number="usoForm.cantidad" type="number" min="0.01" step="0.01" outlined label="Cantidad *"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Registrar" @click="saveMaterial"/></q-card-actions></q-card></q-dialog>
  <q-dialog v-model="paymentDialog"><q-card class="small-dialog"><q-card-section><div class="text-overline text-primary">Control</div><div class="text-h6 text-weight-bold">Registrar pago</div><div class="text-caption text-grey-6">Saldo: {{paymentOrder?money(paymentOrder.saldo):'0.00 Bs'}}</div></q-card-section><q-card-section class="q-gutter-md"><q-select v-model="pagoForm.metodo" outlined :options="['efectivo','qr','transferencia','tarjeta','otro']" label="Método *"/><q-input v-model.number="pagoForm.monto" type="number" min="0.01" step="0.5" outlined label="Monto (Bs) *"/><q-input v-model="pagoForm.referencia" outlined label="Referencia"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="positive" unelevated label="Registrar pago" @click="savePayment"/></q-card-actions></q-card></q-dialog>
  <q-dialog v-model="finishDialog"><q-card class="form-dialog"><q-card-section><div class="text-overline text-primary">Cierre del servicio</div><div class="text-h5 text-weight-bold">{{enabled('garantias')?'Trabajo y garantía':'Trabajo realizado'}}</div></q-card-section><q-card-section class="q-gutter-md"><q-input v-model="finishForm.trabajo_realizado" outlined type="textarea" autogrow label="Trabajo realizado *"/><q-input v-model="finishForm.recomendaciones" outlined type="textarea" autogrow label="Recomendaciones al cliente"/><q-input v-if="enabled('garantias')" v-model.number="finishForm.garantia_dias" type="number" min="0" max="3650" outlined label="Días de garantía"/><q-input v-if="enabled('garantias')&&Number(finishForm.garantia_dias)>0" v-model="finishForm.condiciones_garantia" outlined type="textarea" autogrow label="Condiciones de la garantía"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated icon="task_alt" label="Finalizar servicio" @click="saveFinish"/></q-card-actions></q-card></q-dialog>
</q-page>
</template>

<style scoped>
.electro-page{max-width:1550px;margin:0 auto;background:radial-gradient(circle at 0 0,rgba(18,184,200,.13),transparent 28%),radial-gradient(circle at 100% 0,rgba(25,118,210,.09),transparent 25%)}
.page-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:24px}.page-heading--hero{position:relative;overflow:hidden;padding:28px;border-radius:24px;background:linear-gradient(135deg,#0f4c81,#1976d2 60%,#00acc1);color:#fff;box-shadow:0 18px 44px rgba(15,76,129,.24)}.page-heading--hero::after{content:'ac_unit';font-family:'Material Icons';position:absolute;right:24px;bottom:-38px;color:rgba(255,255,255,.1);font-size:150px;line-height:1}.page-heading--hero .heading-copy,.page-heading--hero .heading-actions{position:relative;z-index:1}.page-heading--hero .text-primary,.page-heading--hero .text-grey-7{color:#fff!important}.page-heading--hero .text-overline{opacity:.78}.page-heading--hero .heading-actions :deep(.q-btn){background:#fff!important;color:#0f5d7b!important}
.heading-actions{display:flex;gap:10px;flex-wrap:wrap}.heading-actions :deep(.q-btn){min-height:44px;border-radius:13px;padding:0 18px;font-weight:700}.metrics-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.module-search{max-width:560px}.section-caption{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:4px 2px 12px}
.app-card,.app-table,.mobile-card{border:1px solid var(--viti-border);border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(15,76,129,.08);transition:transform .18s ease,box-shadow .18s ease}.metric-card:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(15,76,129,.13)}.metric-icon{width:52px;height:52px;display:grid;place-items:center;border-radius:16px;color:#0f6fa4;background:linear-gradient(135deg,rgba(25,118,210,.14),rgba(0,172,193,.12))}.metric-card--accent .metric-icon{color:#d86418;background:rgba(255,138,61,.14)}.metric-card--positive .metric-icon{color:#148166;background:rgba(20,155,117,.13)}.metric-card--warning .metric-icon{color:#c36e0b;background:rgba(231,163,33,.16)}.metric{font-size:30px;font-weight:800;margin-top:12px;color:var(--viti-text)}.money-metric{font-size:22px}.empty{padding:34px;text-align:center;color:var(--viti-muted)}.min-width-0{min-width:0}
.app-table :deep(.q-table thead th){color:#31556d;background:color-mix(in srgb,var(--viti-bg) 76%,var(--viti-card));font-weight:800}.app-table :deep(.q-table tbody tr:hover td){background:rgba(25,118,210,.045)}.app-table :deep(.q-table__bottom){border-color:var(--viti-border)}
.form-dialog{width:720px;max-width:96vw;max-height:92vh}.dialog-body{max-height:68vh;overflow:auto}.detail-dialog{width:850px;max-width:96vw;max-height:94vh;overflow:auto}.small-dialog{width:500px;max-width:94vw}.form-dialog,.detail-dialog,.small-dialog{border-radius:20px!important;overflow:hidden;box-shadow:0 26px 70px rgba(6,34,55,.28)}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.detail-grid>div{display:flex;flex-direction:column;gap:4px}.detail-grid span,.detail-label{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--viti-muted);font-weight:700}.amount-box{background:color-mix(in srgb,var(--viti-bg) 78%,var(--viti-card));border-radius:14px;padding:14px 16px;display:grid;gap:8px}.amount-box>div{display:flex;justify-content:space-between;gap:16px}.amount-box .total{font-size:18px}.warranty-box{display:flex;gap:12px;align-items:center;padding:14px;background:rgba(20,155,117,.09);border:1px solid rgba(20,155,117,.25);border-radius:14px}.detail-actions{gap:8px;padding:14px 16px;flex-wrap:wrap}.payments-summary{grid-template-columns:repeat(2,minmax(0,1fr));max-width:720px}.rounded-borders{border-radius:12px}
:global(body.electrofrio-local-dark) .app-card,:global(body.electrofrio-local-dark) .app-table,:global(body.electrofrio-local-dark) .mobile-card{box-shadow:0 12px 30px rgba(0,0,0,.2)}:global(body.electrofrio-local-dark) .app-table :deep(.q-table thead th){color:#e3f0f7}:global(body.electrofrio-local-dark) .dialog-actions{background:#102a43;color:#f4fbff}
@media(max-width:900px){.page-heading{align-items:flex-start;flex-direction:column}.heading-actions{width:100%}.heading-actions .q-btn{flex:1}.metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.detail-actions .q-btn{flex:1}.detail-actions .q-space{display:none}.page-heading--hero{padding:24px}}
@media(max-width:600px){.electro-page{padding:16px 12px}.page-heading .text-h4{font-size:26px}.page-heading--hero{padding:22px 18px}.page-heading--hero::after{right:-8px;font-size:120px}.metrics-grid,.payments-summary,.detail-grid{grid-template-columns:1fr}.heading-actions{display:grid;grid-template-columns:1fr}.mobile-card{border-radius:16px}.dialog-actions{position:sticky;bottom:0;background:var(--viti-card)}.detail-actions{display:grid;grid-template-columns:1fr}.detail-actions .q-btn{width:100%}.form-dialog{max-width:100vw;border-radius:18px 18px 0 0}.q-dialog__inner--minimized>div{max-height:94vh}}
</style>
