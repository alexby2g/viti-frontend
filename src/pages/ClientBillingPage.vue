<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { downloadFile } from '../utils/download'
import PageHeader from '../components/PageHeader.vue'

const $q=useQuasar()
const loading=ref(true)
const sending=ref(false)
const data=ref({negocio:null,configuracion:null,proyectos:[]})
const qrFailed=ref(false)
const dialog=ref(false)
const current=ref(null)
const paymentKind=ref('project')
const proof=ref(null)
const form=reactive({monto:0,metodo:'qr',fecha_pago:'',referencia:'',observaciones:''})

const money=value=>`${Number(value||0).toFixed(2)} Bs`
const pretty=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const today=()=>new Date().toISOString().slice(0,10)
const statusColor=value=>({pagado:'positive',pendiente_saldo:'orange',pendiente_anticipo:'negative',activa:'positive',al_dia:'positive',por_vencer:'amber-9',gracia:'orange',suspendida:'negative',cancelada:'grey',prueba:'positive',pendiente_revision:'orange',confirmado:'positive',rechazado:'negative'}[value]||'grey')
const reviewLabel=value=>({pendiente_revision:'Pendiente de revisión',confirmado:'Confirmado',rechazado:'Rechazado'}[value]||pretty(value||'confirmado'))
const subscriptionStage=value=>value?.etapa_cobro||(value?.en_prueba?'prueba':value?.estado||'al_dia')
const subscriptionStageLabel=value=>({prueba:'Prueba gratuita',al_dia:'Al día',por_vencer:'Por vencer',gracia:'Periodo de gracia',suspendida:'Suspendida',cancelada:'Cancelada'}[subscriptionStage(value)]||pretty(subscriptionStage(value)))
const subscriptionBannerClass=value=>({prueba:'bg-green-1 text-green-9',al_dia:'bg-blue-1 text-primary',por_vencer:'bg-amber-1 text-amber-10',gracia:'bg-orange-1 text-orange-10',suspendida:'bg-red-1 text-negative',cancelada:'bg-grey-2 text-grey-8'}[subscriptionStage(value)]||'bg-blue-1 text-primary')
const subscriptionIcon=value=>({prueba:'verified',al_dia:'event_available',por_vencer:'schedule',gracia:'hourglass_top',suspendida:'lock_clock',cancelada:'cancel'}[subscriptionStage(value)]||'event')
const qrSrc=computed(()=>data.value.configuracion?.qr_url&&!qrFailed.value?data.value.configuracion.qr_url:'/viti-payment-qr.png')
const payerName=payment=>payment.pagador?`${payment.pagador.nombre||''} ${payment.pagador.apellido||''}`.trim():''
const conceptLabel=computed(()=>{
  if(paymentKind.value==='subscription')return 'Suscripción VITI'
  return current.value?.siguiente_pago?.tipo==='anticipo'?'Anticipo del desarrollo':'Saldo del desarrollo'
})
const expectedAmount=computed(()=>paymentKind.value==='subscription'?Number(current.value?.suscripcion?.importe_pendiente||0):Number(current.value?.siguiente_pago?.monto||0))
const requiresProof=computed(()=>form.metodo!=='efectivo')

async function load(){
  loading.value=true
  try{data.value=(await api.get('/mi/pagos')).data.data}
  catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudieron cargar tus pagos.'})}
  finally{loading.value=false}
}
function openPayment(project,kind){
  current.value=project
  paymentKind.value=kind
  proof.value=null
  Object.assign(form,{monto:kind==='subscription'?project.suscripcion?.importe_pendiente||0:project.siguiente_pago?.monto||0,metodo:project.empresa?.metodo_pago_preferido||data.value.negocio?.metodo_pago_preferido||'qr',fecha_pago:today(),referencia:'',observaciones:''})
  dialog.value=true
}
async function sendProof(){
  if(requiresProof.value&&!proof.value){$q.notify({type:'warning',message:'Adjunta el comprobante del pago.'});return}
  sending.value=true
  try{
    const payload=new FormData()
    payload.append('monto',String(form.monto))
    payload.append('metodo',form.metodo)
    payload.append('fecha_pago',form.fecha_pago)
    if(form.referencia)payload.append('referencia',form.referencia)
    if(form.observaciones)payload.append('observaciones',form.observaciones)
    if(proof.value)payload.append('comprobante',proof.value)
    const url=paymentKind.value==='subscription'
      ? `/mi/pagos/suscripciones/${current.value.suscripcion.id}/comprobante`
      : `/mi/pagos/proyectos/${current.value.id}/comprobante`
    const response=await api.post(url,payload)
    dialog.value=false
    $q.notify({type:'positive',message:response.data?.message||'Comprobante enviado para revisión.'})
    await load()
  }catch(e){$q.notify({type:'negative',message:e.response?.data?.message||Object.values(e.response?.data?.errors||{}).flat()[0]||'No se pudo enviar el comprobante.'})}
  finally{sending.value=false}
}
function proofUrl(kind,payment){return kind==='subscription'?`/mi/pagos/suscripcion-pagos/${payment.id}/comprobante`:`/mi/pagos/proyecto-pagos/${payment.id}/comprobante`}
async function getProof(kind,payment){try{await downloadFile(proofUrl(kind,payment),payment.comprobante_nombre||'comprobante')}catch(e){$q.notify({type:'negative',message:e.response?.data?.message||'No se pudo abrir el comprobante.'})}}

