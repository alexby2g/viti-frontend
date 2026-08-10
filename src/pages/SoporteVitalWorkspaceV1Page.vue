<script setup>
import { computed,inject,onMounted,reactive,ref,watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import SoporteVitalDataTable from '../components/soporte-vital/SoporteVitalDataTable.vue'

const $q=useQuasar(),route=useRoute()
const fallbackBase=computed(()=>route.path.startsWith('/mi-apps/')?'/mi/apps/servicio-tecnico':'/apps/servicio-tecnico')
const apiBase=inject('serviceTechnicalApiBase',fallbackBase)
const modules=inject('serviceTechnicalModules',computed(()=>['inicio','agenda','ordenes','clientes','equipos','tecnicos','pagos','garantias','historial']))
const canManage=inject('serviceTechnicalCanManage',computed(()=>true))
const base=computed(()=>apiBase.value)
const enabled=module=>modules.value.includes(module)
const financialVisible=computed(()=>enabled('pagos'))
const clientMode=computed(()=>route.path.startsWith('/mi-apps/servicio-tecnico'))

const loading=ref(false),search=ref(''),dialog=ref(false),kind=ref(''),editing=ref(null),detail=ref(false),selected=ref(null)
const paymentDialog=ref(false),workDialog=ref(false),evidenceDialog=ref(false),evidenceFile=ref(null),referencesLoaded=ref(false)
const resumen=ref({clientes:0,equipos:0,tecnicos:0,ordenes_abiertas:0,esperando_aprobacion:0,listos_entrega:0,por_cobrar:0,agenda_hoy:[]})
const clientes=ref([]),equipos=ref([]),tecnicos=ref([]),usuarios=ref([]),ordenes=ref([]),pagos=ref([]),garantias=ref([]),historial=ref([])
const client=reactive({nombre:'',telefono:'',whatsapp:'',direccion:'',observaciones:'',activo:true})
const equipment=reactive({cliente_id:null,tipo:'Computadora',marca:'',modelo:'',serie:'',especificaciones:'',accesorios_recibidos:'',estado_recepcion:'',observaciones:'',activo:true})
const technician=reactive({usuario_id:null,nombre:'',telefono:'',especialidad:'',activo:true})
const order=reactive({cliente_id:null,equipo_id:null,tecnico_id:null,fecha_recepcion:'',fecha_programada:'',hora_programada:'',prioridad:'normal',problema_reportado:'',diagnostico:'',propuesta:'',costo_servicio:0,descuento:0})
const payment=reactive({monto:0,metodo:'efectivo',referencia:''})
const work=reactive({trabajo_realizado:'',recomendaciones:'',garantia_dias:0,condiciones_garantia:''})
const evidence=reactive({etapa:'recepcion',descripcion:''})
const actionOrder=ref(null)

const section=computed(()=>String(route.meta.supportSection||route.query.section||'inicio'))
const info={inicio:['Inicio','Resumen real del trabajo técnico.'],clientes:['Clientes','Personas que dejan sus equipos.'],equipos:['Computadoras','Ficha técnica y estado de recepción.'],tecnicos:['Técnicos','Personal responsable del servicio.'],ordenes:['Órdenes de servicio','Recepción, diagnóstico, reparación y entrega.'],agenda:['Agenda','Trabajos programados por fecha y hora.'],pagos:['Pagos','Abonos y saldos de las órdenes.'],garantias:['Garantías','Coberturas registradas por reparación.'],historial:['Historial y reportes','Servicios entregados o cerrados sin reparación.']}
const title=computed(()=>info[section.value]?.[0]||'Servicio Técnico'),subtitle=computed(()=>info[section.value]?.[1]||'')
const stateMap={recibido:'Recibido',diagnostico:'En diagnóstico',esperando_aprobacion:'Esperando aprobación',reparacion:'En reparación',pruebas:'En pruebas',listo_entrega:'Listo para entregar',entregado:'Entregado',sin_reparacion:'Sin reparación'}
const stateColor=v=>({recibido:'blue',diagnostico:'purple',esperando_aprobacion:'orange',reparacion:'teal',pruebas:'indigo',listo_entrega:'positive',entregado:'grey-8',sin_reparacion:'grey'}[v]||'grey')
const pretty=v=>String(v||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),money=v=>`${Number(v||0).toFixed(2)} Bs`
const date=v=>v?new Date(`${String(v).slice(0,10)}T12:00:00`).toLocaleDateString('es-BO'):'—',time=v=>v?String(v).slice(0,5):''
const equipLabel=r=>[r.equipo_tipo,r.equipo_marca,r.equipo_modelo,r.equipo_serie].filter(Boolean).join(' · ')||'Sin equipo'
const clean=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v===''?null:v]))
const fail=(e,m='No se pudo completar la operación.')=>$q.notify({type:'negative',message:e.response?.data?.message||m})
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),matches=r=>!search.value||norm(Object.values(r||{}).join(' ')).includes(norm(search.value))
const activeClients=computed(()=>clientes.value.filter(x=>x.activo!==false)),activeTechs=computed(()=>tecnicos.value.filter(x=>x.activo!==false)),clientEquipment=computed(()=>equipos.value.filter(x=>x.activo!==false&&Number(x.cliente_id)===Number(order.cliente_id)))
const openOrders=computed(()=>ordenes.value.filter(x=>!['entregado','sin_reparacion'].includes(x.estado)))
const agenda=computed(()=>openOrders.value.filter(x=>x.fecha_programada).sort((a,b)=>`${a.fecha_programada} ${a.hora_programada||''}`.localeCompare(`${b.fecha_programada} ${b.hora_programada||''}`)))
const rows=computed(()=>({clientes:clientes.value,equipos:equipos.value,tecnicos:tecnicos.value,ordenes:openOrders.value,agenda:agenda.value,pagos:pagos.value,garantias:garantias.value,historial:historial.value}[section.value]||[]).filter(matches))
const isOrderSection=computed(()=>['ordenes','agenda','historial','garantias'].includes(section.value))
const tableViewable=computed(()=>isOrderSection.value)
const tableEditable=computed(()=>['ordenes','agenda'].includes(section.value)||(['clientes','equipos','tecnicos'].includes(section.value)&&canManage.value))
const tableDeletable=computed(()=>canManage.value&&['clientes','equipos','tecnicos','ordenes','agenda'].includes(section.value))
const tableReadonly=computed(()=>['pagos','garantias','historial'].includes(section.value))

