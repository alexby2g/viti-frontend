<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'
import { formatDateTime } from '../utils/date'

const $q = useQuasar()
const tab = ref('inicio')
const loading = ref(false)
const empresas = ref([])
const empresaId = ref(Number(localStorage.getItem('viti-peluqueria-empresa') || 0) || null)
const resumen = ref({ clientes:0, citas_hoy:0, en_atencion:0, atenciones_hoy:0, ingresos_hoy:0, agenda_hoy:[] })
const clientes = ref([])
const servicios = ref([])
const personal = ref([])
const citas = ref([])
const atenciones = ref([])
const historial = ref([])

const dialog = ref(false)
const dialogType = ref('')
const editingId = ref(null)
const paymentDialog = ref(false)
const paymentAtencion = ref(null)

const clienteForm = reactive({ nombre:'',telefono:'',whatsapp:'',fecha_nacimiento:'',sexo:'',direccion:'',observaciones:'',activo:true })
const servicioForm = reactive({ nombre:'',categoria:'',duracion_minutos:30,precio:0,descripcion:'',activo:true })
const personalForm = reactive({ nombre:'',telefono:'',especialidad:'',horario_inicio:'09:00',horario_fin:'18:00',porcentaje_comision:0,activo:true })
const citaForm = reactive({ cliente_id:null,servicio_id:null,personal_id:null,fecha:'',hora_inicio:'',hora_fin:'',estado:'pendiente',notas:'' })
const atencionForm = reactive({ cita_id:null,cliente_id:null,servicio_id:null,personal_id:null,descuento:0,observaciones:'' })
const pagoForm = reactive({ metodo:'efectivo',monto:0,referencia:'' })

const empresa = computed(() => empresas.value.find(x => x.id === empresaId.value) || null)
const activeClientes = computed(() => clientes.value.filter(x => x.activo))
const activeServicios = computed(() => servicios.value.filter(x => x.activo))
const activePersonal = computed(() => personal.value.filter(x => x.activo))
const citasHoy = computed(() => resumen.value.agenda_hoy || [])

const money = value => `${Number(value || 0).toFixed(2)} Bs`
const statusColor = value => ({pendiente:'orange',confirmada:'blue',en_espera:'purple',en_atencion:'teal',finalizada:'positive',cancelada:'negative',no_asistio:'grey'}[value] || 'grey')
const paid = row => (row.pagos || []).reduce((sum,p)=>sum+Number(p.monto||0),0)
const pendingAmount = row => Math.max(0, Number(row.total||0)-paid(row))

function query() { return { empresa_id: empresaId.value } }
function payload(data) { return { ...data, empresa_id: empresaId.value } }
function cleanEmpty(data) { return Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v===''?null:v])) }
function notifyError(e, fallback='No se pudo completar la operación.') { $q.notify({type:'negative',message:e.response?.data?.message || fallback}) }

async function loadCompanies() {
  const { data } = await api.get('/empresas',{params:{per_page:100}})
  empresas.value = data.data || []
  if (!empresaId.value && empresas.value[0]) empresaId.value = empresas.value[0].id
  if (empresaId.value && !empresas.value.some(x=>x.id===empresaId.value)) empresaId.value = empresas.value[0]?.id || null
}

async function loadApp() {
  if (!empresaId.value) return
  loading.value = true
  try {
    const params = query()
    const [r,c,s,p,a,t,h] = await Promise.all([
      api.get('/apps/peluqueria/resumen',{params}),
      api.get('/apps/peluqueria/clientes',{params}),
      api.get('/apps/peluqueria/servicios',{params}),
      api.get('/apps/peluqueria/personal',{params}),
      api.get('/apps/peluqueria/citas',{params}),
      api.get('/apps/peluqueria/atenciones',{params}),
      api.get('/apps/peluqueria/historial',{params}),
    ])
    resumen.value = r.data.data || resumen.value
    clientes.value = c.data.data || []
    servicios.value = s.data.data || []
    personal.value = p.data.data || []
    citas.value = a.data.data || []
    atenciones.value = t.data.data || []
    historial.value = h.data.data || []
    localStorage.setItem('viti-peluqueria-empresa',String(empresaId.value))
  } catch (e) { notifyError(e,'No se pudo cargar Peluquería.') }
  finally { loading.value=false }
}

