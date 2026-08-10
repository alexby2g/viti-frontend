<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { downloadFile } from '../utils/download'
import PageHeader from '../components/PageHeader.vue'

const $q=useQuasar()
const loading=ref(true)
const tab=ref('comprobantes')
const data=ref({resumen:{},configuracion:null,proyectos:[],suscripciones:[]})
const dialog=ref(false)
const kind=ref('')
const current=ref(null)
const qrFile=ref(null)
const qrPreview=ref('')
const uploadingQr=ref(false)
const qrFailed=ref(false)

const agreement=reactive({precio_acordado:0,anticipo_monto:0,observaciones:''})
const projectPayment=reactive({tipo:'anticipo',monto:0,metodo:'qr',fecha_pago:'',referencia:'',observaciones:'',pagador_usuario_id:null})
const subscription=reactive({plan:'VITI',monto:35,frecuencia:'mensual',fecha_inicio:'',fecha_vencimiento:'',dias_prueba:14,dias_gracia:7,estado:'activa'})
const subscriptionPayment=reactive({monto:0,metodo:'qr',fecha_pago:'',referencia:'',observaciones:'',pagador_usuario_id:null})
const configForm=reactive({banco:'',titular:'',observaciones:''})
const paymentMethods=[{label:'QR',value:'qr'},{label:'Transferencia',value:'transferencia'},{label:'Efectivo',value:'efectivo'},{label:'Otro',value:'otro'}]

const money=value=>`${Number(value||0).toFixed(2)} Bs`
const pretty=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const today=()=>new Date().toISOString().slice(0,10)
const statusColor=value=>({pagado:'positive',pendiente_saldo:'orange',pendiente_anticipo:'negative',activa:'positive',gracia:'orange',suspendida:'negative',cancelada:'grey',pendiente_revision:'orange',confirmado:'positive',rechazado:'negative'}[value]||'grey')
const reviewLabel=value=>({pendiente_revision:'Pendiente de revisión',confirmado:'Confirmado',rechazado:'Rechazado'}[value]||pretty(value))
const qrSrc=computed(()=>qrPreview.value||(data.value.configuracion?.qr_url&&!qrFailed.value?data.value.configuracion.qr_url:'/viti-payment-qr.png'))
const payerOptions=computed(()=>(current.value?.cuentas_empresa||[]).map(account=>({label:`${account.nombre}${account.rol_negocio?` · ${pretty(account.rol_negocio)}`:''}`,value:account.id})))
const clientProofs=computed(()=>{
  const rows=[]
  for(const project of data.value.proyectos||[]){
    for(const payment of project.pagos||[]){if(payment.origen==='cliente')rows.push({kind:'project',payment,empresa:project.empresa,concepto:`${project.codigo} · ${payment.tipo==='anticipo'?'Anticipo':'Pago del proyecto'}`,reference:project})}
  }
  for(const sub of data.value.suscripciones||[]){
    for(const payment of sub.pagos||[]){if(payment.origen==='cliente')rows.push({kind:'subscription',payment,empresa:sub.empresa,concepto:`Suscripción · ${sub.plan}`,reference:sub})}
  }
  return rows.sort((a,b)=>String(b.payment.enviado_at||b.payment.created_at||'').localeCompare(String(a.payment.enviado_at||a.payment.created_at||'')))
})
const pendingProofs=computed(()=>clientProofs.value.filter(x=>x.payment.estado_revision==='pendiente_revision'))

const projectColumns=[
  {name:'proyecto',label:'Proyecto',field:'nombre',align:'left'},
  {name:'empresa',label:'Empresa',field:r=>r.empresa?.nombre_comercial||r.cliente?.nombre,align:'left'},
  {name:'total',label:'Desarrollo',field:'precio_acordado',align:'right'},
  {name:'pagado',label:'Confirmado',field:'pagado',align:'right'},
  {name:'pendiente',label:'Pendiente',field:'pendiente',align:'right'},
  {name:'estado',label:'Estado',field:'estado_pago',align:'left'},
  {name:'acciones',label:'',field:'id',align:'right'},
]
const subscriptionColumns=[
  {name:'app',label:'Aplicación',field:r=>r.aplicacion?.nombre,align:'left'},
  {name:'empresa',label:'Empresa',field:r=>r.empresa?.nombre_comercial,align:'left'},
  {name:'plan',label:'Plan',field:'plan',align:'left'},
  {name:'monto',label:'Mensualidad',field:'monto',align:'right'},
  {name:'vence',label:'Vence',field:'fecha_vencimiento',align:'left'},
  {name:'estado',label:'Estado',field:'estado',align:'left'},
  {name:'acciones',label:'',field:'id',align:'right'},
]

