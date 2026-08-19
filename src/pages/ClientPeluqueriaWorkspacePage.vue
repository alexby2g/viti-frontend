<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { useTenantStore } from '../stores/tenant'

const $q = useQuasar()
const route = useRoute()
const tenant = useTenantStore()
const base = '/mi/apps/peluqueria'
const loading = ref(false)
const resumen = ref({clientes:0,citas_hoy:0,en_atencion:0,atenciones_hoy:0,ingresos_hoy:0,agenda_hoy:[]})
const clientes = ref([]), servicios = ref([]), personal = ref([]), citas = ref([]), atenciones = ref([]), historial = ref([])
const dialog = ref(false), dialogType = ref(''), editingId = ref(null), paymentDialog = ref(false), paymentAtencion = ref(null)

const clienteForm = reactive({nombre:'',telefono:'',whatsapp:'',fecha_nacimiento:'',sexo:'',direccion:'',observaciones:'',activo:true})
const servicioForm = reactive({nombre:'',categoria:'',duracion_minutos:30,precio:0,descripcion:'',activo:true})
const personalForm = reactive({nombre:'',telefono:'',especialidad:'',horario_inicio:'09:00',horario_fin:'18:00',porcentaje_comision:0,activo:true})
const citaForm = reactive({cliente_id:null,servicio_id:null,personal_id:null,fecha:'',hora_inicio:'',hora_fin:'',estado:'pendiente',notas:''})
const atencionForm = reactive({cita_id:null,cliente_id:null,servicio_id:null,personal_id:null,descuento:0,observaciones:''})
const pagoForm = reactive({metodo:'efectivo',monto:0,referencia:''})

const section = computed(()=>route.meta.hairSection || 'inicio')
const hasModule = module => tenant.hasModule(module)
const activeClientes = computed(()=>clientes.value.filter(x=>x.activo))
const activeServicios = computed(()=>servicios.value.filter(x=>x.activo))
const activePersonal = computed(()=>personal.value.filter(x=>x.activo))
const money = v => `${Number(v||0).toFixed(2)} Bs`
const pretty = v => String(v||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const statusColor = v => ({pendiente:'orange',confirmada:'blue',en_espera:'purple',en_atencion:'teal',finalizada:'positive',cancelada:'negative',no_asistio:'grey'}[v]||'grey')
const paid = row => (row.pagos||[]).reduce((s,p)=>s+Number(p.monto||0),0)
const pendingAmount = row => Math.max(0,Number(row.total||0)-paid(row))
const clean = data => Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v===''?null:v]))
const notifyError = (e,msg='No se pudo completar la operación.')=>$q.notify({type:'negative',message:e.response?.data?.message||msg})

async function loadAll(){
  loading.value=true
  try{
    if(!tenant.loaded) await tenant.load()
    const requests = []
    if(hasModule('inicio')) requests.push(['resumen',api.get(`${base}/resumen`)])
    if(hasModule('clientes')) requests.push(['clientes',api.get(`${base}/clientes`)])
    if(hasModule('ordenes')) requests.push(['servicios',api.get(`${base}/servicios`)],['atenciones',api.get(`${base}/atenciones`)])
    if(hasModule('tecnicos')) requests.push(['personal',api.get(`${base}/personal`)])
    if(hasModule('agenda')) requests.push(['citas',api.get(`${base}/citas`)])
    if(hasModule('historial')) requests.push(['historial',api.get(`${base}/historial`)])

    const results = await Promise.all(requests.map(async ([key,promise]) => [key,(await promise).data.data]))
    for(const [key,data] of results){
      if(key==='resumen') resumen.value=data||resumen.value
      if(key==='clientes') clientes.value=data||[]
      if(key==='servicios') servicios.value=data||[]
      if(key==='personal') personal.value=data||[]
      if(key==='citas') citas.value=data||[]
      if(key==='atenciones') atenciones.value=data||[]
      if(key==='historial') historial.value=data||[]
    }
  }catch(e){notifyError(e,'No se pudieron cargar los datos de Peluquería.')}finally{loading.value=false}
}

