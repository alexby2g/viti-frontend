<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import PageHeader from '../components/PageHeader.vue'
import { paymentQrData } from '../assets/paymentQr'

const $q = useQuasar()
const loading = ref(true)
const tab = ref('proyectos')
const data = ref({resumen:{},configuracion:null,proyectos:[],suscripciones:[]})
const dialog = ref(false)
const kind = ref('')
const current = ref(null)

const agreement = reactive({precio_acordado:1700,anticipo_monto:850,observaciones:''})
const projectPayment = reactive({tipo:'anticipo',monto:0,metodo:'qr',fecha_pago:'',referencia:'',observaciones:''})
const subscription = reactive({plan:'VITI Soporte',monto:70,frecuencia:'mensual',fecha_inicio:'',fecha_vencimiento:'',dias_gracia:7,estado:'activa'})
const subscriptionPayment = reactive({monto:70,metodo:'qr',fecha_pago:'',referencia:'',observaciones:''})
const configForm = reactive({banco:'',titular:'',observaciones:''})

const money = value => `${Number(value || 0).toFixed(2)} Bs`
const pretty = value => String(value || '').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const today = () => new Date().toISOString().slice(0,10)
const statusColor = value => ({pagado:'positive',pendiente_saldo:'orange',pendiente_anticipo:'negative',activa:'positive',gracia:'orange',suspendida:'negative',cancelada:'grey'}[value] || 'grey')

const projectColumns = [
  {name:'proyecto',label:'Proyecto',field:'nombre',align:'left'},
  {name:'cliente',label:'Cliente / empresa',field:r=>r.empresa?.nombre_comercial||r.cliente?.nombre,align:'left'},
  {name:'total',label:'Acordado',field:r=>r.precio_acordado,align:'right'},
  {name:'pagado',label:'Pagado',field:'pagado',align:'right'},
  {name:'pendiente',label:'Pendiente',field:'pendiente',align:'right'},
  {name:'estado',label:'Estado',field:'estado_pago',align:'left'},
  {name:'acciones',label:'',field:'id',align:'right'},
]
const subscriptionColumns = [
  {name:'app',label:'Aplicación',field:r=>r.aplicacion?.nombre,align:'left'},
  {name:'empresa',label:'Empresa',field:r=>r.empresa?.nombre_comercial,align:'left'},
  {name:'plan',label:'Plan',field:'plan',align:'left'},
  {name:'monto',label:'Monto',field:'monto',align:'right'},
  {name:'vence',label:'Vence',field:'fecha_vencimiento',align:'left'},
  {name:'estado',label:'Estado',field:'estado',align:'left'},
  {name:'acciones',label:'',field:'id',align:'right'},
]