async function load(){
  loading.value=true
  try{
    data.value=(await api.get('/pagos')).data.data
    Object.assign(configForm,{banco:data.value.configuracion?.banco||'',titular:data.value.configuracion?.titular||'',observaciones:data.value.configuracion?.observaciones||''})
    qrFailed.value=false
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudieron cargar los pagos.'})}
  finally{loading.value=false}
}
function suggestedPayer(row){return row.cuentas_empresa?.length===1?row.cuentas_empresa[0].id:null}
function hasPendingProjectProof(row){return (row.pagos||[]).some(x=>x.estado_revision==='pendiente_revision')}
function hasPendingSubscriptionProof(row){return (row.pagos||[]).some(x=>x.estado_revision==='pendiente_revision')}
function openAgreement(row){current.value=row;kind.value='agreement';Object.assign(agreement,{precio_acordado:row.precio_acordado??0,anticipo_monto:row.anticipo_monto??0,observaciones:''});dialog.value=true}
function openProjectPayment(row){
  current.value=row;kind.value='project-payment'
  const confirmed=(row.pagos||[]).filter(x=>x.estado_revision==='confirmado')
  const initialDone=confirmed.filter(x=>x.tipo==='anticipo').reduce((s,x)=>s+Number(x.monto||0),0)
  const initialPending=Math.max(0,Number(row.anticipo_monto||0)-initialDone)
  const type=initialPending>0?'anticipo':'saldo_final'
  Object.assign(projectPayment,{tipo:type,monto:type==='anticipo'?initialPending:Number(row.pendiente||0),metodo:row.empresa?.metodo_pago_preferido||'qr',fecha_pago:today(),referencia:'',observaciones:'',pagador_usuario_id:suggestedPayer(row)})
  dialog.value=true
}
function openSubscription(row){
  if(!row.aplicacion){$q.notify({type:'warning',message:'El proyecto todavía no tiene una aplicación asociada.'});return}
  current.value=row;kind.value='subscription'
  const existing=data.value.suscripciones.find(x=>x.aplicacion?.id===row.aplicacion.id)
  Object.assign(subscription,{plan:existing?.plan||'VITI',monto:existing?.monto??35,frecuencia:existing?.frecuencia||'mensual',fecha_inicio:existing?.fecha_inicio||today(),fecha_vencimiento:existing?.fecha_vencimiento||'',dias_prueba:existing?.prueba_hasta?14:14,dias_gracia:existing?.dias_gracia??7,estado:existing?.estado||'activa'})
  dialog.value=true
}
function editSubscription(row){current.value={aplicacion:row.aplicacion};kind.value='subscription';Object.assign(subscription,{plan:row.plan,monto:row.monto,frecuencia:row.frecuencia,fecha_inicio:row.fecha_inicio,fecha_vencimiento:row.fecha_vencimiento||'',dias_prueba:14,dias_gracia:row.dias_gracia,estado:row.estado});dialog.value=true}
function openSubscriptionPayment(row){
  current.value=row;kind.value='subscription-payment'
  const due=!row.primer_cobro_pagado&&row.primer_cobro_monto!==null?row.primer_cobro_monto:row.monto
  Object.assign(subscriptionPayment,{monto:due,metodo:row.empresa?.metodo_pago_preferido||'qr',fecha_pago:today(),referencia:'',observaciones:'',pagador_usuario_id:suggestedPayer(row)})
  dialog.value=true
}
async function saveDialog(){
  try{
    if(kind.value==='agreement')await api.put(`/proyectos/${current.value.id}/acuerdo-pago`,agreement)
    if(kind.value==='project-payment')await api.post(`/proyectos/${current.value.id}/pagos`,projectPayment)
    if(kind.value==='subscription'){const body={...subscription,fecha_vencimiento:subscription.fecha_vencimiento||null};await api.put(`/aplicaciones/${current.value.aplicacion.id}/suscripcion`,body)}
    if(kind.value==='subscription-payment')await api.post(`/suscripciones/${current.value.id}/pagos`,subscriptionPayment)
    dialog.value=false;$q.notify({type:'positive',message:'Registro actualizado.'});await load()
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||Object.values(e.response?.data?.errors||{}).flat()[0]||'No se pudo guardar.'})}
}
function proofUrl(row){return row.kind==='subscription'?`/pagos/suscripcion-pagos/${row.payment.id}/comprobante`:`/pagos/proyecto-pagos/${row.payment.id}/comprobante`}
async function openProof(row){try{await downloadFile(proofUrl(row),row.payment.comprobante_nombre||'comprobante')}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo abrir el comprobante.'})}}
function confirmProof(row){
  $q.dialog({title:'Confirmar pago',message:`¿Confirmar ${money(row.payment.monto)} de ${row.empresa?.nombre_comercial||'esta empresa'}? El importe se aplicará al saldo.`,cancel:true,persistent:true}).onOk(async()=>{
    try{const url=row.kind==='subscription'?`/pagos/suscripcion-pagos/${row.payment.id}/confirmar`:`/pagos/proyecto-pagos/${row.payment.id}/confirmar`;const r=await api.post(url);$q.notify({type:'positive',message:r.data?.message||'Pago confirmado.'});await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo confirmar.'})}
  })
}
function rejectProof(row){
  $q.dialog({title:'Rechazar comprobante',message:'Indica por qué no se puede confirmar este pago.',prompt:{model:'',type:'textarea',isValid:v=>String(v||'').trim().length>=5},cancel:true,persistent:true}).onOk(async motivo=>{
    try{const url=row.kind==='subscription'?`/pagos/suscripcion-pagos/${row.payment.id}/rechazar`:`/pagos/proyecto-pagos/${row.payment.id}/rechazar`;const r=await api.post(url,{motivo});$q.notify({type:'positive',message:r.data?.message||'Comprobante rechazado.'});await load()}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo rechazar.'})}
  })
}
async function saveConfig(){try{const response=await api.put('/pagos/configuracion',configForm);data.value.configuracion=response.data.data;$q.notify({type:'positive',message:'Datos de cobro actualizados.'})}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo actualizar.'})}}
function onQrSelected(file){if(qrPreview.value)URL.revokeObjectURL(qrPreview.value);qrPreview.value=file?URL.createObjectURL(file):''}
async function uploadQr(){
  if(!qrFile.value){$q.notify({type:'warning',message:'Selecciona una imagen de QR.'});return}
  uploadingQr.value=true
  try{const payload=new FormData();payload.append('qr',qrFile.value);const response=await api.post('/pagos/configuracion/qr',payload);data.value.configuracion=response.data.data;qrFile.value=null;if(qrPreview.value)URL.revokeObjectURL(qrPreview.value);qrPreview.value='';qrFailed.value=false;$q.notify({type:'positive',message:'QR de cobro actualizado.'})}
  catch(e){$q.notify({type:'negative',message:e.response?.data?.message||Object.values(e.response?.data?.errors||{}).flat()[0]||'No se pudo subir el QR.'})}
  finally{uploadingQr.value=false}
}

onMounted(load)
onBeforeUnmount(()=>{if(qrPreview.value)URL.revokeObjectURL(qrPreview.value)})
</script>

<template>
<q-page class="viti-page">
  <PageHeader eyebrow="Control" title="Pagos y suscripciones" subtitle="Separa pagos del desarrollo, mensualidades y comprobantes enviados por los clientes."/>
  <q-inner-loading :showing="loading"/>

  <div class="row q-col-gutter-md q-mb-lg">
    <div class="col-12 col-sm-6 col-xl"><q-card flat class="viti-card q-pa-lg"><q-icon name="receipt_long" color="orange" size="28px"/><div class="stat-value q-mt-sm">{{data.resumen?.comprobantes_pendientes||0}}</div><div class="stat-label">Comprobantes por revisar</div></q-card></div>
    <div class="col-12 col-sm-6 col-xl"><q-card flat class="viti-card q-pa-lg"><q-icon name="request_quote" color="primary" size="28px"/><div class="stat-value q-mt-sm">{{money(data.resumen?.por_cobrar_proyectos)}}</div><div class="stat-label">Por cobrar en proyectos</div></q-card></div>
    <div class="col-12 col-sm-6 col-xl"><q-card flat class="viti-card q-pa-lg"><q-icon name="verified" color="positive" size="28px"/><div class="stat-value q-mt-sm">{{data.resumen?.suscripciones_activas||0}}</div><div class="stat-label">Suscripciones activas</div></q-card></div>
    <div class="col-12 col-sm-6 col-xl"><q-card flat class="viti-card q-pa-lg"><q-icon name="sync" color="teal" size="28px"/><div class="stat-value q-mt-sm">{{money(data.resumen?.ingreso_recurrente_mensual)}}</div><div class="stat-label">Recurrente mensual</div></q-card></div>
  </div>

  <q-tabs v-model="tab" align="left" no-caps active-color="primary" indicator-color="primary" class="q-mb-md">
    <q-tab name="comprobantes" icon="fact_check" :label="`Comprobantes${pendingProofs.length?` (${pendingProofs.length})`:''}`"/>
    <q-tab name="proyectos" icon="account_tree" label="Proyectos"/>
    <q-tab name="suscripciones" icon="autorenew" label="Suscripciones"/>
    <q-tab name="cobro" icon="qr_code_2" label="Datos de cobro"/>
  </q-tabs>

  <q-tab-panels v-model="tab" animated class="transparent">
    <q-tab-panel name="comprobantes" class="q-pa-none">
      <q-card flat class="viti-card"><q-card-section><div class="text-h6 text-weight-bold">Comprobantes enviados por clientes</div><div class="text-caption text-grey-6">Un comprobante pendiente no modifica el saldo hasta que lo confirmes.</div></q-card-section><q-separator/>
        <q-list v-if="clientProofs.length" separator>
          <q-item v-for="row in clientProofs" :key="`${row.kind}-${row.payment.id}`" class="q-py-md">
            <q-item-section avatar><q-avatar :color="row.payment.estado_revision==='confirmado'?'green-1':row.payment.estado_revision==='rechazado'?'red-1':'orange-1'" :text-color="statusColor(row.payment.estado_revision)" :icon="row.kind==='subscription'?'autorenew':'payments'"/></q-item-section>
            <q-item-section><q-item-label class="text-weight-bold">{{row.empresa?.nombre_comercial}} · {{row.concepto}}</q-item-label><q-item-label>{{money(row.payment.monto)}} · {{pretty(row.payment.metodo)}} · {{row.payment.fecha_pago}}</q-item-label><q-item-label caption>Enviado por {{row.payment.pagador?`${row.payment.pagador.nombre} ${row.payment.pagador.apellido||''}`:'cuenta del cliente'}}<span v-if="row.payment.referencia"> · Ref. {{row.payment.referencia}}</span></q-item-label><q-item-label v-if="row.payment.motivo_revision" caption class="text-negative">Motivo: {{row.payment.motivo_revision}}</q-item-label></q-item-section>
            <q-item-section side><div class="column items-end q-gutter-sm"><q-badge :color="statusColor(row.payment.estado_revision)">{{reviewLabel(row.payment.estado_revision)}}</q-badge><q-btn v-if="row.payment.comprobante_path" outline dense no-caps color="primary" icon="receipt_long" label="Ver comprobante" @click="openProof(row)"/><div v-if="row.payment.estado_revision==='pendiente_revision'" class="row q-gutter-xs"><q-btn dense unelevated no-caps color="positive" icon="check" label="Confirmar" @click="confirmProof(row)"/><q-btn dense outline no-caps color="negative" icon="close" label="Rechazar" @click="rejectProof(row)"/></div></div></q-item-section>
          </q-item>
        </q-list>
        <div v-else class="empty-state">Todavía no hay comprobantes enviados por clientes.</div>
      </q-card>
    </q-tab-panel>

    <q-tab-panel name="proyectos" class="q-pa-none">
      <q-table flat class="viti-table" :rows="data.proyectos||[]" :columns="projectColumns" row-key="id" :pagination="{rowsPerPage:15}">
        <template #body-cell-proyecto="p"><q-td :props="p"><div class="text-weight-bold">{{p.row.codigo}} · {{p.row.nombre}}</div><div class="text-caption text-grey-6">{{p.row.aplicacion?.nombre||'Aplicación todavía no registrada'}}</div></q-td></template>
        <template #body-cell-empresa="p"><q-td :props="p"><div class="text-weight-bold">{{p.row.empresa?.nombre_comercial||p.row.cliente?.nombre||'Sin empresa'}}</div><div class="text-caption text-grey-6">Método habitual: {{pretty(p.row.empresa?.metodo_pago_preferido||'qr')}}</div></q-td></template>
        <template #body-cell-total="p"><q-td :props="p" class="text-right">{{p.row.precio_acordado===null?'Sin acuerdo':money(p.row.precio_acordado)}}</q-td></template>
        <template #body-cell-pagado="p"><q-td :props="p" class="text-right">{{money(p.row.pagado)}}</q-td></template>
        <template #body-cell-pendiente="p"><q-td :props="p" class="text-right">{{money(p.row.pendiente)}}</q-td></template>
        <template #body-cell-estado="p"><q-td :props="p"><q-badge :color="statusColor(p.row.estado_pago)">{{pretty(p.row.estado_pago)}}</q-badge><q-badge v-if="hasPendingProjectProof(p.row)" color="orange" class="q-ml-xs">Comprobante en revisión</q-badge></q-td></template>
        <template #body-cell-acciones="p"><q-td :props="p"><q-btn flat round dense icon="more_vert"><q-menu><q-list style="min-width:230px"><q-item clickable v-close-popup @click="openAgreement(p.row)"><q-item-section avatar><q-icon name="handshake"/></q-item-section><q-item-section>{{p.row.precio_acordado===null?'Registrar acuerdo':'Editar acuerdo'}}</q-item-section></q-item><q-item clickable v-close-popup :disable="p.row.precio_acordado===null||hasPendingProjectProof(p.row)" @click="openProjectPayment(p.row)"><q-item-section avatar><q-icon name="payments"/></q-item-section><q-item-section>Registrar pago manual</q-item-section></q-item><q-item clickable v-close-popup :disable="!p.row.aplicacion" @click="openSubscription(p.row)"><q-item-section avatar><q-icon name="autorenew"/></q-item-section><q-item-section>Configurar suscripción</q-item-section></q-item></q-list></q-menu></q-btn></q-td></template>
      </q-table>
    </q-tab-panel>

    <q-tab-panel name="suscripciones" class="q-pa-none">
      <q-table flat class="viti-table" :rows="data.suscripciones||[]" :columns="subscriptionColumns" row-key="id" :pagination="{rowsPerPage:15}">
        <template #body-cell-monto="p"><q-td :props="p" class="text-right">{{money(p.row.monto)}} / {{p.row.frecuencia==='anual'?'año':'mes'}}</q-td></template>
        <template #body-cell-empresa="p"><q-td :props="p"><div class="text-weight-bold">{{p.row.empresa?.nombre_comercial}}</div><div class="text-caption text-grey-6">Método habitual: {{pretty(p.row.empresa?.metodo_pago_preferido||'qr')}}</div></q-td></template>
        <template #body-cell-estado="p"><q-td :props="p"><q-badge :color="statusColor(p.row.estado)">{{pretty(p.row.estado)}}</q-badge><q-badge v-if="hasPendingSubscriptionProof(p.row)" color="orange" class="q-ml-xs">Comprobante en revisión</q-badge></q-td></template>
        <template #body-cell-acciones="p"><q-td :props="p"><q-btn flat round dense icon="more_vert"><q-menu><q-list style="min-width:210px"><q-item clickable v-close-popup :disable="hasPendingSubscriptionProof(p.row)" @click="openSubscriptionPayment(p.row)"><q-item-section avatar><q-icon name="payments"/></q-item-section><q-item-section>Registrar pago manual</q-item-section></q-item><q-item clickable v-close-popup @click="editSubscription(p.row)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar suscripción</q-item-section></q-item></q-list></q-menu></q-btn></q-td></template>
        <template #no-data><div class="empty-state full-width">Todavía no hay suscripciones configuradas.</div></template>
      </q-table>
    </q-tab-panel>

    <q-tab-panel name="cobro" class="q-pa-none">
      <div class="row q-col-gutter-lg"><div class="col-12 col-md-5"><q-card flat class="viti-card qr-card"><q-card-section><div class="text-h6 text-weight-bold">QR principal VITI</div><div class="text-caption text-grey-6">Este mismo QR se muestra al cliente en su módulo de pagos.</div></q-card-section><q-card-section class="text-center q-pt-none"><div class="qr-stage"><img :src="qrSrc" alt="QR de pago VITI" class="qr-img" @error="qrFailed=true"/></div><q-file v-model="qrFile" outlined accept="image/png,image/jpeg,image/webp" label="Seleccionar nuevo QR" class="q-mt-md" clearable @update:model-value="onQrSelected"><template #prepend><q-icon name="upload_file"/></template></q-file><div class="text-caption text-grey-6 q-mt-sm">PNG, JPG o WEBP. Máximo 5 MB.</div></q-card-section><q-card-actions align="right" class="q-px-md q-pb-md"><q-btn color="primary" unelevated no-caps icon="cloud_upload" label="Subir / reemplazar QR" :disable="!qrFile" :loading="uploadingQr" @click="uploadQr"/></q-card-actions></q-card></div><div class="col-12 col-md-7"><q-card flat class="viti-card"><q-card-section><div class="text-h6 text-weight-bold">Datos de cobro</div><div class="text-caption text-grey-6">Estos datos los verá la empresa junto al QR.</div></q-card-section><q-separator/><q-card-section><q-input v-model="configForm.banco" outlined label="Banco" class="q-mb-md"/><q-input v-model="configForm.titular" outlined label="Titular" class="q-mb-md"/><q-input v-model="configForm.observaciones" outlined type="textarea" label="Indicaciones opcionales"/></q-card-section><q-card-actions align="right"><q-btn color="primary" unelevated no-caps label="Guardar datos" @click="saveConfig"/></q-card-actions></q-card></div></div>
    </q-tab-panel>
  </q-tab-panels>

  <q-dialog v-model="dialog">
    <q-card style="width:650px;max-width:94vw"><q-card-section><div class="section-label">Pagos VITI</div><div class="text-h5 text-weight-bold">{{kind==='agreement'?'Acuerdo económico':kind==='project-payment'?'Registrar pago manual del proyecto':kind==='subscription'?'Configurar suscripción':'Registrar pago manual de suscripción'}}</div><div v-if="current?.empresa" class="text-caption text-grey-6 q-mt-xs">{{current.empresa.nombre_comercial}}</div></q-card-section><q-separator/><q-card-section>
      <div v-if="kind==='agreement'" class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model.number="agreement.precio_acordado" outlined type="number" label="Precio acordado (Bs)"/></div><div class="col-12 col-sm-6"><q-input v-model.number="agreement.anticipo_monto" outlined type="number" label="Anticipo (Bs)"/></div><div class="col-12"><q-input v-model="agreement.observaciones" outlined type="textarea" label="Observaciones opcionales"/></div></div>
      <div v-else-if="kind==='project-payment'" class="row q-col-gutter-md"><div class="col-12"><q-banner rounded class="bg-blue-1 text-primary">Este registro administrativo se considera confirmado inmediatamente. Si el cliente ya envió un comprobante, revísalo desde la pestaña Comprobantes en vez de crear otro pago.</q-banner></div><div class="col-12 col-sm-6"><q-select v-model="projectPayment.tipo" outlined :options="[{label:'Anticipo',value:'anticipo'},{label:'Saldo final',value:'saldo_final'},{label:'Otro',value:'otro'}]" emit-value map-options label="Tipo"/></div><div class="col-12 col-sm-6"><q-input v-model.number="projectPayment.monto" outlined type="number" label="Monto (Bs)"/></div><div class="col-12 col-sm-6"><q-select v-model="projectPayment.metodo" outlined :options="paymentMethods" emit-value map-options label="Método"/></div><div class="col-12 col-sm-6"><q-input v-model="projectPayment.fecha_pago" outlined type="date" label="Fecha" stack-label/></div><div v-if="payerOptions.length" class="col-12"><q-select v-model="projectPayment.pagador_usuario_id" outlined clearable :options="payerOptions" emit-value map-options label="Cuenta asociada al pago (opcional)"/></div><div class="col-12"><q-input v-model="projectPayment.referencia" outlined label="Referencia opcional"/></div><div class="col-12"><q-input v-model="projectPayment.observaciones" outlined type="textarea" label="Observaciones"/></div></div>
      <div v-else-if="kind==='subscription'" class="row q-col-gutter-md"><div class="col-12 col-sm-7"><q-input v-model="subscription.plan" outlined label="Plan"/></div><div class="col-12 col-sm-5"><q-input v-model.number="subscription.monto" outlined type="number" label="Mensualidad (Bs)"/></div><div class="col-12 col-sm-4"><q-select v-model="subscription.frecuencia" outlined :options="['mensual','anual']" label="Frecuencia"/></div><div class="col-12 col-sm-4"><q-input v-model.number="subscription.dias_prueba" outlined type="number" min="0" max="60" label="Días de prueba"/></div><div class="col-12 col-sm-4"><q-input v-model.number="subscription.dias_gracia" outlined type="number" label="Días de gracia"/></div><div class="col-12 col-sm-6"><q-input v-model="subscription.fecha_inicio" outlined type="date" label="Inicio de beta/prueba" stack-label/></div><div class="col-12 col-sm-6"><q-input v-model="subscription.fecha_vencimiento" outlined type="date" label="Vencimiento opcional" stack-label/></div><div class="col-12"><q-select v-model="subscription.estado" outlined :options="['activa','gracia','suspendida','cancelada']" label="Estado"/></div></div>
      <div v-else class="row q-col-gutter-md"><div class="col-12"><q-banner rounded class="bg-blue-1 text-primary">Este pago se registra como confirmado inmediatamente.</q-banner></div><div class="col-12 col-sm-6"><q-input v-model.number="subscriptionPayment.monto" outlined type="number" label="Monto (Bs)"/></div><div class="col-12 col-sm-6"><q-select v-model="subscriptionPayment.metodo" outlined :options="paymentMethods" emit-value map-options label="Método"/></div><div class="col-12 col-sm-6"><q-input v-model="subscriptionPayment.fecha_pago" outlined type="date" label="Fecha" stack-label/></div><div class="col-12 col-sm-6"><q-input v-model="subscriptionPayment.referencia" outlined label="Referencia"/></div><div v-if="payerOptions.length" class="col-12"><q-select v-model="subscriptionPayment.pagador_usuario_id" outlined clearable :options="payerOptions" emit-value map-options label="Cuenta asociada al pago (opcional)"/></div><div class="col-12"><q-input v-model="subscriptionPayment.observaciones" outlined type="textarea" label="Observaciones"/></div></div>
    </q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Guardar" @click="saveDialog"/></q-card-actions></q-card>
  </q-dialog>
</q-page>
</template>

<style scoped>
.qr-card{overflow:hidden}.qr-stage{display:flex;align-items:center;justify-content:center;min-height:320px;padding:18px;border:1px dashed var(--viti-border);border-radius:16px;background:#fff}.qr-img{display:block;width:min(100%,390px);height:auto;max-height:420px;object-fit:contain;background:#fff}.empty-state{text-align:center;padding:36px;color:var(--viti-muted)}
</style>