function reset(type){
  editingId.value=null;dialogType.value=type
  if(type==='cliente')Object.assign(clienteForm,{nombre:'',telefono:'',whatsapp:'',fecha_nacimiento:'',sexo:'',direccion:'',observaciones:'',activo:true})
  if(type==='servicio')Object.assign(servicioForm,{nombre:'',categoria:'',duracion_minutos:30,precio:0,descripcion:'',activo:true})
  if(type==='personal')Object.assign(personalForm,{nombre:'',telefono:'',especialidad:'',horario_inicio:'09:00',horario_fin:'18:00',porcentaje_comision:0,activo:true})
  if(type==='cita')Object.assign(citaForm,{cliente_id:null,servicio_id:null,personal_id:null,fecha:new Date().toISOString().slice(0,10),hora_inicio:'09:00',hora_fin:'',estado:'pendiente',notas:''})
  if(type==='atencion')Object.assign(atencionForm,{cita_id:null,cliente_id:null,servicio_id:null,personal_id:null,descuento:0,observaciones:''})
}
function open(type,row=null){reset(type);if(row){editingId.value=row.id;if(type==='cliente')Object.assign(clienteForm,row,{fecha_nacimiento:(row.fecha_nacimiento||'').slice(0,10)});if(type==='servicio')Object.assign(servicioForm,row);if(type==='personal')Object.assign(personalForm,row,{horario_inicio:(row.horario_inicio||'').slice(0,5),horario_fin:(row.horario_fin||'').slice(0,5)});if(type==='cita')Object.assign(citaForm,row,{fecha:(row.fecha||'').slice(0,10),hora_inicio:(row.hora_inicio||'').slice(0,5),hora_fin:(row.hora_fin||'').slice(0,5)})}dialog.value=true}
function startFromCita(row){reset('atencion');Object.assign(atencionForm,{cita_id:row.id,cliente_id:row.cliente_id,servicio_id:row.servicio_id,personal_id:row.personal_id,descuento:0,observaciones:row.notas||''});dialog.value=true}

async function saveDialog(){
  try{
    let endpoint='',form={}
    if(dialogType.value==='cliente'){endpoint='clientes';form=clienteForm}
    if(dialogType.value==='servicio'){endpoint='servicios';form=servicioForm}
    if(dialogType.value==='personal'){endpoint='personal';form=personalForm}
    if(dialogType.value==='cita'){endpoint='citas';form=citaForm}
    if(dialogType.value==='atencion'){endpoint='atenciones';form=atencionForm}
    const body=clean({...form})
    if(editingId.value&&dialogType.value!=='atencion')await api.put(`${base}/${endpoint}/${editingId.value}`,body);else await api.post(`${base}/${endpoint}`,body)
    dialog.value=false;$q.notify({type:'positive',message:dialogType.value==='atencion'?'Atención iniciada.':'Datos guardados.'});await loadAll()
  }catch(e){notifyError(e)}
}

async function remove(type,row){
  const endpoint=type==='personal'?'personal':`${type}s`
  $q.dialog({title:'Confirmar',message:'¿Eliminar este registro?',cancel:true,persistent:true}).onOk(async()=>{try{await api.delete(`${base}/${endpoint}/${row.id}`);await loadAll()}catch(e){notifyError(e)}})
}
async function finalize(row){try{await api.post(`${base}/atenciones/${row.id}/finalizar`,{observaciones:row.observaciones||null});$q.notify({type:'positive',message:'Atención finalizada.'});await loadAll()}catch(e){notifyError(e)}}
function openPayment(row){paymentAtencion.value=row;Object.assign(pagoForm,{metodo:'efectivo',monto:pendingAmount(row),referencia:''});paymentDialog.value=true}
async function savePayment(){try{await api.post(`${base}/atenciones/${paymentAtencion.value.id}/pagos`,clean({...pagoForm}));paymentDialog.value=false;$q.notify({type:'positive',message:'Pago registrado.'});await loadAll()}catch(e){notifyError(e)}}

onMounted(loadAll)
watch(()=>route.fullPath,()=>window.scrollTo({top:0,behavior:'smooth'}))
</script>