async function load(){
  loading.value=true
  try{
    data.value=(await api.get('/pagos')).data.data
    Object.assign(configForm,{
      banco:data.value.configuracion?.banco||'',
      titular:data.value.configuracion?.titular||'',
      observaciones:data.value.configuracion?.observaciones||'',
    })
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudieron cargar los pagos.'})}
  finally{loading.value=false}
}

function openAgreement(row){
  current.value=row;kind.value='agreement'
  Object.assign(agreement,{precio_acordado:row.precio_acordado??1700,anticipo_monto:row.anticipo_monto??850,observaciones:''})
  dialog.value=true
}
function openProjectPayment(row){
  current.value=row;kind.value='project-payment'
  const initialDone=row.pagos?.filter(x=>x.tipo==='anticipo').reduce((s,x)=>s+Number(x.monto||0),0)||0
  const initialPending=Math.max(0,Number(row.anticipo_monto||0)-initialDone)
  const type=initialPending>0?'anticipo':'saldo_final'
  Object.assign(projectPayment,{tipo:type,monto:type==='anticipo'?initialPending:Number(row.pendiente||0),metodo:'qr',fecha_pago:today(),referencia:'',observaciones:''})
  dialog.value=true
}
function openSubscription(row){
  if(!row.aplicacion){$q.notify({type:'warning',message:'El proyecto todavía no tiene una aplicación asociada.'});return}
  current.value=row;kind.value='subscription'
  const existing=data.value.suscripciones.find(x=>x.aplicacion?.id===row.aplicacion.id)
  Object.assign(subscription,{
    plan:existing?.plan||'VITI Soporte',monto:existing?.monto??70,frecuencia:existing?.frecuencia||'mensual',
    fecha_inicio:existing?.fecha_inicio||today(),fecha_vencimiento:existing?.fecha_vencimiento||'',dias_gracia:existing?.dias_gracia??7,estado:existing?.estado||'activa'
  })
  dialog.value=true
}
function editSubscription(row){
  current.value={aplicacion:row.aplicacion};kind.value='subscription'
  Object.assign(subscription,{plan:row.plan,monto:row.monto,frecuencia:row.frecuencia,fecha_inicio:row.fecha_inicio,fecha_vencimiento:row.fecha_vencimiento||'',dias_gracia:row.dias_gracia,estado:row.estado})
  dialog.value=true
}
function openSubscriptionPayment(row){
  current.value=row;kind.value='subscription-payment'
  Object.assign(subscriptionPayment,{monto:row.monto,metodo:'qr',fecha_pago:today(),referencia:'',observaciones:''})
  dialog.value=true
}

async function saveDialog(){
  try{
    if(kind.value==='agreement') await api.put(`/proyectos/${current.value.id}/acuerdo-pago`,agreement)
    if(kind.value==='project-payment') await api.post(`/proyectos/${current.value.id}/pagos`,projectPayment)
    if(kind.value==='subscription') {
      const body={...subscription,fecha_vencimiento:subscription.fecha_vencimiento||null}
      await api.put(`/aplicaciones/${current.value.aplicacion.id}/suscripcion`,body)
    }
    if(kind.value==='subscription-payment') await api.post(`/suscripciones/${current.value.id}/pagos`,subscriptionPayment)
    dialog.value=false
    $q.notify({type:'positive',message:'Registro actualizado.'})
    await load()
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||Object.values(e.response?.data?.errors||{}).flat()[0]||'No se pudo guardar.'})}
}
async function saveConfig(){
  try{await api.put('/pagos/configuracion',configForm);$q.notify({type:'positive',message:'Datos de cobro actualizados.'});await load()}
  catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo actualizar.'})}
}

onMounted(load)
</script>