onMounted(load)
</script>

<template>
<q-page class="viti-page">
  <PageHeader eyebrow="Mi espacio VITI" title="Mis pagos" subtitle="El desarrollo y la suscripción se registran por separado. Tus comprobantes quedan guardados y sujetos a revisión."/>
  <q-inner-loading :showing="loading"/>

  <template v-if="!loading">
    <q-card flat class="viti-card payment-guide q-mb-lg">
      <q-card-section>
        <div class="section-label">Cómo funcionan tus pagos</div>
        <div class="text-h6 text-weight-bold">Implementación y suscripción son conceptos distintos.</div>
        <div class="payment-guide-grid q-mt-md">
          <div><q-icon name="construction" color="primary" size="24px"/><div><b>Implementación</b><span>Es el trabajo inicial de análisis, configuración, personalización y puesta en marcha. Puede pagarse de contado o por etapas según el acuerdo.</span></div></div>
          <div><q-icon name="autorenew" color="primary" size="24px"/><div><b>Suscripción VITI</b><span>Es el servicio recurrente que mantiene la plataforma, alojamiento, base de datos, respaldos, actualizaciones generales y soporte según tu plan.</span></div></div>
        </div>
        <q-banner rounded class="bg-blue-1 text-primary q-mt-md"><template #avatar><q-icon name="info"/></template>La suscripción no significa volver a pagar el desarrollo cada mes. Solo se cobra el servicio recurrente acordado después de la activación o periodo de prueba.</q-banner>
      </q-card-section>
    </q-card>
    <q-banner rounded class="bg-blue-1 text-primary q-mb-lg">
      <template #avatar><q-icon name="verified_user"/></template>
      <div class="text-weight-bold">El pago no se aplica automáticamente al subir una imagen.</div>
      <div class="text-caption">Tu comprobante queda como <strong>Pendiente de revisión</strong>. Cuando VITI lo confirme, se actualizarán el monto pagado y el saldo.</div>
    </q-banner>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-lg-8">
        <template v-for="project in data.proyectos||[]" :key="project.id">
          <q-card flat class="viti-card q-mb-lg">
            <q-card-section class="row items-start q-col-gutter-md">
              <div class="col"><div class="section-label">Pago del proyecto · {{project.codigo}}</div><div class="text-h6 text-weight-bold">{{project.nombre}}</div><div class="text-caption text-grey-6">Desarrollo del sistema · no incluye la mensualidad VITI</div></div>
              <div class="col-auto"><q-badge :color="statusColor(project.estado_pago)">{{pretty(project.estado_pago)}}</q-badge></div>
            </q-card-section>
            <q-separator/>
            <q-card-section>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-4"><div class="text-caption text-grey-6">Precio del desarrollo</div><div class="text-h6 text-weight-bold">{{project.precio_acordado===null?'Por definir':money(project.precio_acordado)}}</div></div>
                <div class="col-12 col-sm-4"><div class="text-caption text-grey-6">Pagado y confirmado</div><div class="text-h6 text-positive text-weight-bold">{{money(project.pagado)}}</div></div>
                <div class="col-12 col-sm-4"><div class="text-caption text-grey-6">Saldo pendiente</div><div class="text-h6 text-weight-bold">{{money(project.pendiente)}}</div></div>
              </div>

              <q-card v-if="project.siguiente_pago?.monto>0" flat bordered class="next-payment q-mt-lg">
                <q-card-section class="row items-center q-col-gutter-md">
                  <div class="col"><div class="text-caption text-grey-6">Siguiente pago</div><div class="text-h6 text-weight-bold">{{project.siguiente_pago.tipo==='anticipo'?'Anticipo':'Saldo final'}} · {{money(project.siguiente_pago.monto)}}</div><div class="text-caption">Realiza el pago por QR/transferencia y luego adjunta el comprobante aquí.</div></div>
                  <div class="col-12 col-sm-auto"><q-btn v-if="project.siguiente_pago.puede_enviar" color="primary" unelevated no-caps icon="upload_file" :label="project.siguiente_pago.tipo==='anticipo'?'Enviar comprobante de anticipo':'Enviar comprobante de saldo'" @click="openPayment(project,'project')"/><q-badge v-else-if="project.siguiente_pago.comprobante_pendiente_id" color="orange" label="Comprobante en revisión"/></div>
                </q-card-section>
              </q-card>
            </q-card-section>

            <template v-if="project.pagos?.length">
              <q-separator/><q-card-section><div class="text-subtitle2 text-weight-bold">Historial del desarrollo</div></q-card-section>
              <q-list separator>
                <q-item v-for="payment in project.pagos" :key="payment.id">
                  <q-item-section avatar><q-avatar :color="payment.estado_revision==='confirmado'?'green-1':payment.estado_revision==='rechazado'?'red-1':'orange-1'" :text-color="statusColor(payment.estado_revision)" :icon="payment.estado_revision==='confirmado'?'check':payment.estado_revision==='rechazado'?'close':'schedule'"/></q-item-section>
                  <q-item-section><q-item-label class="text-weight-bold">{{pretty(payment.tipo)}} · {{money(payment.monto)}}</q-item-label><q-item-label caption>{{payment.fecha_pago}} · {{pretty(payment.metodo)}}<span v-if="payerName(payment)"> · {{payerName(payment)}}</span></q-item-label><q-item-label v-if="payment.motivo_revision" caption class="text-negative">Motivo: {{payment.motivo_revision}}</q-item-label></q-item-section>
                  <q-item-section side><div class="column items-end q-gutter-xs"><q-badge :color="statusColor(payment.estado_revision)">{{reviewLabel(payment.estado_revision)}}</q-badge><q-btn v-if="payment.comprobante_path" flat dense no-caps color="primary" icon="receipt_long" label="Comprobante" @click="getProof('project',payment)"/></div></q-item-section>
                </q-item>
              </q-list>
            </template>
          </q-card>

          <q-card flat class="viti-card q-mb-lg">
            <q-card-section><div class="section-label">Suscripción VITI</div><div class="text-h6 text-weight-bold">Mantenimiento de la plataforma</div><div class="text-caption text-grey-6">Se maneja aparte del precio de desarrollo y empieza cuando corresponde después de la beta/prueba.</div></q-card-section>
            <q-separator/>
            <q-card-section v-if="project.suscripcion">
              <div class="row items-center q-col-gutter-md">
                <div class="col"><div class="text-h6 text-weight-bold">{{project.suscripcion.plan||'Plan VITI'}}</div><div class="text-body2">{{money(project.suscripcion.monto)}} / {{project.suscripcion.frecuencia==='anual'?'año':'mes'}}</div></div>
                <div class="col-auto"><q-badge :color="statusColor(subscriptionStage(project.suscripcion))">{{subscriptionStageLabel(project.suscripcion)}}</q-badge></div>
              </div>

              <q-banner rounded class="q-mt-md" :class="subscriptionBannerClass(project.suscripcion)">
                <template #avatar><q-icon :name="subscriptionIcon(project.suscripcion)"/></template>
                <div class="text-weight-bold">{{project.suscripcion.mensaje_cobro || (project.suscripcion.en_prueba?`Prueba gratuita hasta ${project.suscripcion.prueba_hasta}.`:'Estado de la suscripción actualizado.') }}</div>
                <div v-if="project.suscripcion.en_prueba" class="text-caption">Mientras dure la prueba no debes pagar la mensualidad.</div>
                <div v-else class="text-caption q-mt-xs">
                  <span v-if="project.suscripcion.fecha_vencimiento">Vencimiento: <strong>{{project.suscripcion.fecha_vencimiento}}</strong>.</span>
                  <span v-if="project.suscripcion.etapa_cobro==='por_vencer' && project.suscripcion.dias_para_vencer!==null"> Quedan {{project.suscripcion.dias_para_vencer}} día(s).</span>
                  <span v-if="project.suscripcion.etapa_cobro==='gracia' && project.suscripcion.gracia_hasta"> Acceso de gracia hasta <strong>{{project.suscripcion.gracia_hasta}}</strong>.</span>
                  <span v-if="project.suscripcion.dias_mora>0"> Mora: {{project.suscripcion.dias_mora}} día(s).</span>
                </div>
              </q-banner>

              <q-card v-if="!project.suscripcion.en_prueba && project.suscripcion.estado!=='cancelada'" flat bordered class="next-payment q-mt-md">
                <q-card-section class="row items-center q-col-gutter-md">
                  <div class="col">
                    <div class="text-caption text-grey-6">Pago actual</div>
                    <div class="text-h6 text-weight-bold">{{money(project.suscripcion.importe_pendiente)}}</div>
                    <div class="text-caption" v-if="project.suscripcion.primer_cobro_monto!==null&&!project.suscripcion.primer_cobro_pagado">Primer periodo proporcional: {{project.suscripcion.primer_cobro_desde}} al {{project.suscripcion.primer_cobro_hasta}}.</div>
                    <div class="text-caption" v-else>Mensualidad correspondiente al periodo vigente.</div>
                  </div>
                  <div class="col-12 col-sm-auto">
                    <q-btn v-if="project.suscripcion.puede_enviar_comprobante" color="primary" unelevated no-caps icon="upload_file" label="Enviar comprobante de suscripción" @click="openPayment(project,'subscription')"/>
                    <q-badge v-else-if="project.suscripcion.comprobante_pendiente_id" color="orange" label="Comprobante en revisión"/>
                  </div>
                </q-card-section>
              </q-card>
            </q-card-section>
            <q-card-section v-else class="text-grey-7"><q-icon name="schedule" class="q-mr-sm"/>La suscripción todavía no ha comenzado. Se configurará cuando la beta sea habilitada para uso.</q-card-section>

            <template v-if="project.pagos_suscripcion?.length">
              <q-separator/><q-card-section><div class="text-subtitle2 text-weight-bold">Historial de suscripción</div></q-card-section>
              <q-list separator><q-item v-for="payment in project.pagos_suscripcion" :key="payment.id"><q-item-section avatar><q-avatar :color="payment.estado_revision==='confirmado'?'green-1':payment.estado_revision==='rechazado'?'red-1':'orange-1'" :text-color="statusColor(payment.estado_revision)" :icon="payment.estado_revision==='confirmado'?'check':payment.estado_revision==='rechazado'?'close':'schedule'"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">Suscripción · {{money(payment.monto)}}</q-item-label><q-item-label caption>{{payment.fecha_pago}} · {{pretty(payment.metodo)}}<span v-if="payerName(payment)"> · {{payerName(payment)}}</span></q-item-label><q-item-label v-if="payment.motivo_revision" caption class="text-negative">Motivo: {{payment.motivo_revision}}</q-item-label></q-item-section><q-item-section side><div class="column items-end q-gutter-xs"><q-badge :color="statusColor(payment.estado_revision)">{{reviewLabel(payment.estado_revision)}}</q-badge><q-btn v-if="payment.comprobante_path" flat dense no-caps color="primary" icon="receipt_long" label="Comprobante" @click="getProof('subscription',payment)"/></div></q-item-section></q-item></q-list>
            </template>
          </q-card>
        </template>

        <div v-if="!(data.proyectos||[]).length" class="empty-state"><q-icon name="payments" size="54px"/><div class="text-h6 q-mt-md">Todavía no hay obligaciones de pago</div><div class="q-mt-xs">Cuando exista un acuerdo económico, aparecerá aquí.</div></div>
      </div>

      <div class="col-12 col-lg-4">
        <q-card flat class="viti-card sticky-card">
          <q-card-section><div class="text-h6 text-weight-bold">Pagar a VITI</div><div class="text-caption text-grey-6">1. Escanea el QR. 2. Realiza el pago. 3. Regresa al concepto correspondiente y sube el comprobante.</div></q-card-section>
          <q-card-section class="text-center q-pt-none"><div class="qr-stage"><img :src="qrSrc" alt="QR de pago VITI" class="qr-img" @error="qrFailed=true"/></div></q-card-section>
          <q-separator/>
          <q-list><q-item><q-item-section avatar><q-icon name="account_balance" color="primary"/></q-item-section><q-item-section><q-item-label caption>Banco</q-item-label><q-item-label class="text-weight-bold">{{data.configuracion?.banco||'Banco Ganadero'}}</q-item-label></q-item-section></q-item><q-item><q-item-section avatar><q-icon name="person" color="primary"/></q-item-section><q-item-section><q-item-label caption>Titular</q-item-label><q-item-label class="text-weight-bold">{{data.configuracion?.titular||'Guzman Ribera Alexander'}}</q-item-label></q-item-section></q-item></q-list>
          <q-card-section v-if="data.configuracion?.observaciones" class="text-body2 text-grey-7">{{data.configuracion.observaciones}}</q-card-section>
          <q-card-section class="text-caption text-grey-6">Los comprobantes quedan privados dentro de VITI y son visibles para tu negocio y para el equipo VITI.</q-card-section>
        </q-card>
      </div>
    </div>
  </template>

  <q-dialog v-model="dialog">
    <q-card style="width:620px;max-width:94vw">
      <q-card-section><div class="section-label">Registrar pago</div><div class="text-h5 text-weight-bold">{{conceptLabel}}</div><div class="text-caption text-grey-6">Importe pendiente: {{money(expectedAmount)}}</div></q-card-section>
      <q-separator/>
      <q-card-section><q-banner rounded class="bg-orange-1 text-orange-10 q-mb-md"><template #avatar><q-icon name="hourglass_top"/></template>Al enviar el comprobante quedará pendiente de revisión. No se descontará del saldo hasta que VITI lo confirme.</q-banner><div class="row q-col-gutter-md"><div class="col-12 col-sm-6"><q-input v-model.number="form.monto" outlined type="number" min="0.01" :max="expectedAmount" :readonly="paymentKind==='subscription'" label="Monto pagado (Bs)"/></div><div class="col-12 col-sm-6"><q-select v-model="form.metodo" outlined emit-value map-options :options="[{label:'QR',value:'qr'},{label:'Transferencia',value:'transferencia'},{label:'Efectivo',value:'efectivo'},{label:'Otro',value:'otro'}]" label="Método de pago"/></div><div class="col-12 col-sm-6"><q-input v-model="form.fecha_pago" outlined type="date" stack-label label="Fecha del pago"/></div><div class="col-12 col-sm-6"><q-input v-model="form.referencia" outlined label="Referencia / Nro. operación"/></div><div class="col-12"><q-file v-model="proof" outlined clearable accept="image/png,image/jpeg,image/webp,application/pdf" :label="requiresProof?'Comprobante *':'Comprobante (opcional para efectivo)'"><template #prepend><q-icon name="attach_file"/></template></q-file><div class="text-caption text-grey-6 q-mt-xs">JPG, PNG, WEBP o PDF. Máximo 5 MB.</div></div><div class="col-12"><q-input v-model="form.observaciones" outlined type="textarea" autogrow label="Observaciones opcionales"/></div></div></q-card-section>
      <q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps icon="upload_file" label="Enviar comprobante" :loading="sending" @click="sendProof"/></q-card-actions>
    </q-card>
  </q-dialog>
</q-page>
</template>

<style scoped>
.payment-guide{border:1px solid var(--viti-border)}.payment-guide-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.payment-guide-grid>div{display:flex;align-items:flex-start;gap:11px;padding:14px;border-radius:13px;background:var(--viti-surface-soft)}.payment-guide-grid b,.payment-guide-grid span{display:block}.payment-guide-grid span{margin-top:4px;color:var(--viti-muted);font-size:12px;line-height:1.55}.next-payment{background:var(--viti-surface-soft)}.qr-stage{display:flex;align-items:center;justify-content:center;padding:14px;border-radius:14px;background:#fff}.qr-img{display:block;width:100%;max-width:340px;height:auto;object-fit:contain;background:#fff}.sticky-card{position:sticky;top:84px}.empty-state{min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--viti-muted)}@media(max-width:1023px){.sticky-card{position:static}.payment-guide-grid{grid-template-columns:1fr}}
</style>