<template>
<q-page class="hair-page q-pa-md q-pa-lg-xl">
  <q-inner-loading :showing="loading" />

  <div class="row items-center q-col-gutter-md q-mb-lg">
    <div class="col"><div class="text-overline text-primary">Peluquería</div><div class="text-h4 text-weight-bold">{{ pretty(section) }}</div><div class="text-body2 text-grey-7">Administra tu negocio desde tu aplicación VITI.</div></div>
    <div class="col-auto row q-gutter-sm" v-if="['inicio','agenda','atenciones'].includes(section)"><q-btn v-if="hasModule('agenda')" color="primary" unelevated no-caps icon="event" label="Nueva cita" @click="open('cita')"/><q-btn v-if="hasModule('ordenes')" outline color="primary" no-caps icon="content_cut" label="Nueva atención" @click="open('atencion')"/></div>
  </div>

  <template v-if="section==='inicio'">
    <div class="metrics-grid">
      <q-card v-if="hasModule('clientes')" flat class="hair-card"><q-card-section><q-icon name="groups" color="primary" size="30px"/><div class="metric">{{resumen.clientes}}</div><div class="text-caption text-grey-6">Clientes activos</div></q-card-section></q-card>
      <q-card v-if="hasModule('agenda')" flat class="hair-card"><q-card-section><q-icon name="event" color="primary" size="30px"/><div class="metric">{{resumen.citas_hoy}}</div><div class="text-caption text-grey-6">Citas hoy</div></q-card-section></q-card>
      <q-card v-if="hasModule('ordenes')" flat class="hair-card"><q-card-section><q-icon name="content_cut" color="primary" size="30px"/><div class="metric">{{resumen.en_atencion}}</div><div class="text-caption text-grey-6">En atención</div></q-card-section></q-card>
      <q-card v-if="hasModule('pagos')" flat class="hair-card"><q-card-section><q-icon name="payments" color="primary" size="30px"/><div class="metric money">{{money(resumen.ingresos_hoy)}}</div><div class="text-caption text-grey-6">Ingresos hoy</div></q-card-section></q-card>
    </div>
    <q-card v-if="hasModule('agenda')" flat class="hair-card q-mt-lg"><q-card-section><div class="text-h6 text-weight-bold">Agenda de hoy</div></q-card-section><q-list separator><q-item v-for="c in resumen.agenda_hoy||[]" :key="c.id"><q-item-section avatar><q-avatar color="primary" text-color="white" icon="event"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{(c.hora_inicio||'').slice(0,5)}} · {{c.cliente?.nombre}}</q-item-label><q-item-label caption>{{c.servicio?.nombre}} · {{c.personal?.nombre||'Sin asignar'}}</q-item-label></q-item-section><q-item-section side><q-badge :color="statusColor(c.estado)">{{pretty(c.estado)}}</q-badge></q-item-section></q-item><div v-if="!(resumen.agenda_hoy||[]).length" class="empty">No hay citas para hoy.</div></q-list></q-card>
  </template>

  <template v-else-if="section==='agenda'">
    <div class="toolbar"><div class="text-h6 text-weight-bold">Citas</div><q-btn color="primary" unelevated no-caps icon="add" label="Nueva cita" @click="open('cita')"/></div>
    <q-table flat class="hair-card" :rows="citas" row-key="id" :columns="[{name:'fecha',label:'Fecha',field:'fecha',align:'left'},{name:'hora',label:'Hora',field:r=>(r.hora_inicio||'').slice(0,5),align:'left'},{name:'cliente',label:'Cliente',field:r=>r.cliente?.nombre,align:'left'},{name:'servicio',label:'Servicio',field:r=>r.servicio?.nombre,align:'left'},{name:'personal',label:'Personal',field:r=>r.personal?.nombre||'Sin asignar',align:'left'},{name:'estado',label:'Estado',field:'estado',align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]"><template #body-cell-estado="p"><q-td :props="p"><q-badge :color="statusColor(p.row.estado)">{{pretty(p.row.estado)}}</q-badge></q-td></template><template #body-cell-acciones="p"><q-td :props="p"><q-btn v-if="!['finalizada','cancelada','no_asistio'].includes(p.row.estado)" flat round dense icon="play_arrow" color="positive" @click="startFromCita(p.row)"/><q-btn flat round dense icon="edit" color="primary" @click="open('cita',p.row)"/><q-btn flat round dense icon="delete" color="negative" @click="remove('cita',p.row)"/></q-td></template></q-table>
  </template>

  <template v-else-if="section==='clientes'">
    <div class="toolbar"><div class="text-h6 text-weight-bold">Clientes</div><q-btn color="primary" unelevated no-caps icon="person_add" label="Nuevo cliente" @click="open('cliente')"/></div>
    <q-table flat class="hair-card" :rows="clientes" row-key="id" :columns="[{name:'nombre',label:'Nombre',field:'nombre',align:'left'},{name:'telefono',label:'Teléfono',field:'telefono',align:'left'},{name:'whatsapp',label:'WhatsApp',field:'whatsapp',align:'left'},{name:'activo',label:'Estado',field:'activo',align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]"><template #body-cell-activo="p"><q-td :props="p"><q-badge :color="p.row.activo?'positive':'grey'">{{p.row.activo?'Activo':'Inactivo'}}</q-badge></q-td></template><template #body-cell-acciones="p"><q-td :props="p"><q-btn flat round dense icon="edit" color="primary" @click="open('cliente',p.row)"/><q-btn flat round dense icon="delete" color="negative" @click="remove('cliente',p.row)"/></q-td></template></q-table>
  </template>

  <template v-else-if="section==='servicios'">
    <div class="toolbar"><div class="text-h6 text-weight-bold">Servicios</div><q-btn color="primary" unelevated no-caps icon="add" label="Nuevo servicio" @click="open('servicio')"/></div>
    <q-table flat class="hair-card" :rows="servicios" row-key="id" :columns="[{name:'nombre',label:'Servicio',field:'nombre',align:'left'},{name:'categoria',label:'Categoría',field:'categoria',align:'left'},{name:'duracion',label:'Duración',field:r=>`${r.duracion_minutos} min`,align:'left'},{name:'precio',label:'Precio',field:r=>money(r.precio),align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]"><template #body-cell-acciones="p"><q-td :props="p"><q-btn flat round dense icon="edit" color="primary" @click="open('servicio',p.row)"/><q-btn flat round dense icon="delete" color="negative" @click="remove('servicio',p.row)"/></q-td></template></q-table>
  </template>

  <template v-else-if="section==='personal'">
    <div class="toolbar"><div class="text-h6 text-weight-bold">Personal</div><q-btn color="primary" unelevated no-caps icon="person_add" label="Nuevo trabajador" @click="open('personal')"/></div>
    <q-table flat class="hair-card" :rows="personal" row-key="id" :columns="[{name:'nombre',label:'Nombre',field:'nombre',align:'left'},{name:'especialidad',label:'Especialidad',field:'especialidad',align:'left'},{name:'horario',label:'Horario',field:r=>`${(r.horario_inicio||'').slice(0,5)} - ${(r.horario_fin||'').slice(0,5)}`,align:'left'},{name:'comision',label:'Comisión',field:r=>`${r.porcentaje_comision||0}%`,align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]"><template #body-cell-acciones="p"><q-td :props="p"><q-btn flat round dense icon="edit" color="primary" @click="open('personal',p.row)"/><q-btn flat round dense icon="delete" color="negative" @click="remove('personal',p.row)"/></q-td></template></q-table>
  </template>

  <template v-else-if="section==='atenciones'">
    <div class="toolbar"><div class="text-h6 text-weight-bold">Atenciones</div><q-btn color="primary" unelevated no-caps icon="add" label="Nueva atención" @click="open('atencion')"/></div>
    <q-table flat class="hair-card" :rows="atenciones" row-key="id" :columns="[{name:'cliente',label:'Cliente',field:r=>r.cliente?.nombre,align:'left'},{name:'servicio',label:'Servicio',field:r=>r.servicio?.nombre,align:'left'},{name:'personal',label:'Personal',field:r=>r.personal?.nombre||'Sin asignar',align:'left'},{name:'estado',label:'Estado',field:'estado',align:'left'},{name:'total',label:'Total',field:r=>money(r.total),align:'right'},{name:'acciones',label:'',field:'id',align:'right'}]"><template #body-cell-estado="p"><q-td :props="p"><q-badge :color="statusColor(p.row.estado)">{{pretty(p.row.estado)}}</q-badge></q-td></template><template #body-cell-acciones="p"><q-td :props="p"><q-btn v-if="p.row.estado==='en_atencion'" flat dense color="positive" icon="check" label="Finalizar" no-caps @click="finalize(p.row)"/><q-btn v-if="hasModule('pagos')&&p.row.estado==='finalizada'&&pendingAmount(p.row)>0" flat round dense color="primary" icon="payments" @click="openPayment(p.row)"/></q-td></template></q-table>
  </template>

  <template v-else-if="section==='caja'">
    <div class="row q-col-gutter-md q-mb-lg"><div class="col-12 col-md-4"><q-card flat class="hair-card"><q-card-section><div class="text-caption text-grey-6">Ingresos de hoy</div><div class="text-h4 text-weight-bold text-primary">{{money(resumen.ingresos_hoy)}}</div></q-card-section></q-card></div><div class="col-12 col-md-4"><q-card flat class="hair-card"><q-card-section><div class="text-caption text-grey-6">Atenciones finalizadas hoy</div><div class="text-h4 text-weight-bold">{{resumen.atenciones_hoy}}</div></q-card-section></q-card></div></div>
    <q-table flat class="hair-card" title="Cobros" :rows="atenciones.filter(x=>x.estado==='finalizada')" row-key="id" :columns="[{name:'cliente',label:'Cliente',field:r=>r.cliente?.nombre,align:'left'},{name:'total',label:'Total',field:r=>money(r.total),align:'right'},{name:'pagado',label:'Pagado',field:r=>money(paid(r)),align:'right'},{name:'saldo',label:'Saldo',field:r=>money(pendingAmount(r)),align:'right'},{name:'acciones',label:'',field:'id',align:'right'}]"><template #body-cell-acciones="p"><q-td :props="p"><q-btn v-if="pendingAmount(p.row)>0" color="primary" unelevated dense no-caps icon="payments" label="Cobrar" @click="openPayment(p.row)"/><q-badge v-else color="positive">Pagado</q-badge></q-td></template></q-table>
  </template>

  <template v-else-if="section==='historial'">
    <q-table flat class="hair-card" :rows="historial" row-key="id" :columns="[{name:'fecha',label:'Fecha',field:r=>r.finalizada_at||r.created_at,align:'left'},{name:'cliente',label:'Cliente',field:r=>r.cliente?.nombre,align:'left'},{name:'servicio',label:'Servicio',field:r=>r.servicio?.nombre,align:'left'},{name:'personal',label:'Personal',field:r=>r.personal?.nombre||'Sin asignar',align:'left'},{name:'total',label:'Total',field:r=>money(r.total),align:'right'}]"/>
  </template>

  <q-dialog v-model="dialog"><q-card style="width:680px;max-width:94vw"><q-card-section><div class="text-h6 text-weight-bold">{{editingId?'Editar':'Nuevo'}} {{dialogType}}</div></q-card-section><q-card-section>
    <div v-if="dialogType==='cliente'" class="row q-col-gutter-md"><div class="col-12 col-sm-7"><q-input v-model="clienteForm.nombre" outlined label="Nombre *"/></div><div class="col-12 col-sm-5"><q-input v-model="clienteForm.telefono" outlined label="Teléfono"/></div><div class="col-12 col-sm-6"><q-input v-model="clienteForm.whatsapp" outlined label="WhatsApp"/></div><div class="col-12 col-sm-6"><q-input v-model="clienteForm.fecha_nacimiento" outlined type="date" label="Nacimiento" stack-label/></div><div class="col-12"><q-input v-model="clienteForm.direccion" outlined label="Dirección"/></div><div class="col-12"><q-input v-model="clienteForm.observaciones" outlined type="textarea" label="Observaciones"/></div></div>
    <div v-if="dialogType==='servicio'" class="row q-col-gutter-md"><div class="col-12 col-sm-7"><q-input v-model="servicioForm.nombre" outlined label="Servicio *"/></div><div class="col-12 col-sm-5"><q-input v-model="servicioForm.categoria" outlined label="Categoría"/></div><div class="col-6"><q-input v-model.number="servicioForm.duracion_minutos" outlined type="number" label="Duración (min)"/></div><div class="col-6"><q-input v-model.number="servicioForm.precio" outlined type="number" label="Precio Bs"/></div><div class="col-12"><q-input v-model="servicioForm.descripcion" outlined type="textarea" label="Descripción"/></div></div>
    <div v-if="dialogType==='personal'" class="row q-col-gutter-md"><div class="col-12 col-sm-7"><q-input v-model="personalForm.nombre" outlined label="Nombre *"/></div><div class="col-12 col-sm-5"><q-input v-model="personalForm.telefono" outlined label="Teléfono"/></div><div class="col-12"><q-input v-model="personalForm.especialidad" outlined label="Especialidad"/></div><div class="col-6"><q-input v-model="personalForm.horario_inicio" outlined type="time" label="Entrada" stack-label/></div><div class="col-6"><q-input v-model="personalForm.horario_fin" outlined type="time" label="Salida" stack-label/></div><div class="col-12"><q-input v-model.number="personalForm.porcentaje_comision" outlined type="number" label="Comisión %"/></div></div>
    <div v-if="dialogType==='cita'" class="row q-col-gutter-md"><div class="col-12"><q-select v-model="citaForm.cliente_id" outlined emit-value map-options :options="activeClientes.map(x=>({label:x.nombre,value:x.id}))" label="Cliente *"/></div><div class="col-12 col-sm-6"><q-select v-model="citaForm.servicio_id" outlined emit-value map-options :options="activeServicios.map(x=>({label:`${x.nombre} · ${money(x.precio)}`,value:x.id}))" label="Servicio *"/></div><div class="col-12 col-sm-6"><q-select v-model="citaForm.personal_id" outlined emit-value map-options clearable :options="activePersonal.map(x=>({label:x.nombre,value:x.id}))" label="Personal"/></div><div class="col-12 col-sm-4"><q-input v-model="citaForm.fecha" outlined type="date" stack-label label="Fecha"/></div><div class="col-6 col-sm-4"><q-input v-model="citaForm.hora_inicio" outlined type="time" stack-label label="Inicio"/></div><div class="col-6 col-sm-4"><q-input v-model="citaForm.hora_fin" outlined type="time" stack-label label="Fin"/></div><div class="col-12"><q-select v-model="citaForm.estado" outlined :options="['pendiente','confirmada','en_espera','en_atencion','finalizada','cancelada','no_asistio']" label="Estado"/></div></div>
    <div v-if="dialogType==='atencion'" class="row q-col-gutter-md"><div class="col-12"><q-select v-model="atencionForm.cliente_id" outlined emit-value map-options :options="activeClientes.map(x=>({label:x.nombre,value:x.id}))" label="Cliente *"/></div><div class="col-12 col-sm-6"><q-select v-model="atencionForm.servicio_id" outlined emit-value map-options :options="activeServicios.map(x=>({label:`${x.nombre} · ${money(x.precio)}`,value:x.id}))" label="Servicio *"/></div><div class="col-12 col-sm-6"><q-select v-model="atencionForm.personal_id" outlined emit-value map-options clearable :options="activePersonal.map(x=>({label:x.nombre,value:x.id}))" label="Personal"/></div><div class="col-12"><q-input v-model.number="atencionForm.descuento" outlined type="number" label="Descuento Bs"/></div><div class="col-12"><q-input v-model="atencionForm.observaciones" outlined type="textarea" label="Observaciones"/></div></div>
  </q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Guardar" @click="saveDialog"/></q-card-actions></q-card></q-dialog>

  <q-dialog v-if="hasModule('pagos')" v-model="paymentDialog"><q-card style="width:460px;max-width:94vw"><q-card-section><div class="text-h6 text-weight-bold">Registrar pago</div><div class="text-caption text-grey-6">Saldo pendiente: {{money(paymentAtencion?pendingAmount(paymentAtencion):0)}}</div></q-card-section><q-card-section class="q-gutter-md"><q-select v-model="pagoForm.metodo" outlined :options="['efectivo','qr','transferencia','tarjeta','otro']" label="Método"/><q-input v-model.number="pagoForm.monto" outlined type="number" label="Monto Bs"/><q-input v-model="pagoForm.referencia" outlined label="Referencia"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Registrar pago" @click="savePayment"/></q-card-actions></q-card></q-dialog>
</q-page>
</template>

<style scoped>
.hair-page{max-width:1600px;margin:0 auto}.hair-card{border:1px solid #e8eaf0;border-radius:16px;background:#fff}.metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.metric{font-size:30px;font-weight:800;margin-top:8px}.money{font-size:23px}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.empty{text-align:center;padding:42px;color:#7c8492}@media(max-width:900px){.metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.metrics-grid{grid-template-columns:1fr}.toolbar{align-items:flex-start;flex-direction:column}}
</style>