<template>
<q-page class="viti-page">
  <PageHeader eyebrow="Control" title="Pagos y suscripciones" subtitle="Controla el acuerdo del proyecto, la entrega y el mantenimiento recurrente desde un solo lugar." />
  <q-inner-loading :showing="loading" />

  <div class="row q-col-gutter-md q-mb-lg">
    <div class="col-12 col-sm-6 col-lg-3"><q-card flat class="viti-card q-pa-lg"><q-icon name="request_quote" color="primary" size="28px"/><div class="stat-value q-mt-sm">{{money(data.resumen?.por_cobrar_proyectos)}}</div><div class="stat-label">Por cobrar en proyectos</div></q-card></div>
    <div class="col-12 col-sm-6 col-lg-3"><q-card flat class="viti-card q-pa-lg"><q-icon name="verified" color="positive" size="28px"/><div class="stat-value q-mt-sm">{{data.resumen?.suscripciones_activas||0}}</div><div class="stat-label">Suscripciones activas</div></q-card></div>
    <div class="col-12 col-sm-6 col-lg-3"><q-card flat class="viti-card q-pa-lg"><q-icon name="schedule" color="orange" size="28px"/><div class="stat-value q-mt-sm">{{data.resumen?.suscripciones_gracia||0}}</div><div class="stat-label">En periodo de gracia</div></q-card></div>
    <div class="col-12 col-sm-6 col-lg-3"><q-card flat class="viti-card q-pa-lg"><q-icon name="sync" color="teal" size="28px"/><div class="stat-value q-mt-sm">{{money(data.resumen?.ingreso_recurrente_mensual)}}</div><div class="stat-label">Recurrente mensual estimado</div></q-card></div>
  </div>

  <q-tabs v-model="tab" align="left" no-caps active-color="primary" indicator-color="primary" class="q-mb-md">
    <q-tab name="proyectos" icon="account_tree" label="Proyectos"/><q-tab name="suscripciones" icon="autorenew" label="Suscripciones"/><q-tab name="cobro" icon="qr_code_2" label="Datos de cobro"/>
  </q-tabs>

  <q-tab-panels v-model="tab" animated class="transparent">
    <q-tab-panel name="proyectos" class="q-pa-none">
      <q-table flat class="viti-table" :rows="data.proyectos||[]" :columns="projectColumns" row-key="id" :pagination="{rowsPerPage:15}">
        <template #body-cell-proyecto="p"><q-td :props="p"><div class="text-weight-bold">{{p.row.codigo}} · {{p.row.nombre}}</div><div class="text-caption text-grey-6">{{p.row.aplicacion?.nombre||'Aplicación todavía no registrada'}}</div></q-td></template>
        <template #body-cell-total="p"><q-td :props="p" class="text-right">{{p.row.precio_acordado===null?'Sin acuerdo':money(p.row.precio_acordado)}}</q-td></template>
        <template #body-cell-pagado="p"><q-td :props="p" class="text-right">{{money(p.row.pagado)}}</q-td></template>
        <template #body-cell-pendiente="p"><q-td :props="p" class="text-right">{{money(p.row.pendiente)}}</q-td></template>
        <template #body-cell-estado="p"><q-td :props="p"><q-badge :color="statusColor(p.row.estado_pago)">{{pretty(p.row.estado_pago)}}</q-badge></q-td></template>
        <template #body-cell-acciones="p"><q-td :props="p"><q-btn flat round dense icon="more_vert"><q-menu><q-list style="min-width:210px"><q-item clickable v-close-popup @click="openAgreement(p.row)"><q-item-section avatar><q-icon name="handshake"/></q-item-section><q-item-section>{{p.row.precio_acordado===null?'Registrar acuerdo':'Editar acuerdo'}}</q-item-section></q-item><q-item clickable v-close-popup :disable="p.row.precio_acordado===null" @click="openProjectPayment(p.row)"><q-item-section avatar><q-icon name="payments"/></q-item-section><q-item-section>Registrar pago</q-item-section></q-item><q-item clickable v-close-popup :disable="!p.row.aplicacion" @click="openSubscription(p.row)"><q-item-section avatar><q-icon name="autorenew"/></q-item-section><q-item-section>Configurar suscripción</q-item-section></q-item></q-list></q-menu></q-btn></q-td></template>
      </q-table>
    </q-tab-panel>

    <q-tab-panel name="suscripciones" class="q-pa-none">
      <q-table flat class="viti-table" :rows="data.suscripciones||[]" :columns="subscriptionColumns" row-key="id" :pagination="{rowsPerPage:15}">
        <template #body-cell-monto="p"><q-td :props="p" class="text-right">{{money(p.row.monto)}} / {{p.row.frecuencia==='anual'?'año':'mes'}}</q-td></template>
        <template #body-cell-estado="p"><q-td :props="p"><q-badge :color="statusColor(p.row.estado)">{{pretty(p.row.estado)}}</q-badge></q-td></template>
        <template #body-cell-acciones="p"><q-td :props="p"><q-btn flat round dense icon="more_vert"><q-menu><q-list style="min-width:190px"><q-item clickable v-close-popup @click="openSubscriptionPayment(p.row)"><q-item-section avatar><q-icon name="payments"/></q-item-section><q-item-section>Registrar pago</q-item-section></q-item><q-item clickable v-close-popup @click="editSubscription(p.row)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar suscripción</q-item-section></q-item></q-list></q-menu></q-btn></q-td></template>
        <template #no-data><div class="empty-state full-width">Todavía no hay suscripciones configuradas.</div></template>
      </q-table>
    </q-tab-panel>

    <q-tab-panel name="cobro" class="q-pa-none">
      <div class="row q-col-gutter-lg"><div class="col-12 col-md-5"><q-card flat class="viti-card q-pa-lg text-center"><div class="text-h6 text-weight-bold">QR principal VITI</div><img :src="paymentQrData" alt="QR de pago VITI" class="qr-img q-mt-md"/><div class="text-caption text-grey-6 q-mt-md">QR recortado del comprobante original. El monto se ingresa al pagar.</div></q-card></div><div class="col-12 col-md-7"><q-card flat class="viti-card"><q-card-section><div class="text-h6 text-weight-bold">Datos de cobro</div><div class="text-caption text-grey-6">Estos datos los verá el cliente junto al QR.</div></q-card-section><q-separator/><q-card-section><q-input v-model="configForm.banco" outlined label="Banco" class="q-mb-md"/><q-input v-model="configForm.titular" outlined label="Titular" class="q-mb-md"/><q-input v-model="configForm.observaciones" outlined type="textarea" label="Indicaciones opcionales"/></q-card-section><q-card-actions align="right"><q-btn color="primary" unelevated no-caps label="Guardar datos" @click="saveConfig"/></q-card-actions></q-card></div></div>
    </q-tab-panel>
  </q-tab-panels>

  <q-dialog v-model="dialog"><q-card style="width:620px;max-width:94vw"><q-card-section><div class="section-label">Pagos VITI</div><div class="text-h5 text-weight-bold">{{kind==='agreement'?'Acuerdo económico':kind==='project-payment'?'Registrar pago del proyecto':kind==='subscription'?'Suscripción de la aplicación':'Registrar pago de suscripción'}}</div></q-card-section><q-separator/><q-card-section>
    <div v-if="kind==='agreement'" class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model.number="agreement.precio_acordado" outlined type="number" label="Precio acordado (Bs)"/></div><div class="col-12 col-sm-6"><q-input v-model.number="agreement.anticipo_monto" outlined type="number" label="Anticipo (Bs)"/></div><div class="col-12"><q-input v-model="agreement.observaciones" outlined type="textarea" label="Observaciones opcionales"/></div></div>
    <div v-else-if="kind==='project-payment'" class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-select v-model="projectPayment.tipo" outlined :options="[{label:'Anticipo',value:'anticipo'},{label:'Saldo final',value:'saldo_final'},{label:'Otro',value:'otro'}]" emit-value map-options label="Tipo"/></div><div class="col-12 col-sm-6"><q-input v-model.number="projectPayment.monto" outlined type="number" label="Monto (Bs)"/></div><div class="col-12 col-sm-6"><q-select v-model="projectPayment.metodo" outlined :options="['qr','transferencia','efectivo','otro']" label="Método"/></div><div class="col-12 col-sm-6"><q-input v-model="projectPayment.fecha_pago" outlined type="date" label="Fecha" stack-label/></div><div class="col-12"><q-input v-model="projectPayment.referencia" outlined label="Referencia / comprobante"/></div></div>
    <div v-else-if="kind==='subscription'" class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model="subscription.plan" outlined label="Plan"/></div><div class="col-12 col-sm-6"><q-input v-model.number="subscription.monto" outlined type="number" label="Monto (Bs)"/></div><div class="col-12 col-sm-6"><q-select v-model="subscription.frecuencia" outlined :options="['mensual','anual']" label="Frecuencia"/></div><div class="col-12 col-sm-6"><q-input v-model.number="subscription.dias_gracia" outlined type="number" label="Días de gracia"/></div><div class="col-12 col-sm-6"><q-input v-model="subscription.fecha_inicio" outlined type="date" label="Inicio" stack-label/></div><div class="col-12 col-sm-6"><q-input v-model="subscription.fecha_vencimiento" outlined type="date" label="Vencimiento (opcional)" stack-label clearable/></div><div class="col-12"><q-select v-model="subscription.estado" outlined :options="['activa','suspendida','cancelada']" label="Estado manual"/></div></div>
    <div v-else class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model.number="subscriptionPayment.monto" outlined type="number" label="Monto (Bs)"/></div><div class="col-12 col-sm-6"><q-select v-model="subscriptionPayment.metodo" outlined :options="['qr','transferencia','efectivo','otro']" label="Método"/></div><div class="col-12 col-sm-6"><q-input v-model="subscriptionPayment.fecha_pago" outlined type="date" label="Fecha" stack-label/></div><div class="col-12 col-sm-6"><q-input v-model="subscriptionPayment.referencia" outlined label="Referencia"/></div></div>
  </q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Guardar" @click="saveDialog"/></q-card-actions></q-card></q-dialog>
</q-page>
</template>

<style scoped>.qr-img{width:min(100%,340px);aspect-ratio:1/1;object-fit:contain;background:#fff;border-radius:16px;padding:12px;border:1px solid var(--viti-border)}.empty-state{text-align:center;padding:38px;color:var(--viti-muted)}</style>