const columns=computed(()=>({
  clientes:[{name:'nombre',label:'Cliente',field:'nombre',align:'left'},{name:'telefono',label:'Teléfono',field:'telefono',align:'left'},{name:'whatsapp',label:'WhatsApp',field:'whatsapp',align:'left'},{name:'estado',label:'Estado',field:r=>r.activo?'Activo':'Inactivo',align:'left'},{name:'actions',label:'',field:'id'}],
  equipos:[{name:'equipo',label:'Computadora',field:r=>[r.tipo,r.marca,r.modelo].filter(Boolean).join(' · '),align:'left'},{name:'cliente',label:'Cliente',field:'cliente_nombre',align:'left'},{name:'serie',label:'Serie',field:'serie',align:'left'},{name:'estado',label:'Recepción',field:'estado_recepcion',align:'left'},{name:'actions',label:'',field:'id'}],
  tecnicos:[{name:'nombre',label:'Técnico',field:'nombre',align:'left'},{name:'telefono',label:'Teléfono',field:'telefono',align:'left'},{name:'especialidad',label:'Especialidad',field:'especialidad',align:'left'},{name:'estado',label:'Estado',field:r=>r.activo?'Activo':'Inactivo',align:'left'},{name:'actions',label:'',field:'id'}],
  ordenes:orderCols(),agenda:orderCols(),historial:orderCols(),
  pagos:[{name:'fecha',label:'Fecha',field:'pagado_at',align:'left'},{name:'orden',label:'Orden',field:'orden_codigo',align:'left'},{name:'cliente',label:'Cliente',field:'cliente_nombre',align:'left'},{name:'estado',label:'Método',field:'metodo',align:'left'},{name:'total',label:'Monto',field:'monto',align:'right'}],
  garantias:[{name:'codigo',label:'Orden',field:'codigo',align:'left'},{name:'cliente',label:'Cliente',field:'cliente_nombre',align:'left'},{name:'equipo',label:'Computadora',field:r=>equipLabel(r),align:'left'},{name:'fecha',label:'Vence',field:'garantia_fin',align:'left'},{name:'actions',label:'',field:'id'}],
}[section.value]||[]))
function orderCols(){const cols=[{name:'codigo',label:'Orden',field:'codigo',align:'left'},{name:'fecha',label:'Fecha',field:r=>r.fecha_programada||r.fecha_recepcion,align:'left'},{name:'cliente',label:'Cliente',field:'cliente_nombre',align:'left'},{name:'equipo',label:'Computadora',field:r=>equipLabel(r),align:'left'},{name:'estado',label:'Estado',field:'estado',align:'left'}];if(financialVisible.value)cols.push({name:'total',label:'Total',field:'total',align:'right'});cols.push({name:'actions',label:'',field:'id'});return cols}