function reset(type) {
  editingId.value = null
  dialogType.value = type
  if (type==='cliente') Object.assign(clienteForm,{nombre:'',telefono:'',whatsapp:'',fecha_nacimiento:'',sexo:'',direccion:'',observaciones:'',activo:true})
  if (type==='servicio') Object.assign(servicioForm,{nombre:'',categoria:'',duracion_minutos:30,precio:0,descripcion:'',activo:true})
  if (type==='personal') Object.assign(personalForm,{nombre:'',telefono:'',especialidad:'',horario_inicio:'09:00',horario_fin:'18:00',porcentaje_comision:0,activo:true})
  if (type==='cita') Object.assign(citaForm,{cliente_id:null,servicio_id:null,personal_id:null,fecha:new Date().toISOString().slice(0,10),hora_inicio:'09:00',hora_fin:'',estado:'pendiente',notas:''})
  if (type==='atencion') Object.assign(atencionForm,{cita_id:null,cliente_id:null,servicio_id:null,personal_id:null,descuento:0,observaciones:''})
}

function open(type,row=null) {
  reset(type)
  if (row) {
    editingId.value=row.id
    if(type==='cliente')Object.assign(clienteForm,row,{fecha_nacimiento:row.fecha_nacimiento?.slice?.(0,10)||row.fecha_nacimiento||''})
    if(type==='servicio')Object.assign(servicioForm,row)
    if(type==='personal')Object.assign(personalForm,row,{horario_inicio:(row.horario_inicio||'').slice(0,5),horario_fin:(row.horario_fin||'').slice(0,5)})
    if(type==='cita')Object.assign(citaForm,row,{fecha:row.fecha?.slice?.(0,10)||row.fecha||'',hora_inicio:(row.hora_inicio||'').slice(0,5),hora_fin:(row.hora_fin||'').slice(0,5)})
  }
  dialog.value=true
}

function startFromCita(row) {
  reset('atencion')
  Object.assign(atencionForm,{cita_id:row.id,cliente_id:row.cliente_id,servicio_id:row.servicio_id,personal_id:row.personal_id,descuento:0,observaciones:row.notas||''})
  dialog.value=true
}

async function saveDialog() {
  if (!empresaId.value) return
  try {
    let endpoint=''; let form={};
    if(dialogType.value==='cliente'){endpoint='clientes';form=clienteForm}
    if(dialogType.value==='servicio'){endpoint='servicios';form=servicioForm}
    if(dialogType.value==='personal'){endpoint='personal';form=personalForm}
    if(dialogType.value==='cita'){endpoint='citas';form=citaForm}
    if(dialogType.value==='atencion'){endpoint='atenciones';form=atencionForm}
    const body=payload(cleanEmpty({...form}))
    if(editingId.value && dialogType.value!=='atencion') await api.put(`/apps/peluqueria/${endpoint}/${editingId.value}`,body)
    else await api.post(`/apps/peluqueria/${endpoint}`,body)
    dialog.value=false
    $q.notify({type:'positive',message:dialogType.value==='atencion'?'Atención iniciada.':'Datos guardados.'})
    await loadApp()
  } catch(e){ notifyError(e) }
}

async function remove(type,row) {
  const labels={cliente:'cliente',servicio:'servicio',personal:'trabajador',cita:'cita'}
  $q.dialog({title:'Confirmar',message:`¿Eliminar ${labels[type]}?`,cancel:true,persistent:true}).onOk(async()=>{
    try{await api.delete(`/apps/peluqueria/${type==='personal'?'personal':type+'s'}/${row.id}`,{data:{empresa_id:empresaId.value}});await loadApp()}
    catch(e){notifyError(e)}
  })
}