async function load(){
  loading.value=true
  try{
    const jobs=[]
    const put=(promise,setter)=>jobs.push(promise.then(({data})=>setter(data.data)))
    if(enabled('inicio'))put(api.get(`${base.value}/resumen`),v=>{resumen.value=v||resumen.value})
    if(enabled('clientes'))put(api.get(`${base.value}/clientes`),v=>{clientes.value=v||[]})
    if(enabled('equipos'))put(api.get(`${base.value}/equipos`),v=>{equipos.value=v||[]})
    if(enabled('tecnicos')){
      put(api.get(`${base.value}/tecnicos`),v=>{tecnicos.value=v||[]})
      if(canManage.value)put(api.get(`${base.value}/usuarios-negocio`),v=>{usuarios.value=v||[]})
    }
    if(enabled('ordenes'))put(api.get(`${base.value}/ordenes`),v=>{ordenes.value=v||[]})
    if(enabled('pagos'))put(api.get(`${base.value}/pagos`),v=>{pagos.value=v||[]})
    if(enabled('garantias'))put(api.get(`${base.value}/garantias`),v=>{garantias.value=v||[]})
    if(enabled('historial'))put(api.get(`${base.value}/historial`),v=>{historial.value=v||[]})
    await Promise.all(jobs)
    if(selected.value){const fresh=[...ordenes.value,...historial.value,...garantias.value].find(x=>x.id===selected.value.id);if(fresh)selected.value=fresh}
  }catch(e){fail(e,'No se pudo cargar Servicio Técnico VITI.')}finally{loading.value=false}
}
async function ensureReferences(){
  if(referencesLoaded.value)return
  try{const {data}=await api.get(`${base.value}/referencias`);const refs=data.data||{};clientes.value=refs.clientes||clientes.value;equipos.value=refs.equipos||equipos.value;tecnicos.value=refs.tecnicos||tecnicos.value;referencesLoaded.value=true}
  catch(e){fail(e,'No se pudieron cargar los datos necesarios para la orden.');throw e}
}
function reset(k){editing.value=null;kind.value=k;if(k==='cliente')Object.assign(client,{nombre:'',telefono:'',whatsapp:'',direccion:'',observaciones:'',activo:true});if(k==='equipo')Object.assign(equipment,{cliente_id:null,tipo:'Computadora',marca:'',modelo:'',serie:'',especificaciones:'',accesorios_recibidos:'',estado_recepcion:'',observaciones:'',activo:true});if(k==='tecnico')Object.assign(technician,{usuario_id:null,nombre:'',telefono:'',especialidad:'',activo:true});if(k==='orden')Object.assign(order,{cliente_id:null,equipo_id:null,tecnico_id:null,fecha_recepcion:new Date().toISOString().slice(0,10),fecha_programada:'',hora_programada:'',prioridad:'normal',problema_reportado:'',diagnostico:'',propuesta:'',costo_servicio:0,descuento:0})}
async function open(k,row=null){
  if(k==='orden')await ensureReferences()
  reset(k)
  if(row){editing.value=row.id;Object.assign(k==='cliente'?client:k==='equipo'?equipment:k==='tecnico'?technician:order,row);if(k==='orden'){order.fecha_recepcion=String(row.fecha_recepcion||'').slice(0,10);order.fecha_programada=String(row.fecha_programada||'').slice(0,10);order.hora_programada=time(row.hora_programada)}}
  dialog.value=true
}
async function save(){try{const form=kind.value==='cliente'?client:kind.value==='equipo'?equipment:kind.value==='tecnico'?technician:order,ep={cliente:'clientes',equipo:'equipos',tecnico:'tecnicos',orden:'ordenes'}[kind.value],body=clean({...form});if(!financialVisible.value&&kind.value==='orden'){delete body.costo_servicio;delete body.descuento}editing.value?await api.put(`${base.value}/${ep}/${editing.value}`,body):await api.post(`${base.value}/${ep}`,body);dialog.value=false;referencesLoaded.value=false;await load();$q.notify({type:'positive',message:'Datos guardados.'})}catch(e){fail(e)}}
function remove(k,row){const ep={cliente:'clientes',equipo:'equipos',tecnico:'tecnicos',orden:'ordenes'}[k];$q.dialog({title:'Confirmar',message:'¿Eliminar este registro? Los datos con trazabilidad están protegidos.',cancel:true,persistent:true}).onOk(async()=>{try{await api.delete(`${base.value}/${ep}/${row.id}`);referencesLoaded.value=false;await load()}catch(e){fail(e)}})}
function show(row){selected.value=row;detail.value=true}
async function accept(row){try{await api.post(`${base.value}/ordenes/${row.id}/decision`,{decision:'aceptado'});await load()}catch(e){fail(e)}}
function reject(row){$q.dialog({title:'Cerrar sin reparación',message:'Indica por qué el cliente no autorizó el trabajo.',prompt:{model:'',type:'textarea',isValid:v=>String(v||'').trim().length>2},cancel:true}).onOk(async motivo=>{try{await api.post(`${base.value}/ordenes/${row.id}/decision`,{decision:'rechazado',motivo_rechazo:motivo});await load()}catch(e){fail(e)}})}
function openWork(row){actionOrder.value=row;Object.assign(work,{trabajo_realizado:row.trabajo_realizado||'',recomendaciones:row.recomendaciones||'',garantia_dias:Number(row.garantia_dias||0),condiciones_garantia:row.condiciones_garantia||''});workDialog.value=true}
async function saveWork(){try{await api.post(`${base.value}/ordenes/${actionOrder.value.id}/finalizar-trabajo`,clean({...work}));workDialog.value=false;await load()}catch(e){fail(e)}}
async function state(row,value){try{await api.post(`${base.value}/ordenes/${row.id}/estado`,{estado:value});await load();if(value==='entregado')$q.notify({type:'positive',message:'Equipo marcado como entregado y guardado en el historial.'})}catch(e){fail(e)}}
function openPayment(row){actionOrder.value=row;Object.assign(payment,{monto:Number(row.saldo||0),metodo:'efectivo',referencia:''});paymentDialog.value=true}
async function savePayment(){try{await api.post(`${base.value}/ordenes/${actionOrder.value.id}/pagos`,clean({...payment}));paymentDialog.value=false;await load();$q.notify({type:'positive',message:'Pago registrado.'})}catch(e){fail(e)}}
function openEvidence(row){actionOrder.value=row;evidenceFile.value=null;Object.assign(evidence,{etapa:row.estado==='recibido'?'recepcion':row.estado==='diagnostico'?'diagnostico':row.estado==='pruebas'?'pruebas':row.estado==='listo_entrega'?'entrega':'reparacion',descripcion:''});evidenceDialog.value=true}
async function saveEvidence(){if(!evidenceFile.value)return;$q.loading.show();try{const f=new FormData();f.append('archivo',evidenceFile.value);f.append('etapa',evidence.etapa);if(evidence.descripcion)f.append('descripcion',evidence.descripcion);await api.post(`${base.value}/ordenes/${actionOrder.value.id}/evidencias`,f);evidenceDialog.value=false;await load();$q.notify({type:'positive',message:'Fotografía guardada como evidencia privada.'})}catch(e){fail(e)}finally{$q.loading.hide()}}
async function downloadEvidence(item){try{const r=await api.get(`${base.value}/evidencias/${item.id}/descargar`,{responseType:'blob'});saveBlob(r.data,item.nombre_original||'evidencia')}catch(e){fail(e)}}
function dropEvidence(item){$q.dialog({title:'Eliminar fotografía',message:'Solo se permite mientras la orden siga abierta. Una orden cerrada conserva sus evidencias.',cancel:true}).onOk(async()=>{try{await api.delete(`${base.value}/evidencias/${item.id}`);await load()}catch(e){fail(e)}})}
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
async function downloadOrderPdf(row){try{const r=await api.get(`${base.value}/ordenes/${row.id}/pdf`,{responseType:'blob'});saveBlob(r.data,`${row.codigo}-orden-servicio.pdf`)}catch(e){fail(e,'No se pudo generar el PDF de la orden.')}}
async function downloadReport(){try{$q.loading.show();const r=await api.get(`${base.value}/reportes/resumen`,{responseType:'blob'});saveBlob(r.data,`servicio-tecnico-reporte-${new Date().toISOString().slice(0,10)}.pdf`)}catch(e){fail(e,'No se pudo generar el reporte PDF.')}finally{$q.loading.hide()}}