async function finalize(row) {
  try { await api.post(`/apps/peluqueria/atenciones/${row.id}/finalizar`,{empresa_id:empresaId.value,observaciones:row.observaciones||null}); $q.notify({type:'positive',message:'Atención finalizada.'}); await loadApp() }
  catch(e){notifyError(e)}
}

function openPayment(row){paymentAtencion.value=row;Object.assign(pagoForm,{metodo:'efectivo',monto:pendingAmount(row),referencia:''});paymentDialog.value=true}
async function savePayment(){try{await api.post(`/apps/peluqueria/atenciones/${paymentAtencion.value.id}/pagos`,payload(cleanEmpty({...pagoForm})));paymentDialog.value=false;$q.notify({type:'positive',message:'Pago registrado.'});await loadApp()}catch(e){notifyError(e)}}

watch(empresaId,()=>loadApp())
onMounted(async()=>{await loadCompanies();await loadApp()})
</script>

<template>
  <q-page class="viti-page peluqueria-page">
    <PageHeader eyebrow="VITI Apps" title="Peluquería" subtitle="Agenda, clientes, servicios, personal, atenciones y caja en una sola aplicación.">
      <q-select v-model="empresaId" dense outlined emit-value map-options :options="empresas.map(e=>({label:e.nombre_comercial,value:e.id}))" label="Negocio" style="min-width:240px" />
    </PageHeader>

    <q-banner v-if="!empresaId && !loading" rounded class="bg-orange-1 text-orange-10 q-mb-lg">Primero registra una empresa en VITI para utilizar esta aplicación.</q-banner>

    <template v-if="empresaId">
      <div class="app-identity q-mb-lg">
        <div><div class="text-overline text-primary">Negocio activo</div><div class="text-h6 text-weight-bold">{{empresa?.nombre_comercial}}</div></div>
        <div class="row q-gutter-sm"><q-btn color="primary" unelevated icon="event" label="Nueva cita" no-caps @click="open('cita')"/><q-btn outline color="primary" icon="content_cut" label="Nueva atención" no-caps @click="open('atencion')"/></div>
      </div>

      <q-tabs v-model="tab" dense align="left" active-color="primary" indicator-color="primary" class="app-tabs q-mb-md">
        <q-tab name="inicio" icon="dashboard" label="Inicio" no-caps/>
        <q-tab name="agenda" icon="event" label="Agenda" no-caps/>
        <q-tab name="clientes" icon="groups" label="Clientes" no-caps/>
        <q-tab name="servicios" icon="content_cut" label="Servicios" no-caps/>
        <q-tab name="personal" icon="badge" label="Personal" no-caps/>
        <q-tab name="atenciones" icon="point_of_sale" label="Atenciones" no-caps/>
        <q-tab name="historial" icon="history" label="Historial" no-caps/>
      </q-tabs>

      <q-tab-panels v-model="tab" animated class="bg-transparent">
        <q-tab-panel name="inicio" class="q-pa-none">
          <div class="metrics-grid">
            <q-card flat class="viti-card metric"><q-card-section><q-icon name="groups" color="primary" size="28px"/><div class="metric-value">{{resumen.clientes}}</div><div class="text-caption text-grey-6">Clientes activos</div></q-card-section></q-card>
            <q-card flat class="viti-card metric"><q-card-section><q-icon name="event" color="primary" size="28px"/><div class="metric-value">{{resumen.citas_hoy}}</div><div class="text-caption text-grey-6">Citas de hoy</div></q-card-section></q-card>
            <q-card flat class="viti-card metric"><q-card-section><q-icon name="content_cut" color="primary" size="28px"/><div class="metric-value">{{resumen.en_atencion}}</div><div class="text-caption text-grey-6">En atención</div></q-card-section></q-card>
            <q-card flat class="viti-card metric"><q-card-section><q-icon name="payments" color="primary" size="28px"/><div class="metric-value">{{money(resumen.ingresos_hoy)}}</div><div class="text-caption text-grey-6">Ingresos de hoy</div></q-card-section></q-card>
          </div>
          <q-card flat class="viti-card q-mt-lg"><q-card-section><div class="text-h6 text-weight-bold">Agenda de hoy</div><div class="text-caption text-grey-6">Las próximas atenciones del negocio.</div></q-card-section><q-list separator><q-item v-for="c in citasHoy" :key="c.id"><q-item-section avatar><q-avatar color="primary" text-color="white" icon="event"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{c.hora_inicio?.slice(0,5)}} · {{c.cliente?.nombre}}</q-item-label><q-item-label caption>{{c.servicio?.nombre}} · {{c.personal?.nombre||'Sin profesional asignado'}}</q-item-label></q-item-section><q-item-section side><q-badge :color="statusColor(c.estado)">{{c.estado}}</q-badge></q-item-section></q-item><div v-if="!citasHoy.length" class="empty-state q-pa-xl">No hay citas para hoy.</div></q-list></q-card>
        </q-tab-panel>

        <q-tab-panel name="agenda" class="q-pa-none"><div class="section-toolbar"><div><div class="text-h6 text-weight-bold">Agenda</div><div class="text-caption text-grey-6">Organiza las citas sin cruzar horarios del personal.</div></div><q-btn color="primary" unelevated icon="add" label="Nueva cita" no-caps @click="open('cita')"/></div><q-table flat class="viti-table" :rows="citas" :columns="[{name:'fecha',label:'Fecha',field:'fecha',align:'left'},{name:'hora',label:'Hora',field:r=>r.hora_inicio?.slice(0,5),align:'left'},{name:'cliente',label:'Cliente',field:r=>r.cliente?.nombre,align:'left'},{name:'servicio',label:'Servicio',field:r=>r.servicio?.nombre,align:'left'},{name:'personal',label:'Personal',field:r=>r.personal?.nombre||'Sin asignar',align:'left'},{name:'estado',label:'Estado',field:'estado',align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]" row-key="id"><template #body-cell-estado="p"><q-td :props="p"><q-badge :color="statusColor(p.row.estado)">{{p.row.estado}}</q-badge></q-td></template><template #body-cell-acciones="p"><q-td :props="p"><q-btn v-if="!p.row.atencion && !['finalizada','cancelada','no_asistio'].includes(p.row.estado)" flat dense round icon="play_arrow" color="positive" @click="startFromCita(p.row)"><q-tooltip>Iniciar atención</q-tooltip></q-btn><q-btn flat dense round icon="edit" color="primary" @click="open('cita',p.row)"/><q-btn flat dense round icon="delete" color="negative" @click="remove('cita',p.row)"/></q-td></template></q-table></q-tab-panel>

        <q-tab-panel name="clientes" class="q-pa-none"><div class="section-toolbar"><div><div class="text-h6 text-weight-bold">Clientes</div><div class="text-caption text-grey-6">Ficha básica e historial de cada persona.</div></div><q-btn color="primary" unelevated icon="person_add" label="Nuevo cliente" no-caps @click="open('cliente')"/></div><q-table flat class="viti-table" :rows="clientes" :columns="[{name:'nombre',label:'Nombre',field:'nombre',align:'left'},{name:'telefono',label:'Teléfono',field:'telefono',align:'left'},{name:'whatsapp',label:'WhatsApp',field:'whatsapp',align:'left'},{name:'estado',label:'Estado',field:r=>r.activo?'Activo':'Inactivo',align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]" row-key="id"><template #body-cell-acciones="p"><q-td :props="p"><q-btn flat dense round icon="edit" color="primary" @click="open('cliente',p.row)"/><q-btn flat dense round icon="delete" color="negative" @click="remove('cliente',p.row)"/></q-td></template></q-table></q-tab-panel>

        <q-tab-panel name="servicios" class="q-pa-none"><div class="section-toolbar"><div><div class="text-h6 text-weight-bold">Servicios</div><div class="text-caption text-grey-6">Catálogo de servicios, duración y precio.</div></div><q-btn color="primary" unelevated icon="add" label="Nuevo servicio" no-caps @click="open('servicio')"/></div><q-table flat class="viti-table" :rows="servicios" :columns="[{name:'nombre',label:'Servicio',field:'nombre',align:'left'},{name:'categoria',label:'Categoría',field:'categoria',align:'left'},{name:'duracion',label:'Duración',field:r=>`${r.duracion_minutos} min`,align:'left'},{name:'precio',label:'Precio',field:r=>money(r.precio),align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]" row-key="id"><template #body-cell-acciones="p"><q-td :props="p"><q-btn flat dense round icon="edit" color="primary" @click="open('servicio',p.row)"/><q-btn flat dense round icon="delete" color="negative" @click="remove('servicio',p.row)"/></q-td></template></q-table></q-tab-panel>

        <q-tab-panel name="personal" class="q-pa-none"><div class="section-toolbar"><div><div class="text-h6 text-weight-bold">Personal</div><div class="text-caption text-grey-6">Profesionales, horarios y comisión base.</div></div><q-btn color="primary" unelevated icon="person_add" label="Nuevo trabajador" no-caps @click="open('personal')"/></div><q-table flat class="viti-table" :rows="personal" :columns="[{name:'nombre',label:'Nombre',field:'nombre',align:'left'},{name:'especialidad',label:'Especialidad',field:'especialidad',align:'left'},{name:'horario',label:'Horario',field:r=>`${(r.horario_inicio||'').slice(0,5)} - ${(r.horario_fin||'').slice(0,5)}`,align:'left'},{name:'comision',label:'Comisión',field:r=>`${r.porcentaje_comision||0}%`,align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]" row-key="id"><template #body-cell-acciones="p"><q-td :props="p"><q-btn flat dense round icon="edit" color="primary" @click="open('personal',p.row)"/><q-btn flat dense round icon="delete" color="negative" @click="remove('personal',p.row)"/></q-td></template></q-table></q-tab-panel>

        <q-tab-panel name="atenciones" class="q-pa-none"><div class="section-toolbar"><div><div class="text-h6 text-weight-bold">Atenciones y caja</div><div class="text-caption text-grey-6">Inicia el servicio, finalízalo y registra el cobro.</div></div><q-btn color="primary" unelevated icon="add" label="Nueva atención" no-caps @click="open('atencion')"/></div><q-table flat class="viti-table" :rows="atenciones" :columns="[{name:'cliente',label:'Cliente',field:r=>r.cliente?.nombre,align:'left'},{name:'servicio',label:'Servicio',field:r=>r.servicio?.nombre,align:'left'},{name:'personal',label:'Personal',field:r=>r.personal?.nombre||'Sin asignar',align:'left'},{name:'total',label:'Total',field:r=>money(r.total),align:'left'},{name:'pagado',label:'Pagado',field:r=>money(paid(r)),align:'left'},{name:'estado',label:'Estado',field:'estado',align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]" row-key="id"><template #body-cell-estado="p"><q-td :props="p"><q-badge :color="statusColor(p.row.estado)">{{p.row.estado}}</q-badge></q-td></template><template #body-cell-acciones="p"><q-td :props="p"><q-btn v-if="p.row.estado==='en_atencion'" flat dense round icon="check_circle" color="positive" @click="finalize(p.row)"><q-tooltip>Finalizar atención</q-tooltip></q-btn><q-btn v-if="pendingAmount(p.row)>0" flat dense round icon="payments" color="primary" @click="openPayment(p.row)"><q-tooltip>Registrar pago</q-tooltip></q-btn></q-td></template></q-table></q-tab-panel>

        <q-tab-panel name="historial" class="q-pa-none"><div class="section-toolbar"><div><div class="text-h6 text-weight-bold">Historial</div><div class="text-caption text-grey-6">Servicios finalizados por cliente.</div></div></div><q-table flat class="viti-table" :rows="historial" :columns="[{name:'fecha',label:'Fecha',field:r=>r.finalizada_at?formatDateTime(r.finalizada_at):'',align:'left'},{name:'cliente',label:'Cliente',field:r=>r.cliente?.nombre,align:'left'},{name:'servicio',label:'Servicio',field:r=>r.servicio?.nombre,align:'left'},{name:'personal',label:'Personal',field:r=>r.personal?.nombre||'Sin asignar',align:'left'},{name:'total',label:'Total',field:r=>money(r.total),align:'left'},{name:'pagado',label:'Pagado',field:r=>money(paid(r)),align:'left'}]" row-key="id"/></q-tab-panel>
      </q-tab-panels>
    </template>

    <q-dialog v-model="dialog"><q-card class="viti-card form-dialog">
      <q-card-section><div class="text-overline text-primary">Peluquería</div><div class="text-h6 text-weight-bold">{{editingId?'Editar':'Nuevo'}} {{dialogType==='personal'?'trabajador':dialogType}}</div></q-card-section>
      <q-card-section class="q-gutter-md">
        <template v-if="dialogType==='cliente'"><q-input v-model="clienteForm.nombre" outlined label="Nombre *"/><div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model="clienteForm.telefono" outlined label="Teléfono"/></div><div class="col-12 col-sm-6"><q-input v-model="clienteForm.whatsapp" outlined label="WhatsApp"/></div></div><div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model="clienteForm.fecha_nacimiento" type="date" stack-label outlined label="Fecha de nacimiento"/></div><div class="col-12 col-sm-6"><q-select v-model="clienteForm.sexo" outlined clearable :options="['Femenino','Masculino','Otro']" label="Sexo"/></div></div><q-input v-model="clienteForm.direccion" outlined label="Dirección"/><q-input v-model="clienteForm.observaciones" outlined type="textarea" autogrow label="Observaciones"/><q-toggle v-model="clienteForm.activo" label="Cliente activo"/></template>
        <template v-if="dialogType==='servicio'"><q-input v-model="servicioForm.nombre" outlined label="Nombre del servicio *"/><q-input v-model="servicioForm.categoria" outlined label="Categoría" placeholder="Cabello, uñas, barbería..."/><div class="row q-col-gutter-md"><div class="col-6"><q-input v-model.number="servicioForm.duracion_minutos" type="number" min="5" outlined label="Duración (min)"/></div><div class="col-6"><q-input v-model.number="servicioForm.precio" type="number" min="0" step="0.5" outlined label="Precio (Bs)"/></div></div><q-input v-model="servicioForm.descripcion" outlined type="textarea" autogrow label="Descripción"/><q-toggle v-model="servicioForm.activo" label="Servicio activo"/></template>
        <template v-if="dialogType==='personal'"><q-input v-model="personalForm.nombre" outlined label="Nombre *"/><q-input v-model="personalForm.telefono" outlined label="Teléfono"/><q-input v-model="personalForm.especialidad" outlined label="Especialidad"/><div class="row q-col-gutter-md"><div class="col-6"><q-input v-model="personalForm.horario_inicio" type="time" stack-label outlined label="Inicio"/></div><div class="col-6"><q-input v-model="personalForm.horario_fin" type="time" stack-label outlined label="Fin"/></div></div><q-input v-model.number="personalForm.porcentaje_comision" type="number" min="0" max="100" outlined label="Comisión base (%)"/><q-toggle v-model="personalForm.activo" label="Trabajador activo"/></template>
        <template v-if="dialogType==='cita'"><q-select v-model="citaForm.cliente_id" outlined emit-value map-options :options="activeClientes.map(x=>({label:x.nombre,value:x.id}))" label="Cliente *"/><q-select v-model="citaForm.servicio_id" outlined emit-value map-options :options="activeServicios.map(x=>({label:`${x.nombre} · ${money(x.precio)}`,value:x.id}))" label="Servicio *"/><q-select v-model="citaForm.personal_id" outlined clearable emit-value map-options :options="activePersonal.map(x=>({label:x.nombre,value:x.id}))" label="Personal"/><div class="row q-col-gutter-md"><div class="col-12 col-sm-4"><q-input v-model="citaForm.fecha" type="date" stack-label outlined label="Fecha *"/></div><div class="col-6 col-sm-4"><q-input v-model="citaForm.hora_inicio" type="time" stack-label outlined label="Inicio *"/></div><div class="col-6 col-sm-4"><q-input v-model="citaForm.hora_fin" type="time" stack-label outlined label="Fin" hint="Vacío = usa duración del servicio"/></div></div><q-select v-model="citaForm.estado" outlined :options="['pendiente','confirmada','en_espera','en_atencion','finalizada','cancelada','no_asistio']" label="Estado"/><q-input v-model="citaForm.notas" outlined type="textarea" autogrow label="Notas"/></template>
        <template v-if="dialogType==='atencion'"><q-select v-model="atencionForm.cliente_id" outlined emit-value map-options :options="activeClientes.map(x=>({label:x.nombre,value:x.id}))" label="Cliente *"/><q-select v-model="atencionForm.servicio_id" outlined emit-value map-options :options="activeServicios.map(x=>({label:`${x.nombre} · ${money(x.precio)}`,value:x.id}))" label="Servicio *"/><q-select v-model="atencionForm.personal_id" outlined clearable emit-value map-options :options="activePersonal.map(x=>({label:x.nombre,value:x.id}))" label="Personal"/><q-input v-model.number="atencionForm.descuento" outlined type="number" min="0" label="Descuento (Bs)"/><q-input v-model="atencionForm.observaciones" outlined type="textarea" autogrow label="Observaciones"/></template>
      </q-card-section>
      <q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Guardar" @click="saveDialog"/></q-card-actions>
    </q-card></q-dialog>

    <q-dialog v-model="paymentDialog"><q-card class="viti-card" style="width:480px;max-width:94vw"><q-card-section><div class="text-overline text-primary">Caja</div><div class="text-h6 text-weight-bold">Registrar pago</div><div class="text-caption text-grey-6">Pendiente: {{paymentAtencion?money(pendingAmount(paymentAtencion)):'0.00 Bs'}}</div></q-card-section><q-card-section class="q-gutter-md"><q-select v-model="pagoForm.metodo" outlined :options="['efectivo','qr','transferencia','tarjeta','otro']" label="Método"/><q-input v-model.number="pagoForm.monto" outlined type="number" min="0.01" step="0.5" label="Monto (Bs)"/><q-input v-model="pagoForm.referencia" outlined label="Referencia (opcional)"/></q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Registrar pago" @click="savePayment"/></q-card-actions></q-card></q-dialog>

    <q-inner-loading :showing="loading" />
  </q-page>
</template>

<style scoped>
.peluqueria-page{max-width:1500px}.app-identity{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px 18px;border:1px solid var(--viti-border);border-radius:18px;background:var(--viti-card)}.app-tabs{overflow:auto;border-bottom:1px solid var(--viti-border)}.metrics-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.metric-value{font-size:28px;font-weight:800;margin-top:10px}.section-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.form-dialog{width:680px;max-width:94vw}.empty-state{text-align:center;color:#7a7a7a}@media(max-width:900px){.metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.app-identity,.section-toolbar{align-items:flex-start;flex-direction:column}}@media(max-width:520px){.metrics-grid{grid-template-columns:1fr}.app-identity .row{width:100%}.app-identity .q-btn{flex:1}}
</style>