onMounted(load)
watch(()=>route.fullPath,()=>{search.value='';window.scrollTo({top:0,behavior:'smooth'})})
</script>

<template>
<q-page class="sv-page q-pa-md q-pa-lg-xl"><q-inner-loading :showing="loading"/>
  <div class="heading">
    <div><div class="text-overline text-primary">Servicio Técnico VITI · V1.0</div><div class="text-h4 text-weight-bold">{{title}}</div><div class="text-body2 text-grey-7">{{subtitle}}</div></div>
    <div class="actions">
      <q-badge color="positive" class="progress">100% · Finalizada</q-badge>
      <q-btn v-if="enabled('ordenes')&&['inicio','ordenes','agenda'].includes(section)" color="primary" unelevated no-caps icon="add" label="Nueva orden" @click="open('orden')"/>
      <q-btn v-if="section==='clientes'&&canManage" color="primary" unelevated no-caps icon="person_add" label="Nuevo cliente" @click="open('cliente')"/>
      <q-btn v-if="section==='equipos'&&canManage" color="primary" unelevated no-caps icon="computer" label="Nueva computadora" @click="open('equipo')"/>
      <q-btn v-if="section==='tecnicos'&&canManage" color="primary" unelevated no-caps icon="engineering" label="Nuevo técnico" @click="open('tecnico')"/>
      <q-btn v-if="section==='historial'&&canManage" outline color="primary" no-caps icon="picture_as_pdf" label="Reporte PDF" @click="downloadReport"/>
    </div>
  </div>

  <q-banner rounded class="release q-mb-lg"><template #avatar><q-icon name="verified" color="positive"/></template><strong>V1.0 terminada.</strong> {{clientMode?'La aplicación está disponible según los permisos de tu rol.':'La aplicación está lista para entrega, pero el acceso de la empresa continúa deshabilitado hasta que AGR Studio lo habilite expresamente.'}}</q-banner>

  <template v-if="section==='inicio'">
    <div class="metrics">
      <q-card v-for="m in [{i:'groups',v:resumen.clientes,l:'Clientes'},{i:'computer',v:resumen.equipos,l:'Computadoras'},{i:'assignment',v:resumen.ordenes_abiertas,l:'Órdenes abiertas'},{i:'hourglass_top',v:resumen.esperando_aprobacion,l:'Esperando aprobación'},{i:'inventory',v:resumen.listos_entrega,l:'Listos para entregar'},...(financialVisible?[{i:'payments',v:money(resumen.por_cobrar),l:'Por cobrar'}]:[])]" :key="m.l" flat class="card"><q-card-section><q-icon :name="m.i" color="primary" size="28px"/><div class="metric">{{m.v}}</div><div class="text-caption">{{m.l}}</div></q-card-section></q-card>
    </div>
    <q-card flat class="card q-mt-lg"><q-card-section><div class="text-h6 text-weight-bold">Agenda de hoy</div><div class="text-caption text-grey-6">Trabajos programados y todavía abiertos.</div></q-card-section><q-list separator><q-item v-for="r in resumen.agenda_hoy||[]" :key="r.id" clickable @click="show(r)"><q-item-section><q-item-label class="text-weight-bold">{{time(r.hora_programada)||'Sin hora'}} · {{r.cliente_nombre}}</q-item-label><q-item-label caption>{{equipLabel(r)}} · {{r.problema_reportado}}</q-item-label></q-item-section><q-item-section side><q-badge :color="stateColor(r.estado)">{{stateMap[r.estado]}}</q-badge></q-item-section></q-item><div v-if="!(resumen.agenda_hoy||[]).length" class="empty">No hay trabajos programados para hoy.</div></q-list></q-card>
  </template>

  <template v-else>
    <q-input v-model="search" outlined clearable debounce="120" class="search q-mb-md" placeholder="Buscar en esta sección"><template #prepend><q-icon name="search"/></template></q-input>
    <SoporteVitalDataTable :rows="rows" :columns="columns" :empty="`No hay registros en ${title.toLowerCase()}.`" :grid="$q.screen.lt.md" :readonly="tableReadonly" :viewable="tableViewable" :editable="tableEditable" :deletable="tableDeletable" @view="show" @edit="row=>open(section==='clientes'?'cliente':section==='equipos'?'equipo':section==='tecnicos'?'tecnico':'orden',row)" @delete="row=>remove(section==='clientes'?'cliente':section==='equipos'?'equipo':section==='tecnicos'?'tecnico':'orden',row)">
      <template #estado="p"><q-badge :color="p.row.estado&&stateMap[p.row.estado]?stateColor(p.row.estado):(p.value==='Activo'?'positive':'grey')">{{p.row.estado&&stateMap[p.row.estado]?stateMap[p.row.estado]:pretty(p.value)}}</q-badge></template>
      <template #fecha="p">{{date(p.value)}} {{time(p.row.hora_programada)}}</template>
      <template #total="p">{{money(p.value)}}</template>
    </SoporteVitalDataTable>
  </template>

  <q-dialog v-model="dialog" persistent><q-card class="form"><q-card-section><div class="text-overline text-primary">Servicio Técnico</div><div class="text-h5 text-weight-bold">{{editing?'Editar':'Registrar'}} {{pretty(kind)}}</div></q-card-section><q-separator/><q-card-section class="body q-gutter-md">
    <template v-if="kind==='cliente'"><q-input v-model="client.nombre" outlined label="Nombre *"/><q-input v-model="client.telefono" outlined label="Teléfono"/><q-input v-model="client.whatsapp" outlined label="WhatsApp"/><q-input v-model="client.direccion" outlined label="Dirección"/><q-input v-model="client.observaciones" outlined type="textarea" autogrow label="Observaciones"/><q-toggle v-model="client.activo" label="Activo"/></template>
    <template v-else-if="kind==='equipo'"><q-select v-model="equipment.cliente_id" outlined emit-value map-options :options="activeClients.map(x=>({label:x.nombre,value:x.id}))" label="Cliente *"/><q-input v-model="equipment.tipo" outlined label="Tipo *"/><q-input v-model="equipment.marca" outlined label="Marca"/><q-input v-model="equipment.modelo" outlined label="Modelo"/><q-input v-model="equipment.serie" outlined label="Serie"/><q-input v-model="equipment.especificaciones" outlined type="textarea" autogrow label="Especificaciones"/><q-input v-model="equipment.accesorios_recibidos" outlined type="textarea" autogrow label="Accesorios recibidos"/><q-input v-model="equipment.estado_recepcion" outlined type="textarea" autogrow label="Estado al recibir"/><q-input v-model="equipment.observaciones" outlined type="textarea" autogrow label="Observaciones"/></template>
    <template v-else-if="kind==='tecnico'"><q-select v-model="technician.usuario_id" clearable outlined emit-value map-options :options="usuarios.map(x=>({label:`${x.nombre} ${x.apellido||''} · @${x.usuario}`,value:x.id}))" label="Cuenta VITI"/><q-input v-model="technician.nombre" outlined label="Nombre *"/><q-input v-model="technician.telefono" outlined label="Teléfono"/><q-input v-model="technician.especialidad" outlined label="Especialidad"/></template>
    <template v-else><q-select v-model="order.cliente_id" outlined emit-value map-options :options="activeClients.map(x=>({label:x.nombre,value:x.id}))" label="Cliente *" @update:model-value="order.equipo_id=null"/><q-select v-model="order.equipo_id" clearable outlined emit-value map-options :options="clientEquipment.map(x=>({label:[x.tipo,x.marca,x.modelo,x.serie].filter(Boolean).join(' · '),value:x.id}))" label="Computadora"/><q-select v-model="order.tecnico_id" clearable outlined emit-value map-options :options="activeTechs.map(x=>({label:x.nombre,value:x.id}))" label="Técnico"/><div class="row q-col-gutter-md"><div class="col-12 col-sm-5"><q-input v-model="order.fecha_recepcion" type="date" stack-label outlined label="Recepción *"/></div><div class="col-7 col-sm-4"><q-input v-model="order.fecha_programada" type="date" stack-label outlined label="Fecha programada"/></div><div class="col-5 col-sm-3"><q-input v-model="order.hora_programada" type="time" stack-label outlined label="Hora"/></div></div><q-select v-model="order.prioridad" outlined :options="['baja','normal','alta','urgente']" label="Prioridad"/><q-input v-model="order.problema_reportado" outlined type="textarea" autogrow label="Problema reportado *"/><template v-if="editing"><q-input v-model="order.diagnostico" outlined type="textarea" autogrow label="Diagnóstico"/><q-input v-model="order.propuesta" outlined type="textarea" autogrow label="Propuesta"/><div v-if="financialVisible" class="row q-col-gutter-md"><div class="col-6"><q-input v-model.number="order.costo_servicio" type="number" min="0" outlined label="Costo (Bs)"/></div><div class="col-6"><q-input v-model.number="order.descuento" type="number" min="0" outlined label="Descuento (Bs)"/></div></div></template></template>
  </q-card-section><q-separator/><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Guardar" @click="save"/></q-card-actions></q-card></q-dialog>

  <q-dialog v-model="detail"><q-card v-if="selected" class="detail"><q-card-section class="row items-start no-wrap"><div class="col min-width-0"><div class="text-overline text-primary">Orden de servicio</div><div class="text-h5 text-weight-bold">{{selected.codigo}}</div><div class="text-caption ellipsis">{{selected.cliente_nombre}} · {{equipLabel(selected)}}</div></div><q-btn flat round icon="close" v-close-popup/></q-card-section><q-separator/><q-card-section class="q-gutter-md"><div class="row items-center q-gutter-sm"><q-badge :color="stateColor(selected.estado)">{{stateMap[selected.estado]}}</q-badge><q-badge v-if="selected.prioridad" outline color="primary">{{pretty(selected.prioridad)}}</q-badge></div><div><b>Problema:</b> {{selected.problema_reportado}}</div><div v-if="selected.diagnostico"><b>Diagnóstico:</b> {{selected.diagnostico}}</div><div v-if="selected.propuesta"><b>Propuesta:</b> {{selected.propuesta}}</div><div v-if="selected.motivo_rechazo"><b>Motivo de cierre:</b> {{selected.motivo_rechazo}}</div><div v-if="selected.trabajo_realizado"><b>Trabajo realizado:</b> {{selected.trabajo_realizado}}</div><div v-if="selected.recomendaciones"><b>Recomendaciones:</b> {{selected.recomendaciones}}</div><div v-if="financialVisible" class="amount"><span>Total {{money(selected.total)}}</span><span class="text-positive">Pagado {{money(selected.pagado)}}</span><span :class="Number(selected.saldo)>0?'text-orange':'text-positive'">Saldo {{money(selected.saldo)}}</span></div><div v-if="selected.garantia_fin" class="warranty"><q-icon name="verified" color="positive" size="26px"/><div><b>Garantía hasta {{date(selected.garantia_fin)}}</b><div class="text-caption">{{selected.condiciones_garantia||`${selected.garantia_dias} días`}}</div></div></div><div class="row items-center"><b>Evidencias privadas</b><q-space/><q-btn v-if="!['entregado','sin_reparacion'].includes(selected.estado)" outline color="primary" no-caps icon="photo_camera" label="Agregar" @click="openEvidence(selected)"/></div><q-list v-if="selected.evidencias?.length" bordered separator class="evidence-list"><q-item v-for="x in selected.evidencias" :key="x.id"><q-item-section><q-item-label>{{x.nombre_original}}</q-item-label><q-item-label caption>{{pretty(x.etapa)}} · {{x.descripcion||'Sin descripción'}}</q-item-label></q-item-section><q-item-section side class="row no-wrap"><q-btn flat round icon="download" @click="downloadEvidence(x)"/><q-btn v-if="canManage&&!['entregado','sin_reparacion'].includes(selected.estado)" flat round color="negative" icon="delete" @click="dropEvidence(x)"/></q-item-section></q-item></q-list></q-card-section><q-separator/><q-card-actions class="detail-actions"><q-btn v-if="selected.estado==='esperando_aprobacion'" outline color="negative" no-caps label="No aceptó" @click="reject(selected)"/><q-btn v-if="selected.estado==='esperando_aprobacion'" color="positive" unelevated no-caps label="Aceptó propuesta" @click="accept(selected)"/><q-btn v-if="selected.estado==='reparacion'" color="primary" unelevated no-caps label="Registrar reparación" @click="openWork(selected)"/><q-btn v-if="selected.estado==='pruebas'" color="positive" unelevated no-caps label="Listo para entregar" @click="state(selected,'listo_entrega')"/><q-btn v-if="selected.estado==='listo_entrega'" color="positive" unelevated no-caps label="Confirmar entrega" @click="state(selected,'entregado')"/><q-btn v-if="canManage" outline color="primary" no-caps icon="picture_as_pdf" label="PDF" @click="downloadOrderPdf(selected)"/><q-space/><q-btn v-if="financialVisible&&Number(selected.saldo)>0" color="positive" unelevated no-caps icon="payments" label="Registrar pago" @click="openPayment(selected)"/></q-card-actions></q-card></q-dialog>

  <q-dialog v-model="paymentDialog"><q-card class="small"><q-card-section><div class="text-h6">Registrar pago</div><div class="text-caption">Saldo {{money(actionOrder?.saldo)}}</div></q-card-section><q-card-section class="q-gutter-md"><q-select v-model="payment.metodo" outlined :options="['efectivo','qr','transferencia','tarjeta','otro']" label="Método"/><q-input v-model.number="payment.monto" type="number" min="0.01" outlined label="Monto"/><q-input v-model="payment.referencia" outlined label="Referencia"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="positive" unelevated label="Registrar" @click="savePayment"/></q-card-actions></q-card></q-dialog>
  <q-dialog v-model="workDialog"><q-card class="small"><q-card-section><div class="text-h6">Trabajo realizado</div></q-card-section><q-card-section class="q-gutter-md"><q-input v-model="work.trabajo_realizado" outlined type="textarea" autogrow label="Trabajo *"/><q-input v-model="work.recomendaciones" outlined type="textarea" autogrow label="Recomendaciones"/><q-input v-model.number="work.garantia_dias" type="number" min="0" outlined label="Días de garantía"/><q-input v-if="work.garantia_dias" v-model="work.condiciones_garantia" outlined type="textarea" autogrow label="Condiciones"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Guardar y pasar a pruebas" @click="saveWork"/></q-card-actions></q-card></q-dialog>
  <q-dialog v-model="evidenceDialog"><q-card class="small"><q-card-section><div class="text-h6">Evidencia privada</div></q-card-section><q-card-section class="q-gutter-md"><q-select v-model="evidence.etapa" outlined emit-value map-options :options="[{label:'Recepción',value:'recepcion'},{label:'Diagnóstico',value:'diagnostico'},{label:'Reparación',value:'reparacion'},{label:'Pruebas',value:'pruebas'},{label:'Entrega',value:'entrega'}]" label="Etapa"/><q-file v-model="evidenceFile" outlined accept="image/jpeg,image/png,image/webp" label="Fotografía *"/><q-input v-model="evidence.descripcion" outlined label="Descripción"/></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup/><q-btn color="primary" unelevated label="Guardar" :disable="!evidenceFile" @click="saveEvidence"/></q-card-actions></q-card></q-dialog>
</q-page>
</template>

<style scoped>
.sv-page{max-width:1550px;margin:auto}.heading{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:18px}.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.progress{font-size:14px;padding:9px}.release{background:rgba(21,128,61,.08);border:1px solid rgba(21,128,61,.22)}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card{border:1px solid var(--viti-border);border-radius:20px}.metric{font-size:28px;font-weight:800;margin-top:10px}.search{max-width:560px}.empty{padding:32px;text-align:center;color:var(--viti-muted)}.form{width:700px;max-width:95vw}.body{max-height:68vh;overflow:auto}.detail{width:850px;max-width:95vw;max-height:92vh;overflow:auto}.small{width:500px;max-width:94vw}.amount{display:flex;justify-content:space-between;gap:12px;padding:14px;border-radius:12px;background:color-mix(in srgb,var(--viti-bg) 80%,var(--viti-card))}.warranty{display:flex;align-items:center;gap:10px;padding:12px;border-radius:12px;background:rgba(21,128,61,.08)}.detail-actions{gap:8px;flex-wrap:wrap}.evidence-list{border-radius:12px}.min-width-0{min-width:0}@media(max-width:900px){.heading{flex-direction:column}.metrics{grid-template-columns:repeat(2,1fr)}.actions{width:100%}.actions .q-btn{flex:1}}@media(max-width:600px){.sv-page{padding:16px 12px}.metrics{grid-template-columns:1fr}.amount{flex-direction:column}.detail-actions{display:grid;grid-template-columns:1fr}.detail-actions .q-space{display:none}.form,.detail{max-width:100vw}.body{max-height:72vh}}
</style>
